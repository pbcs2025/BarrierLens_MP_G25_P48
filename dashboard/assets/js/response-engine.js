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
  function formatDeterministicAnswer(evidencePayload, targetLang = "en") {
    const rawLang = String(targetLang || "en").toLowerCase();
    const langKey = (rawLang.startsWith('kn') || rawLang.includes('kannada') || rawLang.includes('ಕನ್ನಡ')) ? 'kn'
      : (rawLang.startsWith('hi') || rawLang.includes('hindi') || rawLang.includes('हिंदी') || rawLang.includes('हिन्दी')) ? 'hi'
      : 'en';

    if (evidencePayload.status === "unavailable") {
      if (langKey === 'kn') {
        return `ಈ ಮಾಹಿತಿಯು ದೃಢೀಕೃತ ಬ್ಯಾರಿಯರ್ ಲೆನ್ಸ್ NFHS-5 ದತ್ತಾಂಶದಲ್ಲಿ ಲಭ್ಯವಿಲ್ಲ. ${evidencePayload.limitationNote || ''}`;
      } else if (langKey === 'hi') {
        return `यह जानकारी सत्यापित बैरियरलेंस NFHS-5 डेटासेट में उपलब्ध नहीं है। ${evidencePayload.limitationNote || ''}`;
      }
      return `This information is not available in the verified BarrierLens NFHS-5 dataset. ${evidencePayload.limitationNote || ''}`;
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

    let APIService = options.APIService;
    if (!APIService) {
      if (typeof window !== 'undefined' && window.BarrierLensAPIService) APIService = window.BarrierLensAPIService;
      else if (typeof require !== 'undefined') {
        try { APIService = require('./api-service.js'); } catch (e) {}
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
          answer: `👋 **Welcome to BarrierLens AI!**\n\n• 🔍 **Explore Barriers**: Browse verified NFHS-5 evidence across 5 categories.\n• 💬 **Chat with AI**: Ask open research questions about healthcare access disparities.\n• 📊 **Risk Predictor**: Visit the *AI Risk Assessment* module on the dashboard for personal predictions.`,
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

      // A2. Identity / Name Query
      if (lowerQuery.includes("your name") || lowerQuery.includes("who are you") || lowerQuery.includes("what is your name") || lowerQuery.includes("what's your name") || lowerQuery.includes("ನಿಮ್ಮ ಹೆಸರೇನು") || lowerQuery.includes("आपका नाम")) {
        let nameAnswer = "My name is **BarrierLens** (Project Code: P48), an AI research intelligence assistant analyzing women's healthcare access barriers across India based on the NFHS-5 dataset (N = 724,115 respondents).\n\n• 🏥 **Facility Barriers (46.01%)**: Absence of providers & medication shortages\n• 🚗 **Logistic Barriers (31.61%)**: Distance & transport costs\n• 🏠 **Household Barriers (27.16%)**: Family permission & autonomy constraints";
        if (language === "kn") {
          nameAnswer = "ನನ್ನ ಹೆಸರು **BarrierLens** (ಪ್ರಾಜೆಕ್ಟ್ ಕೋಡ್: P48). ನಾನು NFHS-5 ಸಮೀಕ್ಷೆಯ ಆಧಾರದ ಮೇಲೆ ಭಾರತದಾದ್ಯಂತ ಮಹಿಳೆಯರ ಆರೋಗ್ಯ ಸೇವಾ ಅಡೆತಡೆಗಳನ್ನು ವಿಶ್ಲೇಷಿಸುವ ಸಂಶೋಧನಾ AI ಸಹಾಯಕ.";
        } else if (language === "hi") {
          nameAnswer = "मेरा नाम **BarrierLens** (प्रोजेक्ट कोड: P48) है। मैं NFHS-5 डेटासेट के आधार पर पूरे भारत में महिलाओं की स्वास्थ्य सेवा पहुंच बाधाओं का विश्लेषण करने वाला एक AI अनुसंधान सहायक हूँ।";
        }
        return {
          answer: nameAnswer,
          response: nameAnswer,
          language: language || "en",
          intent: "IDENTITY",
          confidence: 1.0,
          entities: ctx.entities,
          source: ["BarrierLens Project P48"],
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
          answer: `🔍 **Select a Barrier Category to Explore:**\n\n• 🏥 **Facility Barrier (46.01%)**: Provider absence, medicine shortages\n• 🚗 **Logistic Barrier (31.61%)**: Distance to facilities & transport costs\n• 🏠 **Household Barrier (27.16%)**: Family permission & autonomy constraints\n• ⚠️ **Multiple Barriers (38.80%)**: Overlapping multi-domain vulnerability\n• 📊 **All Barriers (59.16%)**: Comprehensive national multi-barrier summary\n\n👉 *Click or type any barrier above to begin!*`,
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

      // C. Barrier Assessment Query -> Direct to Dashboard AI Risk Assessment
      if (ctx.intent === "identify_barrier" || lowerQuery.includes("identify my barrier") || lowerQuery.includes("identify barrier") || lowerQuery.includes("check my barrier") || lowerQuery.includes("check which barrier")) {
        return {
          answer: `🎯 **AI Risk Assessment is on the Dashboard!**\n\n• 📊 Test personal profiles on the [AI Risk Assessment](pages/risk_prediction.html) page.\n• 🔍 Use the chatbot here to explore barrier categories or ask open research questions.`,
          language: language || "en",
          intent: "identify_barrier",
          confidence: 1.0,
          entities: ctx.entities,
          source: ["pages/risk_prediction.html"],
          relatedPage: "pages/risk_prediction.html",
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

    // 3. Build evidence payload for backend API call
    const normalized = IntentModule.normalizeQuery(text);
    const entities = IntentModule.extractEntities(normalized);
    const intentResult = IntentModule.detectIntent(normalized, entities);
    const retrieval = RetrievalModule.retrieveVerifiedEvidence(intentResult, entities, dataRegistry);
    const calculations = CalculationModule.calculateDerivedValues(retrieval);
    const evidencePayload = EvidenceModule.buildEvidencePayload(intentResult, entities, retrieval, calculations);

    // 4. Call Ollama backend API if available and not skipped, otherwise use deterministic fallback
    if (!options.skipBackend && APIService && typeof APIService.sendChatMessage === 'function') {
      try {
        // Prepare request payload for backend API
        const chatPayload = {
          question: queryStr,
          message: queryStr,
          language: language || "en",
          intent: intentResult.intent,
          history: options.history || []
        };

        // Only include evidence if it's verified and has actual data
        if (evidencePayload && evidencePayload.status === "verified" && evidencePayload.evidence && evidencePayload.evidence.length > 0) {
          chatPayload.evidence = evidencePayload;
        }

        // Call backend /api/chat endpoint
        const backendResponse = await APIService.sendChatMessage(chatPayload);

        // If backend responds successfully, use Ollama-generated answer
        if (backendResponse && backendResponse.status === "success" && backendResponse.answer) {
          return {
            answer: backendResponse.answer,
            language: backendResponse.language || language || "en",
            intent: backendResponse.intent || intentResult.intent,
            confidence: intentResult.confidence,
            entities: entities,
            source: backendResponse.source || evidencePayload.provenance.dataSourcesUsed || [],
            relatedPage: backendResponse.relatedPage || INTENT_PAGE_MAP[intentResult.intent] || null,
            status: backendResponse.status || evidencePayload.status,
            metrics: backendResponse.metrics || evidencePayload.evidence.map(e => ({ label: e.label, value: e.value, unit: e.unit, entity: e.entity })),
            evidence: backendResponse.evidence_used || evidencePayload.evidence,
            calculations: evidencePayload.calculations,
            methodologyNote: evidencePayload.methodologyNote,
            limitationNote: evidencePayload.limitationNote,
            disclaimer: backendResponse.disclaimer || (intentResult.intent === "LIMITATIONS" ? "Cross-sectional survey data; association does not establish clinical causality." : null),
            claims: backendResponse.claims || []
          };
        }
      } catch (error) {
        console.warn('[BarrierLensResponse] Backend API call failed, using deterministic fallback:', error.message || error);
      }
    }

    // 5. Deterministic fallback when backend is unavailable
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
