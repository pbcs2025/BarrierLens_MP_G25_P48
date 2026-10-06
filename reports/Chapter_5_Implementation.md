# CHAPTER 5 — IMPLEMENTATION


## 5.1 Implementation Overview

The BarrierLens system implements an end-to-end, two-stage machine learning architecture paired with explainable AI and interactive decision-support interfaces for analyzing healthcare-access barriers in India. Built upon the National Family Health Survey (NFHS-5) Individual Recode dataset (N = 724,115 women aged 15–49), the core pipeline translates raw demographic, socio-economic, and survey items into actionable risk intelligence.

As illustrated in Fig. 5.1, the implementation spans five sequential layers: (1) Data Ingestion and Preprocessing, (2) Stage 1 Healthcare-Access Barrier Prediction across three specific barrier domains (Household, Logistic, Facility), (3) Leakage-Free Out-of-Fold (OOF) Probability Extraction and K-Means Risk-Archetype Clustering, (4) Stage 2 Downstream Health Outcome Prediction evaluating barrier-information uplift, and (5) Explainable AI (SHAP TreeExplainer), interactive dashboard visualization, and an Ollama-backed AI research assistant.

![Fig. 5.1. Overall implementation workflow of the BarrierLens healthcare access risk prediction system.](plots/report/fig5_1_implementation_workflow.png)
*Fig. 5.1. Overall implementation workflow of the BarrierLens healthcare access risk prediction system.*


## 5.2 Dataset Preparation and Preprocessing

Data ingestion and feature preparation form the foundational layer of the BarrierLens pipeline. All preprocessing modules are modularized under src/preprocessing/ to ensure reproducible execution across raw survey extracts.


### 5.2.1 NFHS-5 Dataset Loading

The dataset loading pipeline is implemented in src/preprocessing/load_data.py. The module programmatically detects and ingests the raw NFHS-5 Individual Recode file, resolving between the primary Stata format (IAIR7EFL.DTA) and the fallback CSV extract (NFHS5_Individual.csv). The loading function resolves Stata variable labels and handles column aliases (e.g., mapping latest-birth antenatal visits m14_1 to m14). The default analytic sample rule (ANALYTIC_SAMPLE = 'full') retains all N = 724,115 surveyed women across India to preserve national representative weighting.


### 5.2.2 Data Cleaning and Missing-Value Handling

Implemented in src/preprocessing/clean.py, data cleaning processes missing values systematically according to demographic survey standards. Structural missingness—such as unasked questions for unmarried women or non-pregnant respondents—is preserved via explicit category encodings rather than simple imputation. Categorical variables are converted to clean lower-case string representations and one-hot encoded using src/preprocessing/encode.py. Numerical variables are standardized using StandardScaler via src/preprocessing/split_scale.py.


| Variable Category | NFHS-5 Source Variables | Engineered / Modeled Role | Sample Size / Missingness Rule |
| --- | --- | --- | --- |
| Identifiers | caseid, v001, v002, v021, v024, v025 | Stratification & Geographic Join Keys | Full N = 724,115; preserved without modeling |
| Background | v012, v013, v106, v130, v131, v501, v717 | Socioeconomic Features & Predictors | Categorical cleaned; missing encoded as explicit category |
| Household & Digital | v190, v169a, v170, v481 | Wealth, Mobile, Internet, Insurance | Constructs Digital Inclusion & Vulnerability Score |
| Media Exposure | v157, v158, v159 | Media Reading, Radio, TV Frequency | Normalized [0,1] scale for Media Exposure Index |
| Barrier Items | v467b, v467c, v467d, v467e, v467f, v467g, v467h, v467i | Stage 1 Binary Healthcare Barrier Targets | Zero missingness across analytic extract |
| Stage 2 Outcomes | m14 (ANC visits), v626a (Unmet FP need) | Downstream Health Outcome Targets | Restricted sample masks: ANC (N=163,018), FP (N=466,859) |
*Table 5.1. NFHS-5 Dataset Variables, Roles, and Preprocessing Specifications.*


