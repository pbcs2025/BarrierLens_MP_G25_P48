# MEMBER 2 — BARRIERLENS ML PREDICTION ADAPTER & EVIDENCE ENGINE

**Component**: Member 2 — Evidence Engine + ML Prediction Adapter  
**Project**: BarrierLens P48 (AI-Driven Healthcare Access Barrier Analytics Platform)  
**Status**: Verified & Operational  
**Data Grounding**: Verified NFHS-5 Dataset ($N = 227,391$ Indian women).  
**Models**: Frozen Stage 1 XGBoost Classifiers (`models/xgb_household.pkl`, `models/xgb_logistic.pkl`, `models/xgb_facility.pkl`).

---

## 1. Member 2 Scope & Core Responsibilities

Member 2 owns:
1. **BarrierLens Evidence Engine**: Deterministic evidence retrieval, provenance tracking, percentage-point difference calculations, and solution-sufficiency checks across 11 verified JSON datasets.
2. **ML Prediction Adapter**: `backend/prediction_adapter.py` executing deterministic model inference on user-provided respondent attributes without retraining frozen models.
3. **Deterministic Model Inference**: Strict adherence to the exact 37-feature matrix order, training-time `StandardScaler` reconstruction, and XGBoost `predict_proba()`.
4. **Backend Prediction REST API**: `POST /api/predict-barrier` endpoint on Flask backend.
5. **Dual Label Representation**: Strict enforcement of internal NFHS variable codes (`v012`, `v025`, etc.) internally, authoritative human-readable labels externally, and combined format `<Label> (<Code>)` in validation/developer logs.
6. **Handoff Contracts**: Formal integration specifications for Member 1 (NLP), Member 3 (UI), and Member 4 (Reporting).

---

## 2. Dataset Verification & Analytic Sample

- **Source File**: `data/raw/NFHS5_Individual.csv`
- **Total Records**: 227,391 women ($N = 227,391$)
- **Raw Columns**: 32 fields (identifiers, demographic, socioeconomic, media, autonomy, barrier items, stage 2 indicators).
- **Analytic Sample**: Full dataset extract ($N = 227,391$).

---

## 3. Raw Field Dictionary & Authoritative Human-Readable Labels

All field labels strictly match `Column_names.pdf`:

| NFHS Code | Authoritative Human-Readable Label | Data Type | Required | Derivable | Derivation Rule |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `caseid` | Unique respondent ID | String | Yes | No | Direct identifier |
| `v001` | Cluster (Primary Sampling Unit) number | Numeric | Yes | No | Direct sampling PSU |
| `v002` | Household number | Numeric | Yes | No | Direct household ID |
| `v021` | Sample cluster number | Numeric | Yes | No | Direct cluster ID |
| `v024` | State/Union Territory | Categorical | Yes | No | State code string |
| `v025` | Type of residence (Urban/Rural) | Categorical | Yes | No | Urban or Rural |
| `v012` | Respondent's current age | Numeric | Yes | No | Continuous years (15–49) |
| `v013` | Age group (5-year groups) | Categorical | Yes | Yes | Binned from `v012` (15-19 ... 45-49) |
| `v106` | Highest educational level | Categorical | Yes | No | No education, Primary, Secondary, Higher |
| `v130` | Religion | Categorical | Yes | No | Hindu, Muslim, Christian, Sikh, etc. |
| `v131` | Caste/Tribe | Categorical | Yes | No | No caste / tribe, Tribe, Missing |
| `v501` | Current marital status | Categorical | Yes | No | Married, Never in union, Separated, Widowed |
| `v717` | Current occupation | Categorical | Yes | No | Not working, Professional, Clerical, etc. |
| `v190` | Wealth index quintile | Categorical | Yes | No | Poorest, Poorer, Middle, Richer, Richest |
| `v169a` | Household has a mobile phone | Categorical | No | No | Yes / No |
| `v170` | Household has a bank account | Categorical | No | No | Yes / No |
| `v481` | Covered by health insurance | Categorical | No | No | Yes / No |
| `v157` | Frequency of reading newspapers/magazines | Categorical | No | No | Not at all, Less than once a week, etc. |
| `v158` | Frequency of listening to radio | Categorical | No | No | Not at all, Less than once a week, etc. |
| `v159` | Frequency of watching television | Categorical | No | No | Not at all, Less than once a week, etc. |
| `v743f` | Respondent owns a mobile phone | Categorical | No | No | Respondent alone, + partner, etc. |
| `v466` | Owns and uses the internet | Categorical | No | No | Dropped in extract (100% missing) |
| `v467b` | Used the internet in the last 12 months | Categorical | No | No | Household barrier source |
| `v467c` | Frequency of internet use | Categorical | No | No | Household barrier source |
| `v467d` | Uses internet almost every day | Categorical | No | No | Logistic barrier source |
| `v467e` | Uses internet at least once a week | Categorical | No | No | Logistic barrier source |
| `v467g` | Uses internet less than once a week | Categorical | No | No | Facility barrier source |
| `v467h` | Never uses the internet | Categorical | No | No | Facility barrier source |
| `v626a` | Unmet need for family planning | Categorical | No | No | Stage 2 utilization metric |

---

## 4. Feature Engineering & Composite Indices

Composite indices are calculated in `engineer_features.py`:
1. `media_exposure_index`: Mean ordinal score of `v157`, `v158`, `v159` (range 0.0 to 2.0).
2. `digital_inclusion_index`: Mean binary score of household mobile phone (`v169a`) and bank account (`v170`) (range 0.0 to 1.0).
3. `vulnerability_score`: Composite vulnerability metric derived as:
   $$\text{Vulnerability} = 0.35 \times (\text{Wealth} \le \text{Poorer}) + 0.25 \times \text{Rural} + 0.20 \times (\text{Education} \le \text{None}) + 0.20 \times (\text{Media} \le \text{Median})$$

