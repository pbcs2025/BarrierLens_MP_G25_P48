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
from src.preprocessing.encode import AGE_GROUP_ORDER

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
        "observed_target_anc_gap",
        "pred_target_anc_gap_prob",
    ]
    return pd.read_csv(master_path, usecols=usecols, low_memory=False)


def build_national_kpi_summary() -> pd.DataFrame:
    """Wide national KPI table for Page 1 cards."""
    master = _load_master_sample()
    if master is None:
        raise FileNotFoundError("Run build_dashboard_datasets.py first.")

    valid_fp = master["observed_target_unmet_fp"].notna()
    valid_anc = master["observed_target_anc_gap"].notna()
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
        "stage2_anc_gap_N": int(valid_anc.sum()),
        "stage2_anc_gap_observed_rate": round(
            float(master.loc[valid_anc, "observed_target_anc_gap"].mean()), 6
        )
        if valid_anc.any()
        else None,
        "stage2_anc_gap_pred_prob": round(
            float(master.loc[valid_anc, "pred_target_anc_gap_prob"].mean()), 6
        )
        if valid_anc.any()
        else None,
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


def _any_barrier_observed(df: pd.DataFrame) -> pd.Series:
    return (
        (df["observed_household"] == 1)
        | (df["observed_logistic"] == 1)
        | (df["observed_facility"] == 1)
    ).astype(float)


def _attach_age_group(master: pd.DataFrame) -> pd.DataFrame:
    """Map ordinal v013 from aligned X_features to NFHS age-group labels."""
    features_path = PROJECT_ROOT / "data" / "processed" / "X_features.csv"
    if not features_path.exists():
        return master
    v013 = pd.read_csv(features_path, usecols=["v013"], low_memory=False)["v013"]
    inv = {v: k for k, v in AGE_GROUP_ORDER.items()}
    age_labels = v013.map(inv).fillna("Missing")
    display = {k: k for k in AGE_GROUP_ORDER}
    display["Missing"] = "Missing"
    out = master.copy()
    out["age_group"] = age_labels.map(lambda x: display.get(x, str(x).title()))
    return out


def build_demographic_dimension_long() -> pd.DataFrame:
    """Single-dimension observed vs predicted rates for demographic pages."""
    master_path = DASHBOARD_DIR / "woman_level_master.csv"
    master = _attach_age_group(pd.read_csv(master_path, low_memory=False))
    dims = {
        "Education": "education_tier",
        "Wealth": "wealth_tier",
        "Residence": "residence",
        "Religion": "religion",
        "Occupation": "occupation_group",
        "Caste": "caste_group",
        "Age Group": "age_group",
    }
    records: list[dict] = []
    for dim_label, col in dims.items():
        grouped = master.groupby(col, dropna=False)
        for category, sub in grouped:
            if len(sub) < 30:
                continue
            obs = float(_any_barrier_observed(sub).mean())
            pred = float(sub["composite_barrier_score"].mean())
            cat = str(category) if pd.notna(category) else "Missing"
            for metric_type, val in [("Observed", obs), ("Predicted", pred)]:
                records.append(
                    {
                        "dimension": dim_label,
                        "category": cat,
                        "metric_type": metric_type,
                        "value": round(val, 6),
                        "N": int(len(sub)),
                    }
                )
    return pd.DataFrame(records)


def build_state_ranking_long() -> pd.DataFrame:
    """Top / bottom states by mean predicted composite barrier for state analysis page."""
    states = pd.read_csv(DASHBOARD_DIR / "state_level_summary.csv")
    ranked = states.sort_values("pred_composite_barrier_score", ascending=False).reset_index(drop=True)
    records: list[dict] = []
    for idx, row in ranked.head(10).iterrows():
        records.append(
            {
                "ranking_type": "Top 10 High Risk",
                "rank_order": idx + 1,
                "state_name": row["state_name"],
                "pred_composite_barrier_score": row["pred_composite_barrier_score"],
                "N": row["N"],
            }
        )
    bottom = ranked.tail(10).reset_index(drop=True)
    for idx, row in bottom.iterrows():
        records.append(
            {
                "ranking_type": "Bottom 10 Low Risk",
                "rank_order": idx + 1,
                "state_name": row["state_name"],
                "pred_composite_barrier_score": row["pred_composite_barrier_score"],
                "N": row["N"],
            }
        )
    return pd.DataFrame(records)


