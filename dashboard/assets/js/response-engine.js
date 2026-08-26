/**
 * BARRIERLENS — MEMBER 1: RESPONSE ENGINE & CENTRAL PUBLIC INTERFACE
 * Formulates safe, deterministic response objects, handles page recommendations,
 * supports Mode 1 (ML Guided Prediction), Mode 2 (Explore Barriers), and exposes `processUserQuery(text, language)`.
 * Dual environment support: Browser (window.BarrierLensResponse) & Node.js (module.exports).
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
    let ContextManager = options.ContextManager;
    let BarrierSelector = options.BarrierSelector;

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

    if (!ContextManager) {
      if (typeof window !== 'undefined' && window.BarrierLensContextManager) ContextManager = window.BarrierLensContextManager;
      else if (typeof require !== 'undefined') {
        try { ContextManager = require('./context-manager.js'); } catch (e) {}
      }
    }

    if (!BarrierSelector) {
      if (typeof window !== 'undefined' && window.BarrierLensBarrierSelector) BarrierSelector = window.BarrierLensBarrierSelector;
      else if (typeof require !== 'undefined') {
        try { BarrierSelector = require('./barrier-selector.js'); } catch (e) {}
      }
    }

    // 1. Load / Ensure Data Cache
    const basePath = options.basePath || '';
    const dataRegistry = options.dataRegistry || await DataModule.preloadChatbotData(basePath);

    const queryStr = (text || "").trim();
    const lowerQuery = queryStr.toLowerCase();

    // 2. Handle Mode 1 / Mode 2 / Greeting / Selection via Member 1 ContextManager
    if (ContextManager && BarrierSelector) {
      const sessionId = options.sessionId || "default-web-session";
      const ctx = ContextManager.processUserQuery(text, language, options.barrierContext, sessionId, options);

      // A. Greeting
      if (ctx.intent === "greeting") {
        return {
          answer: `Hello! Welcome to **BarrierLens** (NFHS-5 Healthcare Access Research Assistant).\n\nWhat would you like to do?\n- Type **Explore Barriers** to browse verified research on Household, Logistic, and Facility barriers.\n- Type **Identify My Barrier** to predict your barrier domain using our Stage 1 ML models.`,
          language: language || "en",
          intent: "greeting",
          confidence: 1.0,
          entities: ctx.entities,
          source: ["dashboard/assets/data/national_overview.json"],
          relatedPage: INTENT_PAGE_MAP.NATIONAL_OVERVIEW,
          status: "verified",
          metrics: [],
          evidence: [],
          calculations: []
        };
      }

      // B. Mode 2 Entry: Explore Barriers
      if (ctx.intent === "explore_barrier" || (lowerQuery.includes("explore barrier") && !ctx.activeBarrier)) {
        return {
          answer: `Welcome to **Explore Barriers** (Mode 2)!\n\nPlease select one of the 5 healthcare barrier domains below to explore verified NFHS-5 evidence:\n\n1. **Household Barrier**: Family permission, autonomy, and socio-cultural constraints.\n2. **Logistic Barrier**: Distance to facility, transportation availability, and treatment costs.\n3. **Facility Barrier**: Absence of female providers, doctor availability, and medicine supply.\n4. **Multiple Barriers**: Overlapping vulnerability across 2 or more concurrent domains.\n5. **All Barriers**: Comprehensive nationwide analytical overview (59.16% any-barrier rate).\n\n👉 *Type the name of any barrier above to begin.*`,
          language: language || "en",
          intent: "explore_barrier",
          confidence: 1.0,
          entities: ctx.entities,
          source: ["dashboard/assets/data/national_overview.json"],
          relatedPage: INTENT_PAGE_MAP.NATIONAL_OVERVIEW,
          status: "verified",
          metrics: [],
          evidence: [],
          calculations: []
        };
      }

      // C. Mode 1 Entry: Identify My Barrier
      if (ctx.intent === "identify_barrier" || lowerQuery.includes("identify my barrier") || lowerQuery.includes("identify barrier")) {
        return {
          answer: `Welcome to **Identify My Barrier** (Mode 1)!\n\nOur Stage 1 Machine Learning models evaluate your demographic and household profile across 724,115 women to predict your primary barrier.\n\nTo begin, please tell us your:\n- **Age** (e.g. 28)\n- **Education level** (no education / primary / secondary / higher)\n- **Wealth tier** (poorest / poorer / middle / richer / richest)\n- **Residence** (rural / urban)`,
          language: language || "en",
          intent: "identify_barrier",
          confidence: 1.0,
          entities: ctx.entities,
          source: ["saved_models/stage1/random_forest_logistic.pkl"],
          relatedPage: INTENT_PAGE_MAP.REGRESSION,
          status: "verified",
          metrics: [],
          evidence: [],
          calculations: []
        };
      }

      // D. Direct Barrier Selection
      if (ctx.intent.startsWith("select_") || (BarrierSelector.isBarrierSelectionText(queryStr) && ctx.activeBarrier)) {
        const ev = EvidenceModule.getBarrierEvidence(ctx.activeBarrier, { text: queryStr }, dataRegistry);
        const barrierName = ctx.barrierContext ? ctx.barrierContext.barrier : "Active Barrier";
        const explanation = ev.explanation || EvidenceModule.getBarrierExplanation(ctx.activeBarrier, dataRegistry);

        return {
          answer: `Active Barrier selected: **${barrierName}** (${ctx.barrierSource === "ml_prediction" ? "ML Model Prediction" : "User Selection"}).\n\n${explanation}\n\nYou can now ask follow-up questions without repeating the barrier, for example:\n- *"Which states are most affected?"*\n- *"Compare rural and urban areas"*\n- *"What are the statistics?"*\n- *"What can be done?"*`,
          language: language || "en",
          intent: ctx.intent,
          confidence: 1.0,
          entities: ctx.entities,
          source: ev.provenance ? ev.provenance.dataSourcesUsed : ["dashboard/assets/data/national_overview.json"],
          relatedPage: INTENT_PAGE_MAP.NATIONAL_OVERVIEW,
          status: "verified",
          metrics: ev.metrics || [],
          evidence: ev.metrics || [],
          calculations: []
        };
      }
    }

    // 3. Fallback to analytical NLU query pipeline
    const normalized = IntentModule.normalizeQuery(text);
    const entities = IntentModule.extractEntities(normalized);
    const intentResult = IntentModule.detectIntent(normalized, entities);
    const retrieval = RetrievalModule.retrieveVerifiedEvidence(intentResult, entities, dataRegistry);
    const calculations = CalculationModule.calculateDerivedValues(retrieval);
    const evidencePayload = EvidenceModule.buildEvidencePayload(intentResult, entities, retrieval, calculations);
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
