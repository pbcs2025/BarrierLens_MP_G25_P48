/**
 * BARRIERLENS — MEMBER 2: EVIDENCE ENGINE
 * Constructs structured, audit-ready evidence packages grounded strictly in verified BarrierLens NFHS-5 JSON datasets.
 * Attaches complete provenance metadata, raw vs derived distinction, solution sufficiency flags, and anti-hallucination safety fallbacks.
 * Retains full backward compatibility with Member 1.
 * Dual environment support: Browser (UMD) & Node.js (CommonJS).
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.BarrierLensEvidence = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function getDataMapModule() {
    if (typeof window !== 'undefined' && window.BarrierLensDataMap) return window.BarrierLensDataMap;
    if (typeof require !== 'undefined') return require('./barrier-data-map.js');
    return null;
  }

  function getComparisonEngineModule() {
    if (typeof window !== 'undefined' && window.BarrierLensComparisonEngine) return window.BarrierLensComparisonEngine;
    if (typeof require !== 'undefined') return require('./comparison-engine.js');
    return null;
  }

  /**
   * Format a standardized provenance object for every metric.
   */
  function formatMetricProvenance(sourceFile, sourceKey, dataPath, label, value, unit = "%", entity = null, derived = false) {
    return {
      source: sourceFile,
      sourceKey: sourceKey,
      path: dataPath,
      label: label,
      value: typeof value === 'number' ? value.toString() : value,
      unit: unit,
      entity: entity,
      derived: derived,
      verified: true
    };
  }

  /**
   * Retrieve deterministic barrier explanation.
   */
  function getBarrierExplanation(barrierInput, dataRegistry = {}) {
    const DataMap = getDataMapModule();
    const def = DataMap ? DataMap.getBarrierDefinition(barrierInput) : null;
    if (!def) {
      return "BarrierLens analyzes healthcare access barriers across Household, Logistic, and Facility domains using verified NFHS-5 data.";
    }
    return def.explanation;
  }

  /**
   * Retrieve exact statistics for a specified barrier category.
   */
  function getBarrierStatistics(barrierInput = "all", dataRegistry = {}) {
    const DataMap = getDataMapModule();
    const def = DataMap ? DataMap.getBarrierDefinition(barrierInput) : null;
    const key = def ? def.key : "all";

    const metrics = [];
    const nat = dataRegistry.nationalOverview;

    if (key === "multiple") {
      const mult = dataRegistry.multipleBarrierSummary;
      if (mult && mult.overall) {
        metrics.push(formatMetricProvenance(
          "dashboard/assets/data/multiple_barrier_summary.json",
          "multipleBarrierSummary",
          "overall.mean_barrier_count",
          "National Mean Barrier Count",
          mult.overall.mean_barrier_count,
          "count",
          "National",
          false
        ));
        metrics.push(formatMetricProvenance(
          "dashboard/assets/data/multiple_barrier_summary.json",
          "multipleBarrierSummary",
          "overall.pct_facing_2plus_barriers",
          "Women Facing 2+ Overlapping Barriers",
          (mult.overall.pct_facing_2plus_barriers * 100).toFixed(2),
          "%",
          "National",
          false
        ));
      }
    } else if (nat && nat.kpis) {
      if (key === "household") {
        metrics.push(formatMetricProvenance("dashboard/assets/data/national_overview.json", "nationalOverview", "kpis.observed_household_rate", "Observed Household Barrier Rate", (nat.kpis.observed_household_rate * 100).toFixed(2), "%", "National", false));
        metrics.push(formatMetricProvenance("dashboard/assets/data/national_overview.json", "nationalOverview", "kpis.predicted_household_prob", "Predicted Household Barrier Probability", (nat.kpis.predicted_household_prob * 100).toFixed(2), "%", "National", false));
        metrics.push(formatMetricProvenance("dashboard/assets/data/national_overview.json", "nationalOverview", "kpis.base_paper_household_rate", "Base Paper Household Barrier Rate", (nat.kpis.base_paper_household_rate * 100).toFixed(2), "%", "National", false));
      } else if (key === "logistic") {
        metrics.push(formatMetricProvenance("dashboard/assets/data/national_overview.json", "nationalOverview", "kpis.observed_logistic_rate", "Observed Logistic Barrier Rate", (nat.kpis.observed_logistic_rate * 100).toFixed(2), "%", "National", false));
        metrics.push(formatMetricProvenance("dashboard/assets/data/national_overview.json", "nationalOverview", "kpis.predicted_logistic_prob", "Predicted Logistic Barrier Probability", (nat.kpis.predicted_logistic_prob * 100).toFixed(2), "%", "National", false));
        metrics.push(formatMetricProvenance("dashboard/assets/data/national_overview.json", "nationalOverview", "kpis.base_paper_logistic_rate", "Base Paper Logistic Barrier Rate", (nat.kpis.base_paper_logistic_rate * 100).toFixed(2), "%", "National", false));
      } else if (key === "facility") {
        metrics.push(formatMetricProvenance("dashboard/assets/data/national_overview.json", "nationalOverview", "kpis.observed_facility_rate", "Observed Facility Barrier Rate", (nat.kpis.observed_facility_rate * 100).toFixed(2), "%", "National", false));
        metrics.push(formatMetricProvenance("dashboard/assets/data/national_overview.json", "nationalOverview", "kpis.predicted_facility_prob", "Predicted Facility Barrier Probability", (nat.kpis.predicted_facility_prob * 100).toFixed(2), "%", "National", false));
        metrics.push(formatMetricProvenance("dashboard/assets/data/national_overview.json", "nationalOverview", "kpis.base_paper_facility_rate", "Base Paper Facility Barrier Rate", (nat.kpis.base_paper_facility_rate * 100).toFixed(2), "%", "National", false));
      } else {
        metrics.push(formatMetricProvenance("dashboard/assets/data/national_overview.json", "nationalOverview", "kpis.observed_any_barrier_rate", "Observed Any Barrier Rate", (nat.kpis.observed_any_barrier_rate * 100).toFixed(2), "%", "National", false));
        metrics.push(formatMetricProvenance("dashboard/assets/data/national_overview.json", "nationalOverview", "kpis.observed_facility_rate", "Facility Barrier Rate (Rank 1)", (nat.kpis.observed_facility_rate * 100).toFixed(2), "%", "National", false));
        metrics.push(formatMetricProvenance("dashboard/assets/data/national_overview.json", "nationalOverview", "kpis.observed_logistic_rate", "Logistic Barrier Rate (Rank 2)", (nat.kpis.observed_logistic_rate * 100).toFixed(2), "%", "National", false));
        metrics.push(formatMetricProvenance("dashboard/assets/data/national_overview.json", "nationalOverview", "kpis.observed_household_rate", "Household Barrier Rate (Rank 3)", (nat.kpis.observed_household_rate * 100).toFixed(2), "%", "National", false));
      }
    }

    if (metrics.length === 0) {
      return { status: "unavailable", reason: "Statistics dataset is not loaded." };
    }

    return {
      status: "verified",
      barrier: key,
      metrics: metrics
    };
  }

  /**
   * Retrieve affected states ranked by barrier prevalence.
   */
  function getAffectedStates(barrierInput = "all", dataRegistry = {}) {
    const stateData = dataRegistry.stateSummary;
    if (!stateData || !Array.isArray(stateData.states)) {
      return { status: "unavailable", reason: "State summary dataset is not loaded." };
    }

    const DataMap = getDataMapModule();
    const def = DataMap ? DataMap.getBarrierDefinition(barrierInput) : null;
    const fieldName = def && def.stateField ? def.stateField : "observed_any_barrier_rate";

    const sorted = [...stateData.states].sort((a, b) => (b[fieldName] || 0) - (a[fieldName] || 0));

    const topStates = sorted.slice(0, 5).map((s, idx) => {
      const rawIdx = stateData.states.indexOf(s);
      return formatMetricProvenance(
        "dashboard/assets/data/state_summary.json",
        "stateSummary",
        `states[${rawIdx}].${fieldName}`,
        `${def ? def.label : 'Any Barrier'} Rate (Rank ${idx + 1})`,
        (s[fieldName] * 100).toFixed(2),
        "%",
        s.state_name,
        false
      );
    });

    const lowestStates = sorted.slice(-3).reverse().map((s, idx) => {
      const rawIdx = stateData.states.indexOf(s);
      return formatMetricProvenance(
        "dashboard/assets/data/state_summary.json",
        "stateSummary",
        `states[${rawIdx}].${fieldName}`,
        `${def ? def.label : 'Any Barrier'} Rate (Lowest ${idx + 1})`,
        (s[fieldName] * 100).toFixed(2),
        "%",
        s.state_name,
        false
      );
    });

    return {
      status: "verified",
      barrier: def ? def.key : "all",
      metricField: fieldName,
      mostAffected: topStates,
      leastAffected: lowestStates
    };
  }

  /**
   * Retrieve affected socio-demographic groups.
   */
  function getAffectedGroups(barrierInput = "all", dataRegistry = {}) {
    const demoData = dataRegistry.demographicSummary;
    if (!demoData) {
      return { status: "unavailable", reason: "Demographic summary dataset is not loaded." };
    }

    const DataMap = getDataMapModule();
    const def = DataMap ? DataMap.getBarrierDefinition(barrierInput) : null;
    const fieldName = def && def.demographicField ? def.demographicField : "observed_any_barrier_rate";

    const items = [];
    if (demoData.by_wealth && Array.isArray(demoData.by_wealth)) {
      demoData.by_wealth.forEach((row, idx) => {
        const gName = row.group_keys.wealth_clean || "Wealth Tier";
        items.push(formatMetricProvenance(
          "dashboard/assets/data/demographic_summary.json",
          "demographicSummary",
          `by_wealth[${idx}].${fieldName}`,
          `${gName} ${def ? def.label : 'Any Barrier'} Rate`,
          (row[fieldName] * 100).toFixed(2),
          "%",
          gName,
          false
        ));
      });
    }

    return {
      status: "verified",
      barrier: def ? def.key : "all",
      affectedGroups: items
    };
  }

  /**
   * Delegate deterministic comparisons to ComparisonEngine.
   */
  function getBarrierComparison(request = {}, dataRegistry = {}) {
    const ComparisonEngine = getComparisonEngineModule();
    if (!ComparisonEngine) {
      return { status: "unavailable", reason: "Comparison engine module is not loaded." };
    }

    const barrier = request.barrier || "all";
    if (request.stateA && request.stateB) {
      return ComparisonEngine.compareStates(request.stateA, request.stateB, barrier, dataRegistry);
    } else if (request.ruralUrban || request.type === "rural_urban") {
      return ComparisonEngine.compareRuralUrban(barrier, dataRegistry);
    } else if (request.barrierA && request.barrierB) {
      return ComparisonEngine.compareBarriers(request.barrierA, request.barrierB, request.scope || "national", dataRegistry);
    } else if (request.dimension && request.groupA && request.groupB) {
      return ComparisonEngine.compareDemographics(request.dimension, request.groupA, request.groupB, barrier, dataRegistry);
    }

    return { status: "unavailable", reason: "Insufficient parameters to execute comparison." };
  }

  /**
   * Solution-Sufficiency Check:
   * Inspects BarrierLens data to check if supported interventions/recommendations exist.
   * Tells Member 3 whether external research is actually required.
   */
  function checkBarrierLensSolutionEvidence(barrierInput = "all", request = {}, dataRegistry = {}) {
    const DataMap = getDataMapModule();
    const def = DataMap ? DataMap.getBarrierDefinition(barrierInput) : null;
    const items = DataMap ? DataMap.getInterventionsForBarrier(barrierInput) : [];

    const queryText = (request.text || request.query || "").toLowerCase();

    // Check if query asks for out-of-scope external clinical/policy details
    const isOutofScopeExternal = /\b(clinical trial|drug dosage|hospital surgery fee|doctor salary|waiting time|insurance scheme|treatment cost|hospital fee|doctor fee|surgical fee)\b/i.test(queryText);

    const barrierLensSupported = items.length > 0 && !isOutofScopeExternal;

    return {
      solutionEvidence: {
        barrierLensSupported: barrierLensSupported,
        items: items
      },
      externalResearchRequired: !barrierLensSupported
    };
  }

  /**
   * Master Member 2 evidence retrieval method.
   */
  function getBarrierEvidence(barrierInput = "all", request = {}, dataRegistry = {}) {
    const queryText = (request.text || request.query || "").toLowerCase();

    // Unsupported check for unrecorded NFHS-5 metrics
    if (/\b(waiting time|hospital wait|doctor salary|treatment cost|surgical cost|patient satisfaction|insurance scheme|hospital fee|doctor fee)\b/i.test(queryText)) {
      return {
        status: "unavailable",
        reason: "Requested metric is not available in the verified BarrierLens NFHS-5 dataset.",
        source: [],
        evidence: [],
        metrics: [],
        calculations: [],
        solutionEvidence: { barrierLensSupported: false, items: [] },
        externalResearchRequired: true
      };
    }

    const DataMap = getDataMapModule();
    const def = DataMap ? DataMap.getBarrierDefinition(barrierInput) : { key: "all", label: "All Barriers" };

    const explanation = getBarrierExplanation(def.key, dataRegistry);
    const statsRes = getBarrierStatistics(def.key, dataRegistry);
    const statesRes = getAffectedStates(def.key, dataRegistry);
    const groupsRes = getAffectedGroups(def.key, dataRegistry);
    const solutionRes = checkBarrierLensSolutionEvidence(def.key, request, dataRegistry);

    let comparisonRes = null;
    if (request.stateA && request.stateB || request.type === "rural_urban" || request.compare) {
      comparisonRes = getBarrierComparison(request, dataRegistry);
    }

    const allMetrics = statsRes.metrics || [];
    const comparisons = comparisonRes && comparisonRes.calculations ? comparisonRes.calculations : [];

    return {
      status: "verified",
      evidenceType: "BarrierLens Evidence",
      barrier: def.key,
      barrierLabel: def.label,
      explanation: explanation,
      metrics: allMetrics,
      affectedStates: statesRes.mostAffected || [],
      affectedGroups: groupsRes.affectedGroups || [],
      comparisons: comparisons,
      solutionEvidence: solutionRes.solutionEvidence,
      externalResearchRequired: solutionRes.externalResearchRequired,
      provenance: {
        sourceType: "verified_barrierlens_json",
        verified: true,
        dataSourcesUsed: Array.from(new Set(allMetrics.map(m => m.source)))
      }
    };
  }

  /**
   * Retained function for Member 1 backward compatibility.
   */
  function buildEvidencePayload(intentResult, entities, retrieval, calculations) {
    if (!retrieval || retrieval.status === "unavailable") {
      return {
        status: "unavailable",
        intent: intentResult ? intentResult.intent : "UNSUPPORTED",
        entities: entities || {},
        evidence: [],
        calculations: [],
        methodologyNote: "BarrierLens analysis uses full 724,115 sample of Indian women from NFHS-5 recode data.",
        limitationNote: retrieval ? retrieval.reason : "The requested metric is unavailable in verified BarrierLens datasets.",
        provenance: {
          sourceType: "verified_barrierlens_json",
          verified: false
        }
      };
    }

    const rawEvidenceItems = retrieval.evidence || [];
    const derivedCalculations = calculations || [];

    const methodologyNote = retrieval.methodologyNote ||
      "Base paper uses 108,785 ever-married women subset with 8 items; BarrierLens uses full 724,115 sample with 6 items (v467f, v467i absent). Values are broadly comparable, not identical.";

    const limitationNote = retrieval.limitationSummary || retrieval.scopeExclusionNote ||
      "BarrierLens uses cross-sectional NFHS-5 survey data. Observed associations and predicted probabilities reflect statistical model outputs and do not establish individual causation or clinical diagnosis.";

    return {
      status: "verified",
      intent: intentResult.intent,
      confidence: intentResult.confidence,
      entities: entities,
      evidence: rawEvidenceItems.map(item => ({
        source: item.sourceFile,
        sourceKey: item.sourceKey,
        path: item.dataPath,
        label: item.label,
        value: item.value,
        unit: item.unit,
        entity: item.entity || null,
        derived: item.derived || false
      })),
      calculations: derivedCalculations,
      summary: retrieval.summary || retrieval.title || null,
      methodologyNote: methodologyNote,
      limitationNote: limitationNote,
      provenance: {
        sourceType: "verified_barrierlens_json",
        verified: true,
        dataSourcesUsed: Array.from(new Set(rawEvidenceItems.map(i => i.sourceFile)))
      }
    };
  }

  return {
    buildEvidencePayload,
    getBarrierEvidence,
    getBarrierExplanation,
    getBarrierStatistics,
    getAffectedStates,
    getAffectedGroups,
    getBarrierComparison,
    checkBarrierLensSolutionEvidence
  };
}));
