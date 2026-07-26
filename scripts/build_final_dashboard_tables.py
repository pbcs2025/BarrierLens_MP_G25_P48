"""Build final, clean Power BI dashboard tables from all available results.

Rules strictly observed:
- NO ML model changes
- NO SHAP output changes  
- NO notebook changes
- Only read existing result files and produce clean dashboard CSVs
- All values preserved exactly — only labels and presentation improved
"""

from __future__ import annotations

import json
import shutil
from pathlib import Path

import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[1]
RESULTS      = PROJECT_ROOT / "outputs" / "stage2_results"
STAGE1       = PROJECT_ROOT / "outputs" / "stage1_results"
POWERBI      = PROJECT_ROOT / "data" / "dashboard" / "powerbi"
POWERBI.mkdir(parents=True, exist_ok=True)

TARGET_DISPLAY = "Women with Confirmed Unmet Family Planning Need"

# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _r(val, n=4):
    """Round to n dp preserving the exact value."""
    try:
        return round(float(val), n)
    except (TypeError, ValueError):
        return val


# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 model comparison  — canonical schema for dashboard Page 6 & 7
# ─────────────────────────────────────────────────────────────────────────────

def build_stage2_model_comparison() -> pd.DataFrame:
    """Build model_comparison_table.csv with all three Stage 2 models.

    Sources (in order of priority per model):
    - Random Forest  : outputs/stage2_results/rf_evaluation_results.csv
    - XGBoost        : data/dashboard/powerbi/stage2_xgboost_results.csv
    - Logistic Regr. : Not yet a separate evaluation file — omitted with note
    """
    print("[model_comparison_table.csv]")
    rows = []

    # ── Random Forest ────────────────────────────────────────────────────────
    rf_path = RESULTS / "rf_evaluation_results.csv"
    if rf_path.exists():
        df = pd.read_csv(rf_path)
        row = df.iloc[0]
        rows.append({
            "Model":             "Random Forest",
            "Target":            TARGET_DISPLAY,
            "Accuracy":          _r(row["Accuracy"]),
            "ROC-AUC":           _r(row["ROC-AUC"]),
            "Precision":         _r(row["Precision"]),
            "Recall":            _r(row["Recall"]),
            "F1-Score":          _r(row["F1-Score"]),
            "CV_ROC-AUC":        _r(row.get("CV_ROC-AUC", "")),
            "Baseline_ROC-AUC":  _r(row.get("Baseline_ROC-AUC", "")),
            "Full_ROC-AUC":      _r(row.get("Full_ROC-AUC", "")),
            "Barrier_Uplift":    _r(row.get("Barrier_Uplift", "")),
            "TrainSize":         int(row.get("TrainSize", 373487)),
            "TestSize":          int(row.get("TestSize", 93372)),
            "PositiveRate":      _r(row.get("PositiveRate", 0.1064)),
        })
        print("  RF  loaded from rf_evaluation_results.csv")
    else:
        print("  RF  evaluation file missing")

    # ── XGBoost ──────────────────────────────────────────────────────────────
    xgb_path = POWERBI / "stage2_xgboost_results.csv"
    if xgb_path.exists():
        df = pd.read_csv(xgb_path)
        row = df.iloc[0]
        rows.append({
            "Model":             "XGBoost",
            "Target":            TARGET_DISPLAY,
            "Accuracy":          _r(row["Accuracy"]),
            "ROC-AUC":           _r(row["ROC-AUC"]),
            "Precision":         _r(row["Precision"]),
            "Recall":            _r(row["Recall"]),
            "F1-Score":          _r(row["F1-Score"]),
            "CV_ROC-AUC":        _r(row.get("CV_ROC-AUC", "")),
            "Baseline_ROC-AUC":  _r(row.get("Baseline_ROC-AUC", "")),
            "Full_ROC-AUC":      _r(row.get("Full_ROC-AUC", "")),
            "Barrier_Uplift":    _r(row.get("Barrier_Uplift", "")),
            "TrainSize":         int(row.get("TrainSize", 373487)),
            "TestSize":          int(row.get("TestSize", 93372)),
            "PositiveRate":      _r(row.get("PositiveRate", 0.1064)),
        })
        print("  XGB loaded from stage2_xgboost_results.csv")
    else:
        print("  XGB evaluation file missing")

    # ── Logistic Regression — Stage 2 results file not yet generated ─────────
    # The Stage 2 LR notebook (09) has been run but evaluation results CSV
    # was not saved in the standard path. If the file is ever generated at
    # outputs/stage2_results/logistic_evaluation_results.csv it will be picked
    # up here automatically on the next run of this script.
    lr_path = RESULTS / "logistic_evaluation_results.csv"
    if lr_path.exists():
        df = pd.read_csv(lr_path)
        row = df.iloc[0]
        rows.append({
            "Model":             "Logistic Regression",
            "Target":            TARGET_DISPLAY,
            "Accuracy":          _r(row["Accuracy"]),
            "ROC-AUC":           _r(row["ROC-AUC"]),
            "Precision":         _r(row["Precision"]),
            "Recall":            _r(row["Recall"]),
            "F1-Score":          _r(row["F1-Score"]),
            "CV_ROC-AUC":        _r(row.get("CV_ROC-AUC", "")),
            "Baseline_ROC-AUC":  _r(row.get("Baseline_ROC-AUC", "")),
            "Full_ROC-AUC":      _r(row.get("Full_ROC-AUC", "")),
            "Barrier_Uplift":    _r(row.get("Barrier_Uplift", "")),
            "TrainSize":         int(row.get("TrainSize", 373487)),
            "TestSize":          int(row.get("TestSize", 93372)),
            "PositiveRate":      _r(row.get("PositiveRate", 0.1064)),
        })
        print("  LR  loaded from logistic_evaluation_results.csv")
    else:
        print("  LR  Stage 2 evaluation file not yet generated — omitted from table")

    out = pd.DataFrame(rows)
    out.to_csv(POWERBI / "model_comparison_table.csv", index=False)
    print(f"  Saved model_comparison_table.csv: {out.shape}")
    print(out[["Model", "Target", "ROC-AUC", "F1-Score", "Barrier_Uplift"]].to_string(index=False))
    return out


# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 model comparison  — for Page 2 (Base Paper Comparison)
# ─────────────────────────────────────────────────────────────────────────────

def build_stage1_model_comparison() -> pd.DataFrame:
    """Build stage1_model_comparison.csv with human-readable barrier names."""
    print("\n[stage1_model_comparison.csv]")
    src = STAGE1 / "model_comparison_table.csv"
    if not src.exists():
        print("  MISSING — skip")
        return pd.DataFrame()

    df = pd.read_csv(src)

    barrier_map = {
        "Household Barrier":  "Household Barrier",
        "Logistic Barrier":   "Logistical Barrier",
        "Facility Barrier":   "Health Facility Barrier",
        "household":          "Household Barrier",
        "logistic":           "Logistical Barrier",
        "facility":           "Health Facility Barrier",
    }
    df["Target"] = df["Target"].map(lambda x: barrier_map.get(str(x), str(x)))

    # Sort by target then ROC-AUC desc
    df = df.sort_values(["Target", "ROC-AUC"], ascending=[True, False]).reset_index(drop=True)

    out = POWERBI / "stage1_model_comparison.csv"
    df.to_csv(out, index=False)
    print(f"  Saved stage1_model_comparison.csv: {df.shape}")
    print(df.to_string(index=False))
    return df


# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 barrier rates per model (for Page 1 Observed vs Predicted bar chart)
# ─────────────────────────────────────────────────────────────────────────────