def build_state_top10_long() -> pd.DataFrame:
    ranked = build_state_ranking_long()
    return ranked[ranked["ranking_type"] == "Top 10 High Risk"].drop(columns=["ranking_type"])


def build_state_bottom10_long() -> pd.DataFrame:
    ranked = build_state_ranking_long()
    return ranked[ranked["ranking_type"] == "Bottom 10 Low Risk"].drop(columns=["ranking_type"])


def build_national_barrier_predicted_mix() -> pd.DataFrame:
    """Predicted-only barrier mix for national donut chart."""
    long_df = build_national_barrier_long()
    mix = long_df[long_df["metric_type"] == "Predicted"].copy()
    total = mix["value"].sum()
    mix["share"] = mix["value"] / total if total else 0
    return mix[["barrier_type", "value", "share"]]


def build_base_paper_barrier_long() -> pd.DataFrame:
    ref_path = POWERBI_DATA / "base_paper_reference.csv"
    if not ref_path.exists():
        from scripts.build_final_dashboard_tables import build_base_paper_reference

        build_base_paper_reference()
    ref = pd.read_csv(ref_path)
    records: list[dict] = []
    for _, row in ref.iterrows():
        for source, col in [
            ("Base Paper (Pradhan & De 2025)", "base_paper_rate"),
            ("BarrierLens Observed", "barrierlens_observed"),
            ("BarrierLens Predicted", "barrierlens_predicted"),
        ]:
            records.append(
                {
                    "barrier_type": row["barrier_type"],
                    "comparison_source": source,
                    "value": row[col],
                }
            )
    return pd.DataFrame(records)


def build_cluster_radar_long() -> pd.DataFrame:
    cluster_path = DASHBOARD_DIR / "cluster_summary.csv"
    cs = pd.read_csv(cluster_path)
    metrics = [
        ("Media Exposure", "media_exposure_index_mean"),
        ("Digital Inclusion", "digital_inclusion_index_mean"),
        ("Vulnerability", "vulnerability_score_mean"),
        ("Household Barrier Prob", "pred_household_prob_mean"),
        ("Logistic Barrier Prob", "pred_logistic_prob_mean"),
        ("Facility Barrier Prob", "pred_facility_prob_mean"),
        ("Composite Barrier", "composite_barrier_score_mean"),
    ]
    risk_map = {
        0: "High Risk Cluster",
        1: "Low Risk Cluster",
    }
    records: list[dict] = []
    for _, row in cs.iterrows():
        cid = int(row["cluster_id"])
        tier = risk_map.get(cid, row["archetype_name"])
        for label, col in metrics:
            records.append(
                {
                    "cluster_id": cid,
                    "archetype_name": row["archetype_name"],
                    "risk_tier": tier,
                    "metric_label": label,
                    "value": row[col],
                }
            )
    return pd.DataFrame(records)


def _enrich_cluster_summary() -> pd.DataFrame:
    cs = pd.read_csv(DASHBOARD_DIR / "cluster_summary.csv")
    risk_map = {0: "High Risk Cluster", 1: "Low Risk Cluster"}
    cs["risk_tier"] = cs["cluster_id"].map(risk_map).fillna(cs["archetype_name"])
    return cs


def _enrich_cluster_state_distribution() -> pd.DataFrame:
    dist = pd.read_csv(DASHBOARD_DIR / "cluster_state_distribution.csv")
    risk_map = {0: "High Risk Cluster", 1: "Low Risk Cluster"}
    dist["risk_tier"] = dist["cluster_id"].map(risk_map).fillna(dist["archetype_name"])
    return dist