### 5.2.3 Feature Engineering

Feature engineering logic in src/preprocessing/engineer_features.py constructs three composite indices prior to modeling: the Media Exposure Index, Digital Inclusion Index, and Vulnerability Score. Additionally, src/preprocessing/target_builder.py aggregates individual survey questions under v467 into three binary Stage 1 barrier targets.


## 5.3 Stage 1 — Healthcare Access Barrier Prediction

Stage 1 predicts whether a woman experiences severe healthcare-access barriers across three distinct domains. Four supervised machine learning algorithms are implemented and evaluated across all three targets.


### 5.3.1 Barrier Target Construction

Stage 1 binary barrier targets are constructed from eight raw survey items under v467 in NFHS-5, where respondents report whether specific factors represent a 'big problem' in obtaining medical treatment:

1. Target Household (target_household): Binary indicator (1 if v467b='big problem' [getting permission] OR v467c='big problem' [getting money]; else 0). Prevalence: 20.31%.

2. Target Logistic (target_logistic): Binary indicator (1 if v467d='big problem' [distance to facility] OR v467e='big problem' [getting transportation]; else 0). Prevalence: 24.58%.

3. Target Facility (target_facility): Binary indicator (1 if v467f='big problem' [not wanting to go alone], v467g='big problem' [no female provider], v467h='big problem' [no provider available], OR v467i='big problem' [no drugs available]; else 0). Prevalence: 42.19%.


### 5.3.2 Logistic Regression Implementation

Implemented in src/models/logistic_regression.py, Logistic Regression models are fitted using scikit-learn's LogisticRegression solver ('lbfgs', max_iter=1000, C=1.0, class_weight='balanced'). Feature scaling is applied using StandardScaler. Odds ratios e^beta are computed to assess factor associations.


### 5.3.3 Decision Tree Implementation

Implemented in src/models/decision_tree.py, Decision Tree models use the CART algorithm via DecisionTreeClassifier (max_depth=10, min_samples_leaf=50, class_weight='balanced'). This provides a non-linear baseline with readable decision split logic.


### 5.3.4 Random Forest Implementation

Implemented in src/models/random_forest.py and scripts/train_random_forest.py, Random Forest models fit an ensemble of 400 decision trees (n_estimators=400, max_depth=15, min_samples_leaf=75, class_weight='balanced', n_jobs=-1). Models are persisted to saved_models/stage1/ as joblib pickles.


### 5.3.5 XGBoost Implementation

Implemented in src/models/xgboost_model.py, XGBoost models use XGBClassifier with histogram-based tree building (tree_method='hist', n_estimators=100, max_depth=6, learning_rate=0.1, subsample=0.8, colsample_bytree=0.8). Class imbalance is handled using scale_pos_weight = count(neg)/count(pos).


### 5.3.6 Stage 1 Model Evaluation

All 12 Stage 1 model combinations (4 algorithms x 3 barrier targets) were evaluated on an 80/20 stratified hold-out split (N_train = 579,292; N_test = 144,823). Baseline accuracy and balanced imbalanced metrics are presented in Tables 5.2 and 5.3.


| Model Algorithm | Household Barrier (Train / Test) | Logistic Barrier (Train / Test) | Facility Barrier (Train / Test) |
| --- | --- | --- | --- |
| Logistic Regression | 0.7299 / 0.7298 | 0.6895 / 0.6896 | 0.5844 / 0.5819 |
| Decision Tree | 0.7306 / 0.7305 | 0.6900 / 0.6897 | 0.5837 / 0.5809 |
| Random Forest | 0.7312 / 0.7306 | 0.6928 / 0.6905 | 0.5926 / 0.5865 |
| XGBoost | 0.7322 / 0.7307 | 0.6936 / 0.6911 | 0.5931 / 0.5872 |
*Table 5.2. Baseline Train and Test Accuracy Comparison Across All 12 Stage 1 Models (Data source: outputs/stage1_results/train_test_accuracy.csv).*


