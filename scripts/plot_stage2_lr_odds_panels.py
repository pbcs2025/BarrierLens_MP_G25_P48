"""Publication-ready 2-panel figure for IEEE research paper: Stage 2 Logistic Regression Odds Ratios.

Data sources:
- outputs/stage2_results/logistic_coefficients_target_anc_gap.csv
- outputs/stage2_results/logistic_coefficients_target_unmet_fp.csv
"""

from __future__ import annotations

from pathlib import Path
import pandas as pd
import numpy as np
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.lines import Line2D

# Define Paths
PROJECT_ROOT = Path(__file__).resolve().parents[1]
CSV_ANC = PROJECT_ROOT / "outputs" / "stage2_results" / "logistic_coefficients_target_anc_gap.csv"
CSV_FP = PROJECT_ROOT / "outputs" / "stage2_results" / "logistic_coefficients_target_unmet_fp.csv"
PLOTS_DIR = PROJECT_ROOT / "plots"

# Clean display names for maximum readability in IEEE two-column paper format
DISPLAY_NAMES: dict[str, str] = {
    "household_barrier_prob": "Household Barrier Prob.",
    "vulnerability_score": "Vulnerability Score",
    "composite_barrier_score": "Composite Barrier Score",
    "v013": "Age Group (5-year)",
    "v743f_missing": "Healthcare Decision: Missing",
    "media_exposure_index": "Media Exposure Index",
    "v131_tribe": "Caste/Tribe: Scheduled Tribe",
    "v481_yes": "Health Insurance: Covered",
    "v131_no caste / tribe": "Caste/Tribe: No Caste/Tribe",
    "v130_muslim": "Religion: Muslim",
    "v501_married": "Marital Status: Married",
    "v106": "Educational Level",
    "v717_not working": "Occupation: Not Working",
    "v012": "Respondent Age",
    "v501_widowed": "Marital Status: Widowed",
    "facility_barrier_prob": "Facility Barrier Prob.",
    "v190": "Wealth Index Quintile",
}

# Exact feature sets requested by user
ANC_HIGHER = ["household_barrier_prob", "vulnerability_score", "composite_barrier_score", "v013", "v743f_missing"]
ANC_LOWER = ["media_exposure_index", "v131_tribe", "v481_yes", "v131_no caste / tribe", "v130_muslim"]

FP_HIGHER = ["v501_married", "v743f_missing", "household_barrier_prob", "v106", "v717_not working"]
FP_LOWER = ["v012", "v501_widowed", "facility_barrier_prob", "v190", "media_exposure_index"]


def load_panel_data(csv_path: Path, higher_feats: list[str], lower_feats: list[str]) -> pd.DataFrame:
    df = pd.read_csv(csv_path)
    feat_map = {row["Feature"]: float(row["OddsRatio"]) for _, row in df.iterrows()}
    
    records = []
    # Higher OR (OR > 1.0)
    for feat in higher_feats:
        or_val = feat_map[feat]
        records.append({
            "feature_raw": feat,
            "display_name": DISPLAY_NAMES.get(feat, feat),
            "odds_ratio": or_val,
            "category": "Higher Odds (OR > 1.0)"
        })
        
    # Lower OR (OR < 1.0)
    for feat in lower_feats:
        or_val = feat_map[feat]
        records.append({
            "feature_raw": feat,
            "display_name": DISPLAY_NAMES.get(feat, feat),
            "odds_ratio": or_val,
            "category": "Lower Odds (OR < 1.0)"
        })
        
    res_df = pd.DataFrame(records)
    # Sort descending by Odds Ratio so higher ORs appear at top
    res_df = res_df.sort_values(by="odds_ratio", ascending=False).reset_index(drop=True)
    return res_df


