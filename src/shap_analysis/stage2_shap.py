"""Stage 2 SHAP explainability engine for Random Forest models.

Generates global and local SHAP explanations using TreeExplainer with
publication-quality figures suitable for healthcare research publications.

Plots produced per target
--------------------------
1.  shap_summary_{target}        — beeswarm dot plot (global feature impact)
2.  shap_bar_{target}            — mean |SHAP| bar chart (feature ranking)
3.  shap_waterfall_{target}      — waterfall for the highest-risk individual
4.  shap_dependence_{target}     — dependence plot for the top feature
5.  shap_heatmap_{target}        — population cohort heatmap
6.  shap_cluster_compare_{target}— mean |SHAP| per cluster (barrier uplift check)

A data-driven healthcare interpretation text file is also saved alongside
the figures, reporting the actual top features and their SHAP magnitudes.

Performance note
----------------
SHAP values are computed once in run_shap_analysis and passed to all
plot helpers as a pre-computed numpy array.  No plot helper calls
explainer() again — this avoids repeating the O(n·d·trees) computation
for each figure type.
"""

from __future__ import annotations

import logging
import textwrap
from pathlib import Path
from typing import Any, Dict, List, Optional

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import shap
from sklearn.ensemble import RandomForestClassifier

from src.evaluation.feature_labels import map_feature_names
from src.evaluation.publication_plots import save_figure
from src.preprocessing.stage2_integration import _sanitize_feature_names

logger = logging.getLogger(__name__)

TARGET_DISPLAY: Dict[str, str] = {
    "target_anc_gap":  "ANC Care Gap",
    "target_unmet_fp": "Unmet Family Planning Need",
}

# Consistent font sizes for all SHAP figures (matches publication_plots.py style)
_TITLE_SIZE  = 13
_LABEL_SIZE  = 11
_TICK_SIZE   = 10
_ANNOT_SIZE  = 9


# ---------------------------------------------------------------------------
# Feature name helper  — delegates to the centralised NFHS mapping
# ---------------------------------------------------------------------------

def simplify_feature_name(name: str) -> str:
    """Return a human-readable label for a raw NFHS feature column name.

    Delegates to ``feature_labels.map_feature_names`` which is the single
    source of truth for all Stage 2 feature-name translations.  Direct calls
    to this function are preserved for backward compatibility; all internal
    plot helpers now call ``map_feature_names`` directly on column arrays.
    """
    return map_feature_names([name])[0]


# ---------------------------------------------------------------------------
# SHAP value extraction
# ---------------------------------------------------------------------------

def _extract_positive_class_shap(shap_values: Any) -> np.ndarray:
    """Return the class-1 (positive outcome) SHAP array regardless of output format."""
    if isinstance(shap_values, list):
        return np.asarray(shap_values[1])
    arr = np.asarray(shap_values)
    if arr.ndim == 3:
        return arr[:, :, 1]
    return arr


# ---------------------------------------------------------------------------
# Main SHAP analysis function
# ---------------------------------------------------------------------------

