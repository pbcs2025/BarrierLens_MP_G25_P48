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

import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.clustering.kmeans_cluster import (  # noqa: E402
    build_cluster_profiles,
    fit_clusters,
)
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


def build_preclustering_matrix(X_features: pd.DataFrame, oof_df: pd.DataFrame) -> pd.DataFrame:
    """Socioeconomic + engineered features + OOF barrier probabilities (no cluster dummies)."""
    drop_cols = [c for c in X_features.columns if c in LEAKAGE_COLS]
    if drop_cols:
        X_features = X_features.drop(columns=drop_cols)

    X_stage2 = pd.concat([X_features.reset_index(drop=True), oof_df.reset_index(drop=True)], axis=1)
    return X_stage2


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
    y_targets = build_stage2_targets(raw_df)
    y_targets.to_csv(STAGE2_DIR / "y_stage2_targets.csv", index=False)
    print(f"Saved targets -> {STAGE2_DIR / 'y_stage2_targets.csv'}")

    print("Building X_stage2_preclustering matrix...")
    X_pre = build_preclustering_matrix(X, oof_df)
    X_pre.to_csv(STAGE2_DIR / "X_stage2_preclustering.csv", index=False)
    print(f"Saved preclustering matrix {X_pre.shape} -> {STAGE2_DIR / 'X_stage2_preclustering.csv'}")

    print("Fitting MiniBatchKMeans clusters...")
    cluster_labels, _, _, k_meta = fit_clusters(X_pre, models_dir=MODELS_DIR)
    OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)
    cluster_path = OUTPUTS_DIR / "cluster_assignments.csv"
    cluster_labels.to_csv(cluster_path, index=False)
    print(f"Saved cluster assignments -> {cluster_path}")

    k_meta.to_csv(OUTPUTS_DIR / "cluster_k_selection.csv", index=False)
    build_cluster_profiles(X_pre, cluster_labels, outputs_dir=OUTPUTS_DIR)
    print("Stage 2 data prep complete.")


if __name__ == "__main__":
    main()
