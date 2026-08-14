# Stage 1 Implementation — As Built

**Guide reference:** `Stage1_Implementation_Guide_v5.docx`  
**Purpose:** Classify whether an individual woman faces **household**, **logistic**, or **facility** healthcare-access barriers, using NFHS-5 individual-level data (same unit of analysis as Pradhan & De, 2025).

---

## 1. What Stage 1 does

Stage 1 answers: *"Given a woman's demographics and socioeconomic profile, does she report a significant barrier to healthcare access?"*

It trains **four model types** on **three separate binary targets** (12 models total):

| Model | Role in project |
|-------|-----------------|
| **Logistic Regression** | Interpretable odds ratios — comparable to the base paper's AOR table |
| **Decision Tree** | Simple decision rules for demonstration |
| **Random Forest** | Non-linear patterns + SHAP feature importance |
| **XGBoost** | Best predictive performance; also used later for OOF probabilities in Stage 2 |

There is **no Decision Tree in Stage 2** (by design — see Stage 2 guide Section 5).

---

## 2. Data source and sample

| Item | Implementation |
|------|----------------|
| Primary raw file | `data/raw/IAIR7EFL.DTA` (Stata DHS recode) |
| Working CSV | `data/raw/NFHS5_Individual.csv` |
| Unit of analysis | **One row = one woman** |
| Sample size | **724,115 women** (full extract) |
| Analytic sample rule | `ANALYTIC_SAMPLE = "full"` in `src/preprocessing/load_data.py` |

The guide allows switching to `"ever_married"` (~108K, closer to the base paper). The current build uses the **full 724K sample** because all barrier questions (v467b–h) have zero missingness in this extract.

**India-specific note:** `v467f` (companion) and `v467i` (no drugs) are **absent** from the India extract. Targets are built from available columns only — this is intentional, not an error.

---

## 3. Raw columns loaded

Defined in `src/preprocessing/load_data.py`:

| Group | Columns | Used as |
|-------|---------|---------|
| Identifiers | caseid, v001, v002, v021, **v024 (state)**, **v025 (residence)** | Dropped before modelling (not in `X_features.csv`) |
| Background | v012, v013, v106, v130, v131, v501, v717 | Features |
| Household | v190, v169a, v170, v481 | Features (phone/bank folded into indices) |
| Media | v157, v158, v159 | Features → `media_exposure_index` |
| Autonomy | v743f (v466 empty — dropped) | Feature |
| Barriers | v467b–v467h (+ f/i if present) | **Targets only** — never used as predictors |
| Stage 2 reference | v626a, m14 | Loaded but excluded from Stage 1 X |
| Leakage guard | s245a, s245b, s245h | Excluded entirely |

---

## 4. Preprocessing pipeline

Executed by `notebooks/01_preprocessing.ipynb` or `scripts/run_stage1_pipeline.py`:

```
load_stage1_data()
    → handle_missing()      # DHS special codes → NaN; categorical → "missing"
    → build_targets()       # three binary barrier targets (OR logic)
    → engineer_features()   # composite indices
    → encode_features()     # ordinals + one-hot dummies
    → save CSVs
```

### 4.1 Target construction (`src/preprocessing/target_builder.py`)

Each target = **1 if ANY source item is `"big problem"`**, else 0:

| Target column | Source NFHS items | Positive rate (actual) |
|---------------|-------------------|------------------------|
| `target_household` | v467b (permission), v467c (money) | **27.2%** (196,638) |
| `target_logistic` | v467d (distance), v467e (transport) | **31.6%** (228,867) |
| `target_facility` | v467g (no female provider), v467h (no provider) | **46.0%** (333,147) |

After target construction, raw v467 columns are **dropped** so they cannot leak into features.

### 4.2 Engineered features (`src/preprocessing/engineer_features.py`)

| Feature | Formula / logic |
|---------|-----------------|
| `media_exposure_index` | Mean ordinal score of v157, v158, v159 (0=not at all → 2=at least weekly) |
| `digital_inclusion_index` | Mean of binary mobile (v169a) and bank account (v170) |
| `vulnerability_score` | Weighted composite: low wealth (35%) + rural residence (25%) + low education (20%) + low media (20%) |

> Rural residence enters `vulnerability_score` during engineering, but **v025 itself is dropped** as an identifier before encoding — so there is no standalone urban/rural column in `X_features.csv`.

### 4.3 Encoding (`src/preprocessing/encode.py`)

| Variable type | Columns | Encoding |
|---------------|---------|----------|
| Numeric age | v012 | Kept as numeric (median-imputed if missing) |
| Ordinal | v013 (age group), v106 (education), v190 (wealth) | Mapped to 0–n integer scores |
| Nominal | v130, v131, v501, v717, v743f, v481 | One-hot with `drop_first=True` |
| Engineered | media_exposure_index, digital_inclusion_index, vulnerability_score | Kept as numeric |
| Dropped after engineering | v157–v159, v169a, v170 | Absorbed into composite indices |

**Final feature matrix: 724,115 × 37 columns** → saved as `data/processed/X_features.csv`.

Example column groups in the saved matrix:
- Demographics: v012, v013, v106, one-hot religion/caste/marital/occupation/autonomy
- Socioeconomic: v190 (wealth quintile 0–4), v481_yes (insurance)
- Composites: media_exposure_index, digital_inclusion_index, vulnerability_score

---

## 5. Model training — what each model uses

### 5.1 Feature columns

**All four Stage 1 models use the same 37 columns** — the entire `X_features.csv` matrix. There is no feature subsetting per model.

**What they do NOT use:**
- Barrier source columns (v467*) — these are the targets
- Identifiers (caseid, state v024, etc.)
- Stage 2 columns (m14, v626a)
- Leakage columns (s245a/b/h)

