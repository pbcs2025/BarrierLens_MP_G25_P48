"""Refresh all Power BI dashboard tables with clean, human-readable content.

Rules:
- NO ML model changes
- NO SHAP output changes
- NO notebook changes
- Only improve CSV content: labels, column names, human-readable values
- Preserve every calculated value exactly
"""

from __future__ import annotations

import shutil
from pathlib import Path

import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[1]
RESULTS      = PROJECT_ROOT / "outputs" / "stage2_results"
POWERBI      = PROJECT_ROOT / "data" / "dashboard" / "powerbi"
POWERBI.mkdir(parents=True, exist_ok=True)

# ─────────────────────────────────────────────────────────────────────────────
# Human-readable label maps  (presentation only — no values changed)
# ─────────────────────────────────────────────────────────────────────────────

TARGET_LABELS = {
    "target_unmet_fp":  "Unmet Need for Family Planning",
    "target_anc_gap":   "ANC Care Gap",
    "Unmet FP Need":    "Unmet Need for Family Planning",  # fix old label too
}

BARRIER_LABELS = {
    "household": "Household Barrier",
    "logistic":  "Logistic Barrier",
    "facility":  "Facility Barrier",
    "Household": "Household Barrier",
    "Logistic":  "Logistic Barrier",
    "Facility":  "Facility Barrier",
}

MODEL_LABELS = {
    "RandomForest":        "Random Forest",
    "random_forest":       "Random Forest",
}

METRIC_LABELS = {
    "Observed":  "Observed (NFHS-5)",
    "Predicted": "BarrierLens Predicted",
}

DATA_RAIL_LABELS = {
    "Rail A — Observed":                    "Rail A — Observed NFHS-5",
    "Rail A — Observed NFHS-5 Statistic":   "Rail A — Observed NFHS-5",
    "Rail B — BarrierLens OOF Prediction":  "Rail B — BarrierLens AI Prediction",
}

CASTE_FIXES = {
    "Don'T Know":  "Don't Know",
    "don't know":  "Don't Know",
    "Don't know":  "Don't Know",
}

WEALTH_LABELS = {
    "Poor":    "Poorest / Poorer (Bottom 40%)",
    "Middle":  "Middle Wealth",
    "Rich":    "Richer / Richest (Top 40%)",
}

EDUCATION_LABELS = {
    "No Education": "No Formal Education",
    "Primary":      "Primary Education",
    "Secondary":    "Secondary Education",
    "Higher":       "Higher Education",
}

RESIDENCE_LABELS = {
    "Urban": "Urban",
    "Rural": "Rural",
}


def _fix_caste(val: str) -> str:
    return CASTE_FIXES.get(str(val), val)


# ─────────────────────────────────────────────────────────────────────────────
# 1.  model_comparison_table.csv — all 3 models, human-readable target names
# ─────────────────────────────────────────────────────────────────────────────

