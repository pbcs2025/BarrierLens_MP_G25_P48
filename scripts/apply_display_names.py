"""Apply Power BI displayName annotations to all TMDL table columns.

This adds `displayName: "Human Readable Name"` inside each column block
so Power BI shows professional labels in field lists, axes, tooltips and
legends WITHOUT renaming physical CSV columns.

Rules:
- NO CSV columns renamed
- NO source data changed
- NO ML / SHAP / notebook changes
- Only TMDL `displayName` annotations added/updated
"""

from __future__ import annotations

import re
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
TABLES_DIR   = PROJECT_ROOT / "powerbi" / "BarrierLens.SemanticModel" / "definition" / "tables"

# ─────────────────────────────────────────────────────────────────────────────
# Master display-name mapping
# key = physical column name (sourceColumn value)
# value = display name shown in Power BI UI
# ─────────────────────────────────────────────────────────────────────────────

DISPLAY_NAMES: dict[str, str] = {

    # ── national_kpi_summary ─────────────────────────────────────────────────
    "total_women":                         "Total Women Analysed",
    "observed_any_barrier_rate":           "Observed Any Barrier Rate (%)",
    "observed_household_rate":             "Observed Household Barrier Rate (%)",
    "observed_logistic_rate":              "Observed Logistic Barrier Rate (%)",
    "observed_facility_rate":              "Observed Facility Barrier Rate (%)",
    "pred_household_prob":                 "Predicted Household Barrier Probability",
    "pred_logistic_prob":                  "Predicted Logistic Barrier Probability",
    "pred_facility_prob":                  "Predicted Facility Barrier Probability",
    "pred_composite_barrier_score":        "Predicted Composite Barrier Score",
    "stage2_unmet_fp_N":                   "Analytic Sample — Unmet FP Need (N)",
    "stage2_unmet_fp_observed_rate":       "Observed Unmet Family Planning Rate (%)",
    "stage2_unmet_fp_pred_prob":           "Predicted Unmet FP Probability",
    "stage2_anc_gap_N":                    "Analytic Sample — ANC Care Gap (N)",
    "data_note":                           "Data Note",

    # ── national_barrier_long ─────────────────────────────────────────────────
    "barrier_type":                        "Barrier Type",
    "metric_type":                         "Metric Type (Observed / Predicted)",
    "value":                               "Rate / Probability",
    "data_rail":                           "Data Source",

    # ── state_level_summary ──────────────────────────────────────────────────
    "state_name":                          "State / Union Territory",
    "N":                                   "Sample Size (Women)",
    # observed_household_rate etc. covered above
    "cluster_0_share":                     "High-Vulnerability Cluster Share (%)",
    "cluster_1_share":                     "High-Inclusion Cluster Share (%)",
    "target_unmet_fp_N":                   "Unmet FP Analytic Sample (N)",
    "target_unmet_fp_observed_rate":       "Observed Unmet FP Rate (%)",
    "target_unmet_fp_pred_prob":           "Predicted Unmet FP Probability",
    "target_anc_gap_N":                    "ANC Gap Analytic Sample (N)",
    "target_anc_gap_observed_rate":        "Observed ANC Gap Rate (%)",
    "target_anc_gap_pred_prob":            "Predicted ANC Gap Probability",

    # ── state_barrier_long ───────────────────────────────────────────────────
    # state_name, barrier_type covered above
    "mean_observed_rate":                  "Mean Observed Barrier Rate (%)",
    "mean_predicted_prob":                 "Mean Predicted Barrier Probability",
    "data_rail_observed":                  "Data Rail — Observed",
    "data_rail_predicted":                 "Data Rail — Predicted",

    # ── demographic_summary / demographic_comparison_long ────────────────────
    "wealth_tier":                         "Wealth Tier",
    "education_tier":                      "Education Level",
    "residence":                           "Type of Residence (Urban / Rural)",
    "caste_group":                         "Caste / Scheduled Tribe",
    # barrier_type, N covered above
    "suppress_flag":                       "Cell Suppressed (N < 30)",
    "mean_observed_rate":                  "Mean Observed Barrier Rate (%)",
    "mean_predicted_prob":                 "Mean Predicted Probability",
    "demographic_cell":                    "Demographic Group",
    # metric_type, value, data_rail covered above

    # ── cluster_summary ──────────────────────────────────────────────────────
    "cluster_id":                          "Cluster ID",
    "archetype_name":                      "Risk Archetype Name",
    "n_women":                             "Number of Women",
    "share_of_total":                      "Share of Total Population (%)",
    "media_exposure_index_mean":           "Mean Media Exposure Index",
    "digital_inclusion_index_mean":        "Mean Digital Inclusion Index",
    "vulnerability_score_mean":            "Mean Vulnerability Score",
    "pred_household_prob_mean":            "Mean Predicted Household Barrier Prob",
    "pred_logistic_prob_mean":             "Mean Predicted Logistic Barrier Prob",
    "pred_facility_prob_mean":             "Mean Predicted Facility Barrier Prob",
    "composite_barrier_score_mean":        "Mean Composite Barrier Score",

    # ── cluster_state_distribution ───────────────────────────────────────────
    # cluster_id, archetype_name, state_name, n_women covered above
    "share_within_cluster":                "Share Within Cluster (%)",

    # ── model_comparison_table ───────────────────────────────────────────────
    "Model":                               "Model Name",
    "Target":                              "Prediction Target",
    "Accuracy":                            "Accuracy",
    "ROC-AUC":                             "ROC-AUC Score",
    "Precision":                           "Precision",
    "Recall":                              "Recall (Sensitivity)",
    "F1-Score":                            "F1 Score",
    "TrainSize":                           "Training Set Size",
    "TestSize":                            "Test Set Size",
    "PositiveRate":                        "Positive Class Rate (%)",
    "CV_ROC-AUC":                          "Cross-Validated ROC-AUC",
    "Baseline_ROC-AUC":                    "Baseline ROC-AUC (Socioeconomic Only)",
    "Full_ROC-AUC":                        "Full Model ROC-AUC (With Barriers)",
    "Barrier_Uplift":                      "Barrier Uplift (Full − Baseline ROC-AUC)",

    # ── stage2_xgboost_results ───────────────────────────────────────────────
    # Most columns same as model_comparison_table
    "param_max_depth":                     "Max Tree Depth (Hyperparameter)",
    "param_n_estimators":                  "Number of Trees (Hyperparameter)",

    # ── shap_importance / shap_top20 ─────────────────────────────────────────
    "model":                               "Model",
    "target":                              "Prediction Target",
    "rank":                                "Feature Rank",
    "feature":                             "Feature Name",
    "mean_abs_shap":                       "Mean |SHAP Value| (Feature Importance)",

    # ── stage1_model_comparison ──────────────────────────────────────────────
    # Model, Target, Accuracy, ROC-AUC, Precision, Recall, F1-Score covered above

    # ── stage1_barrier_rates_long ────────────────────────────────────────────
    # model, barrier_type covered; roc_auc, f1_score etc. are lower-case here
    "accuracy":                            "Accuracy",
    "roc_auc":                             "ROC-AUC Score",
    "f1_score":                            "F1 Score",
    "precision":                           "Precision",
    "recall":                              "Recall (Sensitivity)",

    # ── base_paper_reference ─────────────────────────────────────────────────
    # barrier_type covered
    "description":                         "Barrier Description",
    "base_paper_rate":                     "Base Paper Barrier Rate (%)",
    "barrierlens_observed":                "BarrierLens Observed Rate (%)",
    "barrierlens_predicted":               "BarrierLens Predicted Probability",
    "base_paper_n":                        "Base Paper Sample Size",
    "barrierlens_n":                       "BarrierLens Sample Size",
    "source_note":                         "Source Note",
    "comparability":                       "Comparability Note",

    # ── classification_report_display ────────────────────────────────────────
    # model, target covered
    "class":                               "Class Code",
    "class_display":                       "Class Label",
    "f1-score":                            "F1 Score",
    "support":                             "Support (Number of Cases)",

    # ── hyperparameters_display ──────────────────────────────────────────────
    "parameter":                           "Hyperparameter Name",
    # value below conflicts with national_barrier_long; handle per-table
    "parameter_code":                      "Parameter Code (Internal)",
}

