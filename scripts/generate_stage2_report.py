"""Generate Stage2_Modelling_Report.pdf from executed Stage 2 result CSVs."""

from __future__ import annotations

import sys
from datetime import datetime
from pathlib import Path

import pandas as pd
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.models.stage2_xgboost import STAGE2_TARGETS, TARGET_DISPLAY

RESULTS_DIR = PROJECT_ROOT / "outputs" / "stage2_results"
SHAP_DIR = RESULTS_DIR / "shap"
OUTPUT_PDF = PROJECT_ROOT / "Stage2_Modelling_Report.pdf"


def _table_from_df(df: pd.DataFrame, col_widths=None):
    data = [df.columns.tolist()] + df.values.tolist()
    table = Table(data, colWidths=col_widths, repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1d3557")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.grey),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f1faee")]),
            ]
        )
    )
    return table


def _top_shap_features(target: str, n: int = 10) -> pd.DataFrame:
    path = SHAP_DIR / f"xgb_shap_importance_{target}.csv"
    if not path.exists():
        return pd.DataFrame({"feature": ["N/A"], "mean_abs_shap": [0.0]})
    df = pd.read_csv(path).head(n)[["feature", "mean_abs_shap"]]
    df["mean_abs_shap"] = df["mean_abs_shap"].round(5)
    return df


