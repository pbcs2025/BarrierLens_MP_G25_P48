# BARRIERLENS — MEMBER 1 SYSTEM ARCHITECTURE & INTEGRATION CONTRACT

**Component**: Member 1 — NLP + Retrieval + Evidence Engine  
**Project**: BarrierLens P48 (Research Intelligence Assistant)  
**Status**: Verified & Deployed  
**Data Grounding**: Strictly reads from verified datasets in `dashboard/assets/data/` (N = 724,115 Indian women, NFHS-5).

---

## 1. System Architecture

Member 1 serves as the deterministic, data-grounded intelligence layer. It executes completely without requiring an LLM or backend service, transforming user natural language into structured, traceable evidence packages.

```
USER QUERY (Text, Language)
          │
          ▼
┌──────────────────────────────────┐
│  1. QUERY NORMALIZATION          │  (intent-engine.js)
└──────────────────────────────────┘
          │
          ▼
┌──────────────────────────────────┐
│  2. ENTITY EXTRACTION            │  (intent-engine.js)
└──────────────────────────────────┘
          │
          ▼
┌──────────────────────────────────┐
│  3. INTENT DETECTION & SCORING   │  (intent-engine.js)
└──────────────────────────────────┘
          │
          ▼
┌──────────────────────────────────┐
│  4. VERIFIED DATA RETRIEVAL      │  (retrieval-engine.js + chatbot-data.js)
└──────────────────────────────────┘
          │
          ▼
┌──────────────────────────────────┐
│  5. VALID DERIVED CALCULATIONS   │  (calculation-engine.js)
└──────────────────────────────────┘
          │
          ▼
┌──────────────────────────────────┐
│  6. EVIDENCE CONSTRUCTION        │  (evidence-engine.js)
└──────────────────────────────────┘
          │
          ▼
┌──────────────────────────────────┐
│  7. SAFE RESPONSE & PAGE MAPPING │  (response-engine.js)
└──────────────────────────────────┘
```

---

## 2. Supported Intent Taxonomy (15 Intents)

| Intent | Description | Example Queries |
| :--- | :--- | :--- |
| `NATIONAL_OVERVIEW` | National barrier prevalence & domain rankings | *"What is the most common barrier?"* |
| `STATE_ANALYSIS` | State-level barrier rates for a single state | *"What is the situation in Karnataka?"* |
| `STATE_COMPARISON` | Comparative analysis between 2 states | *"Compare Karnataka and Kerala."* |
| `RURAL_URBAN` | Rural vs Urban barrier comparison | *"Compare rural and urban women."* |
| `DEMOGRAPHIC_ANALYSIS` | Breakdown by wealth, education, age, etc. | *"How does wealth affect healthcare barriers?"* |
| `MULTIPLE_BARRIER` | Overlapping barrier count analysis (0-3 count) | *"How common are multiple barriers?"* |
| `RISK_ARCHETYPE` | K-Means clustering & archetype profiles | *"What are the risk archetypes?"* |
| `EMPOWERMENT` | Household decision autonomy & empowerment | *"How does empowerment affect healthcare access?"* |
| `OUTCOME_IMPACT` | Stage 2 healthcare utilization (Unmet FP & ANC) | *"What is the impact on unmet family planning?"* |
| `REGRESSION` | Stage 1 logistic regression odds ratios | *"What are the top risk factors in regression?"* |
| `SHAP` | SHAP model explainability drivers | *"What is SHAP?"*, *"What drives model predictions?"* |
| `BASE_PAPER` | Reference findings from Pradhan & De (2025) | *"What does the base paper say?"* |
| `METHODOLOGY` | NFHS-5 dataset recode & analytical scope | *"What dataset is used?"* |
| `LIMITATIONS` | Study scope limits & causality boundaries | *"Can BarrierLens prove causation?"* |
| `UNSUPPORTED` | Out-of-scope or missing metric queries | *"What is the average hospital waiting time?"* |

---

## 3. Entity Schema

The entity extractor recognizes:
- **States**: All 36 Indian states/UTs present in `state_summary.json` (e.g., `Karnataka`, `Kerala`, `Tamil Nadu`, `Uttar Pradesh`, `Delhi`, `Assam`, etc.).
- **Barrier Types**: `household` (`target_household`), `logistic` (`target_logistic`), `facility` (`target_facility`), `any` (`observed_any_barrier_rate`).
- **Demographic Dimensions**: `wealth` (`Poorest`, `Poorer`, `Middle`, `Richer`, `Richest`), `residence` (`Rural`, `Urban`), `education` (`No education`, `Primary`, `Secondary`, `Higher`), `age` (`15-19` to `45-49`).
- **Topics**: `unmet_fp`, `anc_gap`, `cluster`, `shap`, `regression`, `base_paper`, `methodology`, `limitations`, `empowerment`, `multiple_barrier`.

---

## 4. Verified Data Source Registry (11 JSON Files)

All metric values originate strictly from `dashboard/assets/data/`:
1. `national_overview.json`
2. `state_summary.json`
3. `demographic_summary.json`
4. `rural_urban_summary.json`
5. `cluster_summary.json`
6. `regression_summary.json`
7. `outcome_impact_summary.json`
8. `empowerment_summary.json`
9. `multiple_barrier_summary.json`
10. `base_paper_reference.json`
11. `validation_report.json`

---

## 5. Provenance & Evidence Schema

Every retrieved data point maintains explicit provenance:

