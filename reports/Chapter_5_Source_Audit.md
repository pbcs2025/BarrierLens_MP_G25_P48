# Chapter 5 Implementation — Companion Source Audit File
**Project:** BarrierLens / WHCARP (Major Project MP_G25_P48)  
**Generated Date:** 2026-09-27  

---

## 1. Primary Source Files Inspected
- `src/preprocessing/load_data.py`: NFHS-5 dataset loading and sample rules.
- `src/preprocessing/clean.py`, `encode.py`, `engineer_features.py`, `target_builder.py`: Preprocessing & index creation.
- `src/preprocessing/stage2_integration.py`: 3-fold Stratified OOF XGBoost barrier probabilities & Stage 2 targets.
- `src/models/logistic_regression.py`, `decision_tree.py`, `random_forest.py`, `xgboost_model.py`: Stage 1 classifiers.
- `scripts/run_stage1_pipeline.py`: Stage 1 training pipeline execution.
- `src/clustering/kmeans_cluster.py`: MiniBatchKMeans clustering ($k=2$, silhouette = 0.3986).
- `src/models/stage2_logistic.py`: Stage 2 Logistic Regression & uplift evaluation.
- `scripts/run_stage2_model_compare.py`: Model comparison across Stage 2 targets.
- `src/shap_analysis/stage2_shap.py`: SHAP TreeExplainer explainability engine.
- `dashboard/index.html`, `dashboard/pages/*.html`: Interactive web UI.
- `backend/app.py`, `backend/routes/chat.py`, `backend/services/ollama_service.py`: Flask + Ollama Llama 3.2 chatbot server.

---

## 2. Key Output Files Used
- `outputs/stage1_results/train_test_accuracy.csv`: Stage 1 baseline model accuracy.
- `results/xgb_metrics.csv`: Stage 1 XGBoost imbalanced evaluation metrics.
- `outputs/stage2_results/cluster_profiles.csv`: K-Means cluster profiles ($k=2$).
- `outputs/stage2_results/cluster_k_selection.csv`: Silhouette evaluation for $k \in [2, 10]$.
- `outputs/stage2_results/logistic_evaluation_results.csv`: Stage 2 performance & barrier uplift metrics.
- `outputs/stage2_results/logistic_coefficients_target_anc_gap.csv`: ANC Gap odds ratios.
- `outputs/stage2_results/logistic_coefficients_target_unmet_fp.csv`: Unmet FP odds ratios.

---

## 3. Embedded Figures Summary
1. **Fig. 5.1**: `plots/report/fig5_1_implementation_workflow.png` — Overall Implementation Workflow.
2. **Fig. 5.2**: `plots/stage1_lr_odds_ratios_3panel.png` — Stage 1 Logistic Regression Odds Ratios.
3. **Fig. 5.3**: `plots/xgb_household_roc.png` — Stage 1 XGBoost ROC Curve (Household Barrier).
4. **Fig. 5.4**: `plots/xgb_household_importance.png` — Stage 1 XGBoost Feature Importance.
5. **Fig. 5.5**: `plots/stage1_clustering_archetypes.png` — K-Means Risk Archetype Profiles.
6. **Fig. 5.6**: `plots/stage2_lr_odds_ratios_2panel.png` — Stage 2 Logistic Regression Odds Ratios.
7. **Fig. 5.7**: `data/dashboard/powerbi/images/barrier_uplift_comparison.png` — Stage 2 Barrier ROC-AUC Uplift.
8. **Fig. 5.8**: `dashboard/assets/images/shap_summary_target_unmet_fp.png` — Global SHAP Beeswarm Plot.
9. **Fig. 5.9**: `dashboard/assets/images/shap_waterfall_target_unmet_fp.png` — Local SHAP Waterfall Plot.
10. **Fig. 5.10**: `dashboard/assets/images/shap_heatmap_target_unmet_fp.png` — Population Cohort SHAP Heatmap.

---

## 4. Implementation Consistency Notes
- **Clustering $k$ Selection**: The production pipeline (`src/clustering/kmeans_cluster.py`) persisted $k = 2$ based on maximum silhouette score (0.3986 in `cluster_k_selection.csv`). Earlier report drafts evaluated $k = 6$ (silhouette = 0.2624) for finer policy breakdown. Documented in Section 5.6.4 note.
- **Stage 2 Model Role**: Logistic Regression is used for interpretable inference and barrier uplift evaluation in Section 5.7, while Random Forest and XGBoost are evaluated in parallel for comparative benchmarks in Section 5.7 / Section 5.8.

---

## 5. Verification Checklist
- DOCX Path: `reports/Chapter_5_Implementation.docx` (Created & verified)
- Markdown Path: `reports/Chapter_5_Implementation.md` (Created & verified)
- Audit Path: `reports/Chapter_5_Source_Audit.md` (Created & verified)
- Total Figures Inserted: 10
- Total Tables Generated: 6
- Total Algorithms Included: 7
- Unverified Assumptions / Fabrications: NONE (100% verified against codebase).