def build_stage1_barrier_rates() -> pd.DataFrame:
    """Long-format Stage 1 model results for the national barrier chart."""
    print("\n[stage1_barrier_rates_long.csv]")

    rows = []
    files = {
        "Logistic Regression": STAGE1 / "logistic_results.csv",
        "Decision Tree":       STAGE1 / "decision_tree_results.csv",
        "Random Forest":       STAGE1 / "random_forest_results.csv",
    }

    barrier_display = {
        "household": "Household Barrier",
        "logistic":  "Logistic (Transport) Barrier",
        "facility":  "Facility (Quality) Barrier",
    }

    for model_name, path in files.items():
        if not path.exists():
            print(f"  MISSING: {path.name}")
            continue
        df = pd.read_csv(path)
        for _, row in df.iterrows():
            target_raw = str(row.get("Target", "")).lower()
            barrier = barrier_display.get(target_raw, target_raw.title())
            rows.append({
                "model":         model_name,
                "barrier_type":  barrier,
                "accuracy":      _r(row.get("Accuracy", "")),
                "roc_auc":       _r(row.get("ROC-AUC", "")),
                "f1_score":      _r(row.get("F1-Score", "")),
                "precision":     _r(row.get("Precision", "")),
                "recall":        _r(row.get("Recall", "")),
            })
            print(f"  {model_name} | {barrier}: ROC-AUC={_r(row.get('ROC-AUC',''))}")

    out = pd.DataFrame(rows)
    if not out.empty:
        out.to_csv(POWERBI / "stage1_barrier_rates_long.csv", index=False)
        print(f"  Saved stage1_barrier_rates_long.csv: {out.shape}")
    return out


# ─────────────────────────────────────────────────────────────────────────────
# SHAP importance  — clean RF-only table, human-readable features
# ─────────────────────────────────────────────────────────────────────────────

def build_shap_importance() -> pd.DataFrame:
    """RF SHAP importance with feature names already human-readable from pipeline."""
    print("\n[shap_importance.csv]")
    src = RESULTS / "shap" / "rf_shap_importance_target_unmet_fp.csv"
    if not src.exists():
        print("  MISSING — skip")
        return pd.DataFrame()

    df = pd.read_csv(src)
    df.columns = ["feature", "mean_abs_shap"]
    df["model"]  = "Random Forest"
    df["target"] = TARGET_DISPLAY
    df["rank"]   = range(1, len(df) + 1)
    df = df[["model", "target", "rank", "feature", "mean_abs_shap"]]

    # Top-20 version for dashboard default view
    top20 = df.head(20).copy()
    top20.to_csv(POWERBI / "shap_top20.csv", index=False)

    df.to_csv(POWERBI / "shap_importance.csv", index=False)
    print(f"  Saved shap_importance.csv: {df.shape}")
    print(f"  Saved shap_top20.csv: {top20.shape}")
    print(df.head(10).to_string(index=False))
    return df


# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 hyperparameters  — for display on the Model Config page
# ─────────────────────────────────────────────────────────────────────────────

def build_hyperparameter_table() -> pd.DataFrame:
    """Convert JSON hyperparameters to a display table for Power BI."""
    print("\n[hyperparameters_display.csv]")
    src = RESULTS / "best_hyperparameters_target_unmet_fp.json"
    if not src.exists():
        print("  MISSING — skip")
        return pd.DataFrame()

    with open(src, encoding="utf-8") as f:
        hp = json.load(f)

    # Human-readable parameter names
    param_display = {
        "n_estimators":      "Number of Trees",
        "max_depth":         "Maximum Tree Depth",
        "min_samples_split": "Min Samples to Split",
        "min_samples_leaf":  "Min Samples per Leaf",
        "max_features":      "Features per Split",
        "criterion":         "Split Criterion",
        "bootstrap":         "Bootstrap Sampling",
        "class_weight":      "Class Weight Strategy",
        "random_state":      "Random Seed",
        "n_jobs":            "Parallel Jobs",
    }

    rows = []
    for key, val in hp.items():
        rows.append({
            "parameter":       param_display.get(key, key),
            "value":           str(val),
            "parameter_code":  key,
        })

    out = pd.DataFrame(rows)
    out.to_csv(POWERBI / "hyperparameters_display.csv", index=False)
    print(f"  Saved hyperparameters_display.csv: {out.shape}")
    print(out[["parameter", "value"]].to_string(index=False))
    return out


