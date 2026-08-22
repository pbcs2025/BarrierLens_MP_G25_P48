# BarrierLens (P48) Global Label & Naming Audit Report

**Date:** August 2026  
**Project ID:** P48 — Women's Healthcare Access Research Project (WHCARP)  
**Methodological Base:** Pradhan & De (2025), *BMC Health Services Research*, 25:323  
**Dataset:** NFHS-5 Individual Recode (`NFHS5_Individual.csv`, 724,115 women)  

---

## 1. Executive Summary & Audit Scope

This document provides a comprehensive audit of **all labels, variable names, display mappings, model outputs, cluster archetypes, dashboard fields, Power BI annotations, and platform UI terms** across the entire BarrierLens codebase.

The audit was conducted against 10 strict criteria:
1. **Semantic Correctness:** Verifying that labels accurately describe the underlying variable definition.
2. **User Accessibility:** Ensuring terminology is intuitive for non-technical users and domain experts.
3. **Consistency:** Eliminating duplicate or conflicting terms for the same concept.
4. **Target Precision:** Documenting exact `0` vs `1` binary definitions for Stage 1 and Stage 2 targets.
5. **Feature Mapping:** Preserving machine-readable column names while establishing human-readable display mappings.
6. **Categorical Validity:** Verifying codebook value mappings (e.g. DHS `v626a` and `m14`).
7. **Model Output Clarity:** Removing ambiguous terms (`pred`, `label`, `prob`) in user-facing outputs.
8. **Cluster Interpretability:** Replacing arbitrary numbers (`Cluster 0`) with evidence-based archetype profiles.
9. **Dashboard & Power BI Alignment:** Ensuring display labels match Power BI TMDL annotations and static dashboard JSON fields.
10. **Research Validity:** Strict adherence to Pradhan & De (2025) and DHS NFHS-5 recode standards.

---

## 2. Global Terminology Dictionary

| Concept / Internal Variable | Physical / Code Name | Recommended Display Label | Audit Status | Meaning / Research Definition |
|---|---|---|---|---|
| Household Barrier Target | `target_household` | Household & Autonomy Barrier | CORRECT | 1 = Big problem on permission (`v467b`), money (`v467c`), or solo travel (`v467f`) (~26.9% prevalence) |
| Logistic Barrier Target | `target_logistic` | Distance & Transport Barrier | CORRECT | 1 = Big problem on facility distance (`v467d`) or transport (`v467e`) (~31.8% prevalence) |
| Facility Barrier Target | `target_facility` | Facility Quality & Resource Barrier | CORRECT | 1 = Big problem on provider gender (`v467g`), provider absence (`v467h`), or drug absence (`v467i`) (~46.1% prevalence) |
| Family Planning Target | `target_unmet_fp` | Unmet Need for Family Planning | CORRECT | 1 = Unmet need for spacing/limiting from DHS `v626a`. Restricted N = 466,859 (10.6% positive rate) |
| Antenatal Care Target | `target_anc_gap` | Inadequate Antenatal Care (<4 Visits) | CORRECT | 1 = Fewer than 4 ANC visits (`m14 < 4`) per WHO/NFHS minimum. Restricted N = 163,018 (37.8% positive rate) |
| Age Cohort | `v013` | Age Group (5-year cohorts) | NEEDS IMPROVEMENT | DHS 5-year age group categories (15-19 through 45-49) |
| Residence Type | `v025` | Residence Type (Urban vs Rural) | CORRECT | 1 = Urban, 2 = Rural in raw extract; mapped to binary 1=Rural in features |
| Educational Attainment | `v106` | Educational Attainment | CORRECT | 0 = No education, 1 = Primary, 2 = Secondary, 3 = Higher |
| Religion | `v130` | Religion | CORRECT | Hindu, Muslim, Christian, Sikh, Buddhist, Jain, Other |
| Caste / Tribe | `v131` | Caste / Tribal Identity | CORRECT | Scheduled Caste (SC), Scheduled Tribe (ST), OBC, Other |
| Wealth Index | `v190` | Household Wealth Index | CORRECT | Quintiles: Poorest, Poorer, Middle, Richer, Richest |
| Health Insurance | `v481` | Health Insurance Coverage | CORRECT | 0 = No coverage, 1 = Covered by health scheme/insurance |
| Marital Status | `v501` | Marital Status | CORRECT | Currently married, Never married, Widowed, Divorced, Separated |
| Media Exposure Index | `media_exposure_index` | Mass Media Exposure Index (0–3) | CORRECT | Composite count of weekly reading, radio, and television access |
| Digital Inclusion Index | `digital_inclusion_index` | Digital Inclusion Index (0–2) | CORRECT | Composite count of mobile phone ownership and internet usage |
| Vulnerability Score | `vulnerability_score` | Composite Vulnerability Score (0–4) | CORRECT | Composite index of rural residence, low education, low wealth, no insurance |
| Composite Barrier Score | `composite_barrier_score` | Composite Barrier Exposure Index (0–3) | CORRECT | Sum of predicted Stage 1 barrier probabilities |
| Cluster Assignment | `cluster` | Risk Cluster Archetype | NEEDS IMPROVEMENT | MiniBatchKMeans segment (0, 1, 2, 3) mapped to evidence-based archetype names |

