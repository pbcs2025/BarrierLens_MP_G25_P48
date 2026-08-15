"""DAX measure definitions for BarrierLens _Metrics table (TMDL fragment)."""

from __future__ import annotations

# Each entry: (measure_name, dax_expression, format_string, display_folder)
MEASURES: list[tuple[str, str, str, str]] = [
    # ── Page 1 — National KPIs ───────────────────────────────────────────────
    (
        "Total Women Analysed",
        "MAX(national_kpi_summary[total_women])",
        "#,0",
        "01 National Overview",
    ),
    (
        "Observed Any Barrier Rate",
        "MAX(national_kpi_summary[observed_any_barrier_rate])",
        "0.0%",
        "01 National Overview",
    ),
    (
        "Predicted Household Barrier Probability",
        "MAX(national_kpi_summary[pred_household_prob])",
        "0.0%",
        "01 National Overview",
    ),
    (
        "Predicted Logistical Barrier Probability",
        "MAX(national_kpi_summary[pred_logistic_prob])",
        "0.0%",
        "01 National Overview",
    ),
    (
        "Predicted Health Facility Barrier Probability",
        "MAX(national_kpi_summary[pred_facility_prob])",
        "0.0%",
        "01 National Overview",
    ),
    (
        "Composite Barrier Score",
        "MAX(national_kpi_summary[pred_composite_barrier_score])",
        "0.0%",
        "01 National Overview",
    ),
    (
        "National Observed Household Rate",
        "MAX(national_kpi_summary[observed_household_rate])",
        "0.0%",
        "01 National Overview",
    ),
    (
        "National Observed Logistic Rate",
        "MAX(national_kpi_summary[observed_logistic_rate])",
        "0.0%",
        "01 National Overview",
    ),
    (
        "National Observed Facility Rate",
        "MAX(national_kpi_summary[observed_facility_rate])",
        "0.0%",
        "01 National Overview",
    ),
    (
        "Mean Stage 2 ANC Prediction",
        "VAR n = MAX(national_kpi_summary[stage2_anc_gap_N]) "
        "RETURN IF(n > 0, MAX(national_kpi_summary[stage2_anc_gap_pred_prob]), BLANK())",
        "0.0%",
        "01 National Overview",
    ),
    (
        "Mean Unmet FP Prediction",
        "MAX(national_kpi_summary[stage2_unmet_fp_pred_prob])",
        "0.0%",
        "01 National Overview",
    ),
    # ── State analysis ───────────────────────────────────────────────────────
    (
        "State Mean Predicted Composite Barrier",
        "AVERAGE(state_level_summary[pred_composite_barrier_score])",
        "0.0%",
        "03 State Analysis",
    ),
    (
        "State Mean Observed Household",
        "AVERAGE(state_level_summary[observed_household_rate])",
        "0.0%",
        "03 State Analysis",
    ),
    (
        "State Mean Predicted Household",
        "AVERAGE(state_level_summary[pred_household_prob])",
        "0.0%",
        "03 State Analysis",
    ),
    (
        "State Mean Observed Logistic",
        "AVERAGE(state_level_summary[observed_logistic_rate])",
        "0.0%",
        "03 State Analysis",
    ),
    (
        "State Mean Predicted Logistic",
        "AVERAGE(state_level_summary[pred_logistic_prob])",
        "0.0%",
        "03 State Analysis",
    ),
    (
        "State Mean Observed Facility",
        "AVERAGE(state_level_summary[observed_facility_rate])",
        "0.0%",
        "03 State Analysis",
    ),
    (
        "State Mean Predicted Facility",
        "AVERAGE(state_level_summary[pred_facility_prob])",
        "0.0%",
        "03 State Analysis",
    ),
    (
        "Selected State Women Count",
        "SUM(state_level_summary[N])",
        "#,0",
        "03 State Analysis",
    ),
    (
        "State Ranking Barrier Score",
        "AVERAGE(state_ranking_long[pred_composite_barrier_score])",
        "0.0%",
        "02 State Analysis",
    ),
    # ── Barrier long (maps / toggles) ─────────────────────────────────────────
    (
        "Barrier Long Value",
        "AVERAGE(national_barrier_long[value])",
        "0.0%",
        "01 National Overview",
    ),
    (
        "State Barrier Long Observed",
        "AVERAGE(state_barrier_long[mean_observed_rate])",
        "0.0%",
        "03 State Analysis",
    ),
    (
        "State Barrier Long Predicted",
        "AVERAGE(state_barrier_long[mean_predicted_prob])",
        "0.0%",
        "03 State Analysis",
    ),
    # ── Demographics ─────────────────────────────────────────────────────────
    (
        "Demographic Mean Observed Rate",
        "AVERAGE(demographic_summary[mean_observed_rate])",
        "0.0%",
        "04 Demographics",
    ),
    (
        "Demographic Mean Predicted Prob",
        "AVERAGE(demographic_summary[mean_predicted_prob])",
        "0.0%",
        "04 Demographics",
    ),
    (
        "Dimension Comparison Value",
        "AVERAGE(demographic_dimension_long[value])",
        "0.0%",
        "04 Demographics",
    ),
    # ── Clusters ─────────────────────────────────────────────────────────────
    (
        "Cluster Women Count",
        "SUM(cluster_summary[n_women])",
        "#,0",
        "05 Risk Archetypes",
    ),
    (
        "Cluster Share of Total",
        "AVERAGE(cluster_summary[share_of_total])",
        "0.0%",
        "05 Risk Archetypes",
    ),
    (
        "Cluster Radar Metric Value",
        "AVERAGE(cluster_radar_long[value])",
        "0.000",
        "05 Risk Archetypes",
    ),
    (
        "Cluster State Women",
        "SUM(cluster_state_distribution[n_women])",
        "#,0",
        "05 Risk Archetypes",
    ),
    # ── Stage 2 ────────────────────────────────────────────────────────────────
    (
        "Women with Confirmed Unmet Family Planning Need",
        "MAX(national_kpi_summary[stage2_unmet_fp_N])",
        "#,0",
        "06 Stage 2 Outcomes",
    ),
    (
        "Stage 2 Unmet FP Observed Rate",
        "MAX(national_kpi_summary[stage2_unmet_fp_observed_rate])",
        "0.0%",
        "06 Stage 2 Outcomes",
    ),
    (
        "Stage 2 Unmet FP Predicted Prob",
        "MAX(national_kpi_summary[stage2_unmet_fp_pred_prob])",
        "0.0%",
        "06 Stage 2 Outcomes",
    ),
    (
        "Stage 2 Outcome Value",
        "AVERAGE(stage2_outcome_long[value])",
        "0.0%",
        "06 Stage 2 Outcomes",
    ),
    (
        "Stage 2 Best Area Under the ROC Curve",
        "MAX(model_comparison_table[ROC-AUC])",
        "0.0000",
        "06 Stage 2 Outcomes",
    ),
    (
        "Avg Barrier Uplift",
        "AVERAGE(model_comparison_table[Barrier_Uplift])",
        "+0.0000;-0.0000",
        "06 Stage 2 Outcomes",
    ),
    # ── Explainability ───────────────────────────────────────────────────────
    (
        "Top SHAP Importance",
        "AVERAGE(shap_top20[mean_abs_shap])",
        "0.0000",
        "07 Explainability",
    ),
    (
        "SHAP Feature Importance",
        "AVERAGE(shap_importance[mean_abs_shap])",
        "0.0000",
        "07 Explainability",
    ),
    (
        "Stage 1 Best ROC-AUC",
        "MAX(stage1_model_comparison[ROC-AUC])",
        "0.0000",
        "07 Explainability",
    ),
    # ── Woman-level (slicer context) ───────────────────────────────────────────
    (
        "Woman Count",
        "COUNTROWS(woman_level_master)",
        "#,0",
        "00 Slicers",
    ),
    (
        "Woman Mean Composite Barrier",
        "AVERAGE(woman_level_master[composite_barrier_score])",
        "0.0%",
        "00 Slicers",
    ),
    (
        "Woman Observed Any Barrier Rate",
        "AVERAGEX("
        "woman_level_master,"
        "IF("
        "woman_level_master[observed_household] = 1 "
        "|| woman_level_master[observed_logistic] = 1 "
        "|| woman_level_master[observed_facility] = 1,"
        "1,"
        "0"
        ")"
        ")",
        "0.0%",
        "00 Slicers",
    ),
    # ── Base paper ───────────────────────────────────────────────────────────
    (
        "Base Paper Comparison Value",
        "AVERAGE(base_paper_barrier_long[value])",
        "0.0%",
        "02 Base Paper",
    ),
]


def render_metrics_tmdl(lineage_tag: str, placeholder_tag: str) -> str:
    lines = [
        "table _Metrics",
        f"\tlineageTag: {lineage_tag}",
        "",
    ]
    for name, expr, fmt, folder in MEASURES:
        safe = name.replace("'", "''")
        lines.append(f"\tmeasure '{safe}' = {expr}")
        lines.append(f"\t\tdisplayFolder: {folder}")
        lines.append(f"\t\tformatString: {fmt}")
        lines.append("")
    lines.extend(
        [
            "\tcolumn Placeholder",
            "\t\tisHidden",
            f"\t\tlineageTag: {placeholder_tag}",
            "\t\tdataType: string",
            "\t\tsourceColumn: Placeholder",
            "",
            "\tpartition _Metrics = calculated",
            "\t\tmode: import",
            '\t\tsource = ROW("Placeholder", BLANK())',
            "",
        ]
    )
    return "\n".join(lines)