| Barrier Target | XGBoost Accuracy | Precision | Recall | F1-Score | ROC-AUC |
| --- | --- | --- | --- | --- | --- |
| Household Barrier (target_household) | 0.6015 | 0.3679 | 0.6507 | 0.4701 | 0.6619 |
| Logistic Barrier (target_logistic) | 0.6055 | 0.4220 | 0.6718 | 0.5184 | 0.6696 |
| Facility Barrier (target_facility) | 0.5803 | 0.5385 | 0.6136 | 0.5736 | 0.6185 |
*Table 5.3. Imbalanced Evaluation Metrics for Stage 1 XGBoost Classifiers (Data source: results/xgb_metrics.csv).*

[Image missing: plots/stage1_lr_odds_ratios_3panel.png]

![Fig. 5.2. Stage 1 Logistic Regression odds ratios across household, logistic, and facility barrier targets.](plots/stage1_lr_odds_ratios_3panel.png)
*Fig. 5.2. Stage 1 Logistic Regression odds ratios across household, logistic, and facility barrier targets.*

![Fig. 5.3. Stage 1 XGBoost ROC curve and classification threshold analysis for household barrier prediction.](plots/xgb_household_roc.png)
*Fig. 5.3. Stage 1 XGBoost ROC curve and classification threshold analysis for household barrier prediction.*

![Fig. 5.4. Stage 1 XGBoost feature importance ranking for household barrier prediction.](plots/xgb_household_importance.png)
*Fig. 5.4. Stage 1 XGBoost feature importance ranking for household barrier prediction.*


## 5.4 Out-of-Fold Prediction and Stage 1–Stage 2 Integration

A critical architectural challenge in two-stage ML systems is preventing data leakage between Stage 1 barrier classifiers and Stage 2 outcome models. If in-sample predicted probabilities from fitted Stage 1 models were directly passed into Stage 2 models trained on the same rows, the downstream models would receive artificially optimistic barrier estimates.


### 5.4.1 Out-of-Fold Probability Generation

Implemented in src/preprocessing/stage2_integration.py, out-of-fold (OOF) prediction is executed via 3-fold Stratified Cross-Validation (StratifiedKFold, n_splits=3, shuffle=True, random_state=42). For each fold, an XGBoost model (max_depth=6, n_estimators=300, learning_rate=0.08, scale_pos_weight = neg/pos) is trained on 66.7% of the data and predicts probabilities on the remaining 33.3% hold-out fold. Concatenating these out-of-fold predictions generates leakage-free probability vectors across all N = 724,115 rows: household_barrier_prob, logistic_barrier_prob, and facility_barrier_prob. Checkpoints are persisted to outputs/stage2_results/oof_checkpoints/ as npy files.


### 5.4.2 Composite Barrier Score

The composite barrier exposure score integrates all three barrier domains into a single continuous metric representing overall healthcare access risk:

composite_barrier_score = (household_barrier_prob + logistic_barrier_prob + facility_barrier_prob) / 3

This composite score is saved alongside individual OOF probabilities in data/processed/stage2/oof_barrier_probabilities.csv.


## 5.5 Risk Index Construction

To capture broader social determinants of health, feature engineering logic in src/preprocessing/engineer_features.py constructs three domain-specific vulnerability indices.


### 5.5.1 Media Exposure Index

Constructed by averaging the normalized responses of three survey questions: v157 (frequency of reading newspaper), v158 (frequency of listening to radio), and v159 (frequency of watching TV). Each item is mapped from 0 ('not at all') to 1 ('almost every day'), yielding media_exposure_index in [0, 1].


### 5.5.2 Digital Inclusion Index

Combines mobile phone ownership (v169a) and internet usage (v170). Calculated as the mean of binary indicators for having a mobile phone and ever using the internet, yielding digital_inclusion_index in [0, 1].