---

## 3. Comprehensive Label Audit Table

| Location | Current Label | Meaning | Correct? | Recommended Label | Reason | Action |
|---|---|---|---|---|---|---|
| `data/processed/y_household.csv` | `target_household` | Binary indicator for household & autonomy barrier | CORRECT | Household & Autonomy Barrier | Scientifically accurate binary target | Keep CSV column name, add display label |
| `data/processed/y_logistic.csv` | `target_logistic` | Binary indicator for distance & transport barrier | CORRECT | Distance & Transport Barrier | Scientifically accurate binary target | Keep CSV column name, add display label |
| `data/processed/y_facility.csv` | `target_facility` | Binary indicator for facility quality barrier | CORRECT | Facility Quality & Resource Barrier | Scientifically accurate binary target | Keep CSV column name, add display label |
| `data/processed/stage2/y_stage2_targets.csv` | `target_unmet_fp` | DHS `v626a` unmet family planning need | CORRECT | Unmet Need for Family Planning | Matches DHS recode definition | Keep CSV column name, add display label |
| `data/processed/stage2/y_stage2_targets.csv` | `target_anc_gap` | DHS `m14 < 4` inadequate ANC visits | CORRECT | Inadequate Antenatal Care (<4 Visits) | Direct WHO/NFHS standard measure | Keep CSV column name, add display label |
| `src/clustering/kmeans_cluster.py` | `cluster` | Numeric cluster cluster ID (0..K-1) | TECHNICAL ONLY | Risk Cluster Archetype | Raw cluster numbers lack domain context | Add `archetype_name` mapping in profiles |
| `saved_models/stage2/kmeans_model.pkl` | `Cluster 0`, `Cluster 1` | Cluster centroids | TECHNICAL ONLY | Archetype profiles | Model outputs need readable labels | Mapped via `name_cluster_archetypes` |
| `outputs/stage1_results/model_comparison_table.csv` | `ROC-AUC`, `F1-Score` | Standard ML performance metrics | CORRECT | ROC-AUC, F1-Score | Standard technical evaluation metrics | Retain exact metric labels |
| `scripts/apply_display_names.py` | `pred_household_prob` | Model predicted probability | CORRECT | Predicted Household Barrier Probability | Clear Power BI display label | Retained in TMDL annotations |
| `dashboard/index.html` | `Page A`, `Page B` | Dashboard navigation tabs | NEEDS IMPROVEMENT | Executive Overview, Base Paper Comparison | Professional navigation titles | Mapped in site shell |
| `platform/app.py` | `vulnerability_score` | Input slider for vulnerability | CORRECT | Composite Socioeconomic Vulnerability Score | User-friendly input description | Displayed with context tooltip |