# Per-table overrides — for column names that mean different things in different tables
# Format: {table_name: {col_name: display_name}}
TABLE_OVERRIDES: dict[str, dict[str, str]] = {
    "hyperparameters_display": {
        "value": "Parameter Value",
    },
    "national_barrier_long": {
        "value": "Rate / Probability",
    },
    "demographic_comparison_long": {
        "value": "Observed or Predicted Rate (%)",
    },
}


def _get_display(table_name: str, col_name: str) -> str | None:
    """Return the display name for a column, with per-table overrides."""
    overrides = TABLE_OVERRIDES.get(table_name, {})
    if col_name in overrides:
        return overrides[col_name]
    return DISPLAY_NAMES.get(col_name)


def _inject_display_name(tmdl_text: str, table_name: str) -> tuple[str, int]:
    """Inject `displayName` annotations into each column block that lacks one.

    Returns (updated_text, count_of_changes).
    """
    changes = 0
    lines   = tmdl_text.split("\n")
    out     = []
    i       = 0
    while i < len(lines):
        line = lines[i]
        out.append(line)

        # Detect column definition line: starts with tab + "column <name>"
        col_match = re.match(r'^(\t)(column\s+)(\'[^\']+\'|\S+)', line)
        if col_match:
            indent = col_match.group(1)
            raw_col = col_match.group(3).strip("'")

            # Collect the entire column block (until next column/measure/partition/empty-outdent)
            block_start = len(out) - 1
            j = i + 1
            block_lines = [line]
            while j < len(lines):
                bl = lines[j]
                # Block ends when we hit a same-or-lower indent non-continuation line
                if bl.strip() == "" or (
                    bl.startswith(indent) and not bl.startswith(indent + "\t")
                    and re.match(r'^\t(column|measure|partition)', bl)
                ):
                    break
                block_lines.append(bl)
                j += 1

            # Check if displayName already present in this block
            block_text = "\n".join(block_lines)
            has_display = "displayName:" in block_text

            # Look up display name
            display = _get_display(table_name, raw_col)

            if display and not has_display:
                # Find the right insertion point:
                # Insert after the column declaration line itself
                out.append(f"{indent}\tdisplayName: \"{display}\"")
                changes += 1

        i += 1

    return "\n".join(out), changes


def process_all_tables() -> None:
    changes_total = 0
    tables_modified = []

    for tmdl_path in sorted(TABLES_DIR.glob("*.tmdl")):
        if tmdl_path.name == "_Metrics.tmdl":
            continue  # measures table has no columns needing display names

        table_name = tmdl_path.stem
        original   = tmdl_path.read_text(encoding="utf-8")
        updated, n = _inject_display_name(original, table_name)

        if n > 0:
            tmdl_path.write_text(updated, encoding="utf-8")
            tables_modified.append((tmdl_path.name, n))
            changes_total += n
            print(f"  Modified  {tmdl_path.name}  (+{n} displayName annotations)")
        else:
            print(f"  No change {tmdl_path.name}")

    print(f"\nTotal: {changes_total} displayName annotations added across {len(tables_modified)} tables")
    if tables_modified:
        print("Files modified:")
        for name, n in tables_modified:
            print(f"  {name}  ({n} annotations)")


if __name__ == "__main__":
    print("=" * 60)
    print("Applying Power BI displayName annotations")
    print("Physical columns NOT renamed — display only")
    print("=" * 60)
    process_all_tables()
    print("=" * 60)
    print("Done. No CSV, notebook, or ML code modified.")
    print("=" * 60)