### 5.5.3 Vulnerability Score

A composite indicator measuring socio-economic deprivation. Calculated by combining inverted wealth quintile (v190), female educational attainment (v106), and non-working employment status (v717), rescaled to vulnerability_score in [0, 1]. Higher values denote higher socio-economic vulnerability.


### 5.5.4 Composite Barrier Score

As defined in Section 5.4.2, the composite barrier score represents the arithmetic mean of out-of-fold household, logistic, and facility barrier probabilities. It acts as an overall summary of healthcare access exposure.


## 5.6 K-Means Risk Archetype Clustering

To segment women into actionable policy personas, unsupervised clustering is implemented in src/clustering/kmeans_cluster.py.


### 5.6.1 Clustering Feature Selection

Clustering is performed on six continuous features: media_exposure_index, digital_inclusion_index, vulnerability_score, household_barrier_prob, logistic_barrier_prob, and facility_barrier_prob.


### 5.6.2 Feature Standardization

All six features are standardized to zero mean and unit variance using StandardScaler. The scaler model is persisted to saved_models/stage2/kmeans_scaler.pkl.


### 5.6.3 Optimal Cluster Selection

MiniBatchKMeans (batch_size=4096, n_init=10, random_state=42) is evaluated across k in [2, 10] using silhouette analysis on a 20,000-row random subsample. As recorded in outputs/stage2_results/cluster_k_selection.csv, k = 2 achieves the maximum silhouette score of 0.3986.


### 5.6.4 Risk Archetype Generation

The final MiniBatchKMeans model (k = 2) is fitted on all N = 724,115 rows and persisted to saved_models/stage2/kmeans_model.pkl. Human-readable archetype names are assigned based on cluster mean profiles in src/clustering/kmeans_cluster.py:


| Cluster ID | Archetype Name | Woman Count (N) | % Share | Media Index | Digital Index | Vulnerability | Household Prob | Logistic Prob | Facility Prob | Composite Score |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | High Vulnerability, High Barrier Exposure | 383,077 | 52.9% | 0.3570 | 0.0787 | 0.7708 | 0.5887 | 0.5970 | 0.5744 | 0.5867 |
| 1 | High Media & Digital Inclusion | 341,038 | 47.1% | 0.9122 | 0.1237 | 0.2556 | 0.3562 | 0.3532 | 0.4120 | 0.3738 |
*Table 5.4. K-Means Risk Archetype Profiles (k = 2) Across N = 724,115 Surveyed Women (Data source: outputs/stage2_results/cluster_profiles.csv).*

![Fig. 5.5. K-Means risk-archetype distributions and feature profiles across population clusters.](plots/stage1_clustering_archetypes.png)
*Fig. 5.5. K-Means risk-archetype distributions and feature profiles across population clusters.*

> **Implementation Consistency Note:** *While the automated pipeline selected k = 2 based on peak silhouette score (0.3986), exploratory analyses in notebook 08_clustering.ipynb and earlier report drafts evaluated a 6-cluster partitioning (k = 6, silhouette = 0.2624) to provide finer granularity. The production pipeline persisted the 2-cluster model in saved_models/stage2/kmeans_model.pkl.*


## 5.7 Stage 2 — Health Outcome Prediction

Stage 2 evaluates whether Stage 1 healthcare access barrier probabilities provide predictive uplift for downstream maternal and reproductive health outcomes.


### 5.7.1 ANC Gap Target Construction

Implemented in src/preprocessing/stage2_integration.py, target_anc_gap is defined as 1 if a woman had < 4 antenatal care visits during her last pregnancy (m14 < 4), and 0 if she received 4+ visits. Women with no births in the reference period (m14 missing) are excluded, yielding a restricted sample of N = 163,018 women (Train: 130,414 | Test: 32,604; positive rate: 37.78%).


### 5.7.2 Unmet Family Planning Target Construction

