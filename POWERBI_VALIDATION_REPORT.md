# BarrierLens Power BI — Final Validation Report

**Passed:** 312  |  **Warnings:** 0  |  **Errors:** 0

---

## ✔ Passed Checks
- ✔ PBIP entry file exists: powerbi/BarrierLens.pbip
- ✔ model.tmdl exists
- ✔ model.tmdl declares 18 tables
- ✔ pages.json exists with 11 pages
- ✔ CSV exists: base_paper_reference.csv
- ✔ CSV exists: classification_report_display.csv
- ✔ CSV exists: cluster_state_distribution.csv
- ✔ CSV exists: cluster_summary.csv
- ✔ CSV exists: demographic_comparison_long.csv
- ✔ CSV exists: demographic_summary.csv
- ✔ CSV exists: hyperparameters_display.csv
- ✔ CSV exists: model_comparison_table.csv
- ✔ CSV exists: national_barrier_long.csv
- ✔ CSV exists: national_kpi_summary.csv
- ✔ CSV exists: shap_importance.csv
- ✔ CSV exists: shap_top20.csv
- ✔ CSV exists: stage1_barrier_rates_long.csv
- ✔ CSV exists: stage1_model_comparison.csv
- ✔ CSV exists: stage2_xgboost_results.csv
- ✔ CSV exists: state_barrier_long.csv
- ✔ CSV exists: state_level_summary.csv
- ✔ Total sourceColumn references checked: 149
- ✔ relationships.tmdl: 7 relationships
- ✔   Rel column valid: state_barrier_long.state_name
- ✔   Rel column valid: cluster_state_distribution.cluster_id
- ✔   Rel column valid: cluster_state_distribution.state_name
- ✔   Rel column valid: shap_importance.model
- ✔   Rel column valid: shap_top20.model
- ✔   Rel column valid: classification_report_display.model
- ✔   Rel column valid: stage1_model_comparison.Model
- ✔   Rel column valid: state_level_summary.state_name
- ✔   Rel column valid: cluster_summary.cluster_id
- ✔   Rel column valid: state_level_summary.state_name
- ✔   Rel column valid: model_comparison_table.Model
- ✔   Rel column valid: model_comparison_table.Model
- ✔   Rel column valid: model_comparison_table.Model
- ✔   Rel column valid: stage1_barrier_rates_long.model
- ✔ No duplicate lineageTags across 18 tables
- ✔ _Metrics.tmdl: 87 measures found
- ✔ All measure table references resolve to known tables
- ✔ Measures with displayFolder: 87
- ✔ Measures with formatString: 71
- ✔ DQ rows OK: national_kpi_summary.csv  (1 rows)
- ✔ DQ no nulls: national_kpi_summary.csv[total_women]
- ✔ DQ rows OK: state_level_summary.csv  (36 rows)
- ✔ DQ no nulls: state_level_summary.csv[state_name]
- ✔ DQ rows OK: state_barrier_long.csv  (108 rows)
- ✔ DQ no nulls: state_barrier_long.csv[state_name]
- ✔ DQ no nulls: state_barrier_long.csv[barrier_type]
- ✔ DQ rows OK: cluster_summary.csv  (2 rows)
- ✔ DQ no nulls: cluster_summary.csv[cluster_id]
- ✔ DQ no nulls: cluster_summary.csv[archetype_name]
- ✔ DQ rows OK: model_comparison_table.csv  (2 rows)
- ✔ DQ no nulls: model_comparison_table.csv[Model]
- ✔ DQ no nulls: model_comparison_table.csv[Target]
- ✔ DQ rows OK: shap_top20.csv  (20 rows)
- ✔ DQ no nulls: shap_top20.csv[feature]
- ✔ DQ no nulls: shap_top20.csv[mean_abs_shap]
- ✔ DQ rows OK: shap_importance.csv  (43 rows)
- ✔ DQ no nulls: shap_importance.csv[feature]
- ✔ DQ no nulls: shap_importance.csv[mean_abs_shap]
- ✔ DQ rows OK: national_barrier_long.csv  (6 rows)
- ✔ DQ no nulls: national_barrier_long.csv[barrier_type]
- ✔ DQ no nulls: national_barrier_long.csv[metric_type]
- ✔ DQ rows OK: base_paper_reference.csv  (3 rows)
- ✔ DQ no nulls: base_paper_reference.csv[barrier_type]
- ✔ DQ rows OK: hyperparameters_display.csv  (10 rows)
- ✔ DQ no nulls: hyperparameters_display.csv[parameter]
- ✔ DQ no nulls: hyperparameters_display.csv[value]
- ✔ No raw NFHS codes in header: base_paper_reference.csv
- ✔ No raw NFHS codes in header: classification_report_display.csv
- ✔ No raw NFHS codes in header: cluster_state_distribution.csv
- ✔ No raw NFHS codes in header: cluster_summary.csv
- ✔ No raw NFHS codes in header: demographic_comparison_long.csv
- ✔ No raw NFHS codes in header: demographic_summary.csv
- ✔ No raw NFHS codes in header: hyperparameters_display.csv
- ✔ No raw NFHS codes in header: model_comparison_table.csv
- ✔ No raw NFHS codes in header: national_barrier_long.csv
- ✔ No raw NFHS codes in header: national_kpi_summary.csv
- ✔ No raw NFHS codes in header: shap_importance.csv
- ✔ No raw NFHS codes in header: shap_top20.csv
- ✔ No raw NFHS codes in header: stage1_barrier_rates_long.csv
- ✔ No raw NFHS codes in header: stage1_model_comparison.csv
- ✔ No raw NFHS codes in header: stage2_xgboost_results.csv
- ✔ No raw NFHS codes in header: state_barrier_long.csv
- ✔ No raw NFHS codes in header: state_level_summary.csv
- ✔ All columns have displayName: base_paper_reference.tmdl
- ✔ All columns have displayName: classification_report_display.tmdl
- ✔ All columns have displayName: cluster_state_distribution.tmdl
- ✔ All columns have displayName: cluster_summary.tmdl
- ✔ All columns have displayName: demographic_comparison_long.tmdl
- ✔ All columns have displayName: demographic_summary.tmdl
- ✔ All columns have displayName: hyperparameters_display.tmdl
- ✔ All columns have displayName: model_comparison_table.tmdl
- ✔ All columns have displayName: national_barrier_long.tmdl
- ✔ All columns have displayName: national_kpi_summary.tmdl
- ✔ All columns have displayName: shap_importance.tmdl
- ✔ All columns have displayName: shap_top20.tmdl
- ✔ All columns have displayName: stage1_barrier_rates_long.tmdl
- ✔ All columns have displayName: stage1_model_comparison.tmdl
- ✔ All columns have displayName: stage2_xgboost_results.tmdl
- ✔ All columns have displayName: state_barrier_long.tmdl
- ✔ All columns have displayName: state_level_summary.tmdl
- ✔ Image OK: shap_summary_target_unmet_fp.png
- ✔ Image OK: shap_bar_target_unmet_fp.png
- ✔ Image OK: shap_waterfall_target_unmet_fp.png
- ✔ Image OK: shap_dependence_target_unmet_fp.png
- ✔ Image OK: shap_heatmap_target_unmet_fp.png
- ✔ Image OK: roc_curve_target_unmet_fp.png
- ✔ Image OK: pr_curve_target_unmet_fp.png
- ✔ Image OK: confusion_matrix_target_unmet_fp.png
- ✔ Image OK: confusion_matrix_normalised_target_unmet_fp.png
- ✔ Image OK: top20_features_target_unmet_fp.png
- ✔ Image OK: barrier_uplift_comparison.png
- ✔ Image OK: rf_bar_household.png
- ✔ Image OK: rf_bar_logistic.png
- ✔ Image OK: rf_bar_facility.png
- ✔ Image OK: rf_summary_household.png
- ✔ Image OK: rf_summary_logistic.png
- ✔ Image OK: rf_summary_facility.png
- ✔ Page complete: 0. BarrierLens Home
- ✔ Page complete: 1. National Overview
- ✔ Page complete: 2. Base Paper Comparison
- ✔ Page complete: 3. State-wise Barrier Analysis
- ✔ Page complete: 4. Demographic & Socioeconomic
- ✔ Page complete: 4b. AI Prediction Dashboard
- ✔ Page complete: 5. Risk Archetypes
- ✔ Page complete: 6. Stage 2 Health Outcome Impact
- ✔ Page complete: 7. Model Explainability & SHAP
- ✔ Page complete: 10. Policy Intelligence
- ✔ Page complete: 11. Executive Summary
- ✔ Custom theme file exists: BarrierLensTheme.json
- ✔ Theme has 10 data colors
- ✔ Theme includes visualStyles (card, chart, table overrides)

---

## ⚠ Warnings
- *(none)*

---

## ❌ Errors
- *(none)*

---

## Summary
**The BarrierLens Power BI project is production-ready.**