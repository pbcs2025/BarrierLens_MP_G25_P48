/**
 * BARRIERLENS — MEMBER 1: RESPONSE ENGINE & CENTRAL PUBLIC INTERFACE
 * Formulates safe, deterministic response objects, handles page recommendations,
 * and exposes `processUserQuery(text, language)`.
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.BarrierLensResponse = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /**
   * Map Intent to verified Dashboard Page recommendations.
   */
  const INTENT_PAGE_MAP = {
    NATIONAL_OVERVIEW: {
      label: "National Overview Page",
      url: "dashboard/pages/national_overview.html",
      relativeUrl: "pages/national_overview.html"
    },
    STATE_ANALYSIS: {
      label: "State-Level Barrier Analysis",
      url: "dashboard/pages/state_analysis.html",
      relativeUrl: "pages/state_analysis.html"
    },
    STATE_COMPARISON: {
      label: "State-Level Barrier Analysis & Comparison",
      url: "dashboard/pages/state_analysis.html",
      relativeUrl: "pages/state_analysis.html"
    },
    RURAL_URBAN: {
      label: "Rural vs Urban Barrier Comparison",
      url: "dashboard/pages/rural_urban.html",
      relativeUrl: "pages/rural_urban.html"
    },
    DEMOGRAPHIC_ANALYSIS: {
      label: "Socio-Demographic Analysis",
      url: "dashboard/pages/demographic_analysis.html",
      relativeUrl: "pages/demographic_analysis.html"
    },
    RISK_ARCHETYPE: {
      label: "Risk Archetypes & Clustering Page",
      url: "dashboard/pages/risk_archetypes.html",
      relativeUrl: "pages/risk_archetypes.html"
    },
    EMPOWERMENT: {
      label: "Empowerment & Autonomy Page",
      url: "dashboard/pages/empowerment.html",
      relativeUrl: "pages/empowerment.html"
    },
    MULTIPLE_BARRIER: {
      label: "Multiple Overlapping Barriers Page",
      url: "dashboard/pages/multiple_barrier.html",
      relativeUrl: "pages/multiple_barrier.html"
    },
    OUTCOME_IMPACT: {
      label: "Healthcare Utilization Impact Page",
      url: "dashboard/pages/outcome_impact.html",
      relativeUrl: "pages/outcome_impact.html"
    },
    REGRESSION: {
      label: "Model Explainability & Logistic Regression Page",
      url: "dashboard/pages/explainability.html",
      relativeUrl: "pages/explainability.html"
    },
    SHAP: {
      label: "Model Explainability & SHAP Drivers Page",
      url: "dashboard/pages/explainability.html",
      relativeUrl: "pages/explainability.html"
    },
    BASE_PAPER: {
      label: "Base Paper Comparison Page",
      url: "dashboard/pages/base_paper_comparison.html",
      relativeUrl: "pages/base_paper_comparison.html"
    },
    METHODOLOGY: {
      label: "National Overview & Methodology",
      url: "dashboard/pages/national_overview.html",
      relativeUrl: "pages/national_overview.html"
    },
    LIMITATIONS: {
      label: "National Overview & Study Limitations",
      url: "dashboard/pages/national_overview.html",
      relativeUrl: "pages/national_overview.html"
    }
  };

  /**
   * Format natural language response string from evidence and calculations.
   */
  function formatDeterministicAnswer(evidencePayload) {
    if (evidencePayload.status === "unavailable") {
      return `This information is not available in the verified BarrierLens NFHS-5 dataset. ${evidencePayload.limitationNote}`;
    }

    const intent = evidencePayload.intent;
    const ev = evidencePayload.evidence || [];
    const calcs = evidencePayload.calculations || [];

    let answerParts = [];

    if (intent === "NATIONAL_OVERVIEW") {
      answerParts.push(`In the verified BarrierLens dataset of 724,115 Indian women (NFHS-5), 59.16% face at least one healthcare barrier.`);
      answerParts.push(`Facility-level barriers are the most common (46.01%, Rank 1), followed by Logistic barriers (31.61%, Rank 2) and Household barriers (27.16%, Rank 3).`);
    } else if (intent === "STATE_ANALYSIS") {
      const stateName = evidencePayload.entities.states[0] || "the state";
      const anyEv = ev.find(e => e.label.includes("Any Barrier"));
      const domEv = ev.find(e => e.label.includes("Dominant"));
      answerParts.push(`In ${stateName}, the verified observed any barrier rate is ${anyEv ? anyEv.value + '%' : 'available in dashboard'}.`);
      if (domEv) answerParts.push(`The dominant barrier domain in ${stateName} is ${domEv.value}.`);
    } else if (intent === "STATE_COMPARISON") {
      const sA = evidencePayload.entities.states[0] || "State A";
      const sB = evidencePayload.entities.states[1] || "Kerala";
      answerParts.push(`Comparing ${sA} and ${sB}:`);
      ev.forEach(e => {
        if (e.label.includes("Any Barrier")) {
          answerParts.push(`- ${e.entity}: Observed Any Barrier Rate is ${e.value}%.`);
        }
      });
      if (calcs.length > 0) {
        answerParts.push(`Difference: ${calcs[0].interpretation}`);
      }
    } else if (intent === "RURAL_URBAN") {
      const rAny = ev.find(e => e.entity === "Rural" && e.label.includes("Any Barrier"));
      const uAny = ev.find(e => e.entity === "Urban" && e.label.includes("Any Barrier"));
      answerParts.push(`Rural women experience a significantly higher healthcare barrier rate (${rAny ? rAny.value : 63.49}%) compared to Urban women (${uAny ? uAny.value : 46.03}%).`);
      if (calcs.length > 0) {
        answerParts.push(`Derived gap: ${calcs[0].interpretation}`);
      }
      answerParts.push(`(Note: Hospital waiting times and service quality metrics are explicitly excluded as they are absent from NFHS-5 recode columns).`);
    } else if (intent === "RISK_ARCHETYPE") {
      answerParts.push(`BarrierLens identifies 2 primary K-Means risk archetypes across India (N=724,115, silhouette score = 0.3986):`);
      answerParts.push(`1. Cluster 0 ("High Vulnerability, High Barrier Exposure"): 52.9% of women, mean composite barrier score = 0.5868.`);
      answerParts.push(`2. Cluster 1 ("High Media & Digital Inclusion"): 47.1% of women, mean composite barrier score = 0.3761.`);
    } else if (intent === "LIMITATIONS") {
      answerParts.push(`Can BarrierLens prove causation? No. BarrierLens utilizes cross-sectional NFHS-5 survey data.`);
      answerParts.push(`While machine learning models identify significant risk factors and predictive associations, cross-sectional observational data cannot establish strict cause-and-effect or clinical diagnostic causality.`);
    } else if (intent === "SHAP") {
      answerParts.push(`SHAP (SHapley Additive exPlanations) values quantify feature importance based on game theory.`);
      answerParts.push(`In BarrierLens, top positive model risk factors include poorest wealth tier (OR=1.26) and no education (OR=1.20), while richest wealth tier (OR=0.78) serves as the strongest protective factor.`);
    } else {
      if (evidencePayload.summary) {
        answerParts.push(evidencePayload.summary);
      } else {
        answerParts.push(`Verified evidence retrieved for intent "${intent}".`);
      }
    }

    return answerParts.join(" ");
  }

  /**
   * Central Public Interface Function: `processUserQuery(text, language)`
   */
  async function processUserQuery(text, language = "en", options = {}) {
    // Determine runtime module references
    let DataModule = options.DataModule;
    let IntentModule = options.IntentModule;
    let RetrievalModule = options.RetrievalModule;
    let CalculationModule = options.CalculationModule;
    let EvidenceModule = options.EvidenceModule;

    if (!DataModule) {
      if (typeof window !== 'undefined' && window.BarrierLensData) DataModule = window.BarrierLensData;
      else if (typeof require !== 'undefined') DataModule = require('./chatbot-data.js');
    }

    if (!IntentModule) {
      if (typeof window !== 'undefined' && window.BarrierLensIntent) IntentModule = window.BarrierLensIntent;
      else if (typeof require !== 'undefined') IntentModule = require('./intent-engine.js');
    }

    if (!RetrievalModule) {
      if (typeof window !== 'undefined' && window.BarrierLensRetrieval) RetrievalModule = window.BarrierLensRetrieval;
      else if (typeof require !== 'undefined') RetrievalModule = require('./retrieval-engine.js');
    }

    if (!CalculationModule) {
      if (typeof window !== 'undefined' && window.BarrierLensCalculation) CalculationModule = window.BarrierLensCalculation;
      else if (typeof require !== 'undefined') CalculationModule = require('./calculation-engine.js');
    }

    if (!EvidenceModule) {
      if (typeof window !== 'undefined' && window.BarrierLensEvidence) EvidenceModule = window.BarrierLensEvidence;
      else if (typeof require !== 'undefined') EvidenceModule = require('./evidence-engine.js');
    }

    // 1. Load / Ensure Data Cache
    const basePath = options.basePath || '';
    const dataRegistry = options.dataRegistry || await DataModule.preloadChatbotData(basePath);

    // 2. Normalize Query
    const normalized = IntentModule.normalizeQuery(text);

    // 3. Extract Entities
    const entities = IntentModule.extractEntities(normalized);

    // 4. Detect Intent
    const intentResult = IntentModule.detectIntent(normalized, entities);

    // 5. Retrieve Verified Evidence
    const retrieval = RetrievalModule.retrieveVerifiedEvidence(intentResult, entities, dataRegistry);

    // 6. Compute Derived Calculations
    const calculations = CalculationModule.calculateDerivedValues(retrieval);

    // 7. Construct Evidence Payload
    const evidencePayload = EvidenceModule.buildEvidencePayload(intentResult, entities, retrieval, calculations);

    // 8. Formulate Safe Response & Dashboard Page Recommendation
    const answer = formatDeterministicAnswer(evidencePayload);
    const relatedPageObj = INTENT_PAGE_MAP[intentResult.intent] || null;

    return {
      answer: answer,
      language: language || "en",
      intent: intentResult.intent,
      confidence: intentResult.confidence,
      entities: entities,
      source: evidencePayload.provenance.dataSourcesUsed || [],
      relatedPage: relatedPageObj,
      status: evidencePayload.status,
      metrics: evidencePayload.evidence.map(e => ({ label: e.label, value: e.value, unit: e.unit, entity: e.entity })),
      evidence: evidencePayload.evidence,
      calculations: evidencePayload.calculations,
      methodologyNote: evidencePayload.methodologyNote,
      limitationNote: evidencePayload.limitationNote,
      disclaimer: intentResult.intent === "LIMITATIONS" ? "Cross-sectional survey data; association does not establish clinical causality." : null
    };
  }

  return {
    INTENT_PAGE_MAP,
    formatDeterministicAnswer,
    processUserQuery
  };
}));
