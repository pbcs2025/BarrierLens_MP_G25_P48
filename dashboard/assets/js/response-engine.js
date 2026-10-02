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
      if (langKey === 'kn') {
        answerParts.push(`7,24,115 ಭಾರತೀಯ ಮಹಿಳೆಯರ (NFHS-5) ದೃಢೀಕೃತ ಬ್ಯಾರಿಯರ್ ಲೆನ್ಸ್ ದತ್ತಾಂಶದಲ್ಲಿ, ಶೇಕಡಾ 59.16 ಮಹಿಳೆಯರು ಕನಿಷ್ಠ ಒಂದು ಆರೋಗ್ಯ ಅಡಚಣೆಯನ್ನು ಎದುರಿಸುತ್ತಾರೆ.`);
        answerParts.push(`ಆಸ್ಪತ್ರೆ/ಸೌಲಭ್ಯ ಅಡಚಣೆಗಳು ಅತ್ಯಂತ ಸಾಮಾನ್ಯವಾಗಿದೆ (46.01%, ಶ್ರೇಣಿ 1), ನಂತರ ಸಾರಿಗೆ ಅಡಚಣೆಗಳು (31.61%, ಶ್ರೇಣಿ 2) ಮತ್ತು ಮನೆ/ಕುಟುಂಬ ಅಡಚಣೆಗಳು (27.16%, ಶ್ರೇಣಿ 3).`);
      } else if (langKey === 'hi') {
        answerParts.push(`7,24,115 भारतीय महिलाओं (NFHS-5) के सत्यापित बैरियरलेंस डेटासेट में, 59.16% महिलाएं कम से कम एक स्वास्थ्य बाधा का सामना करती हैं।`);
        answerParts.push(`अस्पताल स्तर की बाधाएं सबसे आम हैं (46.01%, रैंक 1), इसके बाद लॉजिस्टिक बाधाएं (31.61%, रैंक 2) और घरेलू बाधाएं (27.16%, रैंक 3) हैं।`);
      } else {
        answerParts.push(`In the verified BarrierLens dataset of 724,115 Indian women (NFHS-5), 59.16% face at least one healthcare barrier.`);
        answerParts.push(`Facility-level barriers are the most common (46.01%, Rank 1), followed by Logistic barriers (31.61%, Rank 2) and Household barriers (27.16%, Rank 3).`);
      }
    } else if (intent === "STATE_ANALYSIS") {
      const stateName = (evidencePayload.entities && evidencePayload.entities.states && evidencePayload.entities.states[0]) || "State";
      const anyEv = ev.find(e => e.label && e.label.includes("Any Barrier"));
      const domEv = ev.find(e => e.label && e.label.includes("Dominant"));
      if (langKey === 'kn') {
        answerParts.push(`${stateName} ನಲ್ಲಿ, ದೃಢೀಕರಿಸಿದ ಯಾವುದೇ ಅಡಚಣೆ ದರವು ${anyEv ? anyEv.value + '%' : 'ಲಭ್ಯವಿದೆ'}.`);
        if (domEv) answerParts.push(`${stateName} ನಲ್ಲಿ ಪ್ರಮುಖ ಅಡಚಣೆ ವರ್ಗ: ${domEv.value}.`);
      } else if (langKey === 'hi') {
        answerParts.push(`${stateName} में, सत्यापित किसी भी बाधा की दर ${anyEv ? anyEv.value + '%' : 'उपलब्ध है'}।`);
        if (domEv) answerParts.push(`${stateName} में प्रमुख बाधा श्रेणी: ${domEv.value}।`);
      } else {
        answerParts.push(`In ${stateName}, the verified observed any barrier rate is ${anyEv ? anyEv.value + '%' : 'available in dashboard'}.`);
        if (domEv) answerParts.push(`The dominant barrier domain in ${stateName} is ${domEv.value}.`);
      }
    } else if (intent === "STATE_COMPARISON") {
      const sA = (evidencePayload.entities && evidencePayload.entities.states && evidencePayload.entities.states[0]) || "State A";
      const sB = (evidencePayload.entities && evidencePayload.entities.states && evidencePayload.entities.states[1]) || "Kerala";
      if (langKey === 'kn') {
        answerParts.push(`${sA} ಮತ್ತು ${sB} ಹೋಲಿಕೆ:`);
        ev.forEach(e => {
          if (e.label && e.label.includes("Any Barrier")) {
            answerParts.push(`- ${e.entity}: ಅಡಚಣೆ ದರವು ${e.value}% ಆಗಿದೆ.`);
          }
        });
        if (calcs.length > 0) answerParts.push(`ವ್ಯತ್ಯಾಸ: ${calcs[0].interpretation}`);
      } else if (langKey === 'hi') {
        answerParts.push(`${sA} और ${sB} की तुलना:`);
        ev.forEach(e => {
          if (e.label && e.label.includes("Any Barrier")) {
            answerParts.push(`- ${e.entity}: बाधा दर ${e.value}% है।`);
          }
        });
        if (calcs.length > 0) answerParts.push(`अंतर: ${calcs[0].interpretation}`);
      } else {
        answerParts.push(`Comparing ${sA} and ${sB}:`);
        ev.forEach(e => {
          if (e.label && e.label.includes("Any Barrier")) {
            answerParts.push(`- ${e.entity}: Observed Any Barrier Rate is ${e.value}%.`);
          }
        });
        if (calcs.length > 0) {
          answerParts.push(`Difference: ${calcs[0].interpretation}`);
        }
      }
    } else if (intent === "RURAL_URBAN") {
      const rAny = ev.find(e => e.entity === "Rural" && e.label && e.label.includes("Any Barrier"));
      const uAny = ev.find(e => e.entity === "Urban" && e.label && e.label.includes("Any Barrier"));
      if (langKey === 'kn') {
        answerParts.push(`ಗ್ರಾಮೀಣ ಮಹಿಳೆಯರು ನಗರ ಮಹಿಳೆಯರಿಗಿಂತ (${uAny ? uAny.value : 46.03}%) ಗಮನಾರ್ಹವಾಗಿ ಹೆಚ್ಚಿನ ಅಡಚಣೆ ದರವನ್ನು (${rAny ? rAny.value : 63.49}%) ಎದುರಿಸುತ್ತಾರೆ.`);
        if (calcs.length > 0) answerParts.push(`ಲೆಕ್ಕಹಾಕಿದ ವ್ಯತ್ಯಾಸ: ${calcs[0].interpretation}`);
      } else if (langKey === 'hi') {
        answerParts.push(`ग्रामीण महिलाओं में बाधा दर (${rAny ? rAny.value : 63.49}%) शहरी महिलाओं (${uAny ? uAny.value : 46.03}%) की तुलना में काफी अधिक है।`);
        if (calcs.length > 0) answerParts.push(`परिकलित अंतर: ${calcs[0].interpretation}`);
      } else {
        answerParts.push(`Rural women experience a significantly higher healthcare barrier rate (${rAny ? rAny.value : 63.49}%) compared to Urban women (${uAny ? uAny.value : 46.03}%).`);
        if (calcs.length > 0) {
          answerParts.push(`Derived gap: ${calcs[0].interpretation}`);
        }
      }
    } else if (intent === "RISK_ARCHETYPE") {
      if (langKey === 'kn') {
        answerParts.push(`ಬ್ಯಾರಿಯರ್ ಲೆನ್ಸ್ ಭಾರತದಾದ್ಯಂತ 2 ಮುಖ್ಯ ಅಪಾಯದ ಮಾದರಿಗಳನ್ನು ಗುರುತಿಸುತ್ತದೆ:`);
        answerParts.push(`1. ಕ್ಲಸ್ಟರ್ 0 ("ಹೆಚ್ಚಿನ ಹಾನಿಗೊಳಗಾಗುವಿಕೆ"): 52.9% ಮಹಿಳೆಯರು, ಸರಾಸರಿ ಸೂಚ್ಯಂಕ = 0.5868.`);
        answerParts.push(`2. ಕ್ಲಸ್ಟರ್ 1 ("ಹೆಚ್ಚಿನ ಡಿಜಿಟಲ್ ಒಳಗೊಳ್ಳುವಿಕೆ"): 47.1% ಮಹಿಳೆಯರು, ಸರಾಸರಿ ಸೂಚ್ಯಂಕ = 0.3761.`);
      } else if (langKey === 'hi') {
        answerParts.push(`बैरियरलेंस भारत भर में 2 प्राथमिक जोखिम प्रारूपों की पहचान करता है:`);
        answerParts.push(`1. क्लस्टर 0 ("उच्च भेद्यता"): 52.9% महिलाएं, औसत स्कोर = 0.5868।`);
        answerParts.push(`2. क्लस्टर 1 ("उच्च मीडिया समावेशन"): 47.1% महिलाएं, औसत स्कोर = 0.3761।`);
      } else {
        answerParts.push(`BarrierLens identifies 2 primary K-Means risk archetypes across India (N=724,115, silhouette score = 0.3986):`);
        answerParts.push(`1. Cluster 0 ("High Vulnerability, High Barrier Exposure"): 52.9% of women, mean composite barrier score = 0.5868.`);
        answerParts.push(`2. Cluster 1 ("High Media & Digital Inclusion"): 47.1% of women, mean composite barrier score = 0.3761.`);
      }
    } else if (intent === "LIMITATIONS") {
      if (langKey === 'kn') {
        answerParts.push(`ಬ್ಯಾರಿಯರ್ ಲೆನ್ಸ್ ಕಾರಣಾತ್ಮಕತೆಯನ್ನು ಸಾಬೀತುಪಡಿಸಬಹುದೇ? ಇಲ್ಲ. ಬ್ಯಾರಿಯರ್ ಲೆನ್ಸ್ NFHS-5 ಸಮೀಕ್ಷಾ ದತ್ತಾಂಶವನ್ನು ಬಳಸುತ್ತದೆ. ಮೆಷಿನ್ ಲರ್ನಿಂಗ್ ಮಾಡೆಲ್‌ಗಳು ಸಂಭಾವ್ಯ ಸಂಬಂಧಗಳನ್ನು ಗುರುತಿಸುತ್ತವೆ, ಆದರೆ ನೇರ ವೈದ್ಯಕೀಯ ಕಾರಣಾತ್ಮಕತೆಯನ್ನು ಸಾಬೀತುಪಡಿಸುವುದಿಲ್ಲ.`);
      } else if (langKey === 'hi') {
        answerParts.push(`क्या बैरियरलेंस कारण संबंध साबित कर सकता है? नहीं। बैरियरलेंस NFHS-5 सर्वेक्षण डेटा का उपयोग करता है। मशीन लर्निंग मॉडल सांख्यिकीय संबंधों की पहचान करते हैं, लेकिन प्रत्यक्ष कारण संबंध स्थापित नहीं करते हैं।`);
      } else {
        answerParts.push(`Can BarrierLens prove causation? No. BarrierLens utilizes cross-sectional NFHS-5 survey data.`);
        answerParts.push(`While machine learning models identify significant risk factors and predictive associations, cross-sectional observational data cannot establish strict cause-and-effect or clinical diagnostic causality.`);
      }
    } else if (intent === "SHAP") {
      if (langKey === 'kn') {
        answerParts.push(`SHAP ವಿಶ್ಲೇಷಣೆಯು ಮಾದರಿಯ ಮುನ್ಸೂಚನೆಗಳ ಮೇಲೆ ಪ್ರಮುಖ ಪ್ರಭಾವ ಬೀರುವ ಅಂಶಗಳನ್ನು ಲೆಕ್ಕಹಾಕುತ್ತದೆ. ಅತ್ಯಂತ ಬಡ ಆರ್ಥಿಕ ಸ್ಥಿತಿ (OR=1.26) ಮತ್ತು ಶಿಕ್ಷಣ ಇಲ್ಲದಿರುವುದು (OR=1.20) ಪ್ರಮುಖ ಅಡಚಣೆ ಅಪಾಯದ ಅಂಶಗಳಾಗಿವೆ.`);
      } else if (langKey === 'hi') {
        answerParts.push(`SHAP मान मॉडल के पूर्वानुमानों पर प्रभाव का आकलन करते हैं। अति निर्धन वर्ग (OR=1.26) और शिक्षा की कमी (OR=1.20) प्रमुख जोखिम कारक हैं।`);
      } else {
        answerParts.push(`SHAP (SHapley Additive exPlanations) values quantify feature importance based on game theory.`);
        answerParts.push(`In BarrierLens, top positive model risk factors include poorest wealth tier (OR=1.26) and no education (OR=1.20), while richest wealth tier (OR=0.78) serves as the strongest protective factor.`);
      }
    } else {
      if (evidencePayload.summary) {
        answerParts.push(evidencePayload.summary);
      } else {
        answerParts.push(langKey === 'kn' ? `ಸೂಚನೆ "${intent}" ಗಾಗಿ ಪರಿಶೀಲಿಸಿದ ಮಾಹಿತಿ ಲಭ್ಯವಿದೆ.` : langKey === 'hi' ? `इरादे "${intent}" के लिए सत्यापित साक्ष्य प्राप्त हुए।` : `Verified evidence retrieved for intent "${intent}".`);
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

    const rawLang = String(language || "en").toLowerCase();
    const langKey = (rawLang.startsWith('kn') || rawLang.includes('kannada') || rawLang.includes('ಕನ್ನಡ')) ? 'kn'
      : (rawLang.startsWith('hi') || rawLang.includes('hindi') || rawLang.includes('हिंदी') || rawLang.includes('हिन्दी')) ? 'hi'
      : 'en';

    // 2. Handle Mode 1 / Mode 2 / Greeting / Selection via Member 1 ContextManager
    if (ContextManager && BarrierSelector) {
      const sessionId = options.sessionId || "default-web-session";
      const ctx = ContextManager.processUserQuery(text, language, options.barrierContext, sessionId, options);

      // A. Greeting
      if (ctx.intent === "greeting") {
        const greetMsg = langKey === 'kn'
          ? `ನಮಸ್ಕಾರ! **ಬ್ಯಾರಿಯರ್ ಲೆನ್ಸ್‌ಗೆ** (NFHS-5 ಸಂಶೋಧನಾ ಸಹಾಯಕ) ಸುಸ್ವಾಗತ.\n\nನೀವು ಏನು ಮಾಡಲು ಬಯಸುತ್ತೀರಿ?\n- ಮನೆ, ಸಾರಿಗೆ ಮತ್ತು ಆಸ್ಪತ್ರೆ ಅಡಚಣೆಗಳ ಸಂಶೋಧನೆಯನ್ನು ವೀಕ್ಷಿಸಲು **ಅಡಚಣೆಗಳನ್ನು ಅನ್ವೇಷಿಸಿ** ಎಂದು ಟೈಪ್ ಮಾಡಿ.\n- ML ಮಾಡೆಲ್‌ಗಳನ್ನು ಬಳಸಿ ನಿಮ್ಮ ಅಡಚಣೆಯನ್ನು ಗುರುತಿಸಲು **ನನ್ನ ಅಡಚಣೆಯನ್ನು ಗುರುತಿಸಿ** ಎಂದು ಟೈಪ್ ಮಾಡಿ.`
          : langKey === 'hi'
          ? `नमस्ते! **बैरियरलेंस** (NFHS-5 अनुसंधान सहायक) में आपका स्वागत है।\n\nआप क्या करना चाहेंगे?\n- घरेलू, परिवहन और अस्पताल की बाधाओं को देखने के लिए **बाधाओं का अन्वेषण करें** टाइप करें।\n- अपनी प्राथमिक बाधा का अनुमान लगाने के लिए **मेरी बाधा पहचानें** टाइप करें।`
          : `Hello! Welcome to **BarrierLens** (NFHS-5 Healthcare Access Research Assistant).\n\nWhat would you like to do?\n- Type **Explore Barriers** to browse verified research on Household, Logistic, and Facility barriers.\n- Type **Identify My Barrier** to predict your barrier domain using our Stage 1 ML models.`;

        return {
          answer: greetMsg,
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
        const expMsg = langKey === 'kn'
          ? `**ಅಡಚಣೆಗಳನ್ನು ಅನ್ವೇಷಿಸಿ** (ವಿಧಾನ 2) ಗೆ ಸುಸ್ವಾಗತ!\n\nದೃಢೀಕೃತ NFHS-5 ಮಾಹಿತಿಯನ್ನು ನೋಡಲು ಕೆಳಗಿನ 5 ಅಡಚಣೆ ವರ್ಗಗಳಲ್ಲಿ ಒಂದನ್ನು ಆಯ್ಕೆಮಾಡಿ:\n\n1. **ಮನೆ/ಕುಟುಂಬದ ಅಡಚಣೆ**: ಕುಟುಂಬದ ಅನುಮತಿ ಮತ್ತು ಸ್ವಾಯತ್ತತೆಯ ತೊಂದರೆಗಳು.\n2. **ಸಾರಿಗೆ / ವೆಚ್ಚದ ಅಡಚಣೆ**: ಆಸ್ಪತ್ರೆಯ ದೂರ, ಸಾರಿಗೆ ಅಭಾವ ಮತ್ತು ಚಿಕಿತ್ಸಾ ವೆಚ್ಚ.\n3. **ಆಸ್ಪತ್ರೆ / ಸೌಲಭ್ಯದ ಅಡಚಣೆ**: ವೈದ್ಯರ ಗೈರುಹಾಜರಿ, ಔಷಧಿಗಳ ಅಭಾವ.\n4. **ಅನೇಕ ಅಡಚಣೆಗಳು**: ಏಕಕಾಲದಲ್ಲಿ 2 ಅಥವಾ ಹೆಚ್ಚಿನ ಅಡಚಣೆಗಳು.\n5. **ಎಲ್ಲಾ ಅಡಚಣೆಗಳ ಒಟ್ಟು ನೋಟ**: ರಾಷ್ಟ್ರೀಯ ಮಟ್ಟದ ಒಟ್ಟಾರೆ ನೋಟ (59.16%).`
          : langKey === 'hi'
          ? `**बाधाओं का अन्वेषण करें** (मोड 2) में आपका स्वागत है!\n\nसत्यापित NFHS-5 साक्ष्य देखने के लिए नीचे दी गई 5 श्रेणियों में से एक चुनें:\n\n1. **घरेलू बाधा**: पारिवारिक अनुमति और स्वायत्तता बाधाएं।\n2. **परिवहन / लागत बाधा**: अस्पताल की दूरी, परिवहन और लागत।\n3. **अस्पताल / सुविधा बाधा**: डॉक्टरों और दवाओं की अनुपलब्धता।\n4. **अनेक बाधाएं**: 2 या अधिक बाधाओं का एक साथ सामना।\n5. **सभी बाधाएं**: समग्र राष्ट्रीय अवलोकन (59.16%)।`
          : `Welcome to **Explore Barriers** (Mode 2)!\n\nPlease select one of the 5 healthcare barrier domains below to explore verified NFHS-5 evidence:\n\n1. **Household Barrier**: Family permission, autonomy, and socio-cultural constraints.\n2. **Logistic Barrier**: Distance to facility, transportation availability, and treatment costs.\n3. **Facility Barrier**: Absence of female providers, doctor availability, and medicine supply.\n4. **Multiple Barriers**: Overlapping vulnerability across 2 or more concurrent domains.\n5. **All Barriers**: Comprehensive nationwide analytical overview (59.16% any-barrier rate).\n\n👉 *Type the name of any barrier above to begin.*`;

        return {
          answer: expMsg,
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
        const idMsg = langKey === 'kn'
          ? `**ನನ್ನ ಅಡಚಣೆಯನ್ನು ಗುರುತಿಸಿ** (ವಿಧಾನ 1) ಗೆ ಸುಸ್ವಾಗತ!\n\nನಮ್ಮ ಹಂತ 1 ಮೆಷಿನ್ ಲರ್ನಿಂಗ್ ಮಾಡೆಲ್‌ಗಳು 7,24,115 ಮಹಿಳೆಯರ ದತ್ತಾಂಶವನ್ನು ಬಳಸಿಕೊಂಡು ನಿಮ್ಮ ಪ್ರಮುಖ ಅಡಚಣೆಯನ್ನು ಲೆಕ್ಕಹಾಕುತ್ತವೆ.\n\nಪ್ರಾರಂಭಿಸಲು, ದಯವಿಟ್ಟು ತಿಳಿಸಿ:\n- **ವಯಸ್ಸು** (ಉದಾ. 28)\n- **ಶಿಕ್ಷಣ ಮಟ್ಟ** (ಶಿಕ್ಷಣವಿಲ್ಲ / ಪ್ರಾಥಮಿಕ / ಪ್ರೌಢಶಿಕ್ಷಣ / ಉನ್ನತ)\n- **ಆರ್ಥಿಕ ಸ್ಥಿತಿ** (ಅತ್ಯಂತ ಬಡ / ಬಡ / ಮಧ್ಯಮ / ಶ್ರೀಮಂತ / ಅತ್ಯಂತ ಶ್ರೀಮಂತ)\n- **ವಾಸಸ್ಥಳ** (ಗ್ರಾಮೀಣ / ನಗರ)`
          : langKey === 'hi'
          ? `**मेरी बाधा पहचानें** (मोड 1) में आपका स्वागत है!\n\nहमारे चरण 1 मशीन लर्निंग मॉडल 7,24,115 महिलाओं के डेटा का मूल्यांकन करके आपकी प्राथमिक बाधा का अनुमान लगाते हैं।\n\nप्रारंभ करने के लिए, कृपया बताएं:\n- **आयु** (उदा. 28)\n- **शिक्षा स्तर** (कोई शिक्षा नहीं / प्राथमिक / माध्यमिक / उच्च)\n- **आर्थिक स्तर** (अति निर्धन / निर्धन / मध्यम / धनी / अति धनी)\n- **निवास स्थान** (ग्रामीण / शहरी)`
          : `Welcome to **Identify My Barrier** (Mode 1)!\n\nOur Stage 1 Machine Learning models evaluate your demographic and household profile across 724,115 women to predict your primary barrier.\n\nTo begin, please tell us your:\n- **Age** (e.g. 28)\n- **Education level** (no education / primary / secondary / higher)\n- **Wealth tier** (poorest / poorer / middle / richer / richest)\n- **Residence** (rural / urban)`;

        return {
          answer: idMsg,
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

        const selMsg = langKey === 'kn'
          ? `ಆಯ್ಕೆ ಮಾಡಿದ ಸಕ್ರಿಯ ಅಡಚಣೆ: **${barrierName}** (${ctx.barrierSource === "ml_prediction" ? "ML ಮಾಡೆಲ್ ಮುನ್ಸೂಚನೆ" : "ಬಳಕೆದಾರರ ಆಯ್ಕೆ"}).\n\n${explanation}`
          : langKey === 'hi'
          ? `चुनी गई सक्रिय बाधा: **${barrierName}** (${ctx.barrierSource === "ml_prediction" ? "ML मॉडल पूर्वानुमान" : "उपयोगकर्ता चयन"}).\n\n${explanation}`
          : `Active Barrier selected: **${barrierName}** (${ctx.barrierSource === "ml_prediction" ? "ML Model Prediction" : "User Selection"}).\n\n${explanation}`;

        return {
          answer: selMsg,
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
