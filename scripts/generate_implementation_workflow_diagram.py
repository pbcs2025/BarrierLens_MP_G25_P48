"""
Generate Fig 5.1: Overall Implementation Workflow of the BarrierLens System
for Chapter 5 — Implementation (Section 5.1 Overview) of Major Project Report.

Saves:
- plots/report/fig5_1_implementation_workflow.png (High-Res 300 DPI)
- plots/report/fig5_1_implementation_workflow.pdf (Vector PDF)
- reports/figures/fig5_1_implementation_workflow.png
- reports/figures/fig5_1_implementation_workflow.pdf
"""

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]

def create_workflow_diagram():
    # Set up figure dimensions (academic width 11 inches, height 14.5 inches for crisp layout)
    fig, ax = plt.subplots(figsize=(11, 14.5), dpi=300)
    ax.set_xlim(0, 100)
    ax.set_ylim(0, 100)
    ax.axis('off')

    font_family = "sans-serif"
    
    # Muted Academic Palette (No Red)
    COLOR_BG_DATA = "#F0FDF4"       # Muted Mint/Teal
    BORDER_DATA = "#0D9488"         # Deep Teal
    
    COLOR_BG_STAGE1 = "#F0F9FF"     # Ice Blue
    BORDER_STAGE1 = "#0284C7"       # Ocean Blue
    
    COLOR_BG_RISK = "#F8FAFC"       # Slate Grey
    BORDER_RISK = "#475569"         # Deep Slate
    
    COLOR_BG_STAGE2 = "#ECFEFF"     # Light Cyan
    BORDER_STAGE2 = "#0891B2"       # Teal Blue
    
    COLOR_BG_OUTPUT = "#EFF6FF"     # Soft Sky/Royal Blue
    BORDER_OUTPUT = "#2563EB"       # Royal Blue

    COLOR_NODE_FILL = "#FFFFFF"
    COLOR_TEXT_MAIN = "#0F172A"
    COLOR_TEXT_MUTED = "#334155"
    COLOR_ARROW = "#334155"

    # Helper function to draw rounded box
    def draw_box(x, y, w, h, title, subtitle=None, bg_color="#FFFFFF", border_color="#334155", lw=1.5, fontsize_title=9.5, fontsize_sub=8, title_weight="bold"):
        bbox = dict(boxstyle="round,pad=0.5", facecolor=bg_color, edgecolor=border_color, linewidth=lw)
        text = f"{title}\n{subtitle}" if subtitle else title
        ax.text(x + w/2, y + h/2, text, ha='center', va='center',
                fontsize=fontsize_title, fontweight=title_weight, color=COLOR_TEXT_MAIN,
                family=font_family, bbox=bbox, multialignment='center')

    # Helper for drawing section containers
    def draw_section_container(x, y, w, h, label, bg_color, border_color):
        rect = patches.FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.3",
                                      facecolor=bg_color, edgecolor=border_color,
                                      linewidth=1.2, linestyle="--", alpha=0.75)
        ax.add_patch(rect)
        ax.text(x + 2, y + h - 2.2, label, fontsize=9.5, fontweight='bold',
                color=border_color, family=font_family, va='top')

    # Helper for direct straight arrow
    def draw_arrow(x1, y1, x2, y2, label=None, label_pos=(0, 0)):
        ax.annotate('', xy=(x2, y2), xytext=(x1, y1),
                    arrowprops=dict(arrowstyle="-|>", color=COLOR_ARROW, lw=1.6, mutation_scale=14))
        if label:
            lx = (x1 + x2)/2 + label_pos[0]
            ly = (y1 + y2)/2 + label_pos[1]
            ax.text(lx, ly, label, ha='center', va='center', fontsize=8,
                    fontweight='bold', color=COLOR_TEXT_MUTED, family=font_family,
                    bbox=dict(boxstyle="round,pad=0.2", facecolor="#FFFFFF", edgecolor="#CBD5E1", lw=0.8))

    # Helper for orthogonally stepped arrow (no diagonal crossovers)
    def draw_step_arrow(coords, label=None, label_pos=(0,0)):
        # coords is list of (x, y) tuples forming segment path
        for i in range(len(coords)-2):
            ax.plot([coords[i][0], coords[i+1][0]], [coords[i][1], coords[i+1][1]],
                    color=COLOR_ARROW, lw=1.6, linestyle='-')
        
        # final segment with arrowhead
        ax.annotate('', xy=coords[-1], xytext=coords[-2],
                    arrowprops=dict(arrowstyle="-|>", color=COLOR_ARROW, lw=1.6, mutation_scale=14))
        
        if label:
            # Place label on second segment
            mid_idx = len(coords) // 2
            lx = (coords[mid_idx-1][0] + coords[mid_idx][0])/2 + label_pos[0]
            ly = (coords[mid_idx-1][1] + coords[mid_idx][1])/2 + label_pos[1]
            ax.text(lx, ly, label, ha='center', va='center', fontsize=8,
                    fontweight='bold', color=COLOR_TEXT_MUTED, family=font_family,
                    bbox=dict(boxstyle="round,pad=0.2", facecolor="#FFFFFF", edgecolor="#CBD5E1", lw=0.8))


    # --- SECTION CONTAINERS ---
    
    # Layer 1: Data Ingestion & Feature Engineering
    draw_section_container(4, 83.5, 92, 13.5, "LAYER 1: DATA INGESTION & FEATURE PREPARATION", COLOR_BG_DATA, BORDER_DATA)
    
    # Layer 2: Stage 1 ML Barrier Models
    draw_section_container(4, 65, 92, 15.5, "LAYER 2: STAGE 1 HEALTHCARE-ACCESS BARRIER PREDICTION", COLOR_BG_STAGE1, BORDER_STAGE1)

    # Layer 3: Risk Indices & Archetype Clustering
    draw_section_container(4, 46.5, 92, 15.5, "LAYER 3: RISK INDEX DERIVATION & ARCHEETYPE CLUSTERING", COLOR_BG_RISK, BORDER_RISK)

    # Layer 4: Stage 2 Health Outcome Prediction
    draw_section_container(4, 28, 92, 15.5, "LAYER 4: STAGE 2 HEALTH OUTCOME PREDICTION & UPLIFT ANALYSIS", COLOR_BG_STAGE2, BORDER_STAGE2)

    # Layer 5: Explainable AI & Deployed Platforms
    draw_section_container(4, 3, 92, 22, "LAYER 5: EXPLAINABLE AI & SYSTEM OUTPUTS", COLOR_BG_OUTPUT, BORDER_OUTPUT)


    # --- NODES & BOXES ---

    # Layer 1 Boxes (y: 85.5 to 93.5)
    draw_box(6, 85.5, 26, 8, "NFHS-5 Survey Dataset", "Individual Recode (IAIR7EFL.DTA)\nN = 724,115 Women (15–49)",
             bg_color=COLOR_NODE_FILL, border_color=BORDER_DATA, lw=1.5, fontsize_title=9.5, fontsize_sub=8)

    draw_box(37, 85.5, 26, 8, "Data Preprocessing", "Cleaning, Imputation & Encoding\nStratified Analytic Sample",
             bg_color=COLOR_NODE_FILL, border_color=BORDER_DATA, lw=1.5, fontsize_title=9.5, fontsize_sub=8)

    draw_box(68, 85.5, 26, 8, "Target & Feature Engineering", "3 Stage 1 Targets (v467 sub-items)\nVulnerability & Inclusion Indices",
             bg_color=COLOR_NODE_FILL, border_color=BORDER_DATA, lw=1.5, fontsize_title=9.5, fontsize_sub=8)

    # Layer 2 Boxes (y: 67.5 to 76)
    draw_box(10, 67.5, 36, 8.5, "Stage 1 Multi-Model Classifiers", "Train & Evaluate Across 3 Barrier Targets:\nLogistic Reg., Decision Tree, Random Forest, XGBoost",
             bg_color=COLOR_NODE_FILL, border_color=BORDER_STAGE1, lw=1.5, fontsize_title=9.5, fontsize_sub=8)

    draw_box(54, 67.5, 36, 8.5, "Out-of-Fold (OOF) Prediction", "3-Fold Stratified CV (Leakage-Free XGBoost)\nGenerate OOF Barrier Probabilities",
             bg_color=COLOR_NODE_FILL, border_color=BORDER_STAGE1, lw=1.5, fontsize_title=9.5, fontsize_sub=8)

    # Layer 3 Boxes (y: 48.5 to 57.5)
    draw_box(10, 48.5, 36, 9, "OOF Barrier Risk Probabilities", "• Household Barrier Prob. (P_household)\n• Logistic Barrier Prob. (P_logistic)\n• Facility Barrier Prob. (P_facility)",
             bg_color=COLOR_NODE_FILL, border_color=BORDER_RISK, lw=1.5, fontsize_title=9.5, fontsize_sub=7.5)

    draw_box(54, 48.5, 36, 9, "Composite Risk & K-Means Clustering", "Composite Exposure Score (Mean OOF Prob.)\nMiniBatchKMeans (k = 6 Risk Archetypes)",
             bg_color=COLOR_NODE_FILL, border_color=BORDER_RISK, lw=1.5, fontsize_title=9.5, fontsize_sub=8)

    # Layer 4 Boxes (y: 30 to 39)
    draw_box(10, 30, 36, 9, "Stage 2 Health Outcome Targets", "• ANC Care Gap (< 4 Antenatal Visits)\n• Unmet Family Planning Need (v626a)",
             bg_color=COLOR_NODE_FILL, border_color=BORDER_STAGE2, lw=1.5, fontsize_title=9.5, fontsize_sub=7.5)

    draw_box(54, 30, 36, 9, "Stage 2 Supervised Modelling", "LR, Random Forest, & XGBoost Outcomes\nBarrier Uplift Over Socioeconomic Baseline",
             bg_color=COLOR_NODE_FILL, border_color=BORDER_STAGE2, lw=1.5, fontsize_title=9.5, fontsize_sub=8)

    # Layer 5 Boxes (y: 5 to 19)
    draw_box(6, 5, 27, 14, "Explainable AI (SHAP)", "TreeExplainer Engine\n• Global Beeswarm & Bar Plots\n• Highest-Risk Waterfalls\n• Cohort Heatmaps & Dependence\n• Cluster SHAP Comparisons",
             bg_color=COLOR_NODE_FILL, border_color=BORDER_OUTPUT, lw=1.5, fontsize_title=9.5, fontsize_sub=7.5)

    draw_box(36.5, 5, 27, 14, "BarrierLens Dashboard", "Interactive Web & PowerBI UI\n• National & State Maps\n• Demographic & Rural-Urban\n• Risk Archetype Profiles\n• Health Outcome Impact",
             bg_color=COLOR_NODE_FILL, border_color=BORDER_OUTPUT, lw=1.5, fontsize_title=9.5, fontsize_sub=7.5)

    draw_box(67, 5, 27, 14, "AI Research Assistant", "Flask REST API + Ollama Backend\n• Llama 3.2 3B LLM Integration\n• Research Query Answering\n• Risk Profile Predictions\n• Grounded Evidence Responses",
             bg_color=COLOR_NODE_FILL, border_color=BORDER_OUTPUT, lw=1.5, fontsize_title=9.5, fontsize_sub=7.5)


    # --- CLEAN PIPELINE ARROWS (NO OVERLAPS) ---

    # Layer 1 internal horizontal arrows
    draw_arrow(32, 89.5, 37, 89.5)
    draw_arrow(63, 89.5, 68, 89.5)

    # Layer 1 Box 3 (Target/Feature Eng) down to Layer 2 Box 1 (Stage 1 Classifiers)
    # Step path: (81, 85.5) -> (81, 80.5) -> (28, 80.5) -> (28, 76)
    draw_step_arrow([(81, 85.5), (81, 80.5), (28, 80.5), (28, 76)],
                    label="Features & Stage 1 Targets", label_pos=(0, 1.2))

    # Layer 1 Box 1 (NFHS-5 raw) down left margin to Layer 4 Box 1 (Stage 2 Outcome Targets)
    # Step path: (19, 85.5) -> (2, 85.5) -> (2, 34.5) -> (10, 34.5)
    draw_step_arrow([(19, 85.5), (2, 85.5), (2, 34.5), (10, 34.5)],
                    label="Health Outcomes (m14, v626a)", label_pos=(0, 22))

    # Layer 2 internal horizontal arrow (Classifiers -> OOF Prediction)
    draw_arrow(46, 71.75, 54, 71.75, label="3-Fold Stratified CV", label_pos=(0, 1.5))

    # Layer 2 Box 2 (OOF Prediction) down to Layer 3 Box 1 (OOF Barrier Probabilities)
    # Step path: (72, 67.5) -> (72, 61.5) -> (28, 61.5) -> (28, 57.5)
    draw_step_arrow([(72, 67.5), (72, 61.5), (28, 61.5), (28, 57.5)],
                    label="OOF Probabilities (P_household, P_logistic, P_facility)", label_pos=(0, 1.2))

    # Layer 2 Box 2 (OOF Prediction) straight down to Layer 3 Box 2 (Clustering)
    draw_arrow(72, 67.5, 72, 57.5, label="OOF & Indices", label_pos=(4, 4))

    # Layer 3 internal horizontal arrow (OOF Probabilities -> Clustering)
    draw_arrow(46, 53, 54, 53, label="Feature Matrix", label_pos=(0, 1.5))

    # Layer 3 Box 2 (Composite Risk & Clustering) straight down to Layer 4 Box 2 (Stage 2 Modelling)
    draw_arrow(72, 48.5, 72, 39, label="OOF Risk & Risk Archetypes", label_pos=(0, 4.5))

    # Layer 4 internal horizontal arrow (Outcome Targets -> Stage 2 Modelling)
    draw_arrow(46, 34.5, 54, 34.5, label="Analytic Samples", label_pos=(0, 1.5))

    # Layer 4 Box 2 (Stage 2 Modelling) down to Layer 5 Output Boxes (Clean 3-way Branch)
    # Step path to SHAP (Box 1): (72, 30) -> (72, 23.5) -> (19.5, 23.5) -> (19.5, 19)
    draw_step_arrow([(72, 30), (72, 23.5), (19.5, 23.5), (19.5, 19)],
                    label="Tree Models & SHAP Data", label_pos=(-8, 1.2))

    # Straight down to Dashboard (Box 2): (72, 30) -> (72, 23.5) -> (50, 23.5) -> (50, 19)
    draw_step_arrow([(72, 30), (72, 23.5), (50, 23.5), (50, 19)],
                    label="Metrics & Archetypes", label_pos=(0, 1.2))

    # Step path to AI Assistant (Box 3): (72, 30) -> (72, 23.5) -> (80.5, 23.5) -> (80.5, 19)
    draw_step_arrow([(72, 30), (72, 23.5), (80.5, 23.5), (80.5, 19)],
                    label="Fitted Adapters & RAG Payload", label_pos=(5, 1.2))


    # Title and Caption
    plt.suptitle("Overall Implementation Workflow of the BarrierLens System",
                 fontsize=14, fontweight='bold', color=COLOR_TEXT_MAIN, y=0.985, family=font_family)
    
    ax.text(50, 1.2, "Fig. 5.1. Overall implementation workflow of the BarrierLens system.",
            ha='center', va='center', fontsize=10, fontweight='bold', fontstyle='italic',
            color=COLOR_TEXT_MAIN, family=font_family)

    plt.tight_layout()

    # Save outputs
    out_dir_plots = PROJECT_ROOT / "plots" / "report"
    out_dir_reports = PROJECT_ROOT / "reports" / "figures"
    out_dir_plots.mkdir(parents=True, exist_ok=True)
    out_dir_reports.mkdir(parents=True, exist_ok=True)

    file_png_plots = out_dir_plots / "fig5_1_implementation_workflow.png"
    file_pdf_plots = out_dir_plots / "fig5_1_implementation_workflow.pdf"
    file_png_reports = out_dir_reports / "fig5_1_implementation_workflow.png"
    file_pdf_reports = out_dir_reports / "fig5_1_implementation_workflow.pdf"

    plt.savefig(file_png_plots, dpi=300, bbox_inches='tight')
    plt.savefig(file_pdf_plots, format='pdf', bbox_inches='tight')
    plt.savefig(file_png_reports, dpi=300, bbox_inches='tight')
    plt.savefig(file_pdf_reports, format='pdf', bbox_inches='tight')
    plt.close()

    print(f"Successfully generated workflow diagram:")
    print(f"  - PNG: {file_png_plots}")
    print(f"  - PDF: {file_pdf_plots}")
    print(f"  - PNG: {file_png_reports}")
    print(f"  - PDF: {file_pdf_reports}")

if __name__ == "__main__":
    create_workflow_diagram()
