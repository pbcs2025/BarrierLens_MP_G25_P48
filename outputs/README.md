# BarrierLens Implementation Documentation

This folder contains **as-built** documentation for the BarrierLens P48 pipeline. These files describe what was **actually implemented** in code and on disk, mapped against the plans in:

- `docs/Stage1_Implementation_Guide_v5.docx` (individual-level Stage 1 rebuild)
- `docs/Stage2_Implementation_Guide_v2.docx` (individual-level Stage 2 rebuild)

> **Note:** The `.docx` guides are specifications. These README files are the implementation record. Where the code diverges from the guide, both are noted explicitly.

---

## Document index

| File | Contents |
|------|----------|
| [README_Stage1_Implementation.md](README_Stage1_Implementation.md) | Data loading, preprocessing, feature matrix, three barrier targets, four models (LR / DT / RF / XGB), training setup |
| [README_Stage2_Implementation.md](README_Stage2_Implementation.md) | OOF barrier probabilities, K-Means clustering, two health-outcome targets, Stage 2 LR / RF / XGBoost, barrier-uplift analysis |
| [README_Explainability_Guide.md](README_Explainability_Guide.md) | What SHAP and related plots explain, how to read each graph type, Stage 1 vs Stage 2 explainability |

---

## Pipeline at a glance

```
NFHS-5 individual file (724,115 women)
        │
        ▼
┌───────────────────────────────────────┐
│  STAGE 1 — Barrier classification     │
│  Predict: household / logistic /      │
│  facility barrier (3 binary targets)  │
│  Models: LR, Decision Tree, RF, XGB   │
│  Features: 37 encoded columns         │
└───────────────────────────────────────┘
        │
        ▼  (3-fold OOF XGBoost probabilities — leakage-safe)
┌───────────────────────────────────────┐
│  STAGE 2 — Outcome impact + clustering│
│  Cluster: 6 variables → k=2 archetypes│
│  Predict: ANC gap, unmet FP need     │
│  Models: LR, RF, XGB (+ SHAP)       │
│  Features: 43 columns (37 + OOF +     │
│            composite + cluster dummies)│
└───────────────────────────────────────┘
        │
        ▼
Dashboard / Power BI tables (`data/dashboard/`)
```

---

## Key numbers (verified on disk)

| Item | Value |
|------|-------|
| Analytic sample | 724,115 women (full NFHS-5 extract) |
| Stage 1 feature columns | 37 (`data/processed/X_features.csv`) |
| Stage 1 targets | household 27.2%, logistic 31.6%, facility 46.0% positive |
| OOF barrier probabilities | 724,115 rows × 4 columns (3 probs + composite) |
| K-Means clusters chosen | **k = 2** (silhouette 0.399 on 20,000-row subsample) |
| Stage 2 target: `target_unmet_fp` | 466,859 valid rows; 10.6% positive |
| Stage 2 target: `target_anc_gap` | 163,018 valid rows; 37.8% positive (m14 &lt; 4 visits) |

---

## Primary artefact locations

| Stage | Processed data | Models | Results |
|-------|----------------|--------|---------|
| 1 | `data/processed/X_features.csv`, `y_*.csv` | `saved_models/stage1/*.pkl` (12 files) | `outputs/stage1_results/` |
| 2 | `data/processed/stage2/` | `saved_models/stage2/` | `outputs/stage2_results/` |

---

## How to regenerate

| Step | Command / notebook |
|------|-------------------|
| Stage 1 preprocessing + all 12 models | `python scripts/run_stage1_pipeline.py` or `notebooks/01_preprocessing.ipynb` + notebooks 02–06 |
| Stage 2 data integration + clustering | `python scripts/run_stage2_data_prep.py` or `notebooks/07_data_integration.ipynb` + `08_clustering.ipynb` |
| Stage 2 logistic regression | `python -m src.models.stage2_logistic` or `notebooks/09_stage2_logistic.ipynb` |
| Stage 2 random forest + SHAP | `python -m src.models.stage2_random_forest` or `notebooks/10_stage2_random_forest.ipynb` |
| Stage 2 XGBoost + SHAP | `python -m src.models.stage2_xgboost` or `notebooks/11_stage2_xgboost.ipynb` |
| Model comparison | `notebooks/12_stage2_model_compare.ipynb` |

---

## Implementation status (honest summary)

| Component | Status |
|-----------|--------|
| Stage 1 preprocessing + 12 models | **Done** — models and processed CSVs on disk |
| Stage 2 OOF probabilities + targets | **Done** |
| K-Means clustering (k=2) | **Done** — assignments + profiles saved |
| Stage 2 Logistic Regression (both targets) | **Done** — metrics in `logistic_evaluation_results.csv` |
| Stage 2 Random Forest + XGBoost | **Code complete**; metrics for `target_unmet_fp` in `data/dashboard/powerbi/model_comparison_table.csv`; re-run notebooks 10–11 to refresh `saved_models/stage2/` if `.pkl` files are missing |
| Stage 1 SHAP plots | Partial — some plots under `data/dashboard/powerbi/images/` |
| Stage 2 SHAP plots | Partial — RF/XGB SHAP PNGs for `target_unmet_fp` in dashboard images folder |

For file-level verification details see `data/dashboard/verification_log.md` (some entries may reflect an earlier environment; always check the paths above first).