target_unmet_fp is defined from survey item v626a. Restricting to valid analytical categories ('no unmet need', 'using for spacing', 'using for limiting', 'unmet need for spacing', 'unmet need for limiting'), target_unmet_fp is set to 1 for unmet need for spacing or limiting, and 0 otherwise. This yields a restricted sample of N = 466,859 women (Train: 373,487 | Test: 93,372; positive rate: 10.64%).


### 5.7.3 Stage 2 Logistic Regression

Implemented in src/models/stage2_logistic.py, separate Logistic Regression models (solver='lbfgs', max_iter=1000, class_weight='balanced') are trained per target on an 80/20 hold-out split.


### 5.7.4 Barrier-Information Uplift Evaluation

To evaluate whether barrier probabilities add predictive signal beyond socio-economic factors alone, 3-fold cross-validation compares a Baseline model (socioeconomic features only) against a Full model (socioeconomic + OOF barrier probabilities).


| Health Outcome Target | Sample Size (N) | Positive Rate | Holdout Accuracy | Baseline ROC-AUC | Full ROC-AUC | Barrier Uplift (Delta AUC) | 3-Fold CV AUC |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ANC Care Gap (target_anc_gap) | 163,018 | 37.78% | 0.5976 | 0.6354 | 0.6374 | +0.0020 (+0.20%) | 0.6374 |
| Unmet Family Planning (target_unmet_fp) | 466,859 | 10.64% | 0.5841 | 0.6567 | 0.6583 | +0.0017 (+0.17%) | 0.6584 |
*Table 5.5. Stage 2 Logistic Regression Performance and Barrier-Information ROC-AUC Uplift (Data source: outputs/stage2_results/logistic_evaluation_results.csv).*

![Fig. 5.6. Stage 2 Logistic Regression odds ratios for (a) ANC gap and (b) unmet family planning.](plots/stage2_lr_odds_ratios_2panel.png)
*Fig. 5.6. Stage 2 Logistic Regression odds ratios for (a) ANC gap and (b) unmet family planning.*

![Fig. 5.7. ROC-AUC comparison illustrating barrier-information uplift over socioeconomic baseline.](data/dashboard/powerbi/images/barrier_uplift_comparison.png)
*Fig. 5.7. ROC-AUC comparison illustrating barrier-information uplift over socioeconomic baseline.*


## 5.8 Explainable AI Implementation

To ensure research transparency and clinical interpretability, Explainable AI (XAI) is implemented in src/shap_analysis/stage2_shap.py using SHAP (SHapley Additive exPlanations).


### 5.8.1 SHAP-Based Feature Importance

SHAP TreeExplainer is applied to fitted Random Forest models. SHAP values are extracted for the positive outcome class across a background subsample of 2,000 test rows to compute mean absolute SHAP values mean(|SHAP|).


### 5.8.2 Stage 1 Model Explainability

Feature importance rankings for Stage 1 classifiers confirm that wealth quintile (v190), female literacy (v106), and decision-making autonomy (v743f) exert the strongest global impact on access barriers.


### 5.8.3 Stage 2 Model Explainability

For Stage 2 health outcome models, SHAP explanations confirm that Stage 1 barrier probabilities (particularly household_barrier_prob) act as significant risk-increasing factors, whereas higher educational attainment and digital inclusion exert protective (negative SHAP) effects.

![Fig. 5.8. Global SHAP beeswarm plot illustrating feature impact direction and magnitude for unmet family planning need.](dashboard/assets/images/shap_summary_target_unmet_fp.png)
*Fig. 5.8. Global SHAP beeswarm plot illustrating feature impact direction and magnitude for unmet family planning need.*

![Fig. 5.9. Local SHAP waterfall explanation for a representative highest-risk individual.](dashboard/assets/images/shap_waterfall_target_unmet_fp.png)
*Fig. 5.9. Local SHAP waterfall explanation for a representative highest-risk individual.*

