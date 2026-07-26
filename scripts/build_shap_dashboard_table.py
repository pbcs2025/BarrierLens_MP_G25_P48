"""Build SHAP importance dashboard table and refresh model_comparison_table."""
from __future__ import annotations
import shutil
from pathlib import Path
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parents[1]
POWERBI = PROJECT_ROOT / "data" / "dashboard" / "powerbi"
POWERBI.mkdir(parents=True, exist_ok=True)
RESULTS = PROJECT_ROOT / "outputs" / "stage2_results"


def build_shap_importance() -> None:
    """Combine RF and XGBoost SHAP importances into one dashboard table."""
    frames = []

    rf_path = RESULTS / "shap" / "rf_shap_importance_target_unmet_fp.csv"
    if rf_path.exists():
        df = pd.read_csv(rf_path)
        df.columns = ["feature", "mean_abs_shap"]
        df["model"] = "Random Forest"
        frames.append(df)

    xgb_path = RESULTS / "shap" / "xgb_shap_importance_target_unmet_fp.csv"
    if not xgb_path.exists():
        # Try alternate name
        xgb_path = RESULTS / "shap" / "shap_importance_target_unmet_fp.csv"
    if xgb_path.exists():
        df = pd.read_csv(xgb_path)
        if "feature" in df.columns and "mean_abs_shap" in df.columns:
            df["model"] = "XGBoost"
            frames.append(df)

    if not frames:
        print("No SHAP importance files found.")
        return

    combined = pd.concat(frames, ignore_index=True)
    combined["target"] = "Unmet Family Planning Need"
    combined["rank"] = combined.groupby("model")["mean_abs_shap"].rank(
        method="min", ascending=False
    ).astype(int)
    combined = combined[["model", "target", "rank", "feature", "mean_abs_shap"]]
    combined = combined.sort_values(["model", "rank"])
    out = POWERBI / "shap_importance.csv"
    combined.to_csv(out, index=False)
    print(f"shap_importance.csv -> {out} ({combined.shape})")
    print(combined.head(10).to_string(index=False))


def build_model_comparison() -> None:
    """Refresh model_comparison_table with all three Stage 2 models."""
    frames = []
    model_map = {
        "logistic_evaluation_results.csv": "Logistic Regression",
        "rf_evaluation_results.csv":       "Random Forest",
        "xgboost_evaluation_results.csv":  "XGBoost",
    }
    for fname, model_name in model_map.items():
        p = RESULTS / fname
        if p.exists():
            df = pd.read_csv(p)
            df["Model"] = model_name
            frames.append(df)
            print(f"  Loaded {fname}: {df.shape}")

    if not frames:
        print("No evaluation result files found — keeping existing model_comparison_table.")
        return

    combined = pd.concat(frames, ignore_index=True)
    # Human-readable target names
    combined["Target"] = (
        combined["Target"]
        .str.replace("target_unmet_fp", "Unmet FP Need", regex=False)
        .str.replace("target_anc_gap",  "ANC Gap",      regex=False)
    )
    out = POWERBI / "model_comparison_table.csv"
    combined.to_csv(out, index=False)
    print(f"\nmodel_comparison_table.csv -> {out} ({combined.shape})")
    cols_show = ["Model", "Target", "ROC-AUC", "F1-Score", "CV_ROC-AUC", "Barrier_Uplift"]
    show_cols = [c for c in cols_show if c in combined.columns]
    print(combined[show_cols].to_string(index=False))


if __name__ == "__main__":
    print("=== SHAP Importance Table ===")
    build_shap_importance()
    print("\n=== Model Comparison Table ===")
    build_model_comparison()
    print("\nDone.")