def build_report() -> Path:
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("Title2", parent=styles["Title"], fontSize=18, spaceAfter=12)
    h_style = ParagraphStyle("H2", parent=styles["Heading2"], spaceBefore=10, spaceAfter=6)
    body = styles["BodyText"]

    xgb_path = RESULTS_DIR / "xgboost_evaluation_results.csv"
    compare_path = RESULTS_DIR / "model_comparison_table.csv"
    if not xgb_path.exists():
        raise FileNotFoundError(f"Missing {xgb_path}. Run Stage 2 XGBoost first.")

    xgb_df = pd.read_csv(xgb_path)
    compare_df = pd.read_csv(compare_path) if compare_path.exists() else pd.DataFrame()

    story = []
    story.append(Paragraph("BarrierLens — Stage 2 Modelling Report", title_style))
    story.append(Paragraph(f"Project P48 | Generated {datetime.now():%Y-%m-%d}", body))
    story.append(Spacer(1, 0.4 * cm))

    sections = [
        (
            "1. Stage 2 Objective",
            "Predict downstream maternal healthcare utilisation (ANC care gap) and family planning "
            "access (unmet need) using socioeconomic features, Stage 1 out-of-fold barrier "
            "probabilities, engineered vulnerability indices, and woman-level risk clusters.",
        ),
        (
            "2. Dataset and Analytical Sample",
            "NFHS-5 individual-level extract (724,115 women). Each target uses its own restricted "
            "sample where structural missingness applies — targets are not imputed.",
        ),
        (
            "3. Target Definitions",
            "target_anc_gap: 1 if m14 &lt; 4 ANC visits, else 0 (requires m14 in raw extract). "
            "target_unmet_fp: 1 for 'unmet need for spacing/limiting', 0 otherwise among valid "
            "v626a categories. Leakage-prone s245a/b/h excluded.",
        ),
        (
            "4. Data Preprocessing",
            "Stage 1 features + 3-fold OOF barrier probabilities + composite score + "
            "MiniBatchKMeans clusters (one-hot encoded). Per-target row filtering before split.",
        ),
        (
            "5. XGBoost Methodology",
            "Separate XGBClassifier per target; tree_method='hist'; scale_pos_weight = neg/pos; "
            "80/20 stratified hold-out; 3-fold CV stability check on training fold.",
        ),
        (
            "6. Hyperparameters",
            "Tuned n_estimators (300–400) and max_depth (5–7) via GridSearchCV on stratified "
            "subsample; learning_rate=0.08, subsample=0.8, colsample_bytree=0.8.",
        ),
    ]

    for heading, text in sections:
        story.append(Paragraph(heading, h_style))
        story.append(Paragraph(text, body))
        story.append(Spacer(1, 0.2 * cm))

    if "target_anc_gap" not in xgb_df["Target"].values:
        story.append(
            Paragraph(
                "Note: target_anc_gap was skipped — m14 is absent from the current 32-column "
                "NFHS5_Individual.csv extract (0 non-null rows). Re-pull m14 from IAIR7EFL.DTA "
                "to enable ANC gap modelling.",
                body,
            )
        )
        story.append(Spacer(1, 0.2 * cm))

    story.append(Paragraph("7. Evaluation Metrics", h_style))
    story.append(Paragraph("ROC-AUC and F1 prioritised over accuracy due to class imbalance.", body))
    story.append(Spacer(1, 0.2 * cm))

    story.append(Paragraph("8. XGBoost Performance", h_style))
    display_cols = [c for c in xgb_df.columns if c in [
        "Target", "Accuracy", "ROC-AUC", "Precision", "Recall", "F1-Score", "CV_ROC-AUC",
        "Baseline_ROC-AUC", "Full_ROC-AUC", "Barrier_Uplift", "TrainSize", "TestSize",
    ]]
    story.append(_table_from_df(xgb_df[display_cols].round(4) if display_cols else xgb_df.round(4)))
    story.append(Spacer(1, 0.3 * cm))

    story.append(Paragraph("9. SHAP Analysis", h_style))
    for target in STAGE2_TARGETS:
        if target not in xgb_df["Target"].values:
            continue
        story.append(Paragraph(f"Top SHAP features — {TARGET_DISPLAY.get(target, target)}", body))
        story.append(_table_from_df(_top_shap_features(target)))
        story.append(Spacer(1, 0.2 * cm))

    story.append(Paragraph("10. Barrier Uplift Analysis", h_style))
    uplift_cols = ["Target", "Baseline_ROC-AUC", "Full_ROC-AUC", "Barrier_Uplift"]
    if all(c in xgb_df.columns for c in uplift_cols):
        story.append(_table_from_df(xgb_df[uplift_cols].round(4)))
    story.append(Spacer(1, 0.3 * cm))

    story.append(Paragraph("11. Model Comparison (LR vs RF vs XGBoost)", h_style))
    if not compare_df.empty:
        story.append(_table_from_df(compare_df.round(4)))
    else:
        story.append(Paragraph("Model comparison table not yet generated.", body))
    story.append(Spacer(1, 0.3 * cm))

    # Key findings from actual numbers
    findings = []
    for target in xgb_df["Target"].unique():
        row = xgb_df[xgb_df["Target"] == target].iloc[0]
        findings.append(
            f"{TARGET_DISPLAY.get(target, target)}: ROC-AUC={row['ROC-AUC']:.4f}, "
            f"barrier uplift={row.get('Barrier_Uplift', float('nan')):+.4f}."
        )
    if not compare_df.empty:
        for target in compare_df["Target"].unique():
            best = compare_df[compare_df["Target"] == target].sort_values("ROC-AUC", ascending=False).iloc[0]
            findings.append(
                f"Best overall model for {TARGET_DISPLAY.get(target, target)}: "
                f"{best['Model']} (ROC-AUC={best['ROC-AUC']:.4f})."
            )

    story.append(Paragraph("12. Key Findings", h_style))
    for line in findings:
        story.append(Paragraph(f"• {line}", body))
    story.append(Spacer(1, 0.2 * cm))

    story.append(Paragraph("13. Limitations", h_style))
    limitations = [
        "Current 32-column extract supports only ANC gap and unmet FP targets — not child nutrition, NCD, or cancer screening.",
        "target_anc_gap requires m14; if absent from the CSV/DTA extract, only unmet FP is modelled.",
        "Barrier probabilities are OOF estimates — uplift reflects predictive association, not causation.",
        "Single 80/20 hold-out; geographic/temporal drift not assessed.",
    ]
    for line in limitations:
        story.append(Paragraph(f"• {line}", body))

    story.append(Spacer(1, 0.2 * cm))
    story.append(Paragraph("14. Research Implications", h_style))
    story.append(
        Paragraph(
            "If barrier-uplift is positive, Stage 1 barrier exposure adds predictive signal for "
            "downstream maternal and reproductive health outcomes beyond socioeconomic status alone — "
            "supporting integrated barrier-outcome modelling for policy targeting.",
            body,
        )
    )
    story.append(Spacer(1, 0.2 * cm))
    story.append(Paragraph("15. Conclusion", h_style))
    story.append(
        Paragraph(
            "Stage 2 XGBoost models were trained on individual-level NFHS-5 data with strict "
            "leakage controls. Results above are taken directly from saved evaluation CSVs; "
            "see notebooks 11–12 for reproducible execution.",
            body,
        )
    )

    doc = SimpleDocTemplate(str(OUTPUT_PDF), pagesize=A4, rightMargin=2 * cm, leftMargin=2 * cm)
    doc.build(story)
    print(f"Saved report -> {OUTPUT_PDF}")
    return OUTPUT_PDF


if __name__ == "__main__":
    build_report()