---

## 4. Stage 1 & Stage 2 Target Definitions (Research Grounding)

### Stage 1 Barrier Targets (Sample Size: 724,115 women)

1. **`target_household` (Household & Autonomy Barrier):**
   - **Source Items:** `v467b` (getting permission to go), `v467c` (getting money needed for treatment), `v467f` (not wanting to go alone).
   - **Rule:** `1` if at least one item is reported as "big problem", else `0`.
   - **Observed Prevalence:** 26.9% positive (194,545 women).

2. **`target_logistic` (Distance & Transport Barrier):**
   - **Source Items:** `v467d` (distance to health facility), `v467e` (having to take transport).
   - **Rule:** `1` if at least one item is reported as "big problem", else `0`.
   - **Observed Prevalence:** 31.8% positive (230,064 women).

3. **`target_facility` (Facility Quality & Resource Barrier):**
   - **Source Items:** `v467g` (concern no female provider), `v467h` (concern no provider available), `v467i` (concern no drugs available).
   - **Rule:** `1` if at least one item is reported as "big problem", else `0`.
   - **Observed Prevalence:** 46.1% positive (333,785 women).

### Stage 2 Outcome Targets (Restricted Analytic Samples)

1. **`target_unmet_fp` (Unmet Need for Family Planning):**
   - **Source Item:** `v626a` (DHS standard unmet need category).
   - **Rule:** `1` if `unmet need for spacing` or `unmet need for limiting`; `0` if `no unmet need` or `using for spacing/limiting`.
   - **Exclusion:** Women with non-applicable categories (never married, infecund, menopausal) are excluded (not imputed).
   - **Restricted Analytic N:** 466,859 women (64.5% of full sample). Positive rate: 10.6%.

2. **`target_anc_gap` (Inadequate Antenatal Care):**
   - **Source Item:** `m14` (number of ANC visits during pregnancy for most recent birth).
   - **Rule:** `1` if `m14 < 4` (below WHO/NFHS standard of 4 minimum visits); `0` if `m14 >= 4`.
   - **Exclusion:** Women with no birth in reference period (NaN in `m14`) are excluded.
   - **Restricted Analytic N:** 163,018 women (22.5% of full sample). Positive rate: 37.8%.

---

## 5. Risk Cluster Archetype Mappings

The MiniBatchKMeans clustering model segments women into distinct risk archetypes based on 6 core features: `media_exposure_index`, `digital_inclusion_index`, `vulnerability_score`, `household_barrier_prob`, `logistic_barrier_prob`, and `facility_barrier_prob`.

| Cluster ID | Archetype Name | Dominant Characteristics | Policy Focus |
|---|---|---|---|
| **Cluster 0** | **Low Vulnerability, High Digital Inclusion** | High education, urban residence, high media & digital access, low barrier exposure | Digital health services & routine preventive care |
| **Cluster 1** | **High Vulnerability, Multi-Barrier Constrained** | Rural, low wealth, low media access, high household & distance barriers | Doorstep care delivery, mHealth, economic support |
| **Cluster 2** | **Rural Facility-Constrained** | Rural, moderate wealth, severe facility quality & drug shortage barrier exposure | Sub-center infrastructure & medical supply chain improvement |
| **Cluster 3** | **Urban Logistic & Transport Strained** | Urban/peri-urban, working women, high transport & time constraint barrier exposure | Extended clinic hours & urban health center connectivity |

---

## 6. Actionable Implementation Rules

1. **Machine-Readable Preservation:** Retain physical CSV column names (`target_household`, `v013`, `v190`, `v626a`) in all backend data processing, ML model inputs, and pandas operations to prevent pipeline breakages.
2. **Centralized Display Mapping:** Use `src/evaluation/feature_labels.py` and `scripts/apply_display_names.py` for all plot axes, tooltips, Power BI TMDL annotations, and Streamlit UI labels.
3. **No Guesswork:** All categorical value mappings conform strictly to DHS NFHS-5 codebook definitions.
