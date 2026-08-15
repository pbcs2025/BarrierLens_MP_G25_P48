# Stage 2 Implementation — As Built

**Guide reference:** `Stage2_Implementation_Guide_v2.docx`  
**Purpose:** Model how **barrier exposure** (from Stage 1) relates to **health outcomes**, segment women into **risk archetypes** via clustering, and test whether adding barrier probabilities improves outcome prediction beyond socioeconomic features alone.

---

## 1. What Stage 2 does (in plain language)

Stage 2 asks two research questions:

1. **Clustering:** Do women fall into distinct risk groups when we combine their socioeconomic profile with their predicted barrier exposure?
2. **Outcome modelling:** After accounting for demographics, does knowing a woman's barrier probabilities help predict adverse health outcomes (inadequate antenatal care, unmet family planning need)?

Stage 2 uses **three models** (no Decision Tree):

| Model | Owner (guide) | Why |
|-------|---------------|-----|
| Logistic Regression | PBC | Odds ratios — direct comparison with base paper AOR |
| Random Forest | Parvati | SHAP explainability for non-linear effects |
| XGBoost | Sharmila | Strongest predictive performance + SHAP |

---

## 2. Stage 2 targets — what we predict

Both targets come from columns in the raw NFHS extract (`src/preprocessing/stage2_integration.py`).

### Target 1: Antenatal care gap (`target_anc_gap`)

| Attribute | Value |
|-----------|-------|
| Source column | **m14** — number of ANC visits for most recent birth |
| Rule | `1` if m14 &lt; 4 (WHO/NFHS minimum), else `0` |
| Structural missingness | NaN for women with no birth in reference period |
| **Actual restricted N** | **163,018** women (22.5% of full sample) |
| **Positive rate** | **37.8%** (inadequate ANC) |

### Target 2: Unmet family planning need (`target_unmet_fp`)

| Attribute | Value |
|-----------|-------|
| Source column | **v626a** — DHS unmet-need category |
| Valid categories | `no unmet need`, `using for spacing/limiting`, `unmet need for spacing/limiting` |
| Rule | `1` if label is `unmet need for spacing` or `unmet need for limiting` |
| Structural missingness | Never-married / not applicable women excluded (not imputed) |
| **Actual restricted N** | **466,859** women (64.5% of full sample) |
| **Positive rate** | **10.6%** |

> **Important:** Each target is trained on **its own restricted sample**. Rows with NaN for a target are dropped for that model only — never median-imputed.

> **Leakage guard:** s245a/b/h (reasons a complication went untreated) are excluded from both targets and features — they restate barrier logic.

Saved to: `data/processed/stage2/y_stage2_targets.csv`

---

## 3. Stage 1 → Stage 2 integration (OOF probabilities)

**Module:** `src/preprocessing/stage2_integration.py`  
**Notebook:** `07_data_integration.ipynb`  
**Script:** `scripts/run_stage2_data_prep.py`

### Why OOF (out-of-fold) probabilities?

If we used fitted Stage 1 models to score the same rows they were trained on, ~579K training rows would get **overconfident** probabilities. Stage 2 would silently inherit that leakage.

**Fix:** `cross_val_predict` with 3-fold stratified CV trains fresh XGBoost models on each fold and predicts only the held-out fold.

### OOF model settings

```python
XGBClassifier(
    max_depth=6, n_estimators=300, learning_rate=0.08,
    subsample=0.8, colsample_bytree=0.8,
    tree_method='hist',
    scale_pos_weight=neg/pos,
    random_state=42
)
```

### OOF outputs (per woman, 724,115 rows)

| Column | Meaning |
|--------|---------|
| `household_barrier_prob` | OOF P(household barrier = 1) |
| `logistic_barrier_prob` | OOF P(logistic barrier = 1) |
| `facility_barrier_prob` | OOF P(facility barrier = 1) |
| `composite_barrier_score` | Mean of the three probabilities above |

Saved to: `data/processed/stage2/oof_barrier_probabilities.csv`  
Checkpoints: `outputs/stage2_results/oof_checkpoints/*.npy`

---

