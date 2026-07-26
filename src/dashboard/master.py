"""Build the labelled woman-level master dataset for the BarrierLens dashboard."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Optional, Tuple

import joblib
import numpy as np
import pandas as pd

from src.clustering.kmeans_cluster import build_cluster_profiles
from src.dashboard.constants import (
    OOF_PROB_COLS,
    PRED_COLS,
    PROCESSED_DIR,
    RAW_CSV,
    STAGE2_DIR,
    STAGE2_MODELS,
    STAGE2_OUTPUTS,
    STAGE2_TARGETS,
)
from src.dashboard.labels import attach_demographic_labels
from src.models.stage2_xgboost import load_stage2_data
from src.preprocessing.stage2_integration import _sanitize_feature_names

logger = logging.getLogger(__name__)


def _read_aligned_csv(path: Path, squeeze: bool = False) -> pd.Series | pd.DataFrame:
    df = pd.read_csv(path, low_memory=False)
    if squeeze:
        return df.squeeze("columns")
    return df


def _ensure_cluster_profiles(X_pre: pd.DataFrame, clusters: pd.Series) -> pd.DataFrame:
    profile_path = STAGE2_OUTPUTS / "cluster_profiles.csv"
    if profile_path.exists():
        return pd.read_csv(profile_path)
    logger.warning("cluster_profiles.csv missing — rebuilding from assignments.")
    return build_cluster_profiles(X_pre, clusters, outputs_dir=STAGE2_OUTPUTS)


def _score_stage2_target(
    target: str,
    X_full: pd.DataFrame,
    y_stage2: pd.Series | None = None,
) -> pd.Series:
    """Return woman-level Stage 2 predicted probabilities (NaN outside analytic sample)."""
    model_path = STAGE2_MODELS / f"stage2_xgboost_{target}.pkl"
    out = pd.Series(np.nan, index=range(len(X_full)), name=f"pred_{target}_prob")
    if not model_path.exists():
        logger.warning("Stage 2 model not found: %s", model_path)
        return out

    model = joblib.load(model_path)
    X_clean = _sanitize_feature_names(X_full)

    if y_stage2 is not None:
        mask = y_stage2.notna()
        if mask.sum() == 0:
            return out
        probs = model.predict_proba(X_clean.loc[mask])[:, 1]
        out.loc[mask.to_numpy()] = probs
        return out

    probs = model.predict_proba(X_clean)[:, 1]
    out.iloc[:] = probs
    return out


def build_master_dataset(project_root: Optional[Path] = None) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    Assemble the woman-level master table by row index alignment (724,115 rows).

    Returns
    -------
    master, cluster_profiles
    """
    _ = project_root  # reserved for tests; paths come from constants

    raw = pd.read_csv(RAW_CSV, low_memory=False)
    raw.columns = raw.columns.str.strip()

    y_household = _read_aligned_csv(PROCESSED_DIR / "y_household.csv", squeeze=True)
    y_logistic = _read_aligned_csv(PROCESSED_DIR / "y_logistic.csv", squeeze=True)
    y_facility = _read_aligned_csv(PROCESSED_DIR / "y_facility.csv", squeeze=True)
    oof = _read_aligned_csv(STAGE2_DIR / "oof_barrier_probabilities.csv")
    y_stage2 = _read_aligned_csv(STAGE2_DIR / "y_stage2_targets.csv")
    clusters = _read_aligned_csv(STAGE2_OUTPUTS / "cluster_assignments.csv", squeeze=True)
    X_pre = _read_aligned_csv(STAGE2_DIR / "X_stage2_preclustering.csv")

    n_rows = len(raw)
    lengths = {
        "raw": len(raw),
        "X_pre": len(X_pre),
        "y_household": len(y_household),
        "oof": len(oof),
        "clusters": len(clusters),
        "y_stage2": len(y_stage2),
    }
    if len(set(lengths.values())) != 1:
        raise ValueError(f"Row count mismatch across inputs: {lengths}")

    profiles = _ensure_cluster_profiles(X_pre, clusters)
    archetype_map = profiles.set_index("cluster")["archetype_name"].to_dict()

    demo = attach_demographic_labels(raw)
    X_full, _ = load_stage2_data(
        data_dir=STAGE2_DIR,
        outputs_dir=STAGE2_OUTPUTS,
    )

    master = pd.DataFrame({"woman_index": np.arange(n_rows, dtype=int)})
    if "caseid" in raw.columns:
        master["caseid"] = raw["caseid"].values

    master = pd.concat([master, demo], axis=1)

    master["observed_household"] = y_household.values
    master["observed_logistic"] = y_logistic.values
    master["observed_facility"] = y_facility.values

    for barrier, oof_col in OOF_PROB_COLS.items():
        master[PRED_COLS[barrier]] = oof[oof_col].values

    master["composite_barrier_score"] = oof["composite_barrier_score"].values
    master["cluster_id"] = clusters.values.astype(int)
    master["archetype_name"] = master["cluster_id"].map(archetype_map)

    for target in STAGE2_TARGETS:
        if target in y_stage2.columns:
            master[f"observed_{target}"] = y_stage2[target].values
            master[f"pred_{target}_prob"] = _score_stage2_target(
                target, X_full, y_stage2[target]
            ).values

    # Engineered indices for cluster/drill-through context
    for col in ("media_exposure_index", "digital_inclusion_index", "vulnerability_score"):
        if col in X_pre.columns:
            master[col] = X_pre[col].values

    logger.info("Built woman-level master dataset: %s rows × %s cols", master.shape[0], master.shape[1])
    return master, profiles


def save_master_dataset(master: pd.DataFrame, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    master.to_csv(path, index=False)
    logger.info("Saved master dataset -> %s", path)