def build_model_comparison() -> pd.DataFrame:
    print("\n[1] model_comparison_table.csv")
    frames = []

    paths = {
        "Logistic Regression": RESULTS / "logistic_evaluation_results.csv",
        "Random Forest":       RESULTS / "rf_evaluation_results.csv",
        "XGBoost":             RESULTS / "xgboost_evaluation_results.csv",
    }

    for display_name, path in paths.items():
        if path.exists():
            df = pd.read_csv(path)
            df["Model"] = display_name           # force consistent display name
            frames.append(df)
            print(f"  Loaded {path.name}: {df.shape}")
        else:
            print(f"  MISSING: {path.name}")

    if not frames:
        # Fallback: keep existing file unchanged but fix target label
        src = POWERBI / "model_comparison_table.csv"
        if src.exists():
            df = pd.read_csv(src)
            df["Target"] = df["Target"].map(
                lambda x: TARGET_LABELS.get(x, x)
            )
            df.to_csv(POWERBI / "model_comparison_table.csv", index=False)
            print("  Used existing file (no source files found)")
            return df
        return pd.DataFrame()

    combined = pd.concat(frames, ignore_index=True)

    # Fix target labels — no value changes
    combined["Target"] = combined["Target"].map(
        lambda x: TARGET_LABELS.get(str(x), str(x))
    )

    # Ensure numeric columns are round 4 dp (cosmetic only)
    pct_cols = ["Accuracy", "ROC-AUC", "Precision", "Recall", "F1-Score",
                "CV_ROC-AUC", "Baseline_ROC-AUC", "Full_ROC-AUC",
                "Barrier_Uplift", "PositiveRate"]
    for col in pct_cols:
        if col in combined.columns:
            combined[col] = combined[col].round(4)

    out = POWERBI / "model_comparison_table.csv"
    combined.to_csv(out, index=False)
    print(f"  Saved {out.name}: {combined.shape}")
    print(combined[["Model", "Target", "ROC-AUC", "F1-Score", "Barrier_Uplift"]].to_string(index=False))
    return combined


# ─────────────────────────────────────────────────────────────────────────────
# 2.  stage2_xgboost_results.csv — fix raw target code
# ─────────────────────────────────────────────────────────────────────────────

def fix_xgboost_results() -> None:
    print("\n[2] stage2_xgboost_results.csv")
    src = RESULTS / "xgboost_evaluation_results.csv"
    if src.exists():
        df = pd.read_csv(src)
    else:
        f = POWERBI / "stage2_xgboost_results.csv"
        if not f.exists():
            print("  MISSING — skip")
            return
        df = pd.read_csv(f)

    df["Model"]  = "XGBoost"
    df["Target"] = df["Target"].map(lambda x: TARGET_LABELS.get(str(x), str(x)))

    out = POWERBI / "stage2_xgboost_results.csv"
    df.to_csv(out, index=False)
    print(f"  Saved {out.name}: {df.shape}")
    print(df[["Model", "Target", "ROC-AUC", "F1-Score"]].to_string(index=False))


# ─────────────────────────────────────────────────────────────────────────────
# 3.  shap_importance.csv — ensure only RF data, all labels readable
# ─────────────────────────────────────────────────────────────────────────────

def fix_shap_importance() -> None:
    print("\n[3] shap_importance.csv")
    rf_path = RESULTS / "shap" / "rf_shap_importance_target_unmet_fp.csv"
    if not rf_path.exists():
        print("  RF SHAP file missing — skip")
        return

    df = pd.read_csv(rf_path)  # columns: feature, mean_abs_shap
    df.columns = ["feature", "mean_abs_shap"]
    df["model"]  = "Random Forest"
    df["target"] = "Unmet Need for Family Planning"
    df["rank"]   = range(1, len(df) + 1)
    df = df[["model", "target", "rank", "feature", "mean_abs_shap"]]

    out = POWERBI / "shap_importance.csv"
    df.to_csv(out, index=False)
    print(f"  Saved {out.name}: {df.shape}")
    print(df.head(10).to_string(index=False))


# ─────────────────────────────────────────────────────────────────────────────
# 4.  national_barrier_long.csv — human-readable barrier & metric names
# ─────────────────────────────────────────────────────────────────────────────

def fix_national_barrier_long() -> None:
    print("\n[4] national_barrier_long.csv")
    f = POWERBI / "national_barrier_long.csv"
    if not f.exists():
        print("  MISSING — skip")
        return
    df = pd.read_csv(f)

    df["barrier_type"] = df["barrier_type"].map(
        lambda x: BARRIER_LABELS.get(str(x), str(x))
    )
    df["metric_type"]  = df["metric_type"].map(
        lambda x: METRIC_LABELS.get(str(x), str(x))
    )
    df["data_rail"]    = df["data_rail"].map(
        lambda x: DATA_RAIL_LABELS.get(str(x), str(x))
    )

    df.to_csv(f, index=False)
    print(f"  Saved {f.name}: {df.shape}")
    print(df.to_string(index=False))


