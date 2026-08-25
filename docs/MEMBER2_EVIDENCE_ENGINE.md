# MEMBER 2 — BARRIERLENS EVIDENCE & STATISTICS ENGINE SPECIFICATION

**Component**: Member 2 — Evidence Retrieval, Statistics Engine & Provenance Engine  
**Project**: BarrierLens P48 (AI-Driven Healthcare Access Barrier Analytics Platform)  
**Status**: Verified & Operational  
**Data Grounding**: Strictly derived from verified NFHS-5 datasets ($N = 724,115$ Indian women).

---

## 1. Member 2 Responsibilities & Scope

Member 2 serves as the single source of truth for all data, statistics, explanations, state/demographic breakdowns, comparisons, and solution-sufficiency checks coming directly from verified BarrierLens datasets.

Key responsibilities:
- Authoritative mapping between the 5 conversational barrier categories (`household`, `logistic`, `facility`, `multiple`, `all`) and verified BarrierLens JSON sources.
- Deterministic evidence, explanation, statistic, state ranking, and demographic group retrieval.
- Deterministic comparison calculations (`percentage_point_difference`) with explicit `derived: true` tagging.
- Complete provenance metadata attachment (`source`, `sourceKey`, `path`, `label`, `value`, `unit`, `entity`) for every retrieved metric.
- Solution-sufficiency check handoff to Member 3 indicating whether external research is required.
- Safe out-of-scope/unsupported metric fallback without hallucination or external API calls.
- Strict enforcement of non-causal research-safe terminology ("associated with", "observed rate", "percentage-point difference").

---

## 2. Verified Data Source Registry (11 JSON Files)

Member 2 maps queries to the following verified data sources in `dashboard/assets/data/`:

| Source Key | JSON File | Description |
| :--- | :--- | :--- |
| `nationalOverview` | `national_overview.json` | National observed barrier rates, ranking, and predictions |
| `stateSummary` | `state_summary.json` | 36 Indian states & UTs observed rates & composite scores |
| `demographicSummary` | `demographic_summary.json` | Socio-demographic breakdowns (Wealth, Education, Age, Residence) |
| `ruralUrbanSummary` | `rural_urban_summary.json` | Rural vs Urban barrier rate comparisons & scope exclusions |
| `clusterSummary` | `cluster_summary.json` | K-Means $k=2$ cluster risk archetypes & silhouette scores |
| `regressionSummary` | `regression_summary.json` | Stage 1 logistic regression odds ratios and coefficients |
| `outcomeImpactSummary` | `outcome_impact_summary.json` | Stage 2 healthcare utilization impact (Unmet FP & ANC gap) |
| `empowermentSummary` | `empowerment_summary.json` | Intra-household decision autonomy & empowerment levels |
| `multipleBarrierSummary` | `multiple_barrier_summary.json` | 0–3 overlapping barrier count distribution and mean count |
| `basePaperReference` | `base_paper_reference.json` | Pradhan & De (2025) published baseline statistics & protective factors |
| `validationReport` | `validation_report.json` | Data validation status (9/9 files passed) |

---

## 3. Five Conversational Barrier Mapping

Member 2 maps the 5 conversational barrier categories to exact dataset fields:

```
HOUSEHOLD  ──> v467b (getting permission to go) ──> observed_household_rate
LOGISTIC   ──> v467c/d/e (getting money, distance, escort) ──> observed_logistic_rate
FACILITY   ──> v467g/h (no female provider, no doctor/medicine) ──> observed_facility_rate
MULTIPLE   ──> Overlapping 0-3 count ──> multiple_barrier_summary.json
ALL        ──> Combined scope ──> observed_any_barrier_rate (59.16%)
```

---

## 4. Evidence Payload Schema

```json
{
  "status": "verified",
  "evidenceType": "BarrierLens Evidence",
  "barrier": "logistic",
  "barrierLabel": "Logistic Barrier",
  "explanation": "Logistic barriers involve physical and financial access constraints...",
  "metrics": [
    {
      "source": "dashboard/assets/data/national_overview.json",
      "sourceKey": "nationalOverview",
      "path": "kpis.observed_logistic_rate",
      "label": "Observed Logistic Barrier Rate",
      "value": "31.61",
      "unit": "%",
      "entity": "National",
      "derived": false,
      "verified": true
    }
  ],
  "affectedStates": [ /* Top 5 & Lowest 3 state provenances */ ],
  "affectedGroups": [ /* Socio-demographic provenances */ ],
  "comparisons": [ /* Derived percentage-point calculations */ ],
  "solutionEvidence": {
    "barrierLensSupported": true,
    "items": [ /* Supported interventions from JSON */ ]
  },
  "externalResearchRequired": false,
  "provenance": {
    "sourceType": "verified_barrierlens_json",
    "verified": true,
    "dataSourcesUsed": ["dashboard/assets/data/national_overview.json"]
  }
}
```

---

## 5. Provenance Metadata Schema

Every raw stored JSON metric returned by Member 2 maintains strict provenance:

```json
{
  "source": "dashboard/assets/data/state_summary.json",
  "sourceKey": "stateSummary",
  "path": "states[19].observed_any_barrier_rate",
  "label": "Observed Any Barrier Rate",
  "value": "55.38",
  "unit": "%",
  "entity": "Karnataka",
  "derived": false,
  "verified": true
}
```