### 5.2 Train/test split

From `src/preprocessing/split_scale.py`:

| Setting | Value |
|---------|-------|
| Split | 80% train / 20% test |
| Stratification | Yes, on target class |
| Random seed | 42 |
| Scaling | `StandardScaler` fit on train only, applied to all four models |
| SMOTE | **Off** (`use_smote=False`) — imbalance handled via `class_weight='balanced'` |

Train sizes (~579K) and test sizes (~145K) per target.

### 5.3 Model-specific settings

| Model | Key hyperparameters | Saved as |
|-------|---------------------|----------|
| **Logistic Regression** | GridSearchCV over C ∈ {0.1, 1, 10, 100}, 5-fold CV, `class_weight='balanced'` | `saved_models/stage1/logistic_regression_{target}.pkl` |
| **Decision Tree** | GridSearchCV: max_depth 6–10, min_samples_split 500–1000, min_samples_leaf 200–500 | `decision_tree_{target}.pkl` |
| **Random Forest** | n_estimators=400, max_depth=15, min_samples_leaf=75, `class_weight='balanced'` | `random_forest_{target}.pkl` |
| **XGBoost** | n_estimators=100–400, max_depth=6, lr=0.08–0.1, `tree_method='hist'`, `scale_pos_weight=neg/pos` | `xgboost_{target}.pkl` |

Targets `{target}` = `household`, `logistic`, `facility`.

### 5.4 What each model predicts

Each model outputs **P(barrier = 1)** for one barrier category:

| Target key | Question being predicted |
|------------|--------------------------|
| `household` | Does the woman report permission or money as a "big problem" for healthcare? |
| `logistic` | Does she report distance or transport as a "big problem"? |
| `facility` | Does she report provider availability as a "big problem"? |

---

## 6. Reported performance (actual runs)

### 6.1 Train/test accuracy (`outputs/stage1_results/train_test_accuracy.csv`)

| Model | household (test) | logistic (test) | facility (test) |
|-------|------------------|-----------------|-----------------|
| Logistic Regression | 0.730 | 0.690 | 0.582 |
| Decision Tree | 0.731 | 0.690 | 0.581 |
| Random Forest | 0.731 | 0.691 | 0.587 |
| XGBoost | 0.731 | 0.691 | 0.587 |

Accuracy is misleading for imbalanced targets — **ROC-AUC is the primary metric** (guide Section 7).

### 6.2 Logistic Regression ROC-AUC (`outputs/stage1_results/logistic_results.csv`)

| Target | ROC-AUC | CV AUC |
|--------|---------|--------|
| household | 0.657 | 0.658 |
| logistic | 0.662 | 0.661 |
| facility | 0.611 | 0.612 |

Comparable to the base paper's reported AUC range of 0.63–0.68.

---

## 7. Outputs on disk

| Path | Description |
|------|-------------|
| `data/processed/X_features.csv` | Encoded feature matrix (724,115 × 37) |
| `data/processed/y_household.csv` | Binary household barrier target |
| `data/processed/y_logistic.csv` | Binary logistic barrier target |
| `data/processed/y_facility.csv` | Binary facility barrier target |
| `saved_models/stage1/*.pkl` | 12 trained models (4 algorithms × 3 targets) |
| `outputs/stage1_results/train_test_accuracy.csv` | Accuracy summary |
| `outputs/stage1_results/logistic_results.csv` | LR metrics with CV |
| `outputs/stage1_results/confusion_matrices/` | Confusion matrix PNGs |
| `outputs/stage1_results/roc_curves/` | ROC curve PNGs |

---

## 8. Notebooks and code ownership (per guide)

| Notebook | Content | Owner |
|----------|---------|-------|
| `00_data_exploration.ipynb` | EDA | Team |
| `01_preprocessing.ipynb` | Full preprocessing pipeline | PBC |
| `02_stage1_logistic.ipynb` | LR + odds ratios | PBC |
| `03_stage1_decision_tree.ipynb` | Decision trees | RBM |
| `04_stage1_random_forest.ipynb` | RF + SHAP | Parvati |
| `05_stage1_xgboost.ipynb` | XGBoost + SHAP | Sharmila |
| `06_stage1_model_compare.ipynb` | Compare all 12 models | Sharmila |

Core reusable modules: `src/preprocessing/`, `src/models/logistic_regression.py`, `decision_tree.py`, `random_forest.py`, `xgboost_model.py`, `src/evaluation/metrics.py`.

---

## 9. Differences from the guide (if any)

| Guide expectation | Actual implementation |
|-------------------|----------------------|
| Feature count "37" in data/README | Confirmed: 37 columns in saved CSV |
| v025 (urban/rural) as model feature | v025 dropped as identifier; rural signal captured inside `vulnerability_score` only |
| v467f/i in household/facility targets | Absent in India extract — targets use b+c and g+h only |
| SMOTE optional | Not used; `class_weight='balanced'` instead |
| State (v024) preserved for dashboard | Dropped during encoding — must be re-joined from raw file for state-level dashboard views |

---

## 10. How Stage 1 connects to Stage 2

Stage 1 outputs feed Stage 2 in two ways:

1. **`X_features.csv`** — reused as the socioeconomic feature block in Stage 2 models.
2. **Stage 1 XGBoost models** — not used directly for Stage 2 features (that would leak). Instead, **fresh 3-fold out-of-fold (OOF) XGBoost probabilities** are computed in `src/preprocessing/stage2_integration.py` and saved as `household_barrier_prob`, `logistic_barrier_prob`, `facility_barrier_prob`.

See [README_Stage2_Implementation.md](README_Stage2_Implementation.md) for the integration step.