## 4. K-Means clustering — how grouping works

**Module:** `src/clustering/kmeans_cluster.py`  
**Notebook:** `08_clustering.ipynb`

### 4.1 What clustering runs on

Clustering uses **6 features only** — not the full 37-column matrix:

| Feature | Type | Role |
|---------|------|------|
| `media_exposure_index` | Engineered (Stage 1) | Protective / empowerment signal |
| `digital_inclusion_index` | Engineered (Stage 1) | Phone + bank access |
| `vulnerability_score` | Engineered (Stage 1) | Risk stratification composite |
| `household_barrier_prob` | OOF (Stage 1) | Predicted household barrier exposure |
| `logistic_barrier_prob` | OOF (Stage 1) | Predicted logistic barrier exposure |
| `facility_barrier_prob` | OOF (Stage 1) | Predicted facility barrier exposure |

These 6 columns are extracted from `X_stage2_preclustering.csv` (which also contains all 37 Stage 1 features + 4 OOF columns = **41 columns total** for the pre-clustering file).

### 4.2 Algorithm and k selection

| Step | Implementation |
|------|----------------|
| Scaling | `StandardScaler` on the 6 clustering features |
| k search | k = 2 to 10 |
| Silhouette scoring | On a **random 20,000-row subsample** (not full 724K — too slow) |
| Final fit | **MiniBatchKMeans** on all 724,115 rows, `batch_size=4096`, `n_init=10` |
| Chosen k | **k = 2** (silhouette = **0.399** — highest among tested values) |

Silhouette scores saved in: `outputs/stage2_results/cluster_k_selection.csv`

### 4.3 Final cluster groups (actual results)

From `outputs/stage2_results/cluster_profiles.csv`:

| Cluster | Archetype name | N women | Share | Key profile |
|---------|----------------|---------|-------|-------------|
| **0** | High Vulnerability, High Barrier Exposure | 383,077 | 52.9% | Low media (0.36), low digital (0.08), **high vulnerability (0.77)**, **high barrier probs (~0.57–0.59)** |
| **1** | High Media & Digital Inclusion | 341,038 | 47.1% | High media (0.91), higher digital (0.12), **low vulnerability (0.26)**, **lower barrier probs (~0.35–0.41)** |

**How archetype names are assigned:** `name_cluster_archetypes()` compares each cluster's mean feature values to dataset-wide medians and applies rule-based labels (e.g. high vulnerability + high barrier → "High Vulnerability, High Barrier Exposure").

### 4.4 Clustering outputs

| File | Content |
|------|---------|
| `outputs/stage2_results/cluster_assignments.csv` | One cluster label (0 or 1) per woman |
| `outputs/stage2_results/cluster_profiles.csv` | Mean feature values + archetype name per cluster |
| `outputs/stage2_results/cluster_k_selection.csv` | Silhouette score for each k tested |
| `saved_models/stage2/kmeans_model.pkl` | Fitted MiniBatchKMeans |
| `saved_models/stage2/kmeans_scaler.pkl` | StandardScaler for clustering features |

### 4.5 How cluster labels enter Stage 2 models

After clustering, cluster labels are **one-hot encoded** and appended to the feature matrix:

```python
cluster_dummies = pd.get_dummies(clusters, prefix='cluster')  # cluster_0, cluster_1
X_full = pd.concat([X_preclustering, cluster_dummies], axis=1)
```

With k=2, this adds **2 dummy columns** → final modelling matrix shape: **(724,115 × 43)**.

---

## 5. Stage 2 feature matrix — what each model uses

### 5.1 Column breakdown (43 total after clustering)

| Block | Columns | Count |
|-------|---------|-------|
| Stage 1 socioeconomic features | All columns from `X_features.csv` | 37 |
| OOF barrier probabilities | household, logistic, facility | 3 |
| Composite barrier score | composite_barrier_score | 1 |
| Cluster dummies | cluster_0, cluster_1 | 2 |
| **Total** | | **43** |

Built by: `load_stage2_data()` in `src/models/stage2_xgboost.py`

### 5.2 Two feature sets for barrier-uplift comparison

