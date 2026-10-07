"""Generate high-quality relabeled SHAP plots for Stage 1 (RF) and Stage 2 (XGBoost/RF).

Uses NFHS-5 column descriptions provided in the project document.
Applies clean human-readable labels to bar charts, summary beeswarms, waterfalls, dependence, heatmaps, and group comparisons.
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

# Master feature label dictionary based on NFHS column documentation
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

def save_to_targets(fig, filenames):
    for fn in filenames:
        p1 = PROJECT_ROOT / "dashboard" / "assets" / "images" / fn
        p2 = PROJECT_ROOT / "plots" / fn
        p1.parent.mkdir(parents=True, exist_ok=True)
        p2.parent.mkdir(parents=True, exist_ok=True)
        fig.savefig(p1, dpi=300, bbox_inches="tight")
        fig.savefig(p2, dpi=300, bbox_inches="tight")
        print(f"Saved: {p1.name}")

def generate_stage1_rf_plots():
    print("\n--- Generating Stage 1 RF Relabeled Plots ---")
    data_path = PROJECT_ROOT / "data" / "processed" / "X_features.csv"
    if not data_path.exists():
        print("X_features.csv missing!")
        return

    df_raw = pd.read_csv(data_path)
    sample_size = min(1500, len(df_raw))
    df_sample = df_raw.sample(n=sample_size, random_state=42).reset_index(drop=True)

    targets = [
        ("household", "random_forest_household.pkl", "Household Barrier"),
        ("logistic", "random_forest_logistic.pkl", "Logistic Barrier"),
        ("facility", "random_forest_facility.pkl", "Facility Barrier")
    ]

    plt.style.use("seaborn-v0_8-whitegrid")

    for target_key, model_file, display_title in targets:
        model_path = PROJECT_ROOT / "saved_models" / "stage1" / model_file
        if not model_path.exists():
            print(f"Skipping {model_file} (not found)")
            continue

        model = joblib.load(model_path)
        feature_names = getattr(model, "feature_names_in_", None)

        if feature_names is not None:
            X_eval = pd.DataFrame(index=df_sample.index)
            for col in feature_names:
                X_eval[col] = df_sample[col] if col in df_sample.columns else 0.0
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

        X_relabeled = X_eval.copy()
        X_relabeled.columns = [clean_feature_label(c) for c in X_relabeled.columns]

        # 1. Bar Plot (Top 15)
        importance = np.abs(shap_vals).mean(axis=0)
        top_idx = np.argsort(importance)[-15:]

        fig, ax = plt.subplots(figsize=(9, 6), dpi=300)
        bars = ax.barh([X_relabeled.columns[i] for i in top_idx], importance[top_idx], color="#1e3a8a")
        ax.set_title(f"SHAP Feature Importance — {display_title} (Stage 1 RF)", fontsize=12, fontweight="bold", pad=12)
        ax.set_xlabel("Mean |SHAP value|", fontsize=10, fontweight="semibold")
        plt.tight_layout()
        save_to_targets(fig, [f"rf_bar_{target_key}.png"])
        plt.close(fig)

        # 2. Beeswarm Plot
        fig = plt.figure(figsize=(10, 7), dpi=300)
        shap.summary_plot(shap_vals, X_relabeled, max_display=15, show=False, plot_size=(10, 7))
        plt.title(f"SHAP Beeswarm — {display_title} (Stage 1 RF)", fontsize=12, fontweight="bold", pad=12)
        plt.xlabel("SHAP value (impact on model output)", fontsize=10, fontweight="semibold")
        plt.tight_layout()
        save_to_targets(fig, [f"rf_summary_{target_key}.png"])
        plt.close(fig)

def generate_stage2_xgb_plots():
    print("\n--- Generating Stage 2 XGBoost Relabeled Plots ---")
    data_path = PROJECT_ROOT / "data" / "processed" / "X_features.csv"
    model_path = PROJECT_ROOT / "saved_models" / "stage2" / "stage2_xgboost_target_unmet_fp.pkl"

    if not model_path.exists() or not data_path.exists():
        print("Stage 2 model or X_features missing!")
        return

    model = joblib.load(model_path)
    feature_names = getattr(model, "feature_names_in_", None)

    df_raw = pd.read_csv(data_path)
    sample_size = min(2000, len(df_raw))
    df_sample = df_raw.sample(n=sample_size, random_state=42).reset_index(drop=True)

    if feature_names is not None:
        X_eval = pd.DataFrame(index=df_sample.index)
        for col in feature_names:
            X_eval[col] = df_sample[col] if col in df_sample.columns else 0.0
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

    X_relabeled = X_eval.copy()
    X_relabeled.columns = [clean_feature_label(c) for c in X_relabeled.columns]

    # 1. XGBoost SHAP Bar Plot (Top 20)
    importance = np.abs(shap_vals).mean(axis=0)
    top_idx = np.argsort(importance)[-20:]

    fig, ax = plt.subplots(figsize=(10, 8), dpi=300)
    ax.barh([X_relabeled.columns[i] for i in top_idx], importance[top_idx], color="#1d3557")
    ax.set_title("SHAP Feature Importance — XGBoost | Unmet Family Planning Need", fontsize=13, fontweight="bold", pad=15)
    ax.set_xlabel("Mean |SHAP value|", fontsize=11, fontweight="semibold")
    plt.tight_layout()
    save_to_targets(fig, ["xgb_shap_bar_target_unmet_fp.png", "shap_bar_target_unmet_fp.png"])
    plt.close(fig)

    # 2. XGBoost SHAP Beeswarm Plot
    fig = plt.figure(figsize=(10, 8), dpi=300)
    shap.summary_plot(shap_vals, X_relabeled, max_display=20, show=False, plot_size=(10, 8))
    plt.title("SHAP Beeswarm — Unmet Family Planning Need", fontsize=13, fontweight="bold", pad=15)
    plt.xlabel("SHAP value (impact on model output)", fontsize=11, fontweight="semibold")
    plt.tight_layout()
    save_to_targets(fig, ["xgb_shap_beeswarm_target_unmet_fp.png", "shap_summary_target_unmet_fp.png"])
    plt.close(fig)

    # 3. Waterfall Plot
    if len(X_relabeled) > 0:
        idx_max = np.argmax(np.abs(shap_vals).sum(axis=1))
        expected_val = explainer.expected_value[1] if isinstance(explainer.expected_value, (list, np.ndarray)) else explainer.expected_value
        exp = shap.Explanation(
            values=shap_vals[idx_max],
            base_values=expected_val,
            data=X_relabeled.iloc[idx_max].values,
            feature_names=X_relabeled.columns.tolist()
        )
        fig = plt.figure(figsize=(9, 6), dpi=300)
        shap.plots.waterfall(exp, max_display=10, show=False)
        plt.title("SHAP Waterfall — Highest Risk Individual (Unmet FP)", fontsize=12, fontweight="bold", pad=12)
        plt.tight_layout()
        save_to_targets(fig, ["shap_waterfall_target_unmet_fp.png"])
        plt.close(fig)

    # 4. Dependence Plot for Top Feature
    top_feat_idx = np.argmax(importance)
    top_feat_name = X_relabeled.columns[top_feat_idx]
    fig, ax = plt.subplots(figsize=(8, 5), dpi=300)
    shap.dependence_plot(top_feat_idx, shap_vals, X_relabeled, show=False, ax=ax)
    ax.set_title(f"SHAP Dependence Plot — {top_feat_name}", fontsize=12, fontweight="bold", pad=12)
    plt.tight_layout()
    save_to_targets(fig, ["shap_dependence_target_unmet_fp.png"])
    plt.close(fig)

    # 5. Group Comparison Bar Plot
    barrier_mask = [c in ["Household barrier probability", "Logistic barrier probability", "Facility barrier probability", "Composite barrier score"] for c in X_relabeled.columns]
    cluster_mask = [c.startswith("Cluster") for c in X_relabeled.columns]
    socio_mask = [not b and not c for b, c in zip(barrier_mask, cluster_mask)]

    barrier_sum = importance[barrier_mask].sum()
    cluster_sum = importance[cluster_mask].sum()
    socio_sum = importance[socio_mask].sum()

    fig, ax = plt.subplots(figsize=(7, 5), dpi=300)
    bars = ax.bar(["Stage 1 Barrier Probs", "Cluster Features", "Socioeconomic / Demographics"], [barrier_sum, cluster_sum, socio_sum], color=["#e63946", "#457b9d", "#2a9d8f"])
    ax.set_ylabel("Sum of mean |SHAP value|", fontsize=10, fontweight="semibold")
    ax.set_title("SHAP Contribution by Feature Group — Unmet FP Need", fontsize=12, fontweight="bold", pad=12)
    plt.tight_layout()
    save_to_targets(fig, ["xgb_shap_group_comparison_target_unmet_fp.png"])
    plt.close(fig)

    # 6. Heatmap Plot
    if len(X_relabeled) >= 100:
        exp_sample = shap.Explanation(
            values=shap_vals[:200],
            base_values=np.full(200, float(expected_val)),
            data=X_relabeled.iloc[:200].values,
            feature_names=X_relabeled.columns.tolist()
        )
        fig = plt.figure(figsize=(10, 6), dpi=300)
        shap.plots.heatmap(exp_sample, max_display=12, show=False)
        plt.title("SHAP Population Cohort Heatmap — Unmet FP Need", fontsize=12, fontweight="bold", pad=12)
        plt.tight_layout()
        save_to_targets(fig, ["shap_heatmap_target_unmet_fp.png"])
        plt.close(fig)

def main():
    print("====================================================================")
    print("  RELABELING ALL SHAP PLOTS WITH NFHS DOCUMENT SPECIFICATIONS        ")
    print("====================================================================")
    generate_stage1_rf_plots()
    generate_stage2_xgb_plots()
    print("\nSUCCESS: All SHAP graphs relabeled and regenerated!")

if __name__ == "__main__":
    main()