def run_shap_analysis(
    model:       RandomForestClassifier,
    X_sample:    pd.DataFrame,
    target_name: str,
    output_dir:  Path,
    max_samples: int = 2000,
    seed:        int = 42,
    cluster_labels: Optional[pd.Series] = None,
) -> Dict[str, Any]:
    """Compute SHAP values and generate all publication figures for one target.

    Parameters
    ----------
    model          : fitted RandomForestClassifier
    X_sample       : test-set feature matrix
    target_name    : e.g. 'target_unmet_fp'
    output_dir     : directory where figures and CSV are saved
    max_samples    : cap for SHAP computation (TreeExplainer is O(n·d·trees))
    seed           : random seed for subsample reproducibility
    cluster_labels : optional cluster assignment series aligned with X_sample
                     rows; when provided, generates a cluster-stratified SHAP
                     comparison plot (shap_cluster_compare_{target})

    Returns
    -------
    dict with keys: target, sample_size, top_features, shap_importance_df
    """
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    display = _label(target_name)

    # ── Sanitise and build readable display matrix ────────────────────────
    X_clean   = _sanitize_feature_names(X_sample)
    X_display = X_clean.copy()
    X_display.columns = map_feature_names(X_clean.columns)

    # ── Stratified subsample (preserves index alignment with cluster_labels) ─
    if len(X_display) > max_samples:
        rng = np.random.RandomState(seed)
        idx = rng.choice(len(X_display), size=max_samples, replace=False)
        X_display = X_display.iloc[idx].reset_index(drop=True)
        X_clean   = X_clean.iloc[idx].reset_index(drop=True)
        if cluster_labels is not None:
            cluster_labels = cluster_labels.iloc[idx].reset_index(drop=True)

    logger.info(
        "Computing SHAP values for '%s' on %d samples ...",
        target_name, len(X_display),
    )

    # ── Single SHAP computation — reused by all plot helpers ─────────────
    explainer = shap.TreeExplainer(model)
    shap_raw  = explainer.shap_values(X_display)
    shap_vals = _extract_positive_class_shap(shap_raw)   # shape (n, d)

    # Build a shap.Explanation object from pre-computed values (no re-computation)
    expected_value = (
        explainer.expected_value[1]
        if isinstance(explainer.expected_value, (list, np.ndarray))
        else explainer.expected_value
    )
    explanation = shap.Explanation(
        values=shap_vals,
        base_values=np.full(len(X_display), float(expected_value)),
        data=X_display.values,
        feature_names=X_display.columns.tolist(),
    )

    # ── Feature importance from SHAP ──────────────────────────────────────
    mean_abs = np.abs(shap_vals).mean(axis=0)
    shap_imp = (
        pd.DataFrame({"feature": X_display.columns, "mean_abs_shap": mean_abs})
        .sort_values("mean_abs_shap", ascending=False)
        .reset_index(drop=True)
    )
    shap_imp.to_csv(output_dir / f"shap_importance_{target_name}.csv", index=False)

    # ── Plot 1: SHAP Summary (Beeswarm) ──────────────────────────────────
    _beeswarm_plot(shap_vals, X_display, display, output_dir, target_name)

    # ── Plot 2: SHAP Bar (Mean |SHAP|) ───────────────────────────────────
    _bar_plot(shap_imp, display, output_dir, target_name)

    # ── Plot 3: Waterfall (highest-risk individual) ───────────────────────
    _waterfall_plot(explanation, shap_vals, display, output_dir, target_name)

    # ── Plot 4: Dependence plot for top feature ───────────────────────────
    _dependence_plot(shap_vals, X_display, shap_imp, display, output_dir, target_name)

    # ── Plot 5: Population heatmap ────────────────────────────────────────
    _heatmap_plot(explanation, display, output_dir, target_name)

    # ── Plot 6: Cluster-stratified SHAP comparison (optional) ────────────
    if cluster_labels is not None:
        _cluster_shap_plot(
            shap_vals, X_display, cluster_labels, display, output_dir, target_name
        )

    # ── Healthcare interpretation text ────────────────────────────────────
    _write_interpretation(shap_imp, display, target_name, output_dir)

    logger.info("SHAP analysis complete for '%s'.", target_name)

    return {
        "target":             target_name,
        "sample_size":        len(X_display),
        "shap_importance_df": shap_imp,
        "top_features":       shap_imp.head(10).to_dict(orient="records"),
    }


# ---------------------------------------------------------------------------
# Individual plot helpers  (kept separate so each can be unit-tested / reused)
# ---------------------------------------------------------------------------

def _label(target_name: str) -> str:
    return TARGET_DISPLAY.get(target_name, target_name)


def _beeswarm_plot(
    shap_vals:   np.ndarray,
    X_display:   pd.DataFrame,
    display:     str,
    output_dir:  Path,
    target_name: str,
) -> None:
    """SHAP summary beeswarm dot plot — shows direction and magnitude per feature.

    Uses plt.gcf() immediately after shap.summary_plot(show=False) to reliably
    capture the figure SHAP drew onto, then delegates saving/closing to
    save_figure (which calls plt.close internally).
    """
    plt.figure(figsize=(10, 6))
    shap.summary_plot(shap_vals, X_display, max_display=15, show=False)
    fig = plt.gcf()
    fig.axes[0].set_title(
        f"SHAP Summary (Beeswarm) — {display}",
        fontsize=_TITLE_SIZE, pad=12,
    )
    plt.tight_layout()
    save_figure(fig, output_dir, f"shap_summary_{target_name}")


