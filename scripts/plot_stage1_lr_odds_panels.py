"""Publication 3-panel forest plot of Stage 1 LR odds ratios from regression_summary.json.

Does not load models or recompute coefficients — uses top_risk_factors and
top_protective_factors exactly as stored in the dashboard export.
"""

from __future__ import annotations

import json
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

from src.evaluation.feature_labels import to_display_name

PROJECT_ROOT = Path(__file__).resolve().parents[1]
JSON_PATH = PROJECT_ROOT / "dashboard" / "assets" / "data" / "regression_summary.json"
OUT_DIR = PROJECT_ROOT / "outputs" / "stage1_results"
STEM = "stage1_lr_odds_top5_panels"

PANELS = (
    ("household", "(a) Household barrier"),
    ("logistic", "(b) Logistic barrier"),
    ("facility", "(c) Facility barrier"),
)

N_TOP = 5
COLOR_RISK = "#be123c"
COLOR_PROTECT = "#0f766e"
COLOR_REF = "#475569"

# IEEE full two-column width (~7.16 in); compact height for 10 rows × 3 panels
FIG_W, FIG_H = 7.2, 3.35
plt.rcParams.update(
    {
        "font.family": "sans-serif",
        "font.sans-serif": ["Arial", "Helvetica", "DejaVu Sans"],
        "font.size": 8,
        "axes.titlesize": 9,
        "axes.labelsize": 8,
        "xtick.labelsize": 7,
        "ytick.labelsize": 6.5,
        "savefig.dpi": 300,
        "savefig.bbox": "tight",
    }
)


def _load_panels_data() -> dict:
    with open(JSON_PATH, encoding="utf-8") as f:
        payload = json.load(f)
    return payload["targets"]


def _panel_rows(target_blob: dict) -> list[tuple[str, float, str]]:
    """Top 5 protective + top 5 risk from JSON lists (no recomputation)."""
    protective = target_blob["top_protective_factors"][:N_TOP]
    risk = target_blob["top_risk_factors"][:N_TOP]
    rows: list[tuple[str, float, str]] = []
    for item in protective:
        rows.append((item["feature"], float(item["odds_ratio"]), "protective"))
    for item in risk:
        rows.append((item["feature"], float(item["odds_ratio"]), "risk"))
    # Ascending OR: protective (low) → reference → risk (high)
    rows.sort(key=lambda r: r[1])
    return rows


def _x_limits(all_ors: list[float]) -> tuple[float, float]:
    lo, hi = min(all_ors), max(all_ors)
    pad = max(0.06, (hi - lo) * 0.12)
    return max(0.05, lo - pad), hi + pad


def plot_figure(targets: dict) -> plt.Figure:
    panel_rows = {key: _panel_rows(targets[key]) for key, _ in PANELS}
    all_ors = [or_val for rows in panel_rows.values() for _, or_val, _ in rows]
    x_min, x_max = _x_limits(all_ors)

    fig, axes = plt.subplots(1, 3, figsize=(FIG_W, FIG_H), sharex=True)
    fig.subplots_adjust(wspace=0.38, left=0.07, right=0.98, top=0.88, bottom=0.14)

    for ax, (target_key, title) in zip(axes, PANELS):
        rows = panel_rows[target_key]
        labels = [to_display_name(feat) for feat, _, _ in rows]
        ors = np.array([or_val for _, or_val, _ in rows])
        kinds = [k for _, _, k in rows]
        y = np.arange(len(rows))
        colors = [COLOR_RISK if k == "risk" else COLOR_PROTECT for k in kinds]

        ax.axvline(1.0, color=COLOR_REF, linewidth=1.0, linestyle="--", zorder=1)
        ax.barh(y, ors, height=0.62, color=colors, edgecolor="white", linewidth=0.4, zorder=2)

        for yi, or_val in zip(y, ors):
            ha = "left" if or_val >= 1.0 else "right"
            dx = 0.012 * (x_max - x_min)
            x_text = or_val + dx if or_val >= 1.0 else or_val - dx
            ax.text(
                x_text,
                yi,
                f"{or_val:.3f}",
                va="center",
                ha=ha,
                fontsize=6.5,
                color="#1e293b",
                clip_on=False,
            )

        ax.set_yticks(y)
        ax.set_yticklabels(labels)
        ax.invert_yaxis()
        ax.set_xlim(x_min, x_max)
        ax.set_title(title, fontweight="bold", pad=6)
        ax.grid(axis="x", linestyle=":", linewidth=0.5, alpha=0.55, zorder=0)
        ax.set_axisbelow(True)
        for spine in ("top", "right"):
            ax.spines[spine].set_visible(False)

    axes[1].set_xlabel("Odds ratio (OR)")
    fig.suptitle(
        "Stage 1 logistic regression: top protective and risk factors by target",
        fontsize=9,
        fontweight="bold",
        y=0.98,
    )

    from matplotlib.lines import Line2D

    legend_handles = [
        Line2D([0], [0], color=COLOR_PROTECT, lw=6, label="Top 5 protective (OR < 1)"),
        Line2D([0], [0], color=COLOR_RISK, lw=6, label="Top 5 risk (OR > 1)"),
        Line2D([0], [0], color=COLOR_REF, lw=1.2, linestyle="--", label="OR = 1"),
    ]
    fig.legend(
        handles=legend_handles,
        loc="lower center",
        ncol=3,
        frameon=False,
        fontsize=7,
        bbox_to_anchor=(0.5, 0.0),
    )

    return fig


def main() -> None:
    if not JSON_PATH.is_file():
        raise FileNotFoundError(JSON_PATH)

    targets = _load_panels_data()
    for key, _ in PANELS:
        if key not in targets:
            raise KeyError(f"Missing target {key!r} in {JSON_PATH}")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    fig = plot_figure(targets)
    png_path = OUT_DIR / f"{STEM}.png"
    pdf_path = OUT_DIR / f"{STEM}.pdf"
    fig.savefig(png_path, dpi=300, bbox_inches="tight")
    fig.savefig(pdf_path, bbox_inches="tight")
    plt.close(fig)
    print(f"Saved: {png_path}")
    print(f"Saved: {pdf_path}")


if __name__ == "__main__":
    main()