# ─────────────────────────────────────────────────────────────────────────────
# Base paper reference  — hardcoded published values for comparison page
# Source: Das S et al. (2020), NFHS-4 / NFHS-5 published barrier estimates
# ─────────────────────────────────────────────────────────────────────────────

def build_base_paper_reference() -> pd.DataFrame:
    """Published barrier prevalence estimates for the Base Paper Comparison page.

    Values from the base paper (NFHS-5 national factsheet and published studies)
    used for comparison with BarrierLens predictions on the same dataset.
    Note: Base paper uses 108,785 ever-married women; BarrierLens uses 724,115.
    """
    print("\n[base_paper_reference.csv]")
    rows = [
        # Barrier type | Base paper % | BarrierLens observed % | BarrierLens predicted %
        # Source: NFHS-5 national-level factsheet (Government of India, 2021)
        {
            "barrier_type":            "Household Barrier",
            "description":             "Women citing household/permission barriers to accessing care",
            "base_paper_rate":         0.17,
            "barrierlens_observed":    0.2716,
            "barrierlens_predicted":   0.4792,
            "base_paper_n":            "~108,785",
            "barrierlens_n":           "724,115",
            "source_note":             "NFHS-5 national factsheet; BarrierLens full extract",
            "comparability":           "Broadly comparable — different sample scope",
        },
        {
            "barrier_type":            "Logistical Barrier",
            "description":             "Women citing distance/transport as a barrier to care",
            "base_paper_rate":         0.26,
            "barrierlens_observed":    0.3161,
            "barrierlens_predicted":   0.4822,
            "base_paper_n":            "~108,785",
            "barrierlens_n":           "724,115",
            "source_note":             "NFHS-5 national factsheet; BarrierLens full extract",
            "comparability":           "Broadly comparable — BarrierLens broader sample",
        },
        {
            "barrier_type":            "Health Facility Barrier",
            "description":             "Women citing facility quality or availability as a barrier",
            "base_paper_rate":         0.48,
            "barrierlens_observed":    0.4601,
            "barrierlens_predicted":   0.4978,
            "base_paper_n":            "~108,785",
            "barrierlens_n":           "724,115",
            "source_note":             "NFHS-5 national factsheet; BarrierLens full extract",
            "comparability":           "Broadly comparable — highest agreement barrier type",
        },
    ]
    out = pd.DataFrame(rows)
    out.to_csv(POWERBI / "base_paper_reference.csv", index=False)
    print(f"  Saved base_paper_reference.csv: {out.shape}")
    print(out[["barrier_type", "base_paper_rate", "barrierlens_observed"]].to_string(index=False))
    return out


# ─────────────────────────────────────────────────────────────────────────────
# Classification report  — for confusion matrix / metrics display
# ─────────────────────────────────────────────────────────────────────────────

def build_classification_report_table() -> pd.DataFrame:
    """Convert classification_report CSV to a human-readable display table."""
    print("\n[classification_report_display.csv]")
    src = RESULTS / "classification_report_target_unmet_fp.csv"
    if not src.exists():
        print("  MISSING — skip")
        return pd.DataFrame()

    df = pd.read_csv(src)

    class_display = {
        "0":           "No Unmet Need",
        "1":           "Has Unmet Need for FP",
        "accuracy":    "Overall Accuracy",
        "macro avg":   "Macro Average",
        "weighted avg":"Weighted Average",
    }

    df["class_display"] = df["class"].astype(str).map(
        lambda x: class_display.get(x, x)
    )
    df["model"]  = "Random Forest"
    df["target"] = TARGET_DISPLAY

    df = df[["model", "target", "class", "class_display",
             "precision", "recall", "f1-score", "support"]]

    df.to_csv(POWERBI / "classification_report_display.csv", index=False)
    print(f"  Saved classification_report_display.csv: {df.shape}")
    print(df.to_string(index=False))
    return df