```json
{
  "source": "dashboard/assets/data/state_summary.json",
  "sourceKey": "stateSummary",
  "path": "states[19].observed_any_barrier_rate",
  "label": "Observed Any Barrier Rate",
  "value": "55.38",
  "unit": "%",
  "entity": "Karnataka"
}
```

---

## 6. Calculation Schema

Derived metrics are computed deterministically and explicitly tagged:

```json
{
  "calculationType": "percentage_point_difference",
  "label": "Observed Any Barrier Rate Difference (Karnataka vs Kerala)",
  "operands": [
    { "entity": "Karnataka", "value": 55.38, "unit": "%" },
    { "entity": "Kerala", "value": 7.58, "unit": "%" }
  ],
  "result": 47.8,
  "resultUnit": "percentage points",
  "derived": true,
  "interpretation": "Karnataka has a 47.80 percentage-point higher observed any barrier rate than Kerala."
}
```

> [!NOTE]
> Derived metric values are never confused with raw stored JSON values and are clearly labeled as `percentage points`.

---

## 7. Public API Contract for Member 3 (UI Entrypoint)

```javascript
async function processUserQuery(text, language = "en", options = {})
```

### Return Signature Contract

```json
{
  "answer": "Comparing Karnataka and Kerala: - Karnataka: Observed Any Barrier Rate is 55.38%. - Kerala: Observed Any Barrier Rate is 7.58%. Difference: Karnataka has a 47.80 percentage-point higher observed any barrier rate than Kerala.",
  "language": "en",
  "intent": "STATE_COMPARISON",
  "confidence": 0.95,
  "entities": {
    "states": ["Karnataka", "Kerala"],
    "barrierTypes": [],
    "demographicGroups": [],
    "dimensions": [],
    "topic": null
  },
  "source": ["dashboard/assets/data/state_summary.json"],
  "relatedPage": {
    "label": "State-Level Barrier Analysis & Comparison",
    "url": "dashboard/pages/state_analysis.html",
    "relativeUrl": "pages/state_analysis.html"
  },
  "status": "verified",
  "metrics": [
    { "label": "Observed Any Barrier Rate", "value": "55.38", "unit": "%", "entity": "Karnataka" },
    { "label": "Observed Any Barrier Rate", "value": "7.58", "unit": "%", "entity": "Kerala" }
  ],
  "evidence": [ /* Complete provenance array */ ],
  "calculations": [ /* Derived calculation array */ ],
  "methodologyNote": "Base paper uses 108,785 ever-married subset; BarrierLens uses full 724,115 sample.",
  "limitationNote": "Cross-sectional survey data; association does not establish clinical causality.",
  "disclaimer": null
}
```

---

## 8. Out-of-Scope & Unsupported Query Behavior

If a query asks for unrecorded metrics (e.g., hospital waiting times, patient satisfaction, doctor salary, individual clinical advice):

```json
{
  "answer": "This information is not available in the verified BarrierLens NFHS-5 dataset. Query requests metrics or services outside the scope of verified BarrierLens NFHS-5 data.",
  "language": "en",
  "intent": "UNSUPPORTED",
  "confidence": 0.99,
  "entities": { "hasUnsupportedKeyword": true },
  "source": [],
  "relatedPage": null,
  "status": "unavailable",
  "metrics": [],
  "evidence": [],
  "calculations": [],
  "disclaimer": null
}
```

---

## 9. Dashboard Page Mapping Registry

| Intent | Target Dashboard Page File |
| :--- | :--- |
| `NATIONAL_OVERVIEW`, `METHODOLOGY`, `LIMITATIONS` | `dashboard/pages/national_overview.html` |
| `STATE_ANALYSIS`, `STATE_COMPARISON` | `dashboard/pages/state_analysis.html` |
| `RURAL_URBAN` | `dashboard/pages/rural_urban.html` |
| `DEMOGRAPHIC_ANALYSIS` | `dashboard/pages/demographic_analysis.html` |
| `RISK_ARCHETYPE` | `dashboard/pages/risk_archetypes.html` |
| `EMPOWERMENT` | `dashboard/pages/empowerment.html` |
| `MULTIPLE_BARRIER` | `dashboard/pages/multiple_barrier.html` |
| `OUTCOME_IMPACT` | `dashboard/pages/outcome_impact.html` |
| `REGRESSION`, `SHAP` | `dashboard/pages/explainability.html` |
| `BASE_PAPER` | `dashboard/pages/base_paper_comparison.html` |

---

## 10. Downstream Handoff Instructions

### Member 2 (Claude Backend / LLM Integration)
- Member 2 **must consume the structured `evidence` payload** produced by Member 1.
- Pass `response.evidence`, `response.calculations`, `response.methodologyNote`, and `response.limitationNote` as context to Claude.
- Do NOT re-implement query parsing or state retrieval in the backend.

### Member 3 (Multilingual UI & Chat Widget)
- Member 3 **must invoke `processUserQuery(userText, selectedLang)`**.
- Display `response.answer` in the chat window.
- Render `response.relatedPage` as a clickable navigation link recommending relevant dashboard views.

### Member 4 (Report Generator & Dashboard Shell Integration)
- Member 4 **consumes `response.evidence` and `response.metrics`** to compile PDF/downloadable research summary reports.
- Use `response.source` metadata for bibliography/provenance citations.

> [!IMPORTANT]
> **No downstream team member should implement a parallel answer engine.**
> Member 1 provides the single source of truth for query understanding, retrieval, evidence formatting, and page recommendations.