![Fig. 5.10. Population cohort SHAP heatmap illustrating feature importance clustering across individuals.](dashboard/assets/images/shap_heatmap_target_unmet_fp.png)
*Fig. 5.10. Population cohort SHAP heatmap illustrating feature importance clustering across individuals.*


## 5.9 Dashboard Implementation

The BarrierLens user interface is implemented as a dual web application: a modular static HTML/JS dashboard (dashboard/index.html) and an enterprise PowerBI report (powerbi/BarrierLens.pbip).


### 5.9.1 Dashboard Architecture

The web dashboard uses a lightweight, client-side HTML5/JS structure with clean modular pages located in dashboard/pages/. Pre-rendered JSON datasets stored in dashboard/assets/data/ are generated via scripts/build_final_dashboard_tables.py.


### 5.9.2 Data Visualization

Visualizations are built using Plotly.js and Chart.js, rendering interactive choropleth maps of Indian states, demographic breakdown charts, and model comparison bar plots.


### 5.9.3 Risk Archetype Visualization

The Risk Archetypes page (dashboard/pages/risk_archetypes.html) displays interactive cluster breakdown cards, showing population counts, percentage shares, and radar charts of mean index profiles.


### 5.9.4 Barrier Prediction Views

National and state analysis pages (national_overview.html, state_analysis.html) provide geographic heatmaps comparing Household, Logistic, and Facility barrier prevalence across India.


### 5.9.5 Health Outcome Prediction Views

Outcome impact pages (outcome_impact.html) present predicted risk profiles for ANC Care Gap and Unmet Family Planning Need alongside baseline-vs-full model ROC-AUC uplift toggles.


### 5.9.6 Explainability Views

The Explainability page (explainability.html) integrates global SHAP beeswarm plots, mean |SHAP| bar charts, and individual waterfall visualizations.


## 5.10 Chatbot Implementation

The BarrierLens Research Intelligence Assistant is implemented as a dedicated Flask backend server communicating with a locally hosted Ollama LLM instance.


### 5.10.1 Chatbot Architecture

Implemented in backend/app.py, the backend runs a Flask WSGI application configured with CORS middleware (flask_cors). It exposes POST /api/chat for research Q&A and POST /api/predict-barrier for questionnaire-based risk predictions.


### 5.10.2 Query Processing

Route logic in backend/routes/chat.py validates incoming JSON payloads, extracting user questions, language settings (default 'en'), and multi-turn conversation history.


### 5.10.3 Evidence Retrieval

Evidence payloads containing pre-calculated survey indicators or model metrics are formatted by backend/services/prompt_service.py into structured context prompts.


### 5.10.4 Evidence-Grounded Response Generation

Implemented in backend/services/ollama_service.py, the service sends grounded system prompts to Ollama's HTTP API (model: llama3.2:3b). If Ollama is offline, a deterministic fallback service returns verified project metrics.


### 5.10.5 Chatbot Interface

The chatbot frontend widget is integrated directly into the web dashboard interface, offering multi-turn conversational support and guided barrier questionnaire prediction.


## 5.11 System Integration

System integration binds the pipeline components into a cohesive workflow. Data flows seamlessly from raw NFHS-5 survey ingestion through Stage 1 OOF predictions, feature indices, clustering, Stage 2 outcome prediction, SHAP explanation, interactive dashboard rendering, and Ollama chatbot API serving.


## 5.12 Implementation Issues and Resolutions

During pipeline development, several technical and methodological challenges were encountered and resolved:


