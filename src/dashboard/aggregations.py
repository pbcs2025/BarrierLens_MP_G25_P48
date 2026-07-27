"""Aggregate woman-level master data into dashboard summary tables."""

from __future__ import annotations

import logging
from typing import List, Tuple

import numpy as np
import pandas as pd

from src.dashboard.constants import (
    BARRIER_TYPES,
    MIN_CELL_N,
    PRED_COLS,
    STAGE2_TARGETS,
)

logger = logging.getLogger(__name__)

DEMO_GROUP_COLS = ["wealth_tier", "education_tier", "residence", "caste_group"]


def _safe_mean(series: pd.Series) -> float:
    valid = pd.to_numeric(series, errors="coerce").dropna()
    return float(valid.mean()) if len(valid) else np.nan


def build_state_level_summary(master: pd.DataFrame) -> pd.DataFrame:
    """One row per state/UT with observed rates, OOF predicted probs, clusters, Stage 2."""
    rows: List[dict] = []
    cluster_ids = sorted(master["cluster_id"].dropna().unique())

    for state, grp in master.groupby("state_name", sort=True):
        row: dict = {"state_name": state, "N": len(grp)}

        for barrier in BARRIER_TYPES:
            obs_col = f"observed_{barrier}"
            pred_col = PRED_COLS[barrier]
            row[f"observed_{barrier}_rate"] = round(_safe_mean(grp[obs_col]), 6)
            row[f"pred_{barrier}_prob"] = round(_safe_mean(grp[pred_col]), 6)

        row["pred_composite_barrier_score"] = round(_safe_mean(grp["composite_barrier_score"]), 6)

        for cid in cluster_ids:
            share = (grp["cluster_id"] == cid).mean()
            row[f"cluster_{int(cid)}_share"] = round(float(share), 6)

        for target in STAGE2_TARGETS:
            obs_col = f"observed_{target}"
            pred_col = f"pred_{target}_prob"
            valid = grp[obs_col].notna()
            row[f"{target}_N"] = int(valid.sum())
            if valid.any():
                row[f"{target}_observed_rate"] = round(float(grp.loc[valid, obs_col].mean()), 6)
                row[f"{target}_pred_prob"] = round(_safe_mean(grp.loc[valid, pred_col]), 6)
            else:
                row[f"{target}_observed_rate"] = np.nan
                row[f"{target}_pred_prob"] = np.nan

        rows.append(row)

    return pd.DataFrame(rows)


def build_state_barrier_long(state_summary: pd.DataFrame) -> pd.DataFrame:
    """Long-format state × barrier_type table for Power BI choropleth toggles."""
    records = []
    for _, row in state_summary.iterrows():
        for barrier in BARRIER_TYPES:
            records.append(
                {
                    "state_name": row["state_name"],
                    "barrier_type": barrier.title(),
                    "N": row["N"],
                    "mean_observed_rate": row[f"observed_{barrier}_rate"],
                    "mean_predicted_prob": row[f"pred_{barrier}_prob"],
                    "data_rail_observed": "Rail A — Observed",
                    "data_rail_predicted": "Rail B — BarrierLens OOF Prediction",
                }
            )
    return pd.DataFrame(records)


def build_demographic_summary(master: pd.DataFrame) -> pd.DataFrame:
    """
    Demographic cells: wealth_tier × education_tier × residence × caste_group × barrier_type.
    Applies N<30 suppression per Guide Section 11.
    """
    records = []
    group_cols = DEMO_GROUP_COLS

    for keys, grp in master.groupby(group_cols, dropna=False):
        if not isinstance(keys, tuple):
            keys = (keys,)
        base = dict(zip(group_cols, keys))
        n = len(grp)
        suppress = n < MIN_CELL_N

        for barrier in BARRIER_TYPES:
            obs_col = f"observed_{barrier}"
            pred_col = PRED_COLS[barrier]
            record = {
                **base,
                "barrier_type": barrier.title(),
                "N": n,
                "suppress_flag": suppress,
                "mean_observed_rate": np.nan if suppress else round(float(grp[obs_col].mean()), 6),
                "mean_predicted_prob": np.nan if suppress else round(float(grp[pred_col].mean()), 6),
                "data_rail_observed": "Rail A — Observed",
                "data_rail_predicted": "Rail B — BarrierLens OOF Prediction",
            }
            records.append(record)

    return pd.DataFrame(records)


def build_cluster_summary(master: pd.DataFrame, profiles: pd.DataFrame) -> pd.DataFrame:
    """Named archetype profiles with cluster size and feature means."""
    rows = []
    for _, prof in profiles.iterrows():
        cid = int(prof["cluster"])
        prof_dict = prof.to_dict()
        row = {
            "cluster_id": cid,
            "archetype_name": prof["archetype_name"],
            "n_women": int(prof.get("n_women", (master["cluster_id"] == cid).sum())),
            "share_of_total": round((master["cluster_id"] == cid).mean(), 6),
        }
        profile_feature_map = {
            "media_exposure_index": "media_exposure_index",
            "digital_inclusion_index": "digital_inclusion_index",
            "vulnerability_score": "vulnerability_score",
            "pred_household_prob": "household_barrier_prob",
            "pred_logistic_prob": "logistic_barrier_prob",
            "pred_facility_prob": "facility_barrier_prob",
            "composite_barrier_score": "composite_barrier_score",
        }
        for out_col, src_col in profile_feature_map.items():
            if src_col in prof_dict:
                row[f"{out_col}_mean"] = round(float(prof_dict[src_col]), 6)
            elif out_col in master.columns:
                row[f"{out_col}_mean"] = round(
                    float(master.loc[master["cluster_id"] == cid, out_col].mean()), 6
                )
        rows.append(row)

    return pd.DataFrame(rows)


def build_cluster_state_distribution(master: pd.DataFrame) -> pd.DataFrame:
    """Cluster × state distribution for stacked bar charts on Risk Archetypes page."""
    counts = (
        master.groupby(["cluster_id", "archetype_name", "state_name"], as_index=False)
        .size()
        .rename(columns={"size": "n_women"})
    )
    counts["share_within_cluster"] = counts.groupby("cluster_id")["n_women"].transform(
        lambda s: (s / s.sum()).round(6)
    )
    return counts.sort_values(["cluster_id", "n_women"], ascending=[True, False])