---

## 5. Exact 37-Feature Matrix & Column Order

The frozen XGBoost models expect this exact 37-feature matrix order:

```
 1. v012
 2. v013
 3. v106
 4. v190
 5. media_exposure_index
 6. digital_inclusion_index
 7. vulnerability_score
 8. v130_christian
 9. v130_hindu
10. v130_jain
11. v130_jewish
12. v130_muslim
13. v130_no religion
14. v130_other
15. v130_parsi / zoroastrian
16. v130_sikh
17. v131_missing
18. v131_no caste / tribe
19. v131_tribe
20. v501_married
21. v501_never in union  [includes: married gauna not performed]
22. v501_no longer living together/separated
23. v501_widowed
24. v717_clerical
25. v717_missing
26. v717_not working
27. v717_other
28. v717_professional / technical / managerial
29. v717_sales
30. v717_services / household and domestic
31. v717_skilled and unskilled manual
32. v743f_husband/partner has no earnings
33. v743f_missing
34. v743f_other
35. v743f_respondent alone
36. v743f_respondent and husband/partner
37. v481_yes
```

---

## 6. Categorical Encoding & Scaler Reconstruction

- **Encoding Logic**: Ordinal variables (`v013`, `v106`, `v190`) are mapped to integer ranks. Residence (`v025`) is mapped to binary $1 = \text{urban}, 0 = \text{rural}$. Nominal fields (`v130`, `v131`, `v501`, `v717`, `v743f`, `v481`) are one-hot encoded using `pd.get_dummies(..., drop_first=True)`.
- **Scaler Reconstruction**: Reconstructed deterministically using `split_and_scale(..., random_state=42, test_size=0.20)`. The `StandardScaler` fits once during application initialization and caches `mean_` and `scale_`. No scaling fitting occurs during user inference requests.

---

## 7. Frozen Model Inventory & Performance

Three frozen XGBoost classifiers stored in `models/`:
1. `models/xgb_household.pkl`: Predicts household barriers (`n_features_in_ = 37`).
2. `models/xgb_logistic.pkl`: Predicts logistic barriers (`n_features_in_ = 37`).
3. `models/xgb_facility.pkl`: Predicts facility barriers (`n_features_in_ = 37`).

---

## 8. Backend REST API Specification

### Endpoint: `POST /api/predict-barrier`

#### Request JSON Schema:
```json
{
  "v012": 28,
  "v025": "urban",
  "v106": "secondary",
  "v130": "hindu",
  "v131": "no caste / tribe",
  "v501": "married",
  "v717": "not working",
  "v190": "middle",
  "v481": "no",
  "v157": "not at all",
  "v158": "not at all",
  "v159": "at least once a week"
}
```

#### Success Response (HTTP 200):
```json
{
  "status": "success",
  "primaryBarrier": "logistic",
  "primaryBarrierLabel": "Logistic Barrier",
  "probabilities": {
    "household": 0.2845,
    "logistic": 0.6120,
    "facility": 0.4510
  },
  "predictions": {
    "household": 0,
    "logistic": 1,
    "facility": 0
  },
  "metadata": {
    "features_count": 37,
    "model_provenance": ["xgb_household.pkl", "xgb_logistic.pkl", "xgb_facility.pkl"]
  }
}
```

#### Validation Error Response (HTTP 400):
```json
{
  "status": "validation_error",
  "error": "Missing required field: 'Current occupation' (v717).",
  "primaryBarrier": null,
  "primaryBarrierLabel": null,
  "probabilities": {},
  "predictions": {}
}
```

---

## 9. Handoff Contracts

### Member 1 (NLP & Question Generator) Handoff:
Member 1 collects guided questions using the exact schema:
- `v012` $\rightarrow$ Respondent's current age (Required, Numeric)
- `v013` $\rightarrow$ Age group (5-year groups) (Required, Auto-derived from `v012`)
- `v106` $\rightarrow$ Highest educational level (Required, Categorical)
- `v130` $\rightarrow$ Religion (Required, Categorical)
- `v131` $\rightarrow$ Caste/Tribe (Required, Categorical)
- `v501` $\rightarrow$ Current marital status (Required, Categorical)
- `v717` $\rightarrow$ Current occupation (Required, Categorical)
- `v190` $\rightarrow$ Wealth index quintile (Required, Categorical)

### Member 3 (UI & Chat Widget) Handoff:
Member 3 consumes `POST /api/predict-barrier` response:
- Displays `primaryBarrierLabel` ("Household Barrier", "Logistic Barrier", "Facility Barrier").
- Visualizes probability gauge for `probabilities.household`, `probabilities.logistic`, `probabilities.facility`.
- Uses `externalResearchRequired` flag from Evidence Engine for fallback handling.

### Member 4 (Reporting Engine) Handoff:
Member 4 compiles PDF research reports incorporating:
- Model predictions and primary barrier label.
- Provenance metadata (`source`, `sourceKey`, `path`, `label`, `value`, `unit`).
- Derived percentage-point comparisons (`derived: true`).

---

## 10. Automated Test Results

- **Python ML Adapter Test Suite**: 7/7 tests PASSED (`tests/test_member2_prediction_adapter.py`).
- **JS Evidence Engine Test Suite**: 60/60 assertions PASSED (`tests/chatbot/member2-evidence.test.js`).
- **Regression Check**: Zero breaking changes to existing chatbot and backend routes.