| ID | Technical Issue / Challenge | Empirical Resolution | Verification Status |
| --- | --- | --- | --- |
| ISS-01 | XGBoost Feature Name Error on Dummy Columns | Added _sanitize_feature_names() stripping [, ], < characters before XGBoost calls. | Resolved (src/preprocessing/stage2_integration.py) |
| ISS-02 | Data Leakage in Stage 2 Predictors | Replaced fitted Stage 1 model predictions with 3-fold Stratified OOF cross_val_predict. | Resolved (src/preprocessing/stage2_integration.py) |
| ISS-03 | Silently Inflated Positives in v626a Unmet Need | Replaced substring str.contains('unmet need') with explicit isin() against positive categories. | Resolved (src/preprocessing/stage2_integration.py) |
| ISS-04 | Missing m14 Variable in 32-Column CSV Extract | Added automatic fallback to Stata DTA loader (IAIR7EFL.DTA) to extract m14_1 ANC visits. | Resolved (src/preprocessing/load_data.py) |
| ISS-05 | Ollama LLM Offline Downtime in Dashboard Chatbot | Implemented deterministic fallback service returning pre-indexed project metrics when Ollama API is offline. | Resolved (backend/services/ollama_service.py) |
*Table 5.6. Summary of Technical Implementation Challenges, Resolutions, and Status.*


## 5.13 Algorithms

The algorithmic logic of the BarrierLens system is formalized in the seven structured pseudocode specifications below.


**Algorithm 1 — Stage 1 Healthcare Access Barrier Prediction Pipeline**
```
Input: NFHS-5 raw dataset D, barrier target key t in {household, logistic, facility}
Output: Fitted models M_t, train/test accuracy evaluation metrics

1: Load dataset D via load_stage1_data(), set analytic sample N = 724,115
2: Clean missing values D_clean = handle_missing(D)
3: Construct binary target y_t = build_targets(D_clean, t)
4: Engineer indices: media_exposure_index, digital_inclusion_index, vulnerability_score
5: Encode categorical features X_encoded = encode_features(D_clean)
6: Split 80/20 train/test: (X_train, X_test, y_train, y_test)
7: Scale features: X_train_scaled = StandardScaler().fit_transform(X_train)
8: Fit classifiers:
     - LogisticRegression(class_weight='balanced', solver='lbfgs')
     - DecisionTreeClassifier(max_depth=10, min_samples_leaf=50)
     - RandomForestClassifier(n_estimators=400, max_depth=15, class_weight='balanced')
     - XGBClassifier(n_estimators=100, max_depth=6, scale_pos_weight=neg/pos)
9: Compute and return accuracy, precision, recall, F1, and ROC-AUC on X_test
```


**Algorithm 2 — Out-of-Fold Barrier Probability Generation**
```
Input: Cleaned feature matrix X, Stage 1 targets y_household, y_logistic, y_facility
Output: Leakage-free OOF probability matrix P_OOF in R^{N x 3}

1: Sanitize feature names X_clean = _sanitize_feature_names(X)
2: Initialize StratifiedKFold(n_splits=3, shuffle=True, random_state=42)
3: For each barrier target t in {household, logistic, facility}:
4:   Initialize XGBClassifier(max_depth=6, n_estimators=300, scale_pos_weight=neg/pos)
5:   P_OOF[:, t] = cross_val_predict(XGB, X_clean, y_t, cv=3, method='predict_proba')[:, 1]
6:   Persist checkpoint checkpoint_dir / f"{t}_barrier_prob.npy"
7: Return DataFrame P_OOF containing household_barrier_prob, logistic_barrier_prob, facility_barrier_prob
```


**Algorithm 3 — Composite Barrier Score & Vulnerability Index Construction**
```
Input: Raw survey features v157, v158, v159, v169a, v170, v190, v106, v717, and P_OOF
Output: Engineered indices array

1: media_exposure_index = Mean(Norm(v157), Norm(v158), Norm(v159)) in [0, 1]
2: digital_inclusion_index = Mean(Binary(v169a), Binary(v170)) in [0, 1]
3: vulnerability_score = Rescale(Invert(v190) + Invert(v106) + Binary(v717_not_working)) in [0, 1]
4: composite_barrier_score = (P_OOF['household'] + P_OOF['logistic'] + P_OOF['facility']) / 3
5: Return combined feature frame containing all four engineered indices
```


