# BarrierLens Dashboard — Step 1 Verification Log

**Project:** P48 BarrierLens  
**Guide:** BarrierLens_Dashboard_Implementation_Guide.docx (Section 2, Section 10, Section 26 Step 1)  
**Verified by:** Sharmila (Dashboard owner)  
**Date:** 2026-07-25  
**Environment:** `c:\major project\BarrierLens_MP_G25_P48`

---

## 1. Analytic sample confirmation

| Check | Expected | Actual | Status |
|-------|----------|--------|--------|
| Total women (Stage 1) | 724,115 | 724,115 | PASS |
| Row alignment (X, y, clusters, Stage 2) | All equal | 724,115 across all | PASS |
| Stage 2 `target_unmet_fp` restricted N | Structural subset | 466,859 non-null; 49,672 positive (10.64%) | PASS |
| Stage 2 `target_anc_gap` restricted N | Requires m14 | 0 non-null (m14 absent from raw CSV) | BLOCKED — single-target Stage 2 only |
| K-Means clusters assigned | 100% coverage | 724,115 rows; k=2 (clusters 0, 1) | PASS (profiles file missing — see below) |

**Observed barrier prevalence (Rail A — BarrierLens processed targets):**

| Barrier | Prevalence | Positive count |
|---------|------------|----------------|
| Household | 27.16% | 196,638 |
| Logistic | 31.61% | 228,867 |
| Facility | 46.01% | 333,147 |

**Methodological note for dashboard:** Base paper uses 108,785 ever-married women; BarrierLens uses full 724,115 extract. Household/facility sub-items differ (v467f, v467i absent). Label all comparisons "broadly comparable," not identical.

---

## 2. Section 10 file inventory

Legend: **OK** = present and usable | **MISSING** = not on disk | **PARTIAL** = incomplete | **ALT** = exists under alternate path/name

### Stage 1 — processed data

| File | Status | Size / notes |
|------|--------|--------------|
| `data/processed/X_features.csv` | OK | 724,115 × 37 |
| `data/processed/y_household.csv` | OK | 724,115 |
| `data/processed/y_logistic.csv` | OK | 724,115 |
| `data/processed/y_facility.csv` | OK | 724,115 |

### Stage 1 — saved models (12 × .pkl)

| File pattern | Status | Notes |
|--------------|--------|-------|
| `saved_models/stage1/logistic_regression_{household,logistic,facility}.pkl` | MISSING | Directory contains only `.gitkeep` |
| `saved_models/stage1/decision_tree_{household,logistic,facility}.pkl` | MISSING | |
| `saved_models/stage1/random_forest_{household,logistic,facility}.pkl` | MISSING | |
| `saved_models/stage1/xgboost_{household,logistic,facility}.pkl` | MISSING | |

### Stage 1 — results & SHAP

| File | Status | Notes |
|------|--------|-------|
| `outputs/stage1_results/model_comparison_table.csv` | MISSING | |
| `outputs/stage1_results/shap_plots/*.png` | MISSING | Directory does not exist |
| `results/xgb_predictions_{household,logistic,facility}.csv` | PARTIAL | 144,823 rows each (test-set only, not full population) |
| `results/xgb_metrics.csv` | OK | 3 rows — metrics only |

### Stage 2 — processed data

| File | Status | Size / notes |
|------|--------|--------------|
| `data/processed/stage2/X_stage2_preclustering.csv` | OK | 724,115 × 41 |
| `data/processed/stage2/y_stage2_targets.csv` | OK | 724,115 × 2 targets |
| `data/processed/stage2/oof_barrier_probabilities.csv` | OK | 724,115; includes composite score |

### Stage 2 — clustering

| File | Status | Notes |
|------|--------|-------|
| `outputs/stage2_results/cluster_assignments.csv` | OK | 724,115 labels |
| `outputs/stage2_results/cluster_profiles.csv` | MISSING | Required for `cluster_summary.csv` |
| `outputs/stage2_results/cluster_k_selection.csv` | MISSING | Silhouette k-selection metadata |

### Stage 2 — saved models

| File | Status | Notes |
|------|--------|-------|
| `saved_models/stage2/kmeans_model.pkl` | OK | |
| `saved_models/stage2/kmeans_scaler.pkl` | OK | |
| `saved_models/stage2/stage2_logistic_target_unmet_fp.pkl` | OK | |
| `saved_models/stage2/stage2_random_forest_target_unmet_fp.pkl` | OK | |
| `saved_models/stage2/stage2_xgboost_target_unmet_fp.pkl` | OK | |
| `stage2_*_target_anc_gap.pkl` (×3) | N/A | Blocked until m14 extracted |

### Stage 2 — evaluation & SHAP

| File | Status | Notes |
|------|--------|-------|
| `outputs/stage2_results/model_comparison_table.csv` | OK | 3 models × 1 target |
| `outputs/stage2_results/xgboost_evaluation_results.csv` | OK | |
| `outputs/stage2_results/logistic_evaluation_results.csv` | MISSING | Run notebook 09 |
| `outputs/stage2_results/rf_evaluation_results.csv` | MISSING | Run notebook 10 (verify_result.txt shows RF ran elsewhere) |
| `outputs/stage2_results/shap/xgb_shap_*_target_unmet_fp.*` | PARTIAL | XGBoost only; no RF SHAP PNGs |
| Guide path `outputs/stage2_results/shap_plots/` | ALT | Actual folder is `outputs/stage2_results/shap/` |

### Dashboard summary CSVs (Step 5 deliverables — not built yet)

| File | Status |
|------|--------|
| `data/dashboard/state_level_summary.csv` | TO BUILD (Step 4→5) |
| `data/dashboard/demographic_summary.csv` | TO BUILD (Step 4→5) |
| `data/dashboard/cluster_summary.csv` | TO BUILD (Step 4→5) |
| `data/dashboard/base_paper_reference.csv` | TO BUILD (Step 2 / Member 2) |

---

## 3. Critical data-prep findings (blocks Step 4)

1. **State (v024) is not in `X_features.csv`** — dropped in `encode.py` as an identifier. Must re-attach from `data/raw/NFHS5_Individual.csv` by row index before any state aggregation.
2. **Residence (v025)** survives only as binary `0=rural / 1=urban` in `X_features.csv`. Dashboard labels must decode this, or re-attach raw labels.
3. **Wealth (v190)** is ordinal-encoded (0–4 quintile score), not labelled poor/middle/rich. Demographic summary must map quintiles → tiers per guide.
4. **Rail B predicted probabilities for choropleth:** Use `oof_barrier_probabilities.csv` (724,115 rows, leakage-safe) — NOT the 144,823-row test predictions in `results/xgb_predictions_*.csv`.

---

## 4. Step 1 completion criteria (Guide Section 26)

| Criterion | Met? |
|-----------|------|
| Every Section 10 file marked present/missing | YES |
| Row counts documented | YES |
| Stage 2 restricted Ns documented | YES |
| Gaps flagged (not fabricated) | YES |
| Summary CSVs built | NO — deferred to Steps 4–5 per roadmap |

**Step 1 status: COMPLETE** (verification only).  
**Dashboard build readiness: NOT READY** until missing upstream files are generated (Section 5 below).

---

## 5. Sign-off placeholders

| Owner | Confirmation needed |
|-------|---------------------|
| PBC | Stage 1 models + LR coefficients / AOR table for Explainability page |
| RBM | OOF probabilities + Stage 2 targets current |
| Parvati | RF SHAP PNGs + `rf_evaluation_results.csv` in standard path |
| Sharmila | XGBoost Stage 2 outputs + model comparison table |