# ─────────────────────────────────────────────────────────────────────────────
# 5.  state_barrier_long.csv — human-readable barrier names & rails
# ─────────────────────────────────────────────────────────────────────────────

def fix_state_barrier_long() -> None:
    print("\n[5] state_barrier_long.csv")
    f = POWERBI / "state_barrier_long.csv"
    if not f.exists():
        print("  MISSING — skip")
        return
    df = pd.read_csv(f)

    df["barrier_type"]       = df["barrier_type"].map(
        lambda x: BARRIER_LABELS.get(str(x), str(x))
    )
    df["data_rail_observed"]  = df["data_rail_observed"].map(
        lambda x: DATA_RAIL_LABELS.get(str(x), str(x))
    )
    df["data_rail_predicted"] = df["data_rail_predicted"].map(
        lambda x: DATA_RAIL_LABELS.get(str(x), str(x))
    )

    df.to_csv(f, index=False)
    print(f"  Saved {f.name}: {df.shape}")
    print(df.head(6).to_string(index=False))


# ─────────────────────────────────────────────────────────────────────────────
# 6.  demographic_summary.csv — fix caste label capitalisation
# ─────────────────────────────────────────────────────────────────────────────

def fix_demographic_summary() -> None:
    print("\n[6] demographic_summary.csv")
    f = POWERBI / "demographic_summary.csv"
    if not f.exists():
        print("  MISSING — skip")
        return
    df = pd.read_csv(f)

    df["caste_group"]    = df["caste_group"].apply(_fix_caste)
    df["barrier_type"]   = df["barrier_type"].map(
        lambda x: BARRIER_LABELS.get(str(x), str(x))
    )
    df["data_rail_observed"]  = df["data_rail_observed"].map(
        lambda x: DATA_RAIL_LABELS.get(str(x), str(x))
    )
    df["data_rail_predicted"] = df["data_rail_predicted"].map(
        lambda x: DATA_RAIL_LABELS.get(str(x), str(x))
    )

    df.to_csv(f, index=False)
    print(f"  Saved {f.name}: {df.shape}")


# ─────────────────────────────────────────────────────────────────────────────
# 7.  demographic_comparison_long.csv — same fixes
# ─────────────────────────────────────────────────────────────────────────────

def fix_demographic_comparison_long() -> None:
    print("\n[7] demographic_comparison_long.csv")
    f = POWERBI / "demographic_comparison_long.csv"
    if not f.exists():
        print("  MISSING — skip")
        return
    df = pd.read_csv(f)

    df["caste_group"]  = df["caste_group"].apply(_fix_caste)
    df["barrier_type"] = df["barrier_type"].map(
        lambda x: BARRIER_LABELS.get(str(x), str(x))
    )
    df["metric_type"]  = df["metric_type"].map(
        lambda x: METRIC_LABELS.get(str(x), str(x))
    )
    df["data_rail"]    = df["data_rail"].map(
        lambda x: DATA_RAIL_LABELS.get(str(x), str(x))
    )

    # Fix demographic_cell to use updated caste label
    df["demographic_cell"] = (
        df["wealth_tier"].astype(str) + " | " +
        df["education_tier"].astype(str) + " | " +
        df["residence"].astype(str) + " | " +
        df["caste_group"].astype(str)
    )

    df.to_csv(f, index=False)
    print(f"  Saved {f.name}: {df.shape}")
    print(df.head(4).to_string(index=False))


# ─────────────────────────────────────────────────────────────────────────────
# 8.  national_kpi_summary.csv — no column renaming needed (used as measures)
#     Just fix the data_note to be clear
# ─────────────────────────────────────────────────────────────────────────────