Every Stage 2 model runs a **barrier-uplift test** comparing:

| Feature set | Includes | Excludes |
|-------------|----------|----------|
| **Socioeconomic-only (baseline)** | All 37 Stage 1 features | OOF barrier probs, composite_barrier_score, cluster dummies |
| **Full model** | All 43 columns | — |

Function: `split_feature_sets()` in `src/models/stage2_xgboost.py`

**Uplift metric:** Δ ROC-AUC = AUC(full) − AUC(socioeconomic-only), computed via 3-fold CV (`src/evaluation/stage2_metrics.py` → `compute_barrier_uplift()`).

This is the core evidence for the paper's claim that barrier exposure adds predictive signal beyond demographics.

---

## 6. Model training details

Common settings for all three Stage 2 models:

| Setting | Value |
|---------|-------|
| Split | 80% train / 20% test, stratified, `random_state=42` |
| Per-target filtering | Drop rows where target is NaN **before** split |
| Imbalance | `class_weight='balanced'` (LR, RF) or `scale_pos_weight` (XGB) |

### 6.1 Logistic Regression (`src/models/stage2_logistic.py`)

| Aspect | Detail |
|--------|--------|
| Architecture | **Two separate models** (one per target) — not MultiOutputClassifier |
| Features | All 43 columns (full set), **StandardScaler** applied |
| Hyperparameters | `solver='lbfgs'`, `C=1.0`, `max_iter=1000`, `class_weight='balanced'` |
| Saved models | `saved_models/stage2/stage2_logistic_{target}.pkl` (includes scaler + feature names) |
| Coefficients | `outputs/stage2_results/logistic_coefficients_{target}.csv` |

**Actual results** (`outputs/stage2_results/logistic_evaluation_results.csv`):

| Target | N (train/test) | ROC-AUC | CV AUC | Barrier uplift |
|--------|----------------|---------|--------|----------------|
| target_anc_gap | 130,414 / 32,604 | 0.636 | 0.637 | **+0.0020** |
| target_unmet_fp | 373,487 / 93,372 | 0.659 | 0.658 | **+0.0017** |

Top LR predictors for unmet FP (by odds ratio): marital status, autonomy missing, **household_barrier_prob**, education (v106).

### 6.2 Random Forest (`src/models/stage2_random_forest.py`)

| Aspect | Detail |
|--------|--------|
| Features | All 43 columns — **no scaling** (tree-based) |
| Default params | n_estimators=300, max_depth=15, `class_weight='balanced'` |
| Tuning | RandomizedSearchCV on 50K subsample (10 iterations, 3-fold CV) |
| SHAP | TreeExplainer on 2,000-row test subsample |
| Extra outputs | Feature importance, permutation importance, classification report CSVs |

**Actual results** (from `data/dashboard/powerbi/model_comparison_table.csv`, target_unmet_fp):

| Metric | Value |
|--------|-------|
| ROC-AUC | 0.666 |
| CV ROC-AUC | 0.665 |
| Barrier uplift | −0.0001 (negligible) |

### 6.3 XGBoost (`src/models/stage2_xgboost.py`)

| Aspect | Detail |
|--------|--------|
| Features | All 43 columns — **no scaling** |
| Tuning | GridSearchCV on 80K subsample: n_estimators ∈ {300,350,400}, max_depth ∈ {5,6,7} |
| Best params (actual) | n_estimators=300, max_depth=5 |
| SHAP | TreeExplainer on 5,000-row test subsample |

**Actual results** (target_unmet_fp):

| Metric | Value |
|--------|-------|
| ROC-AUC | 0.668 |
| CV ROC-AUC | 0.665 |
| Barrier uplift | −0.0022 |

> **Note on uplift:** Small or slightly negative uplift on hold-out/CV does not mean barrier probabilities are unimportant — it means socioeconomic features already capture much of the same signal at this scale. SHAP analysis still shows barrier probabilities among top predictors for individual-level explanation.

---

## 7. What each model predicts — summary table