def generate_ieee_figure():
    df_anc = load_panel_data(CSV_ANC, ANC_HIGHER, ANC_LOWER)
    df_fp = load_panel_data(CSV_FP, FP_HIGHER, FP_LOWER)
    
    # Configure clean IEEE publication typography and aesthetics
    plt.rcParams.update({
        "font.family": "sans-serif",
        "font.sans-serif": ["Arial", "Helvetica", "DejaVu Sans"],
        "font.size": 8.5,
        "axes.titlesize": 9.5,
        "axes.labelsize": 8.5,
        "xtick.labelsize": 8,
        "ytick.labelsize": 8,
        "figure.titlesize": 10.5,
        "savefig.dpi": 300,
        "savefig.bbox": "tight",
        "pdf.fonttype": 42,
        "ps.fonttype": 42
    })

    COLOR_HIGHER = "#E07A7A"  # Muted coral/soft red for OR > 1.0
    COLOR_LOWER = "#6FA8DC"   # Muted blue for OR < 1.0
    COLOR_REF = "#808080"     # Neutral gray for reference line
    
    fig, axes = plt.subplots(1, 2, figsize=(8.5, 4.4), sharey=False)
    # Adjust layout to guarantee zero overlap between panels and headers
    fig.subplots_adjust(wspace=0.58, left=0.22, right=0.96, top=0.80, bottom=0.15)
    
    panels_info = [
        (axes[0], df_anc, "(a) ANC Gap\n(target_anc_gap)", (0.76, 1.44)),
        (axes[1], df_fp, "(b) Unmet Family Planning\n(target_unmet_fp)", (0.46, 1.52))
    ]
    
    for ax, df_data, title, xlim in panels_info:
        y_pos = np.arange(len(df_data))
        ors = df_data["odds_ratio"].values
        labels = df_data["display_name"].values
        categories = df_data["category"].values
        
        colors = [COLOR_HIGHER if c == "Higher Odds (OR > 1.0)" else COLOR_LOWER for c in categories]
        
        # Vertical reference line at OR = 1.0
        ax.axvline(1.0, color=COLOR_REF, linestyle="--", linewidth=1.2, zorder=1)
        
        # Draw divergence bars originating from OR = 1.0
        widths = ors - 1.0
        ax.barh(y_pos, widths, left=1.0, height=0.42, color=colors, edgecolor="none", zorder=3)
        
        # Add point markers at exact OR values
        ax.scatter(ors, y_pos, color=colors, s=26, zorder=4)
        
        # Annotate exact OR values (3 decimal places) with adequate margin
        x_span = xlim[1] - xlim[0]
        dx = 0.025 * x_span
        
        for yi, or_val in zip(y_pos, ors):
            if or_val >= 1.0:
                ax.text(or_val + dx, yi, f"{or_val:.3f}", va="center", ha="left", fontsize=7.5, fontweight="bold", color="#0f172a", zorder=5)
            else:
                ax.text(or_val - dx, yi, f"{or_val:.3f}", va="center", ha="right", fontsize=7.5, fontweight="bold", color="#0f172a", zorder=5)
                
        ax.set_yticks(y_pos)
        ax.set_yticklabels(labels)
        ax.invert_yaxis()  # Highest OR at top
        ax.set_xlim(xlim)
        ax.set_title(title, fontweight="bold", pad=12)
        ax.set_xlabel("Odds Ratio (OR)")
        ax.grid(axis="x", linestyle=":", linewidth=0.5, alpha=0.6, zorder=0)
        ax.set_axisbelow(True)
        
        # Clean top and right spines
        for spine in ["top", "right"]:
            ax.spines[spine].set_visible(False)
            
    # Main Figure Title
    fig.suptitle("Stage 2 Logistic Regression Odds Ratios for Downstream Healthcare Outcomes", fontweight="bold", y=0.98)
    
    # Legend at bottom
    legend_elements = [
        Line2D([0], [0], color=COLOR_HIGHER, lw=5, marker="o", ms=5, label="Higher associated odds (OR > 1.0)"),
        Line2D([0], [0], color=COLOR_LOWER, lw=5, marker="o", ms=5, label="Lower associated odds (OR < 1.0)"),
        Line2D([0], [0], color=COLOR_REF, lw=1.2, linestyle="--", label="Null association (OR = 1.0)")
    ]
    fig.legend(handles=legend_elements, loc="lower center", ncol=3, frameon=False, fontsize=8, bbox_to_anchor=(0.5, 0.01))
    
    PLOTS_DIR.mkdir(parents=True, exist_ok=True)
    png_path = PLOTS_DIR / "stage2_lr_odds_ratios_2panel.png"
    pdf_path = PLOTS_DIR / "stage2_lr_odds_ratios_2panel.pdf"
    
    fig.savefig(png_path, dpi=300, bbox_inches="tight")
    fig.savefig(pdf_path, bbox_inches="tight")
    plt.close(fig)
    
    print(f"Successfully saved PNG: {png_path}")
    print(f"Successfully saved PDF: {pdf_path}")
    
    return df_anc, df_fp, png_path, pdf_path


if __name__ == "__main__":
    df_anc, df_fp, png_path, pdf_path = generate_ieee_figure()
