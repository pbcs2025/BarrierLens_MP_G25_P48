"""SHAP explainability for Stage-1 Random Forest models (all three targets)."""

from __future__ import annotations

from pathlib import Path
import sys

import joblib
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import shap

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.evaluation.feature_labels import TARGET_DISPLAY, to_display_name
from src.preprocessing.split_scale import split_and_scale

TARGET_KEYS = ("household", "logistic", "facility")
MAX_SHAP_SAMPLES = 1200
TOP_FEATURES = 10  # keep plots readable for judges

plt.rcParams.update(
    {
        "font.size": 11,
        "axes.titlesize": 13,
        "axes.labelsize": 11,
    }
)


def _positive_class_shap(shap_values):
    if isinstance(shap_values, list):
        return np.asarray(shap_values[1])
    arr = np.asarray(shap_values)
    if arr.ndim == 3:
        return arr[:, :, 1]
    return arr


def _load_splits():
    processed = PROJECT_ROOT / "data" / "processed"
    X = pd.read_csv(processed / "X_features.csv")
    ys = {
        key: pd.read_csv(processed / f"y_{key}.csv").squeeze("columns")
        for key in TARGET_KEYS
    }
    return X, ys


def run_shap_for_target(
    target_key: str,
    X: pd.DataFrame,
    y: pd.Series,
    plot_dir: Path,
) -> pd.DataFrame:
    col = f"target_{target_key}"
    combo = pd.concat([X, y.rename(col)], axis=1)
    X_train, X_test, y_train, y_test, _ = split_and_scale(combo, col, apply_scaling=True)

    model_path = PROJECT_ROOT / "saved_models" / "stage1" / f"random_forest_{target_key}.pkl"
    model = joblib.load(model_path)

    display_names = [to_display_name(c) for c in X.columns]
    n = min(MAX_SHAP_SAMPLES, len(X_test))
    rng = np.random.default_rng(42)
    idx = rng.choice(len(X_test), size=n, replace=False)
    X_sample = X_test[idx]

    barrier_label = TARGET_DISPLAY[target_key]
    print(f"\n--- SHAP | {barrier_label} ({n} test samples) ---")

    explainer = shap.TreeExplainer(model)
    shap_vals = _positive_class_shap(explainer.shap_values(X_sample))
    X_plot = pd.DataFrame(X_sample, columns=display_names)

    # Beeswarm — top drivers
    shap.summary_plot(
        shap_vals,
        X_plot,
        show=False,
        max_display=TOP_FEATURES,
    )
    fig = plt.gcf()
    fig.set_size_inches(9, 5.5)
    fig.suptitle(
        f"Random Forest + SHAP — drivers of {barrier_label}",
        fontsize=13,
        y=1.02,
    )
    summary_path = plot_dir / f"rf_summary_{target_key}.png"
    fig.savefig(summary_path, dpi=200, bbox_inches="tight")
    plt.close(fig)
    print("Saved:", summary_path)

    # Bar — mean importance
    shap.summary_plot(
        shap_vals,
        X_plot,
        plot_type="bar",
        show=False,
        max_display=TOP_FEATURES,
    )
    fig = plt.gcf()
    fig.set_size_inches(8, 5)
    fig.suptitle(
        f"Top {TOP_FEATURES} predictors — {barrier_label}",
        fontsize=13,
        y=1.02,
    )
    bar_path = plot_dir / f"rf_bar_{target_key}.png"
    fig.savefig(bar_path, dpi=200, bbox_inches="tight")
    plt.close(fig)
    print("Saved:", bar_path)

    # Waterfall — one example
    proba = model.predict_proba(X_sample)[:, 1]
    sample_i = int(np.argmax(proba))
    base_val = float(
        explainer.expected_value[1]
        if isinstance(explainer.expected_value, (list, np.ndarray))
        else explainer.expected_value
    )
    single = shap_vals[sample_i]
    top_n = 8
    top_idx = np.argsort(np.abs(single))[-top_n:]
    top_idx = top_idx[np.argsort(single[top_idx])]
    exp = shap.Explanation(
        values=single[top_idx],
        base_values=base_val,
        data=X_plot.iloc[sample_i, top_idx].values,
        feature_names=[display_names[i] for i in top_idx],
    )
    shap.plots.waterfall(exp, show=False, max_display=top_n)
    fig = plt.gcf()
    fig.set_size_inches(8, 5)
    fig.suptitle(
        f"Example: why model predicts {barrier_label}",
        fontsize=12,
        y=1.02,
    )
    wf_path = plot_dir / f"rf_waterfall_{target_key}.png"
    fig.savefig(wf_path, dpi=200, bbox_inches="tight")
    plt.close(fig)
    print("Saved:", wf_path)

    importance = np.abs(shap_vals).mean(axis=0)
    imp_df = (
        pd.DataFrame(
            {
                "feature_code": X.columns,
                "feature_label": display_names,
                "mean_abs_shap": importance,
            }
        )
        .sort_values("mean_abs_shap", ascending=False)
        .head(15)
    )
    imp_path = plot_dir / f"rf_shap_importance_{target_key}.csv"
    imp_df.to_csv(imp_path, index=False)
    print("Saved:", imp_path)
    print("Top 5:", imp_df.head(5)["feature_label"].tolist())

    return imp_df


def main() -> None:
    plot_dir = PROJECT_ROOT / "outputs" / "stage1_results" / "shap_plots"
    plot_dir.mkdir(parents=True, exist_ok=True)

    X, ys = _load_splits()
    print("Feature matrix:", X.shape)

    for key in TARGET_KEYS:
        run_shap_for_target(key, X, ys[key], plot_dir)

    print("\nAll SHAP plots saved under:", plot_dir)


if __name__ == "__main__":
    main()