| Model | Input columns | Predicts | Sample | Output type |
|-------|---------------|----------|--------|-------------|
| Stage 2 LR | 43 (scaled) | P(target_anc_gap=1) or P(target_unmet_fp=1) | Restricted per target | Probability + odds ratios |
| Stage 2 RF | 43 (raw) | Same | Restricted per target | Probability + SHAP |
| Stage 2 XGB | 43 (raw) | Same | Restricted per target | Probability + SHAP |

**Neither model predicts barrier types directly** — barriers enter Stage 2 only as **input features** (OOF probabilities from Stage 1).

---

## 8. Pipeline execution order

```
07_data_integration.ipynb / stage2_integration.py
    ├── Build OOF barrier probabilities (3-fold CV XGBoost)
    ├── Build target_anc_gap and target_unmet_fp
    └── Save oof_barrier_probabilities.csv, y_stage2_targets.csv

scripts/run_stage2_data_prep.py
    ├── Merge X_features + OOF → X_stage2_preclustering.csv (41 cols)
    ├── MiniBatchKMeans → cluster_assignments.csv
    └── cluster_profiles.csv

09_stage2_logistic.ipynb / stage2_logistic.py
    ├── Append cluster dummies → 43-col matrix
    ├── Train 2 LR models (one per target)
    └── Barrier-uplift + coefficient CSVs

10_stage2_random_forest.ipynb / stage2_random_forest.py
    └── Train RF + SHAP for each available target

11_stage2_xgboost.ipynb / stage2_xgboost.py
    └── Train XGB + SHAP for each available target

12_stage2_model_compare.ipynb
    └── Merge metrics → model_comparison_table.csv
```

---

## 9. Key outputs on disk

| Path | Description |
|------|-------------|
| `data/processed/stage2/X_stage2_preclustering.csv` | 724,115 × 41 (features + OOF, no cluster dummies) |
| `data/processed/stage2/y_stage2_targets.csv` | Two targets with structural NaNs |
| `data/processed/stage2/oof_barrier_probabilities.csv` | Leakage-safe barrier probabilities |
| `outputs/stage2_results/cluster_assignments.csv` | Per-woman cluster label |
| `outputs/stage2_results/cluster_profiles.csv` | Cluster archetypes and means |
| `outputs/stage2_results/logistic_evaluation_results.csv` | LR metrics both targets |
| `outputs/stage2_results/logistic_coefficients_*.csv` | Odds ratios per target |
| `data/dashboard/powerbi/model_comparison_table.csv` | RF + XGB comparison (unmet FP) |
| `saved_models/stage2/stage2_logistic_*.pkl` | Trained LR bundles |
| `saved_models/stage2/kmeans_*.pkl` | Clustering model + scaler |

SHAP plots (when generated): `data/dashboard/powerbi/images/` and/or `outputs/stage2_results/shap/`

---

## 10. Differences from the guide

| Guide expectation | Actual implementation |
|-------------------|----------------------|
| MiniBatchKMeans at 724K | Implemented as specified |
| k chosen via silhouette on 20K subsample | k=2 chosen (silhouette 0.399) |
| Two Stage 2 targets | Both built; m14 available with 163K valid rows |
| MultiOutputClassifier for LR | **Not used** — two separate LR models (cleaner with different restricted samples) |
| Barrier uplift as core Stage 2 claim | Implemented; uplift small (~+0.002 for LR) on CV |
| State-level choropleth from clusters | Deferred to dashboard phase — woman-level labels must be aggregated by v024 |
| RF/XGB .pkl in saved_models/stage2 | LR + kmeans confirmed; RF/XGB may need re-run of notebooks 10–11 |

---

## 11. How to read the clustering result for presentations

**One-sentence summary:** The NFHS-5 population splits into two nearly equal groups — one with high socioeconomic vulnerability and high predicted barrier exposure (~53%), and one with better media/digital access and lower predicted barriers (~47%).

**Policy framing:** Cluster 0 ("High Vulnerability, High Barrier Exposure") is the priority segment for intervention — they combine structural disadvantage with the highest mean barrier probabilities across all three barrier types.

For graph interpretation of SHAP and model explainability outputs, see [README_Explainability_Guide.md](README_Explainability_Guide.md).
