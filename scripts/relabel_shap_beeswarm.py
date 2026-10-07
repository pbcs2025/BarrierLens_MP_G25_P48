"""Generate high-quality relabeled SHAP Beeswarm plot for Unmet Family Planning Need.

Uses NFHS-5 column descriptions provided in the project document.
"""

import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import shap
import joblib

from src.evaluation.feature_labels import to_display_name

# Exact dictionary mapping matching PDF document specifications & feature_labels
FEATURE_MAP = {
    "v012": "Respondent's current age",
    "v013": "Age group (5-year groups)",
    "v106": "Highest educational level",
    "v130_hindu": "Religion: Hindu",
    "v130_christian": "Religion: Christian",
    "v130_muslim": "Religion: Muslim",
    "v131_tribe": "Caste/tribe: Scheduled tribe",
    "v501_married": "Current marital status: Married",
    "v501_widowed": "Current marital status: Widowed",
    "v501_never in union  includes: married gauna not performed": "Current marital status: Never married",
    "v501_no longer living together/separated": "Current marital status: Separated",
    "v717_not working": "Current occupation: Not working",
    "v190": "Wealth index quintile",
    "v169a": "Household has a mobile phone",
    "v170": "Household has a bank account",
    "v481_yes": "Covered by health insurance: Yes",
    "v157": "Frequency of reading newspapers/magazines",
    "v158": "Frequency of listening to radio",
    "v159": "Frequency of watching television",
    "v743f_respondent and husband/partner": "Health decision: Woman & partner",
    "v743f_respondent alone": "Health decision: Woman alone",
    "v743f_husband/partner has no earnings": "Health decision: Partner no earnings",
    "v743f_missing": "Health decision: Info missing",
    "v466": "Owns and uses internet",
    "v467b": "Used internet in last 12 months",
    "v467c": "Frequency of internet use",
    "v467d": "Uses internet almost every day",
    "v467e": "Uses internet at least once a week",
    "v467g": "Uses internet less than once a week",
    "v467h": "Never uses internet",
    "v626a": "Unmet need for family planning",
    "media_exposure_index": "Media exposure index",
    "digital_inclusion_index": "Digital inclusion index",
    "household_barrier_prob": "Household barrier probability",
    "composite_barrier_score": "Composite barrier score",
    "logistic_barrier_prob": "Logistic barrier probability",
    "facility_barrier_prob": "Facility barrier probability",
    "vulnerability_score": "Vulnerability score",
    "cluster_0": "Cluster 0 (High vulnerability)",
    "cluster_1": "Cluster 1 (High inclusion)"
}

def clean_feature_label(name: str) -> str:
    if name in FEATURE_MAP:
        return FEATURE_MAP[name]
    return to_display_name(name)

def main():
    print("Generating SHAP Beeswarm Plot for Unmet Family Planning Need...")

    model_path = PROJECT_ROOT / "saved_models" / "stage2" / "stage2_xgboost_target_unmet_fp.pkl"
    if not model_path.exists():
        model_path = PROJECT_ROOT / "saved_models" / "stage2" / "stage2_random_forest_target_unmet_fp.pkl"
    
    if not model_path.exists():
        print(f"Model not found at {model_path}")
        return

    print(f"Loading model from {model_path}...")
    model = joblib.load(model_path)
    feature_names = getattr(model, "feature_names_in_", None)

    data_path = PROJECT_ROOT / "data" / "processed" / "X_features.csv"
    if not data_path.exists():
        print(f"Data file not found at {data_path}")
        return

    df_raw = pd.read_csv(data_path)
    sample_size = min(2000, len(df_raw))
    df_sample = df_raw.sample(n=sample_size, random_state=42).reset_index(drop=True)

    # Ensure all model columns are present
    if feature_names is not None:
        X_eval = pd.DataFrame(index=df_sample.index)
        for col in feature_names:
            if col in df_sample.columns:
                X_eval[col] = df_sample[col]
            else:
                X_eval[col] = 0.0
    else:
        X_eval = df_sample

    explainer = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(X_eval)

    if isinstance(shap_values, list):
        shap_vals = np.array(shap_values[1])
    else:
        shap_vals = np.array(shap_values)
    
    if shap_vals.ndim == 3:
        shap_vals = shap_vals[:, :, 1]

    # Relabel columns with exact readable names
    df_relabeled = X_eval.copy()
    df_relabeled.columns = [clean_feature_label(c) for c in df_relabeled.columns]

    # Plot
    plt.style.use("seaborn-v0_8-whitegrid")
    fig = plt.figure(figsize=(10, 8), dpi=300)
    
    shap.summary_plot(
        shap_vals,
        df_relabeled,
        max_display=20,
        show=False,
        plot_size=(10, 8)
    )
    
    plt.title("SHAP Beeswarm — Unmet Family Planning Need", fontsize=13, fontweight="bold", pad=15)
    plt.xlabel("SHAP value (impact on model output)", fontsize=11, fontweight="semibold")
    plt.tight_layout()

    # Save to assets & plots directories
    destinations = [
        PROJECT_ROOT / "dashboard" / "assets" / "images" / "xgb_shap_beeswarm_target_unmet_fp.png",
        PROJECT_ROOT / "dashboard" / "assets" / "images" / "shap_summary_target_unmet_fp.png",
        PROJECT_ROOT / "plots" / "xgb_shap_beeswarm_target_unmet_fp.png"
    ]

    for dest in destinations:
        dest.parent.mkdir(parents=True, exist_ok=True)
        plt.savefig(dest, dpi=300, bbox_inches="tight")
        print(f"Saved SHAP plot to {dest}")

    plt.close()
    print("SUCCESS: Relabeled SHAP beeswarm plot generated and saved!")

if __name__ == "__main__":
    main()