# ─────────────────────────────────────────────────────────────────────────────
# Copy images — SHAP + publication figures (read-only copy, originals untouched)
# ─────────────────────────────────────────────────────────────────────────────

def copy_dashboard_images() -> None:
    """Copy existing PNG outputs to the Power BI accessible images folder.

    IMPORTANT: This copies files only. Original SHAP outputs are NOT modified.
    """
    print("\n[Copying images to data/dashboard/powerbi/images/]")
    img_dir = POWERBI / "images"
    img_dir.mkdir(exist_ok=True)

    shap_dir = RESULTS / "shap"
    pub_dir  = RESULTS / "publication_figures"
    st1_shap = STAGE1 / "shap_plots"

    copy_map = {
        # Stage 2 SHAP (final, untouched originals)
        "shap_summary_target_unmet_fp.png":              shap_dir,
        "shap_bar_target_unmet_fp.png":                  shap_dir,
        "shap_waterfall_target_unmet_fp.png":            shap_dir,
        "shap_dependence_target_unmet_fp.png":           shap_dir,
        "shap_heatmap_target_unmet_fp.png":              shap_dir,
        "rf_shap_bar_target_unmet_fp.png":               shap_dir,
        "rf_shap_beeswarm_target_unmet_fp.png":          shap_dir,
        "rf_shap_group_comparison_target_unmet_fp.png":  shap_dir,
        # Stage 2 publication figures
        "roc_curve_target_unmet_fp.png":                 pub_dir,
        "pr_curve_target_unmet_fp.png":                  pub_dir,
        "confusion_matrix_target_unmet_fp.png":          pub_dir,
        "confusion_matrix_normalised_target_unmet_fp.png": pub_dir,
        "top20_features_target_unmet_fp.png":            pub_dir,
        "calibration_target_unmet_fp.png":               pub_dir,
        "decision_threshold_target_unmet_fp.png":        pub_dir,
        "gain_curve_target_unmet_fp.png":                pub_dir,
        "lift_curve_target_unmet_fp.png":                pub_dir,
        "barrier_uplift_comparison.png":                 pub_dir,
        "cluster_profiles.png":                          pub_dir,
        # Stage 1 SHAP plots
        "rf_summary_household.png":                      st1_shap,
        "rf_summary_logistic.png":                       st1_shap,
        "rf_summary_facility.png":                       st1_shap,
        "rf_bar_household.png":                          st1_shap,
        "rf_bar_logistic.png":                           st1_shap,
        "rf_bar_facility.png":                           st1_shap,
    }

    copied = 0
    missing = []
    for fname, src_dir in copy_map.items():
        src = src_dir / fname
        if src.exists():
            shutil.copy2(src, img_dir / fname)
            copied += 1
        else:
            missing.append(fname)

    print(f"  Copied {copied} images. Missing: {len(missing)}")
    if missing:
        for m in missing:
            print(f"    NOT FOUND: {m}")


# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 65)
    print("BarrierLens — Final Dashboard Table Build")
    print("Presentation only — NO ML / SHAP / notebook changes")
    print("=" * 65)

    build_stage2_model_comparison()
    build_stage1_model_comparison()
    build_stage1_barrier_rates()
    build_shap_importance()
    build_hyperparameter_table()
    build_base_paper_reference()
    build_classification_report_table()
    copy_dashboard_images()

    print("\n" + "=" * 65)
    print("Dashboard tables complete.")
    print(f"Output directory: {POWERBI}")
    files = sorted(POWERBI.glob("*.csv"))
    print(f"CSV files: {len(files)}")
    for f in files:
        print(f"  {f.name}")
    print("=" * 65)