def build_stage2_outcome_long() -> pd.DataFrame:
    kpi = build_national_kpi_summary().iloc[0]
    records: list[dict] = [
        {
            "granularity": "National",
            "state_name": "India",
            "outcome": "Unmet Family Planning",
            "metric_type": "Observed",
            "value": kpi["stage2_unmet_fp_observed_rate"],
            "N": int(kpi["stage2_unmet_fp_N"]),
        },
        {
            "granularity": "National",
            "state_name": "India",
            "outcome": "Unmet Family Planning",
            "metric_type": "Predicted",
            "value": kpi["stage2_unmet_fp_pred_prob"],
            "N": int(kpi["stage2_unmet_fp_N"]),
        },
    ]
    if int(kpi.get("stage2_anc_gap_N", 0) or 0) > 0:
        records.extend(
            [
                {
                    "granularity": "National",
                    "state_name": "India",
                    "outcome": "ANC Care Gap",
                    "metric_type": "Observed",
                    "value": kpi["stage2_anc_gap_observed_rate"],
                    "N": int(kpi["stage2_anc_gap_N"]),
                },
                {
                    "granularity": "National",
                    "state_name": "India",
                    "outcome": "ANC Care Gap",
                    "metric_type": "Predicted",
                    "value": kpi["stage2_anc_gap_pred_prob"],
                    "N": int(kpi["stage2_anc_gap_N"]),
                },
            ]
        )
    else:
        # Placeholder row so visuals retain structure; filter in Desktop when ANC data arrives
        records.extend(
            [
                {
                    "granularity": "National",
                    "state_name": "India",
                    "outcome": "ANC Care Gap",
                    "metric_type": "Observed",
                    "value": None,
                    "N": 0,
                },
                {
                    "granularity": "National",
                    "state_name": "India",
                    "outcome": "ANC Care Gap",
                    "metric_type": "Predicted",
                    "value": None,
                    "N": 0,
                },
            ]
        )

    states = pd.read_csv(DASHBOARD_DIR / "state_level_summary.csv")
    for _, row in states.iterrows():
        if pd.notna(row.get("target_unmet_fp_observed_rate")):
            records.append(
                {
                    "granularity": "State",
                    "state_name": row["state_name"],
                    "outcome": "Unmet Family Planning",
                    "metric_type": "Observed",
                    "value": row["target_unmet_fp_observed_rate"],
                    "N": row.get("target_unmet_fp_N"),
                }
            )
            records.append(
                {
                    "granularity": "State",
                    "state_name": row["state_name"],
                    "outcome": "Unmet Family Planning",
                    "metric_type": "Predicted",
                    "value": row["target_unmet_fp_pred_prob"],
                    "N": row.get("target_unmet_fp_N"),
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
    build_national_barrier_predicted_mix().to_csv(
        POWERBI_DATA / "national_barrier_predicted_mix.csv", index=False
    )
    build_state_ranking_long().to_csv(POWERBI_DATA / "state_ranking_long.csv", index=False)
    build_state_top10_long().to_csv(POWERBI_DATA / "state_top10_long.csv", index=False)
    build_state_bottom10_long().to_csv(POWERBI_DATA / "state_bottom10_long.csv", index=False)
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

    out = build_demographic_dimension_long()
    out.to_csv(POWERBI_DATA / "demographic_dimension_long.csv", index=False)
    for dim in out["dimension"].unique():
        slug = dim.lower().replace(" ", "_")
        out[out["dimension"] == dim].drop(columns=["dimension"]).to_csv(
            POWERBI_DATA / f"demographic_{slug}_long.csv", index=False
        )
    build_base_paper_barrier_long().to_csv(POWERBI_DATA / "base_paper_barrier_long.csv", index=False)
    build_cluster_radar_long().to_csv(POWERBI_DATA / "cluster_radar_long.csv", index=False)
    build_stage2_outcome_long().to_csv(POWERBI_DATA / "stage2_outcome_long.csv", index=False)
    _enrich_cluster_summary().to_csv(POWERBI_DATA / "cluster_summary.csv", index=False)
    _enrich_cluster_state_distribution().to_csv(
        POWERBI_DATA / "cluster_state_distribution.csv", index=False
    )

    # Mirror SHAP / Stage1 / reference tables from powerbi folder if present
    for name in [
        "base_paper_reference.csv",
        "shap_top20.csv",
        "shap_importance.csv",
        "stage1_model_comparison.csv",
        "stage1_barrier_rates_long.csv",
        "classification_report_display.csv",
        "hyperparameters_display.csv",
    ]:
        src = POWERBI_DATA / name
        if not src.exists():
            alt = DASHBOARD_DIR / name
            if alt.exists():
                shutil.copy2(alt, src)

    copy_stage2_tables()
    print(f"Power BI tables written -> {POWERBI_DATA}")


if __name__ == "__main__":
    main()
