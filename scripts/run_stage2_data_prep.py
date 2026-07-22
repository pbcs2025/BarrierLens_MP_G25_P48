"""Build Stage 2 processed inputs when upstream notebooks have not been run locally.

Creates:
  - data/processed/stage2/oof_barrier_probabilities.csv
  - data/processed/stage2/y_stage2_targets.csv
  - data/processed/stage2/X_stage2_preclustering.csv
  - outputs/stage2_results/cluster_assignments.csv
  - saved_models/stage2/kmeans_model.pkl, kmeans_scaler.pkl
"""

from __future__ import annotations

import sys
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.cluster import MiniBatchKMeans
from sklearn.metrics import silhouette_score
from sklearn.preprocessing import StandardScaler

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.preprocessing.stage2_integration import (  # noqa: E402
    STAGE2_DIR,
    build_composite_score,
    build_oof_barrier_probabilities,
    build_stage2_targets,
)

PROCESSED_DIR = PROJECT_ROOT / "data" / "processed"
RAW_CSV = PROJECT_ROOT / "data" / "raw" / "NFHS5_Individual.csv"
OUTPUTS_DIR = PROJECT_ROOT / "outputs" / "stage2_results"
MODELS_DIR = PROJECT_ROOT / "saved_models" / "stage2"

LEAKAGE_COLS = {"s245a", "s245b", "s245h"}

CLUSTER_FEATURES = [
    "media_exposure_index",
    "digital_inclusion_index",
    "vulnerability_score",
    "household_barrier_prob",
    "logistic_barrier_prob",
    "facility_barrier_prob",
]


def build_anc_gap_target(df: pd.DataFrame) -> pd.Series:
    """target_anc_gap = 1 if m14 < 4 else 0; NaN where m14 is structurally missing."""
    if "m14" not in df.columns:
        print("WARNING: m14 not in raw extract — target_anc_gap will be all-NaN.")
        return pd.Series(np.nan, index=df.index, name="target_anc_gap")

    y = pd.Series(np.nan, index=df.index, name="target_anc_gap")
    mask = df["m14"].notna()
    y.loc[mask] = (df.loc[mask, "m14"] < 4).astype(int)
    print(f"target_anc_gap restricted N: {mask.sum():,} / {len(df):,}")
    return y


def build_all_targets(raw_df: pd.DataFrame) -> pd.DataFrame:
    """Combine RBM's unmet-fp builder with optional ANC-gap when m14 is present."""
    y = build_stage2_targets(raw_df)
    y["target_anc_gap"] = build_anc_gap_target(raw_df)
    return y


def build_preclustering_matrix(X_features: pd.DataFrame, oof_df: pd.DataFrame) -> pd.DataFrame:
    """Socioeconomic + engineered features + OOF barrier probabilities (no cluster dummies)."""
    drop_cols = [c for c in X_features.columns if c in LEAKAGE_COLS]
    if drop_cols:
        X_features = X_features.drop(columns=drop_cols)

    X_stage2 = pd.concat([X_features.reset_index(drop=True), oof_df.reset_index(drop=True)], axis=1)
    return X_stage2


def find_best_k(X_scaled: np.ndarray, k_range=range(2, 11), sample_size=20000, random_state=42):
    rng = np.random.RandomState(random_state)
    idx = rng.choice(len(X_scaled), size=min(sample_size, len(X_scaled)), replace=False)
    sample = X_scaled[idx]
    scores = {}
    for k in k_range:
        labels = MiniBatchKMeans(n_clusters=k, random_state=random_state, n_init=10).fit_predict(sample)
        scores[k] = silhouette_score(sample, labels)
        print(f"k={k}: silhouette={scores[k]:.4f} (on {len(sample):,}-row subsample)")
    best_k = max(scores, key=scores.get)
    print(f"Best k: {best_k} (silhouette={scores[best_k]:.4f})")
    return best_k, scores


def fit_clusters(X_stage2: pd.DataFrame) -> tuple[pd.Series, MiniBatchKMeans, StandardScaler]:
    missing = [c for c in CLUSTER_FEATURES if c not in X_stage2.columns]
    if missing:
        raise KeyError(f"Clustering features missing from X_stage2: {missing}")

    X_cluster = X_stage2[CLUSTER_FEATURES]
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_cluster)

    best_k, _ = find_best_k(X_scaled)
    model = MiniBatchKMeans(n_clusters=best_k, random_state=42, n_init=10, batch_size=4096)
    labels = model.fit_predict(X_scaled)

    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, MODELS_DIR / "kmeans_model.pkl")
    joblib.dump(scaler, MODELS_DIR / "kmeans_scaler.pkl")

    return pd.Series(labels, name="cluster"), model, scaler


def main() -> None:
    print("Loading Stage 1 processed features and targets...")
    X = pd.read_csv(PROCESSED_DIR / "X_features.csv")
    y_household = pd.read_csv(PROCESSED_DIR / "y_household.csv").squeeze("columns")
    y_logistic = pd.read_csv(PROCESSED_DIR / "y_logistic.csv").squeeze("columns")
    y_facility = pd.read_csv(PROCESSED_DIR / "y_facility.csv").squeeze("columns")

    STAGE2_DIR.mkdir(parents=True, exist_ok=True)
    oof_path = STAGE2_DIR / "oof_barrier_probabilities.csv"

    if oof_path.exists():
        print(f"Loading existing OOF probabilities from {oof_path}")
        oof_df = pd.read_csv(oof_path)
    else:
        print("Running 3-fold OOF barrier probabilities (this may take a while)...")
        oof_df = build_oof_barrier_probabilities(
            X, y_household, y_logistic, y_facility, checkpoint=True
        )
        oof_df["composite_barrier_score"] = build_composite_score(oof_df)
        oof_df.to_csv(oof_path, index=False)
        print(f"Saved OOF probabilities -> {oof_path}")

    print("Building Stage 2 targets from raw extract...")
    raw_df = pd.read_csv(RAW_CSV, low_memory=False)
    raw_df.columns = raw_df.columns.str.strip()
    y_targets = build_all_targets(raw_df)
    y_targets.to_csv(STAGE2_DIR / "y_stage2_targets.csv", index=False)
    print(f"Saved targets -> {STAGE2_DIR / 'y_stage2_targets.csv'}")

    print("Building X_stage2_preclustering matrix...")
    X_pre = build_preclustering_matrix(X, oof_df)
    X_pre.to_csv(STAGE2_DIR / "X_stage2_preclustering.csv", index=False)
    print(f"Saved preclustering matrix {X_pre.shape} -> {STAGE2_DIR / 'X_stage2_preclustering.csv'}")

    print("Fitting MiniBatchKMeans clusters...")
    cluster_labels, _, _ = fit_clusters(X_pre)
    OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)
    cluster_path = OUTPUTS_DIR / "cluster_assignments.csv"
    cluster_labels.to_csv(cluster_path, index=False)
    print(f"Saved cluster assignments -> {cluster_path}")
    print("Stage 2 data prep complete.")


if __name__ == "__main__":
    main()