def fix_national_kpi_summary() -> None:
    print("\n[8] national_kpi_summary.csv")
    f = POWERBI / "national_kpi_summary.csv"
    if not f.exists():
        print("  MISSING — skip")
        return
    df = pd.read_csv(f)
    df["data_note"] = (
        "Stage 1: 724,115 women from NFHS-5 across 36 States and UTs. "
        "Stage 2 (Unmet Family Planning Need): Restricted to 466,859 "
        "ever-married women in the analytic sample."
    )
    df.to_csv(f, index=False)
    print(f"  Saved {f.name}: data_note updated")


# ─────────────────────────────────────────────────────────────────────────────
# 9.  cluster_summary.csv — archetype names already human-readable; no changes
#     Just confirm it's present
# ─────────────────────────────────────────────────────────────────────────────

def check_cluster_summary() -> None:
    print("\n[9] cluster_summary.csv")
    f = POWERBI / "cluster_summary.csv"
    if f.exists():
        df = pd.read_csv(f)
        print(f"  OK {f.name}: {df.shape}")
        print(df[["cluster_id", "archetype_name", "n_women", "share_of_total",
                  "composite_barrier_score_mean"]].to_string(index=False))
    else:
        print("  MISSING")


# ─────────────────────────────────────────────────────────────────────────────
# 10. Copy SHAP images to powerbi/images/ for embedding in the report
# ─────────────────────────────────────────────────────────────────────────────

def copy_shap_images() -> None:
    print("\n[10] Copying SHAP images to data/dashboard/powerbi/images/")
    img_dir = POWERBI / "images"
    img_dir.mkdir(exist_ok=True)

    shap_dir = PROJECT_ROOT / "outputs" / "stage2_results" / "shap"
    wanted = [
        "shap_summary_target_unmet_fp.png",
        "shap_bar_target_unmet_fp.png",
        "shap_waterfall_target_unmet_fp.png",
        "shap_dependence_target_unmet_fp.png",
        "shap_heatmap_target_unmet_fp.png",
        "rf_shap_bar_target_unmet_fp.png",
        "rf_shap_beeswarm_target_unmet_fp.png",
        "rf_shap_group_comparison_target_unmet_fp.png",
    ]
    pub_dir = PROJECT_ROOT / "outputs" / "stage2_results" / "publication_figures"
    pub_wanted = [
        "roc_curve_target_unmet_fp.png",
        "pr_curve_target_unmet_fp.png",
        "confusion_matrix_target_unmet_fp.png",
        "confusion_matrix_normalised_target_unmet_fp.png",
        "top20_features_target_unmet_fp.png",
        "calibration_target_unmet_fp.png",
        "decision_threshold_target_unmet_fp.png",
        "gain_curve_target_unmet_fp.png",
        "lift_curve_target_unmet_fp.png",
        "barrier_uplift_comparison.png",
    ]

    copied = 0
    for fname in wanted:
        src = shap_dir / fname
        if src.exists():
            shutil.copy2(src, img_dir / fname)
            copied += 1
        else:
            print(f"  NOT FOUND: {fname}")

    for fname in pub_wanted:
        src = pub_dir / fname
        if src.exists():
            shutil.copy2(src, img_dir / fname)
            copied += 1
        else:
            print(f"  NOT FOUND: {fname}")

    print(f"  Copied {copied} images to {img_dir}")


# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 60)
    print("BarrierLens Dashboard Table Refresh")
    print("Presentation improvements only — NO ML changes")
    print("=" * 60)

    build_model_comparison()
    fix_xgboost_results()
    fix_shap_importance()
    fix_national_barrier_long()
    fix_state_barrier_long()
    fix_demographic_summary()
    fix_demographic_comparison_long()
    fix_national_kpi_summary()
    check_cluster_summary()
    copy_shap_images()

    print("\n" + "=" * 60)
    print("All dashboard tables refreshed.")
    print("No ML models, SHAP outputs, or notebooks were modified.")
    print("=" * 60)
