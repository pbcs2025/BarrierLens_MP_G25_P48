# Stage 1 XGBoost Report — BarrierLens (P48)

## Hyperparameters

- `n_estimators`: 400
- `max_depth`: 6
- `learning_rate`: 0.08
- `subsample`: 0.8
- `colsample_bytree`: 0.8
- `tree_method`: hist
- `eval_metric`: auc
- `random_state`: 42
- `n_jobs`: -1
- `scale_pos_weight`: computed per target (negatives / positives)

## Dataset Statistics

- **Total samples**: 724,115
- **Features**: 37
- **Train/test split**: 80/20 stratified (via `split_and_scale`)
- **Scaling**: StandardScaler fit on training fold only

## Class Balance

- **household barriers**: 527,477 low-barrier / 196,638 high-barrier (positive rate 27.16%, scale_pos_weight = 2.6825)
- **logistic barriers**: 495,248 low-barrier / 228,867 high-barrier (positive rate 31.61%, scale_pos_weight = 2.1639)
- **facility barriers**: 390,968 low-barrier / 333,147 high-barrier (positive rate 46.01%, scale_pos_weight = 1.1736)

## Evaluation Metrics (Hold-out Test Set)

| Model | Target | Accuracy | Precision | Recall | F1-Score | ROC-AUC |
| --- | --- | --- | --- | --- | --- | --- |
| XGBoost | household barriers | 0.6015 | 0.3679 | 0.6507 | 0.4701 | 0.6619 |
| XGBoost | logistic barriers | 0.6055 | 0.422 | 0.6718 | 0.5184 | 0.6696 |
| XGBoost | facility barriers | 0.5803 | 0.5385 | 0.6136 | 0.5736 | 0.6185 |

## Best Performing Target

**logistic barriers** achieved the highest ROC-AUC (**0.6696**),
making it the strongest barrier prediction task among the three Stage 1 targets for XGBoost.

## Top Important Features

### Household Barriers
  1. Wealth index (0.4080)
  2. Caste/tribe: No caste/tribe (0.0397)
  3. VULNERABILITY: Score (0.0358)
  4. Education (0.0351)
  5. Religion: Hindu (0.0302)
  6. Religion: Christian (0.0292)
  7. Caste/tribe: Scheduled tribe (0.0267)
  8. Media exposure (0.0238)
  9. Marital status: Widowed (0.0207)
  10. Religion: Muslim (0.0206)
### Logistic Barriers
  1. VULNERABILITY: Score (0.2529)
  2. Wealth index (0.2230)
  3. Caste/tribe: Scheduled tribe (0.0480)
  4. Religion: Christian (0.0309)
  5. Education (0.0259)
  6. Religion: Hindu (0.0245)
  7. Religion: Other (0.0227)
  8. Caste/tribe: Missing (0.0202)
  9. Media exposure (0.0199)
  10. Caste/tribe: No caste/tribe (0.0196)
### Facility Barriers
  1. Wealth index (0.2186)
  2. Religion: Sikh (0.1129)
  3. VULNERABILITY: Score (0.0991)
  4. Religion: Christian (0.0526)
  5. Caste/tribe: Scheduled tribe (0.0325)
  6. Religion: Other (0.0288)
  7. Caste/tribe: No caste/tribe (0.0281)
  8. Religion: Hindu (0.0263)
  9. Clean cooking fuel: Yes (0.0251)
  10. Education (0.0245)

## Observations

- XGBoost uses histogram-based training (`tree_method='hist'`) for tractable fit on large NFHS-5 samples.
- Per-target `scale_pos_weight` addresses restored class imbalance without SMOTE.
- Household barriers are typically the most separable target; facility barriers are often the hardest.
- Feature importances highlight socioeconomic, media exposure, and autonomy-related predictors.

## Limitations

- Hold-out metrics reflect a single stratified split; they do not capture temporal or geographic drift.
- Feature importances indicate association, not causal effects on healthcare access.
- Models are trained on proxy-derived binary targets rather than direct barrier survey responses for all women.

## Future Improvements

- Add stratified k-fold cross-validation for stability intervals on ROC-AUC.
- Tune `n_estimators` and `max_depth` with a stratified subsample via `sample_for_speed`.
- Integrate SHAP values for local explainability alongside global gain importances.
- Compare calibrated probabilities against logistic regression AORs for policy interpretability.