---

## 6. Comparison Engine Logic (`comparison-engine.js`)

Derived metrics are computed deterministically and tagged explicitly with `derived: true`:

```json
{
  "calculationType": "percentage_point_difference",
  "label": "Observed Any Barrier Rate Difference (Karnataka vs Kerala)",
  "metricName": "Observed Any Barrier Rate",
  "operands": [
    { "entity": "Karnataka", "value": 55.38, "unit": "%" },
    { "entity": "Kerala", "value": 7.58, "unit": "%" }
  ],
  "result": 47.8,
  "rawDifference": 47.8,
  "resultUnit": "percentage points",
  "derived": true,
  "interpretation": "Karnataka has a 47.80 percentage-point higher observed any barrier rate than Kerala."
}
```

---

## 7. Solution-Sufficiency Check Handoff to Member 3

When queries ask for solutions or interventions, Member 2 checks whether BarrierLens dataset already contains supported interventions (e.g., empowerment, mass media, female providers, bank account ownership):

```json
{
  "solutionEvidence": {
    "barrierLensSupported": true,
    "items": [
      {
        "title": "Female Healthcare Provider Staffing",
        "sourceKey": "basePaperReference",
        "sourceFile": "dashboard/assets/data/base_paper_reference.json",
        "detail": "Strengthening female provider availability at public primary health centers directly mitigates the largest single barrier component (46.01%)."
      }
    ]
  },
  "externalResearchRequired": false
}
```

If the query asks for out-of-scope clinical protocols, surgical costs, or specific external schemes not covered in NFHS-5:
- `barrierLensSupported`: `false`
- `externalResearchRequired`: `true`

---

## 8. Unsupported & Out-of-Scope Fallback

If requested information is absent from NFHS-5 (e.g. hospital waiting times, doctor salary, patient satisfaction):

```json
{
  "status": "unavailable",
  "reason": "Requested metric is not available in the verified BarrierLens NFHS-5 dataset.",
  "source": [],
  "evidence": [],
  "metrics": [],
  "calculations": [],
  "solutionEvidence": { "barrierLensSupported": false, "items": [] },
  "externalResearchRequired": true
}
```

---

## 9. API Functions Reference

```javascript
// Master evidence retrieval endpoint
getBarrierEvidence(barrier, request, dataRegistry)

// Sub-component endpoints
getBarrierExplanation(barrier, dataRegistry)
getBarrierStatistics(barrier, dataRegistry)
getAffectedStates(barrier, dataRegistry)
getAffectedGroups(barrier, dataRegistry)
getBarrierComparison(request, dataRegistry)
checkBarrierLensSolutionEvidence(barrier, request, dataRegistry)

// Member 1 backward compatibility builder
buildEvidencePayload(intentResult, entities, retrieval, calculations)
```

---

## 10. Test Suite & Verification Results

Automated zero-dependency test runner (`tests/chatbot/member2-evidence.test.js`):

- **Test 1 — Household**: Verified status, correct barrier key & explanation. (PASSED)
- **Test 2 — Logistic**: Verified status & logistic metrics. (PASSED)
- **Test 3 — Facility**: Verified status & facility metrics. (PASSED)
- **Test 4 — Multiple**: Verified status & mean count metrics. (PASSED)
- **Test 5 — All**: Verified status & national rates. (PASSED)
- **Test 6 — State**: Top 5 & lowest 3 state retrieval. (PASSED)
- **Test 7 — State Comparison**: Exact 47.80 percentage points difference for Karnataka vs Kerala. (PASSED)
- **Test 8 — Rural/Urban**: Rural 63.49% vs Urban 46.03% gap (17.46 percentage points) & scope note. (PASSED)
- **Test 9 — Demographic**: Wealth tier breakdowns retrieved. (PASSED)
- **Test 10 — Provenance**: Source, path, label, value, unit verified. (PASSED)
- **Test 11 — Derived Tagging**: `derived: true` confirmed on calculations. (PASSED)
- **Test 12 — Unsupported Fallback**: Waiting time returned `status: "unavailable"`. (PASSED)
- **Test 13 — Missing Data**: Non-existent state Atlantis returned `unavailable`. (PASSED)
- **Test 14 — Solution Sufficiency**: Supported interventions detected & external research flag toggled accurately. (PASSED)
- **Test 15 — Zero Fabricated Data**: Exact numerical match (46.01%) against raw JSON. (PASSED)

**Pass Rate**: 47/47 assertions PASSED (100%).

---

## 11. Known Limitations

- Cross-sectional NFHS-5 survey scope ($N=724,115$); statistical associations do not prove individual clinical causality.
- Metrics not collected in NFHS-5 (hospital waiting times, doctor salaries, treatment costs) are intentionally unsupported.

---

## 12. Files Modified & Created

- `dashboard/assets/js/barrier-data-map.js` [NEW]
- `dashboard/assets/js/comparison-engine.js` [NEW]
- `dashboard/assets/js/evidence-engine.js` [MODIFIED/EXTENDED]
- `tests/chatbot/member2-evidence.test.js` [NEW]
- `docs/MEMBER2_EVIDENCE_ENGINE.md` [NEW]
