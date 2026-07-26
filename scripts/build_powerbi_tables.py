#!/usr/bin/env python3
"""Build Power BI helper tables from dashboard CSV outputs."""

from __future__ import annotations

import shutil
import sys
from pathlib import Path

import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.dashboard.constants import DASHBOARD_DIR, EXPECTED_N_WOMEN

STAGE2_RESULTS = PROJECT_ROOT / "outputs" / "stage2_results"
POWERBI_DATA = DASHBOARD_DIR / "powerbi"


def _load_master_sample() -> pd.DataFrame | None:
    master_path = DASHBOARD_DIR / "woman_level_master.csv"
    if not master_path.exists():
        return None
    # KPIs only need column means — stream via read_csv usecols
    usecols = [
        "observed_household",
        "observed_logistic",
        "observed_facility",
        "pred_household_prob",
        "pred_logistic_prob",
        "pred_facility_prob",
        "composite_barrier_score",
        "observed_target_unmet_fp",
        "pred_target_unmet_fp_prob",
    ]
    return pd.read_csv(master_path, usecols=usecols, low_memory=False)


def build_national_kpi_summary() -> pd.DataFrame:
    """Wide national KPI table for Page 1 cards."""
    master = _load_master_sample()
    if master is None:
        raise FileNotFoundError("Run build_dashboard_datasets.py first.")

    valid_fp = master["observed_target_unmet_fp"].notna()
    any_barrier = (
        (master["observed_household"] == 1)
        | (master["observed_logistic"] == 1)
        | (master["observed_facility"] == 1)
    )

    row = {
        "total_women": EXPECTED_N_WOMEN,
        "observed_any_barrier_rate": round(float(any_barrier.mean()), 6),
        "observed_household_rate": round(float(master["observed_household"].mean()), 6),
        "observed_logistic_rate": round(float(master["observed_logistic"].mean()), 6),
        "observed_facility_rate": round(float(master["observed_facility"].mean()), 6),
        "pred_household_prob": round(float(master["pred_household_prob"].mean()), 6),
        "pred_logistic_prob": round(float(master["pred_logistic_prob"].mean()), 6),
        "pred_facility_prob": round(float(master["pred_facility_prob"].mean()), 6),
        "pred_composite_barrier_score": round(float(master["composite_barrier_score"].mean()), 6),
        "stage2_unmet_fp_N": int(valid_fp.sum()),
        "stage2_unmet_fp_observed_rate": round(
            float(master.loc[valid_fp, "observed_target_unmet_fp"].mean()), 6
        ),
        "stage2_unmet_fp_pred_prob": round(
            float(master.loc[valid_fp, "pred_target_unmet_fp_prob"].mean()), 6
        ),
        "stage2_anc_gap_N": 0,
        "data_note": (
            "Stage 1 rates = 724,115 women. "
            "Stage 2 unmet FP = restricted analytic sample only."
        ),
    }
    return pd.DataFrame([row])


def build_national_barrier_long() -> pd.DataFrame:
    """Long national observed vs predicted bars for Page 1."""
    kpi = build_national_kpi_summary().iloc[0]
    records = []
    mapping = [
        ("Household", "observed_household_rate", "pred_household_prob"),
        ("Logistic", "observed_logistic_rate", "pred_logistic_prob"),
        ("Facility", "observed_facility_rate", "pred_facility_prob"),
    ]
    for barrier, obs_col, pred_col in mapping:
        records.append(
            {
                "barrier_type": barrier,
                "metric_type": "Observed",
                "value": kpi[obs_col],
                "data_rail": "Rail A — Observed NFHS-5 Statistic",
            }
        )
        records.append(
            {
                "barrier_type": barrier,
                "metric_type": "Predicted",
                "value": kpi[pred_col],
                "data_rail": "Rail B — BarrierLens OOF Prediction",
            }
        )
    return pd.DataFrame(records)


def build_demographic_comparison_long() -> pd.DataFrame:
    """Unpivot demographic summary for Page 2 side-by-side bars."""
    demo_path = DASHBOARD_DIR / "demographic_summary.csv"
    demo = pd.read_csv(demo_path)
    demo = demo[demo["suppress_flag"] == False].copy()  # noqa: E712
    records = []
    group_cols = ["wealth_tier", "education_tier", "residence", "caste_group", "barrier_type", "N"]
    for _, row in demo.iterrows():
        cell_label = (
            f"{row['wealth_tier']} | {row['education_tier']} | "
            f"{row['residence']} | {row['caste_group']}"
        )
        records.append(
            {
                **{c: row[c] for c in group_cols},
                "demographic_cell": cell_label,
                "metric_type": "Observed",
                "value": row["mean_observed_rate"],
                "data_rail": row["data_rail_observed"],
            }
        )
        records.append(
            {
                **{c: row[c] for c in group_cols},
                "demographic_cell": cell_label,
                "metric_type": "Predicted",
                "value": row["mean_predicted_prob"],
                "data_rail": row["data_rail_predicted"],
            }
        )
    return pd.DataFrame(records)


def copy_stage2_tables() -> None:
    src = STAGE2_RESULTS / "model_comparison_table.csv"
    if src.exists():
        shutil.copy2(src, POWERBI_DATA / "model_comparison_table.csv")
    xgb = STAGE2_RESULTS / "xgboost_evaluation_results.csv"
    if xgb.exists():
        shutil.copy2(xgb, POWERBI_DATA / "stage2_xgboost_results.csv")


def main() -> None:
    POWERBI_DATA.mkdir(parents=True, exist_ok=True)

    build_national_kpi_summary().to_csv(POWERBI_DATA / "national_kpi_summary.csv", index=False)
    build_national_barrier_long().to_csv(POWERBI_DATA / "national_barrier_long.csv", index=False)
    build_demographic_comparison_long().to_csv(
        POWERBI_DATA / "demographic_comparison_long.csv", index=False
    )

    # Mirror core dashboard tables into powerbi/ subfolder for single import path
    for name in [
        "state_level_summary.csv",
        "state_barrier_long.csv",
        "demographic_summary.csv",
        "cluster_summary.csv",
        "cluster_state_distribution.csv",
    ]:
        src = DASHBOARD_DIR / name
        if src.exists():
            shutil.copy2(src, POWERBI_DATA / name)

    copy_stage2_tables()
    print(f"Power BI tables written -> {POWERBI_DATA}")


if __name__ == "__main__":
    main()
