# src/clustering/kmeans_cluster.py
#
# Owner: PBC
# Woman-level MiniBatchKMeans risk archetypes for Stage 2 (Section 4 of
# Stage2_Implementation_Guide_v2). Silhouette scoring runs on a fixed
# subsample; the final model fits on the full 724K-row matrix.

from __future__ import annotations

from pathlib import Path
from typing import Dict, Optional, Tuple

import joblib
import numpy as np
import pandas as pd
from sklearn.cluster import MiniBatchKMeans
from sklearn.metrics import silhouette_score
from sklearn.preprocessing import StandardScaler

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_MODELS_DIR = PROJECT_ROOT / "saved_models" / "stage2"
DEFAULT_OUTPUTS_DIR = PROJECT_ROOT / "outputs" / "stage2_results"

CLUSTER_FEATURES = [
    "media_exposure_index",
    "digital_inclusion_index",
    "vulnerability_score",
    "household_barrier_prob",
    "logistic_barrier_prob",
    "facility_barrier_prob",
]

PROFILE_FEATURES = CLUSTER_FEATURES + ["composite_barrier_score"]


def find_best_k(
    X_scaled: np.ndarray,
    k_range=range(2, 11),
    sample_size: int = 20_000,
    random_state: int = 42,
) -> Tuple[int, Dict[int, float]]:
    """Pick k via silhouette on a random subsample (Section 4.2)."""
    rng = np.random.RandomState(random_state)
    idx = rng.choice(len(X_scaled), size=min(sample_size, len(X_scaled)), replace=False)
    sample = X_scaled[idx]
    scores: Dict[int, float] = {}

    for k in k_range:
        labels = MiniBatchKMeans(
            n_clusters=k, random_state=random_state, n_init=10
        ).fit_predict(sample)
        scores[k] = silhouette_score(sample, labels)
        print(f"k={k}: silhouette={scores[k]:.4f} (on {len(sample):,}-row subsample)")

    best_k = max(scores, key=scores.get)
    print(f"Best k: {best_k} (silhouette={scores[best_k]:.4f})")
    return best_k, scores


def fit_clusters(
    X_stage2: pd.DataFrame,
    models_dir: Optional[Path] = None,
    k_range=range(2, 11),
    random_state: int = 42,
) -> Tuple[pd.Series, MiniBatchKMeans, StandardScaler, pd.DataFrame]:
    """
    Standardise clustering features, select k, fit MiniBatchKMeans on full data,
    and persist model + scaler.
    """
    missing = [c for c in CLUSTER_FEATURES if c not in X_stage2.columns]
    if missing:
        raise KeyError(f"Clustering features missing from X_stage2: {missing}")

    X_cluster = X_stage2[CLUSTER_FEATURES]
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_cluster)

    best_k, silhouette_scores = find_best_k(X_scaled, k_range=k_range, random_state=random_state)
    model = MiniBatchKMeans(
        n_clusters=best_k,
        random_state=random_state,
        n_init=10,
        batch_size=4096,
    )
    labels = model.fit_predict(X_scaled)

    models_dir = Path(models_dir or DEFAULT_MODELS_DIR)
    models_dir.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, models_dir / "kmeans_model.pkl")
    joblib.dump(scaler, models_dir / "kmeans_scaler.pkl")

    meta = pd.DataFrame(
        {
            "k": list(silhouette_scores.keys()),
            "silhouette_score": list(silhouette_scores.values()),
        }
    )
    meta["chosen"] = meta["k"] == best_k

    return pd.Series(labels, name="cluster"), model, scaler, meta


def _level(value: float, median: float) -> str:
    return "high" if value >= median else "low"


def name_cluster_archetypes(profiles: pd.DataFrame) -> pd.DataFrame:
    """
    Assign human-readable archetype labels from cluster mean profiles.
    Uses dataset-wide medians as thresholds for high/low splits.
    """
    medians = profiles[PROFILE_FEATURES].median()
    names = []

    for _, row in profiles.iterrows():
        vuln = _level(row["vulnerability_score"], medians["vulnerability_score"])
        barrier = _level(row["composite_barrier_score"], medians["composite_barrier_score"])
        media = _level(row["media_exposure_index"], medians["media_exposure_index"])
        digital = _level(row["digital_inclusion_index"], medians["digital_inclusion_index"])

        if vuln == "high" and barrier == "high":
            label = "High Vulnerability, High Barrier Exposure"
        elif vuln == "high" and barrier == "low":
            label = "High Vulnerability, Lower Barrier Exposure"
        elif vuln == "low" and barrier == "high":
            label = "Lower Vulnerability, High Barrier Exposure"
        elif media == "low" and digital == "low":
            label = "Low Media & Digital Inclusion"
        elif media == "high" and digital == "high":
            label = "High Media & Digital Inclusion"
        else:
            label = "Moderate Risk Profile"

        names.append(label)

    out = profiles.copy()
    out["archetype_name"] = names
    return out


def build_cluster_profiles(
    X_stage2: pd.DataFrame,
    labels: pd.Series,
    outputs_dir: Optional[Path] = None,
) -> pd.DataFrame:
    """
    Summarise each cluster's size and mean feature values; save cluster_profiles.csv
    with named archetypes (Guide Section 9, tasks 5–6).
    """
    profile_cols = [c for c in PROFILE_FEATURES if c in X_stage2.columns]
    work = X_stage2[profile_cols].copy()
    work["cluster"] = labels.values

    agg_spec: Dict[str, Tuple[str, str]] = {"n_women": ("cluster", "size")}
    for col in profile_cols:
        agg_spec[col] = (col, "mean")

    profiles = work.groupby("cluster", as_index=False).agg(**agg_spec)

    profiles = name_cluster_archetypes(profiles)

    outputs_dir = Path(outputs_dir or DEFAULT_OUTPUTS_DIR)
    outputs_dir.mkdir(parents=True, exist_ok=True)
    out_path = outputs_dir / "cluster_profiles.csv"
    profiles.to_csv(out_path, index=False)
    print(f"Saved cluster profiles -> {out_path}")

    return profiles