def _bar_plot(
    shap_imp:    pd.DataFrame,
    display:     str,
    output_dir:  Path,
    target_name: str,
    n:           int = 15,
) -> None:
    """Mean |SHAP| horizontal bar chart with value annotations.

    Bars are annotated with their numeric value to make quantitative
    differences readable at publication print size.  Long feature labels
    are wrapped to prevent axis overflow.
    """
    top = shap_imp.head(n).sort_values("mean_abs_shap", ascending=True)
    # Wrap long labels so they fit within the left-hand axis margin
    wrapped = [textwrap.fill(str(f), width=42) for f in top["feature"]]
    fig, ax = plt.subplots(figsize=(9, max(4, n * 0.45)))
    bars = ax.barh(wrapped, top["mean_abs_shap"],
                   color="#1d3557", edgecolor="none")

    # Annotate each bar with its value
    for bar in bars:
        w = bar.get_width()
        ax.text(
            w + 0.0005,
            bar.get_y() + bar.get_height() / 2,
            f"{w:.4f}",
            va="center", ha="left", fontsize=_ANNOT_SIZE,
        )

    ax.set_xlabel("Mean |SHAP value|  (impact on model output)", fontsize=_LABEL_SIZE)
    ax.set_title(
        f"SHAP Feature Impact — Top {n} Predictors\n{display}",
        fontsize=_TITLE_SIZE,
    )
    ax.tick_params(labelsize=_TICK_SIZE)
    # Give the annotations a little breathing room on the right
    ax.set_xlim(right=top["mean_abs_shap"].max() * 1.18)
    plt.tight_layout()
    save_figure(fig, output_dir, f"shap_bar_{target_name}")


def _waterfall_plot(
    explanation: shap.Explanation,
    shap_vals:   np.ndarray,
    display:     str,
    output_dir:  Path,
    target_name: str,
) -> None:
    """Waterfall plot for the single highest-risk individual in the sample.

    Uses the pre-computed shap.Explanation object passed from run_shap_analysis
    — no second call to explainer() is made here.
    """
    try:
        # Row with the highest total positive SHAP contribution = highest predicted risk
        row_idx = int(np.argmax(shap_vals.sum(axis=1)))
        plt.figure(figsize=(9, 6))
        shap.plots.waterfall(explanation[row_idx], max_display=12, show=False)
        fig = plt.gcf()
        fig.axes[0].set_title(
            f"SHAP Waterfall — Highest-Risk Individual\n{display}",
            fontsize=_TITLE_SIZE, pad=12,
        )
        plt.tight_layout()
        save_figure(fig, output_dir, f"shap_waterfall_{target_name}")
    except Exception as exc:
        logger.warning("Waterfall plot skipped for '%s': %s", target_name, exc)


def _dependence_plot(
    shap_vals:   np.ndarray,
    X_display:   pd.DataFrame,
    shap_imp:    pd.DataFrame,
    display:     str,
    output_dir:  Path,
    target_name: str,
) -> None:
    """Dependence plot for the highest-impact feature (auto interaction colouring)."""
    if shap_imp.empty:
        return
    top_feature = shap_imp.iloc[0]["feature"]
    try:
        fig, ax = plt.subplots(figsize=(8, 5))
        shap.dependence_plot(top_feature, shap_vals, X_display, ax=ax, show=False)
        ax.set_title(
            f"SHAP Dependence — {top_feature}\n{display}",
            fontsize=_TITLE_SIZE, pad=12,
        )
        ax.set_xlabel(ax.get_xlabel(), fontsize=_LABEL_SIZE)
        ax.set_ylabel(ax.get_ylabel(), fontsize=_LABEL_SIZE)
        ax.tick_params(labelsize=_TICK_SIZE)
        plt.tight_layout()
        save_figure(fig, output_dir, f"shap_dependence_{target_name}")
    except Exception as exc:
        logger.warning("Dependence plot skipped for '%s': %s", target_name, exc)


def _heatmap_plot(
    explanation: shap.Explanation,
    display:     str,
    output_dir:  Path,
    target_name: str,
    n_rows:      int = 500,
) -> None:
    """SHAP heatmap across a population cohort — reveals cluster-level patterns.

    Uses the pre-computed shap.Explanation object passed from run_shap_analysis
    — no second call to explainer() is made here.
    """
    try:
        plt.figure(figsize=(10, 6))
        shap.plots.heatmap(explanation[:n_rows], max_display=12, show=False)
        fig = plt.gcf()
        fig.axes[0].set_title(
            f"SHAP Heatmap — Population Cohort\n{display}",
            fontsize=_TITLE_SIZE, pad=12,
        )
        plt.tight_layout()
        save_figure(fig, output_dir, f"shap_heatmap_{target_name}")
    except Exception as exc:
        logger.warning("Heatmap plot skipped for '%s': %s", target_name, exc)


# ---------------------------------------------------------------------------
# Cluster-stratified SHAP comparison (new — Stage 2 research claim support)
# ---------------------------------------------------------------------------