**Algorithm 4 — MiniBatchKMeans Risk Archetype Clustering**
```
Input: Standardized 6-feature matrix X_cluster (indices + OOF probabilities), range k in [2, 10]
Output: Cluster labels vector, saved model and scaler

1: Scale features: X_scaled = StandardScaler().fit_transform(X_cluster)
2: For k = 2 to 10:
3:   Fit MiniBatchKMeans(n_clusters=k, batch_size=4096) on 20,000-row random subsample
4:   Compute silhouette score S(k)
5: Select optimal k* = argmax S(k) (k* = 2, S = 0.3986)
6: Fit final MiniBatchKMeans(n_clusters=2) on full N = 724,115 matrix
7: Assign human-readable archetype names from cluster mean profiles:
     - Cluster 0: 'High Vulnerability, High Barrier Exposure'
     - Cluster 1: 'High Media & Digital Inclusion'
8: Save model to kmeans_model.pkl and scaler to kmeans_scaler.pkl
```


**Algorithm 5 — Stage 2 Health Outcome Prediction & Barrier Uplift Evaluation**
```
Input: Full feature matrix X_stage2, targets target_anc_gap, target_unmet_fp
Output: Logistic Regression models, evaluation metrics, barrier ROC-AUC uplift

1: For each health outcome target y_target:
2:   Filter valid analytic sample (mask missing structural rows)
3:   Split socio-economic features X_socio and full features X_full (including OOF probs)
4:   Split 80/20 train/test: (X_tr, X_te, y_tr, y_te)
5:   Scale: X_tr_scaled = StandardScaler().fit_transform(X_tr)
6:   Train LogisticRegression(solver='lbfgs', max_iter=1000, class_weight='balanced')
7:   Evaluate holdout metrics: Accuracy, ROC-AUC, Precision, Recall, F1
8:   Run 3-fold CV for Baseline model (X_socio) -> AUC_baseline
9:   Run 3-fold CV for Full model (X_full) -> AUC_full
10:  Compute Uplift = AUC_full - AUC_baseline
11:  Save model bundle and coefficients to outputs/stage2_results/
```


**Algorithm 6 — SHAP Explainability Engine**
```
Input: Fitted Stage 2 RandomForestClassifier, test feature sample X_sample (N = 2,000)
Output: SHAP explanation object, Beeswarm summary, Bar plot, Waterfall plot, Heatmap

1: Clean feature names X_clean = _sanitize_feature_names(X_sample)
2: Instantiate shap.TreeExplainer(model)
3: Compute raw SHAP values: shap_vals = explainer.shap_values(X_clean)[:, :, 1]
4: Compute mean absolute SHAP value per feature: mean_abs_shap = Mean(|shap_vals|, axis=0)
5: Generate plots:
     - _beeswarm_plot(): direction and magnitude per feature
     - _bar_plot(): top 15 features ranked by mean |SHAP|
     - _waterfall_plot(): local explanation for highest-risk individual
     - _heatmap_plot(): population cohort feature impact heatmap
6: Save summary CSV to shap_importance_{target}.csv
```


**Algorithm 7 — Flask REST Backend & Evidence-Grounded Ollama Chatbot Pipeline**
```
Input: User HTTP POST request to /api/chat with question, language, and optional evidence payload
Output: Grounded JSON response object

1: Receive request payload: extract question, language, history, evidence
2: If question is empty: return HTTP 400 validation_error
3: If evidence status == 'unavailable': return HTTP 200 formatted unavailable response
4: Construct system prompt inserting verified evidence payload and multi-turn history
5: Query local Ollama service via HTTP POST http://localhost:11434/api/generate (model: llama3.2:3b)
6: If Ollama responds: parse LLM answer text, attach evidence source citations
7: Else (Ollama offline): execute deterministic fallback service returning pre-indexed project metrics
8: Return JSON response containing status, answer, intent, source, metrics, evidence_used
```
