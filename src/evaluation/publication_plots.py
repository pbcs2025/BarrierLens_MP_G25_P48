"""Publication-quality visualization engine for Stage 2 Random Forest results.

All figures are exported at 300 DPI in PNG, SVG, and PDF formats, suitable
for IEEE, Springer, Elsevier, and Nature medical AI research publications.
"""

from __future__ import annotations

import logging
import textwrap
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
from sklearn.calibration import calibration_curve
from sklearn.metrics import (
    auc,
    confusion_matrix,
    precision_recall_curve,
    roc_curve,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Consistent publication styling
# ---------------------------------------------------------------------------
_STYLE: Dict[str, Any] = {
    "font.family":      "sans-serif",
    "font.sans-serif":  ["Arial", "DejaVu Sans", "Helvetica", "Liberation Sans"],
    "font.size":        11,
    "axes.titlesize":   13,
    "axes.labelsize":   11,
    "xtick.labelsize":  10,
    "ytick.labelsize":  10,
    "legend.fontsize":  10,
    "figure.dpi":       150,   # screen preview quality
    "savefig.dpi":      300,   # export quality
    "savefig.bbox":     "tight",
}
plt.rcParams.update(_STYLE)
sns.set_theme(style="whitegrid", palette="deep")

# Human-readable target labels used in figure titles
TARGET_DISPLAY: Dict[str, str] = {
    "target_anc_gap":  "ANC Care Gap",
    "target_unmet_fp": "Unmet Family Planning Need",
}


# ---------------------------------------------------------------------------
# Shared save helper
# ---------------------------------------------------------------------------

def save_figure(fig: plt.Figure, output_dir: Path, stem: str) -> List[Path]:
    """Save figure as PNG (300 DPI), SVG, and PDF.  Returns list of saved paths."""
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    paths = []
    for ext in (".png", ".svg", ".pdf"):
        p = output_dir / f"{stem}{ext}"
        fig.savefig(p, dpi=300, bbox_inches="tight")
        paths.append(p)
    plt.close(fig)
    return paths


def _label(target_name: str) -> str:
    return TARGET_DISPLAY.get(target_name, target_name)


# ---------------------------------------------------------------------------
# ROC Curve
# ---------------------------------------------------------------------------

def plot_roc_curve(
    y_test:      np.ndarray,
    y_prob:      np.ndarray,
    target_name: str,
    output_dir:  Path,
) -> List[Path]:
    """ROC curve with shaded AUC and random-chance baseline."""
    fpr, tpr, _ = roc_curve(y_test, y_prob)
    roc_auc = auc(fpr, tpr)

    fig, ax = plt.subplots(figsize=(7, 6))
    ax.plot(fpr, tpr, color="#1d3557", lw=2.5,
            label=f"Random Forest  (AUC = {roc_auc:.3f})")
    ax.plot([0, 1], [0, 1], color="#e63946", lw=1.5, ls="--",
            label="Random chance  (AUC = 0.500)")
    ax.fill_between(fpr, tpr, alpha=0.08, color="#1d3557")
    ax.set_xlim([-0.02, 1.02])
    ax.set_ylim([-0.02, 1.02])
    ax.set_xlabel("False Positive Rate (1 − Specificity)")
    ax.set_ylabel("True Positive Rate (Sensitivity)")
    ax.set_title(f"ROC Curve — {_label(target_name)}")
    ax.legend(loc="lower right", frameon=True, facecolor="white", edgecolor="none")
    return save_figure(fig, output_dir, f"roc_curve_{target_name}")


# ---------------------------------------------------------------------------
# Precision-Recall Curve
# ---------------------------------------------------------------------------

def plot_pr_curve(
    y_test:      np.ndarray,
    y_prob:      np.ndarray,
    target_name: str,
    output_dir:  Path,
) -> List[Path]:
    """Precision-Recall curve with baseline prevalence reference line."""
    precision, recall, _ = precision_recall_curve(y_test, y_prob)
    pr_auc   = auc(recall, precision)
    baseline = float(np.mean(y_test))

    fig, ax = plt.subplots(figsize=(7, 6))
    ax.plot(recall, precision, color="#2a9d8f", lw=2.5,
            label=f"Random Forest  (PR-AUC = {pr_auc:.3f})")
    ax.axhline(baseline, color="#e76f51", lw=1.5, ls="--",
               label=f"Baseline prevalence ({baseline:.1%})")
    ax.fill_between(recall, precision, alpha=0.08, color="#2a9d8f")
    ax.set_xlim([-0.02, 1.02])
    ax.set_ylim([-0.02, 1.02])
    ax.set_xlabel("Recall (Sensitivity)")
    ax.set_ylabel("Precision (Positive Predictive Value)")
    ax.set_title(f"Precision-Recall Curve — {_label(target_name)}")
    ax.legend(loc="upper right", frameon=True, facecolor="white")
    return save_figure(fig, output_dir, f"pr_curve_{target_name}")


# ---------------------------------------------------------------------------
# Confusion Matrix (counts + normalised)
# ---------------------------------------------------------------------------

def plot_confusion_matrix(
    y_test:      np.ndarray,
    y_pred:      np.ndarray,
    target_name: str,
    output_dir:  Path,
) -> Tuple[List[Path], List[Path]]:
    """Save both raw-count and row-normalised confusion matrices."""
    cm      = confusion_matrix(y_test, y_pred)
    cm_norm = cm.astype(float) / cm.sum(axis=1, keepdims=True)
    labels  = ["No Risk", "At Risk"]

    def _heatmap(data, fmt, stem):
        fig, ax = plt.subplots(figsize=(6, 5))
        sns.heatmap(data, annot=True, fmt=fmt, cmap="Blues", cbar=False,
                    xticklabels=labels, yticklabels=labels, ax=ax)
        ax.set_xlabel("Predicted")
        ax.set_ylabel("Actual")
        ax.set_title(f"Confusion Matrix — {_label(target_name)}")
        return save_figure(fig, output_dir, stem)

    paths_raw  = _heatmap(cm,      "d",    f"confusion_matrix_{target_name}")
    paths_norm = _heatmap(cm_norm, ".1%",  f"confusion_matrix_normalised_{target_name}")
    return paths_raw, paths_norm


# ---------------------------------------------------------------------------
# Top-N Feature Importance
# ---------------------------------------------------------------------------

def plot_top_features(
    importance_df: pd.DataFrame,
    target_name:   str,
    output_dir:    Path,
    n:             int = 20,
) -> List[Path]:
    """Horizontal bar chart of the top-N Gini feature importances.

    Accepts either ``feature_display`` or ``feature`` as the label column.
    Long labels are wrapped so they remain readable at publication size.
    """
    # Accept either 'feature_display' or 'feature' as the label column
    label_col = "feature_display" if "feature_display" in importance_df.columns else "feature"
    top = importance_df.head(n).sort_values("importance", ascending=True)
    # Wrap long display labels
    wrapped = [textwrap.fill(str(lbl), width=42) for lbl in top[label_col]]

    fig, ax = plt.subplots(figsize=(10, max(5, n * 0.42)))
    bars = ax.barh(wrapped, top["importance"], color="#1d3557", edgecolor="none")
    for bar in bars:
        w = bar.get_width()
        ax.text(w + 0.001, bar.get_y() + bar.get_height() / 2,
                f"{w:.4f}", va="center", fontsize=9)
    ax.set_xlabel("Gini Feature Importance")
    ax.set_title(f"Top {n} Predictors — {_label(target_name)}")
    ax.set_xlim(right=top["importance"].max() * 1.15)
    return save_figure(fig, output_dir, f"top{n}_features_{target_name}")


# ---------------------------------------------------------------------------
# Calibration Curve
# ---------------------------------------------------------------------------

def plot_calibration_curve(
    y_test:      np.ndarray,
    y_prob:      np.ndarray,
    target_name: str,
    output_dir:  Path,
) -> List[Path]:
    """Reliability diagram (calibration curve)."""
    prob_true, prob_pred = calibration_curve(y_test, y_prob, n_bins=10)

    fig, ax = plt.subplots(figsize=(7, 6))
    ax.plot(prob_pred, prob_true, "s-", color="#457b9d", lw=2,
            label="Random Forest")
    ax.plot([0, 1], [0, 1], "k--", lw=1.5, label="Perfect calibration")
    ax.set_xlabel("Mean Predicted Probability")
    ax.set_ylabel("Fraction of Positives")
    ax.set_title(f"Calibration Curve — {_label(target_name)}")
    ax.legend(loc="upper left", frameon=True)
    return save_figure(fig, output_dir, f"calibration_{target_name}")


# ---------------------------------------------------------------------------
# Decision Threshold Analysis
# ---------------------------------------------------------------------------

def plot_decision_threshold(
    y_test:      np.ndarray,
    y_prob:      np.ndarray,
    target_name: str,
    output_dir:  Path,
) -> List[Path]:
    """Precision, Recall, and F1 as a function of classification threshold."""
    precisions, recalls, thresholds = precision_recall_curve(y_test, y_prob)
    f1s = (2 * precisions[:-1] * recalls[:-1]
           / np.maximum(precisions[:-1] + recalls[:-1], 1e-15))
    best = int(np.argmax(f1s))

    fig, ax = plt.subplots(figsize=(8, 5))
    ax.plot(thresholds, precisions[:-1], color="#e76f51", lw=2,    label="Precision")
    ax.plot(thresholds, recalls[:-1],    color="#2a9d8f", lw=2,    label="Recall")
    ax.plot(thresholds, f1s,             color="#1d3557", lw=2.5, ls="--", label="F1")
    ax.axvline(thresholds[best], color="dimgray", ls=":",
               label=f"Max-F1 threshold ({thresholds[best]:.2f})")
    ax.set_xlabel("Decision Threshold")
    ax.set_ylabel("Score")
    ax.set_title(f"Metrics vs. Decision Threshold — {_label(target_name)}")
    ax.legend(loc="center left", frameon=True)
    return save_figure(fig, output_dir, f"decision_threshold_{target_name}")


# ---------------------------------------------------------------------------
# Cumulative Gain and Lift
# ---------------------------------------------------------------------------

def plot_lift_gain(
    y_test:      np.ndarray,
    y_prob:      np.ndarray,
    target_name: str,
    output_dir:  Path,
) -> Tuple[List[Path], List[Path]]:
    """Cumulative gain curve and lift curve."""
    df = (
        pd.DataFrame({"y_true": y_test, "y_prob": y_prob})
        .sort_values("y_prob", ascending=False)
        .reset_index(drop=True)
    )
    total_pos = max(1, df["y_true"].sum())
    df["pct_sample"] = (np.arange(len(df)) + 1) / len(df)
    df["gain"]       = df["y_true"].cumsum() / total_pos
    df["lift"]       = df["gain"] / df["pct_sample"]

    # Gain
    fig1, ax1 = plt.subplots(figsize=(7, 5))
    ax1.plot(df["pct_sample"], df["gain"], color="#2a9d8f", lw=2.5, label="Random Forest")
    ax1.plot([0, 1], [0, 1], "k--", lw=1.5, label="Baseline")
    ax1.set_xlabel("Percentage of Sample Contacted")
    ax1.set_ylabel("Percentage of Positives Captured")
    ax1.set_title(f"Cumulative Gain — {_label(target_name)}")
    ax1.legend(loc="lower right")
    paths_gain = save_figure(fig1, output_dir, f"gain_curve_{target_name}")

    # Lift
    fig2, ax2 = plt.subplots(figsize=(7, 5))
    ax2.plot(df["pct_sample"], df["lift"], color="#e76f51", lw=2.5, label="Random Forest")
    ax2.axhline(1.0, color="k", ls="--", lw=1.5, label="Baseline (lift = 1)")
    ax2.set_xlabel("Percentage of Sample Contacted")
    ax2.set_ylabel("Lift")
    ax2.set_title(f"Lift Curve — {_label(target_name)}")
    ax2.legend(loc="upper right")
    paths_lift = save_figure(fig2, output_dir, f"lift_curve_{target_name}")

    return paths_gain, paths_lift


# ---------------------------------------------------------------------------
# Barrier Uplift Comparison
# ---------------------------------------------------------------------------

def plot_barrier_uplift(
    uplift_rows: List[Dict[str, Any]],
    output_dir:  Path,
) -> List[Path]:
    """Grouped bar chart: socioeconomic baseline vs. barrier-enhanced ROC-AUC."""
    if not uplift_rows:
        return []

    plot_df = pd.DataFrame([
        {
            "Target":                 _label(r["target"]),
            "Socioeconomic baseline": r["auc_socioeconomic_only"],
            "Barrier-enhanced":       r["auc_with_barriers"],
        }
        for r in uplift_rows
    ])
    melted = plot_df.melt(id_vars="Target", var_name="Feature set", value_name="CV ROC-AUC")

    fig, ax = plt.subplots(figsize=(8, 5))
    sns.barplot(
        data=melted, x="Target", y="CV ROC-AUC", hue="Feature set",
        palette=["#6c757d", "#1d3557"], ax=ax,
    )
    ax.set_ylim(0.5, 0.9)
    ax.set_ylabel("Mean 3-Fold CV ROC-AUC")
    ax.set_title("Empirical Barrier Uplift — Baseline vs. Barrier-Enhanced")
    for p in ax.patches:
        h = p.get_height()
        if h > 0:
            ax.annotate(f"{h:.3f}",
                        (p.get_x() + p.get_width() / 2, h + 0.005),
                        ha="center", va="bottom", fontsize=9)
    return save_figure(fig, output_dir, "barrier_uplift_comparison")


# ---------------------------------------------------------------------------
# Cluster Profile Heatmap
# ---------------------------------------------------------------------------

def plot_cluster_profiles(
    X_full:    pd.DataFrame,
    clusters:  pd.Series,
    output_dir: Path,
) -> List[Path]:
    """Mean feature values per cluster — highlights structural vulnerability groups."""
    barrier_cols = [
        c for c in X_full.columns
        if "barrier" in c
        or c.startswith("cluster_")
        or c in ("media_exposure_index", "digital_inclusion_index",
                 "vulnerability_score", "composite_barrier_score")
    ]
    if not barrier_cols:
        barrier_cols = X_full.columns[:8].tolist()

    df_c = X_full[barrier_cols].copy()
    df_c["Cluster"] = clusters.to_numpy()
    means = df_c.groupby("Cluster").mean()

    fig, ax = plt.subplots(figsize=(10, max(4, len(barrier_cols) * 0.4)))
    sns.heatmap(
        means.T, annot=True, fmt=".3f", cmap="YlGnBu", ax=ax,
        cbar_kws={"label": "Mean feature value"},
    )
    ax.set_title("Healthcare Vulnerability Profile Across Population Clusters")
    ax.set_xlabel("Cluster")
    return save_figure(fig, output_dir, "cluster_profiles")