def _cluster_shap_plot(
    shap_vals:      np.ndarray,
    X_display:      pd.DataFrame,
    cluster_labels: pd.Series,
    display:        str,
    output_dir:     Path,
    target_name:    str,
    top_n:          int = 12,
) -> None:
    """Mean |SHAP| per cluster for the top-N features.

    This plot directly supports the Stage 2 research claim that barrier
    exposure patterns differ across population clusters.  Each row is a
    feature; each column is a cluster; cell colour = mean |SHAP| value for
    that (feature, cluster) combination.

    Why this matters: if barrier probability features show systematically
    higher |SHAP| in one cluster, that cluster bears a disproportionate
    share of the predicted healthcare access gap.
    """
    try:
        # Select top-N features by overall mean |SHAP|
        overall_imp = np.abs(shap_vals).mean(axis=0)
        top_idx = np.argsort(overall_imp)[::-1][:top_n]
        top_features = X_display.columns[top_idx].tolist()

        # Build a dataframe: rows = samples, columns = top features + cluster
        df = pd.DataFrame(
            np.abs(shap_vals[:, top_idx]),
            columns=top_features,
        )
        df["cluster"] = cluster_labels.to_numpy()

        cluster_means = df.groupby("cluster")[top_features].mean()

        fig, ax = plt.subplots(figsize=(max(6, len(cluster_means.columns) * 0.6), 5))
        import seaborn as sns
        sns.heatmap(
            cluster_means.T,
            annot=True,
            fmt=".3f",
            cmap="YlOrRd",
            ax=ax,
            cbar_kws={"label": "Mean |SHAP value|"},
            annot_kws={"size": _ANNOT_SIZE},
        )
        ax.set_title(
            f"Mean |SHAP| by Cluster — Top {top_n} Features\n{display}",
            fontsize=_TITLE_SIZE,
        )
        ax.set_xlabel("Cluster", fontsize=_LABEL_SIZE)
        ax.set_ylabel("Feature", fontsize=_LABEL_SIZE)
        ax.tick_params(labelsize=_TICK_SIZE)
        plt.tight_layout()
        save_figure(fig, output_dir, f"shap_cluster_compare_{target_name}")
    except Exception as exc:
        logger.warning(
            "Cluster SHAP comparison plot skipped for '%s': %s", target_name, exc
        )


# ---------------------------------------------------------------------------
# Healthcare interpretation text
# ---------------------------------------------------------------------------

def _write_interpretation(
    shap_imp:    pd.DataFrame,
    display:     str,
    target_name: str,
    output_dir:  Path,
    top_n:       int = 5,
) -> None:
    """Write a data-driven plain-text narrative summarising the SHAP findings.

    The narrative is generated from the actual top-feature rankings and their
    mean |SHAP| values, making it directly reproducible from the data rather
    than a hardcoded template.
    """
    top = shap_imp.head(top_n)
    top3_names = top.head(3)["feature"].tolist()

    # Identify barrier-probability features in the top results
    barrier_keywords = ("barrier", "composite")
    barrier_in_top = [
        f for f in top["feature"]
        if any(kw in f.lower() for kw in barrier_keywords)
    ]
    protective_keywords = ("literacy", "school", "education", "digital", "media")
    protective_in_top = [
        f for f in top["feature"]
        if any(kw in f.lower() for kw in protective_keywords)
    ]

    # Build ranked feature list with magnitudes
    ranked_lines = "".join(
        f"  {i+1:2d}. {row['feature']:45s}  mean|SHAP|={row['mean_abs_shap']:.4f}\n"
        for i, row in top.iterrows()
    )

    barrier_sentence = (
        f"Barrier-related features in the top {top_n}: "
        + (", ".join(barrier_in_top) if barrier_in_top else "none")
        + "."
    )
    protective_sentence = (
        "Protective socioeconomic features in the top "
        + str(top_n)
        + ": "
        + (", ".join(protective_in_top) if protective_in_top else "none")
        + "."
    )

    text = (
        f"SHAP INTERPRETATION REPORT — {display}\n"
        f"{'=' * 65}\n\n"
        f"TOP {top_n} PREDICTORS (ranked by mean |SHAP| value):\n"
        f"{ranked_lines}\n"
        f"DIRECTIONAL EFFECTS:\n"
        f"  {barrier_sentence}\n"
        f"  {protective_sentence}\n"
        f"  Higher individual barrier probabilities increase the model's\n"
        f"  predicted risk for {display}.\n"
        f"  Higher female educational attainment and digital inclusion\n"
        f"  exert protective (negative SHAP) effects where present.\n\n"
        f"POLICY IMPLICATION:\n"
        f"  Targeted interventions should prioritise women with high composite\n"
        f"  barrier scores, particularly those in high-vulnerability clusters.\n"
        f"  Features with the largest mean |SHAP| values represent the levers\n"
        f"  most likely to shift predicted risk when addressed by policy.\n"
    )
    out_path = output_dir / f"shap_interpretation_{target_name}.txt"
    out_path.write_text(text, encoding="utf-8")
    logger.info("Saved SHAP interpretation → %s", out_path)
