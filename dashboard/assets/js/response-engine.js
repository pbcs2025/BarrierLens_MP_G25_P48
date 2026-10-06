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
   */  function formatDeterministicAnswer(evidencePayload, targetLang = "en") {
    const rawLang = String(targetLang || "en").toLowerCase();
    const langKey = (rawLang.startsWith('kn') || rawLang.includes('kannada') || rawLang.includes('ಕನ್ನಡ')) ? 'kn'
      : (rawLang.startsWith('hi') || rawLang.includes('hindi') || rawLang.includes('हिंदी') || rawLang.includes('ಹಿन्दी')) ? 'hi'
      : 'en';

    if (evidencePayload.status === "unavailable") {
      if (langKey === 'kn') {
        return `ಈ ಮಾಹಿತಿಯು ದೃಢೀಕೃತ ಬ್ಯಾರಿಯರ್ ಲೆನ್ಸ್ NFHS-5 ದತ್ತಾಂಶದಲ್ಲಿ ಲಭ್ಯವಿಲ್ಲ. (ಟಿಪ್ಪಣಿ: ಆಸ್ಪತ್ರೆಯ ಕಾಯುವ ಸಮಯ, ಚಿಕಿತ್ಸಾ ವೆಚ್ಚ ಮತ್ತು ವೈದ್ಯರ ವೇತನದ ದತ್ತಾಂಶವು NFHS-5 ನಲ್ಲಿ ಇರುವುದಿಲ್ಲ).`;
      } else if (langKey === 'hi') {
        return `यह जानकारी सत्यापित बैरियरलेंस NFHS-5 डेटासेट में उपलब्ध नहीं है। (नोट: अस्पताल में प्रतीक्षा समय, इलाज की लागत और डॉक्टरों के वेतन का डेटा NFHS-5 में उपलब्ध नहीं है)।`;
      }
      return `This information is not available in the verified BarrierLens NFHS-5 dataset. ${evidencePayload.limitationNote || ''}`;
    }

    const intent = evidencePayload.intent;
    const ev = evidencePayload.evidence || [];
    const calcs = evidencePayload.calculations || [];

    let answerParts = [];

    if (intent === "NATIONAL_OVERVIEW") {
      if (langKey === 'kn') {
        answerParts.push(`7,24,115 ಭಾರತೀಯ ಮಹಿಳೆಯರ (NFHS-5) ದೃಢೀಕೃತ ಬ್ಯಾರಿಯರ್ ಲೆನ್ಸ್ ದತ್ತಾಂಶದಲ್ಲಿ, 59.16% ಮಹಿಳೆಯರು ಕನಿಷ್ಠ ಒಂದು ಆರೋಗ್ಯ ಅಡಚಣೆಯನ್ನು ಎದುರಿಸುತ್ತಾರೆ.`);
        answerParts.push(`ಆಸ್ಪತ್ರೆ/ಸೌಲಭ್ಯದ ಅಡಚಣೆಗಳು ಅತ್ಯಂತ ಸಾಮಾನ್ಯವಾಗಿದೆ (46.01%, ಪ್ರಥಮ ಸ್ಥಾನ), ನಂತರದ ಸ್ಥಾನಗಳಲ್ಲಿ ಸಾರಿಗೆ/ವೆಚ್ಚದ ಅಡಚಣೆಗಳು (31.61%, ದ್ವಿತೀಯ ಸ್ಥಾನ) ಮತ್ತು ಮನೆ/ಕುಟುಂಬದ ಅಡಚಣೆಗಳು (27.16%, ತೃತೀಯ ಸ್ಥಾನ) ಇವೆ.`);
      } else if (langKey === 'hi') {
        answerParts.push(`7,24,115 भारतीय महिलाओं (NFHS-5) के सत्यापित बैरियरलेंस डेटासेट में, 59.16% महिलाएं कम से कम एक स्वास्थ्य पहुंच बाधा का सामना करती हैं।`);
        answerParts.push(`अस्पताल/सुविधा की बाधाएं सबसे आम हैं (46.01%, प्रथम स्थान), इसके बाद परिवहन/लागत की बाधाएं (31.61%, द्वितीय स्थान) और घरेलू/पारिवारिक बाधाएं (27.16%, तृतीय स्थान) आती हैं।`);
      } else {
        answerParts.push(`In the verified BarrierLens dataset of 724,115 Indian women (NFHS-5), 59.16% face at least one healthcare barrier.`);
        answerParts.push(`Facility-level barriers are the most common (46.01%, Rank 1), followed by Logistic barriers (31.61%, Rank 2) and Household barriers (27.16%, Rank 3).`);
      }
    } else if (intent === "STATE_ANALYSIS") {
      const stateName = evidencePayload.entities.states[0] || "the state";
      const anyEv = ev.find(e => e.label.includes("Any Barrier"));
      const domEv = ev.find(e => e.label.includes("Dominant"));
      if (langKey === 'kn') {
        answerParts.push(`${stateName} ರಾಜ್ಯದಲ್ಲಿ, ಒಟ್ಟಾರೆ ಆರೋಗ್ಯ ಅಡಚಣೆ ಪ್ರಮಾಣ ${anyEv ? anyEv.value + '%' : 'ಲಭ್ಯವಿದೆ'}.`);
        if (domEv) answerParts.push(`${stateName} ರಾಜ್ಯದಲ್ಲಿ ಮುಖ್ಯ ಅಡಚಣೆ ವರ್ಗ: ${domEv.value}.`);
      } else if (langKey === 'hi') {
        answerParts.push(`${stateName} में, सत्यापित कुल बाधा दर ${anyEv ? anyEv.value + '%' : 'उपलब्ध है'}।`);
        if (domEv) answerParts.push(`${stateName} में मुख्य बाधा श्रेणी: ${domEv.value}।`);
      } else {
        answerParts.push(`In ${stateName}, the verified observed any barrier rate is ${anyEv ? anyEv.value + '%' : 'available in dashboard'}.`);
        if (domEv) answerParts.push(`The dominant barrier domain in ${stateName} is ${domEv.value}.`);
      }
    } else if (intent === "STATE_COMPARISON") {
      const sA = evidencePayload.entities.states[0] || "Karnataka";
      const sB = evidencePayload.entities.states[1] || "Kerala";
      if (langKey === 'kn') {
        answerParts.push(`${sA} ಮತ್ತು ${sB} ರಾಜ್ಯಗಳ ಹೋಲಿಕೆ:`);
        ev.forEach(e => {
          if (e.label.includes("Any Barrier")) {
            answerParts.push(`- ${e.entity}: ಒಟ್ಟಾರೆ ಅಡಚಣೆ ಪ್ರಮಾಣ ${e.value}%.`);
          }
        });
        if (calcs.length > 0) {
          answerParts.push(`ವ್ಯತ್ಯಾಸ: ಒಟ್ಟಾರೆ ಅಡಚಣೆ ಪ್ರಮಾಣದಲ್ಲಿ ${sA} ${sB} ಕ್ಕಿಂತ 24.24 ಶೇಕಡಾವಾರು ಅಂಕಗಳಷ್ಟು ಹೆಚ್ಚಾಗಿದೆ.`);
        }
      } else if (langKey === 'hi') {
        answerParts.push(`${sA} और ${sB} की तुलना:`);
        ev.forEach(e => {
          if (e.label.includes("Any Barrier")) {
            answerParts.push(`- ${e.entity}: कुल बाधा दर ${e.value}% है।`);
          }
        });
        if (calcs.length > 0) {
          answerParts.push(`अंतर: समग्र बाधा दर में ${sA}, ${sB} से 24.24 प्रतिशत अंक अधिक है।`);
        }
      } else {
        answerParts.push(`Comparing ${sA} and ${sB}:`);
        ev.forEach(e => {
          if (e.label.includes("Any Barrier")) {
            answerParts.push(`- ${e.entity}: Observed Any Barrier Rate is ${e.value}%.`);
          }
        });
        if (calcs.length > 0) {
          answerParts.push(`Difference: ${calcs[0].interpretation}`);
        }
      }
    } else if (intent === "RURAL_URBAN") {
      const rAny = ev.find(e => e.entity === "Rural" && e.label.includes("Any Barrier"));
      const uAny = ev.find(e => e.entity === "Urban" && e.label.includes("Any Barrier"));
      if (langKey === 'kn') {
        answerParts.push(`ನಗರ ಮಹಿಳೆಯರಿಗೆ (${uAny ? uAny.value : 46.03}%) ಹೋಲಿಸಿದರೆ ಗ್ರಾಮೀಣ ಮಹಿಳೆಯರು ಗಮನಾರ್ಹವಾಗಿ ಹೆಚ್ಚಿನ ಆರೋಗ್ಯ ಅಡಚಣೆ ಪ್ರಮಾಣವನ್ನು (${rAny ? rAny.value : 63.49}%) ಎದುರಿಸುತ್ತಾರೆ.`);
        answerParts.push(`ವ್ಯತ್ಯಾಸ: 17.46 ಶೇಕಡಾವಾರು ಅಂಕಗಳ ಗ್ರಾಮೀಣ-ನಗರ ವ್ಯತ್ಯಾಸ.`);
        answerParts.push(`(ಟಿಪ್ಪಣಿ: NFHS-5 ದತ್ತಾಂಶದಲ್ಲಿ ಲಭ್ಯವಿಲ್ಲದ ಕಾರಣ ಆಸ್ಪತ್ರೆಯ ಕಾಯುವ ಸಮಯ ಮತ್ತು ಸೇವಾ ಗುಣಮಟ್ಟದ ವಿವರಗಳನ್ನು ಹೊರಗಿಡಲಾಗಿದೆ).`);
      } else if (langKey === 'hi') {
        answerParts.push(`शहरी महिलाओं (${uAny ? uAny.value : 46.03}%) की तुलना में ग्रामीण महिलाएं काफी अधिक स्वास्थ्य बाधा दर (${rAny ? rAny.value : 63.49}%) का सामना करती हैं।`);
        answerParts.push(`अंतर: 17.46 प्रतिशत अंक का ग्रामीण-शहरी अंतर।`);
        answerParts.push(`(नोट: अस्पताल में प्रतीक्षा समय और सेवा गुणवत्ता मेट्रिक्स को स्पष्ट रूप से बाहर रखा गया है क्योंकि वे NFHS-5 में उपलब्ध नहीं हैं)।`);
      } else {
        answerParts.push(`Rural women experience a significantly higher healthcare barrier rate (${rAny ? rAny.value : 63.49}%) compared to Urban women (${uAny ? uAny.value : 46.03}%).`);
        if (calcs.length > 0) {
          answerParts.push(`Derived gap: ${calcs[0].interpretation}`);
        }
        answerParts.push(`(Note: Hospital waiting times and service quality metrics are explicitly excluded as they are absent from NFHS-5 recode columns).`);
      }
    } else if (intent === "RISK_ARCHETYPE") {
      if (langKey === 'kn') {
        answerParts.push(`ಬ್ಯಾರಿಯರ್ ಲೆನ್ಸ್ ಭಾರತದಾದ್ಯಂತ 2 ಮುಖ್ಯ K-Means ಅಪಾಯದ ಮಾದರಿಗಳನ್ನು (Risk Archetypes) ಗುರುತಿಸುತ್ತದೆ (N=724,115, ಸಿಲೌಟ್ ಸ್ಕೋರ್ = 0.3986):`);
        answerParts.push(`1. ಕ್ಲಸ್ಟರ್ 0 ("ಹೆಚ್ಚಿನ ಅಪಾಯ ಮತ್ತು ಅಡಚಣೆ"): 52.9% ಮಹಿಳೆಯರು, ಸರಾಸರಿ ಸಂಯೋಜಿತ ಅಡಚಣೆ ಅಂಕ = 0.5868.`);
        answerParts.push(`2. ಕ್ಲಸ್ಟರ್ 1 ("ಉನ್ನತ ಮಾಧ್ಯಮ ಮತ್ತು ಡಿಜಿಟಲ್ ಲಭ್ಯತೆ"): 47.1% ಮಹಿಳೆಯರು, ಸರಾಸರಿ ಸಂಯೋಜಿತ ಅಡಚಣೆ ಅಂಕ = 0.3761.`);
      } else if (langKey === 'hi') {
        answerParts.push(`बैरियरलेंस पूरे भारत में 2 मुख्य K-Means जोखिम प्रारूपों (Risk Archetypes) की पहचान करता है (N=724,115, सिल्हूट स्कोर = 0.3986):`);
        answerParts.push(`1. क्लस्टर 0 ("उच्च संवेदनशीलता और उच्च बाधा"): 52.9% महिलाएं, औसत समग्र बाधा स्कोर = 0.5868।`);
        answerParts.push(`2. क्लस्टर 1 ("उच्च मीडिया और डिजिटल समावेशन"): 47.1% महिलाएं, औसत समग्र बाधा स्कोर = 0.3761।`);
      } else {
        answerParts.push(`BarrierLens identifies 2 primary K-Means risk archetypes across India (N=724,115, silhouette score = 0.3986):`);
        answerParts.push(`1. Cluster 0 ("High Vulnerability, High Barrier Exposure"): 52.9% of women, mean composite barrier score = 0.5868.`);
        answerParts.push(`2. Cluster 1 ("High Media & Digital Inclusion"): 47.1% of women, mean composite barrier score = 0.3761.`);
      }
    } else if (intent === "LIMITATIONS") {
      if (langKey === 'kn') {
        answerParts.push(`ಬ್ಯಾರಿಯರ್ ಲೆನ್ಸ್ ಕಾರಣಾತ್ಮಕತೆಯನ್ನು (Causation) ಸಾಬೀತುಪಡಿಸಬಹುದೇ? ಇಲ್ಲ. ಬ್ಯಾರಿಯರ್ ಲೆನ್ಸ್ NFHS-5 ಸಮೀಕ್ಷಾ ದತ್ತಾಂಶವನ್ನು ಬಳಸುತ್ತದೆ.`);
        answerParts.push(`ಮೆಷಿನ್ ಲರ್ನಿಂಗ್ ಮಾದರಿಗಳು ಪ್ರಮುಖ ಅಪಾಯದ ಅಂಶಗಳನ್ನು ಮತ್ತು ಸಂಬಂಧಗಳನ್ನು ಗುರುತಿಸುತ್ತವೆಯಾದರೂ, ಈ ದತ್ತಾಂಶವು ವೈದ್ಯಕೀಯ ಅಥವಾ ಪ್ರಾಯೋಗಿಕ ಕಾರಣ-ಪರಿಣಾಮ ಸಂಬಂಧವನ್ನು ಸಾಬೀತುಪಡಿಸುವುದಿಲ್ಲ.`);
      } else if (langKey === 'hi') {
        answerParts.push(`क्या बैरियरलेंस कारण संबंध (Causation) साबित कर सकता है? नहीं। बैरियरलेंस NFHS-5 सर्वेक्षण डेटा का उपयोग करता है।`);
        answerParts.push(`यद्यपि मशीन लर्निंग मॉडल महत्वपूर्ण जोखिम कारकों और पूर्वानुमानों की पहचान करते हैं, फिर भी यह डेटा प्रत्यक्ष चिकित्सीय कारण-प्रभाव संबंध स्थापित नहीं करता है।`);
      } else {
        answerParts.push(`Can BarrierLens prove causation? No. BarrierLens utilizes cross-sectional NFHS-5 survey data.`);
        answerParts.push(`While machine learning models identify significant risk factors and predictive associations, cross-sectional observational data cannot establish strict cause-and-effect or clinical diagnostic causality.`);
      }
    } else if (intent === "SHAP") {
      if (langKey === 'kn') {
        answerParts.push(`SHAP (SHapley Additive exPlanations) ಮೌಲ್ಯಗಳು ಗೇಮ್ ಥಿಯರಿ ಆಧಾರದ ಮೇಲೆ ಮಾದರಿಯ ವೈಶಿಷ್ಟ್ಯಗಳ ಪ್ರಾಮುಖ್ಯತೆಯನ್ನು ಲೆಕ್ಕಹಾಕುತ್ತವೆ.`);
        answerParts.push(`ಬ್ಯಾರಿಯರ್ ಲೆನ್ಸ್‌ನಲ್ಲಿ, ಅತ್ಯಂತ ಬಡತನ (OR=1.26) ಮತ್ತು ಶಿಕ್ಷಣವಿಲ್ಲದಿರುವುದು (OR=1.20) ಪ್ರಮುಖ ಅಪಾಯಕಾರಿ ಅಂಶಗಳಾಗಿವೆ, ಆದರೆ ಉನ್ನತ ಶ್ರೀಮಂತಿಕೆ (OR=0.78) ಅತ್ಯಂತ ಬಲವಾದ ರಕ್ಷಣಾತ್ಮಕ ಅಂಶವಾಗಿದೆ.`);
      } else if (langKey === 'hi') {
        answerParts.push(`SHAP (SHapley Additive exPlanations) मान गेम थ्योरी के आधार पर मॉडल की विशेषताओं के महत्व को मापते हैं।`);
        answerParts.push(`बैरियरलेंस में, अति निर्धनता (OR=1.26) और शिक्षा का अभाव (OR=1.20) प्रमुख जोखिम कारक हैं, जबकि अति धनी श्रेणी (OR=0.78) सबसे मजबूत सुरक्षात्मक कारक है।`);
      } else {
        answerParts.push(`SHAP (SHapley Additive exPlanations) values quantify feature importance based on game theory.`);
        answerParts.push(`In BarrierLens, top positive model risk factors include poorest wealth tier (OR=1.26) and no education (OR=1.20), while richest wealth tier (OR=0.78) serves as the strongest protective factor.`);
      }
    } else if (intent === "DEMOGRAPHIC_ANALYSIS") {
      if (langKey === 'kn') {
        answerParts.push(`ಸಾಮಾಜಿಕ-ಜನಸಂಖ್ಯಾ ವಿಶ್ಲೇಷಣೆ (NFHS-5, N=7,24,115): ಸಂಪತ್ತು ಮತ್ತು ಶಿಕ್ಷಣವು ಆರೋಗ್ಯ ಸೇವೆ ಪಡೆಯುವಿಕೆಯಲ್ಲಿ ಪ್ರಮುಖ ಪಾತ್ರವಹಿಸುತ್ತವೆ.`);
        answerParts.push(`ಅತ್ಯಂತ ಬಡತನದಲ್ಲಿರುವ ಮಹಿಳೆಯರು (68.42%) ಅತ್ಯಂತ ಶ್ರೀಮಂತ ಮಹಿಳೆಯರಿಗೆ (41.15%) ಹೋಲಿಸಿದರೆ ಗಮನಾರ್ಹವಾಗಿ ಹೆಚ್ಚಿನ ಅಡಚಣೆಗಳನ್ನು ಎದುರಿಸುತ್ತಾರೆ.`);
      } else if (langKey === 'hi') {
        answerParts.push(`सामाजिक-जनसांख्यिकी विश्लेषण (NFHS-5, N=7,24,115): संपत्ति और शिक्षा स्वास्थ्य सेवा पहुंच में मुख्य निर्धारक हैं।`);
        answerParts.push(`अति निर्धन वर्ग की महिलाएं (68.42%) अति धनी वर्ग (41.15%) की तुलना में काफी अधिक बाधाओं का सामना करती हैं।`);
      } else {
        answerParts.push(`Socio-Demographic Analysis (NFHS-5, N=724,115): Wealth and education are primary determinants of healthcare access barriers.`);
        answerParts.push(`Women in the poorest wealth quintile face significantly higher barrier rates (68.42%) compared to the richest quintile (41.15%).`);
      }
    } else if (intent === "MULTIPLE_BARRIER") {
      if (langKey === 'kn') {
        answerParts.push(`ಅನೇಕ ಸಮಾವೇಶಗೊಳ್ಳುವ ಅಡಚಣೆಗಳ ವಿಶ್ಲೇಷಣೆ (NFHS-5): 31.55% ಭಾರತೀಯ ಮಹಿಳೆಯರು ಏಕಕಾಲದಲ್ಲಿ 2 ಅಥವಾ ಹೆಚ್ಚಿನ ಅಡಚಣೆಗಳನ್ನು ಎದುರಿಸುತ್ತಾರೆ.`);
        answerParts.push(`ಒಬ್ಬ ಮಹಿಳೆಯ ಸರಾಸರಿ ಅಡಚಣೆಗಳ ಸಂಖ್ಯೆ 1.05.`);
      } else if (langKey === 'hi') {
        answerParts.push(`अनेक समवर्ती बाधाओं का विश्लेषण (NFHS-5): 31.55% भारतीय महिलाएं एक साथ 2 या अधिक बाधाओं का सामना करती हैं।`);
        answerParts.push(`प्रति महिला औसत बाधा संख्या 1.05 है।`);
      } else {
        answerParts.push(`Multiple Overlapping Barriers Analysis (NFHS-5): 31.55% of Indian women experience 2 or more overlapping healthcare access barriers simultaneously.`);
        answerParts.push(`Mean barrier count per woman is 1.05.`);
      }
    } else if (intent === "EMPOWERMENT") {
      if (langKey === 'kn') {
        answerParts.push(`ಸಬಲೀಕರಣ ಮತ್ತು ಸ್ವಾಯತ್ತತೆ ವಿಶ್ಲೇಷಣೆ (NFHS-5): ಸ್ವತಂತ್ರವಾಗಿ ನಿರ್ಧಾರ ತೆಗೆದುಕೊಳ್ಳುವ ಹಕ್ಕಿಲ್ಲದ ಮಹಿಳೆಯರು ಹೆಚ್ಚಿನ ಕುಟುಂಬ ಅಡಚಣೆಗಳನ್ನು (36.4%) ಎದುರಿಸುತ್ತಾರೆ.`);
      } else if (langKey === 'hi') {
        answerParts.push(`महिला सशक्तिकरण और स्वायत्तता विश्लेषण (NFHS-5): निर्णय स्वायत्तता से वंचित महिलाएं अधिक पारिवारिक बाधाओं (36.4%) का सामना करती हैं।`);
      } else {
        answerParts.push(`Empowerment & Autonomy Analysis (NFHS-5): Women lacking sole healthcare decision autonomy face higher household barrier rates (36.4%) compared to autonomous decision-makers (21.8%).`);
      }
    } else if (intent === "OUTCOME_IMPACT") {
      if (langKey === 'kn') {
        answerParts.push(`ಆರೋಗ್ಯ ಸೇವೆ ಬಳಕೆ ಮೇಲಿನ ಪರಿಣಾಮ (NFHS-5): ಹೆಚ್ಚಿನ ಅಡಚಣೆಗಳು ಹೆರಿಗೆ ಪೂರ್ವ ತಪಾಸಣೆ (ANC) ಮತ್ತು ಆಸ್ಪತ್ರೆ ಹೆರಿಗೆ ಸೇವೆಯ ಬಳಕೆಯನ್ನು ಗಣನೀಯವಾಗಿ ಕಡಿಮೆ ಮಾಡುತ್ತವೆ.`);
      } else if (langKey === 'hi') {
        answerParts.push(`स्वास्थ्य उपयोग प्रभाव विश्लेषण (NFHS-5): उच्च बाधाएं प्रसवपूर्व देखभाल (ANC) और संस्थागत प्रसव के उपयोग को काफी कम करती हैं।`);
      } else {
        answerParts.push(`Healthcare Utilization Impact Analysis (NFHS-5): High barrier exposure significantly reduces full antenatal care (ANC) utilization and facility birth delivery.`);
      }
    } else if (intent === "REGRESSION") {
      if (langKey === 'kn') {
        answerParts.push(`ಲಾಜಿಸ್ಟಿಕ್ ರಿಗ್ರೆಷನ್ ಅಪಾಯಕಾರಿ ಅಂಶಗಳು (NFHS-5): ಅತ್ಯಂತ ಬಡತನ (OR=1.26) ಮತ್ತು ಶಿಕ್ಷಣವಿಲ್ಲದಿರುವುದು (OR=1.20) ಅಡಚಣೆ ಎದುರಿಸುವ ಸಾಧ್ಯತೆಯನ್ನು ಹೆಚ್ಚಿಸುತ್ತವೆ.`);
      } else if (langKey === 'hi') {
        answerParts.push(`लॉजिस्टिक रिग्रेशन जोखिम कारक (NFHS-5): अति निर्धनता (OR=1.26) और शिक्षा का अभाव (OR=1.20) बाधाओं का सामना करने की संभावना को बढ़ाते हैं।`);
      } else {
        answerParts.push(`Logistic Regression Risk Factors (NFHS-5): Poorest wealth (OR=1.26, p<0.001) and no formal education (OR=1.20, p<0.001) significantly increase odds of facing healthcare access barriers.`);
      }
    } else if (intent === "BASE_PAPER") {
      if (langKey === 'kn') {
        answerParts.push(`ಮೂಲ ಸಂಶೋಧನಾ ಪ್ರಬಂಧದ ಹೋಲಿಕೆ (Pradhan et al., 2023): ಬ್ಯಾರಿಯರ್ ಲೆನ್ಸ್ NFHS-5 ದತ್ತಾಂಶದಲ್ಲಿ ಪ್ರತ್ಯೇಕ ಅಡಚಣೆ ವರ್ಗಗಳು ಮತ್ತು K-Means ಕ್ಲಸ್ಟರಿಂಗ್ ವಿಶ್ಲೇಷಣೆಯನ್ನು ಒದಗಿಸುತ್ತದೆ.`);
      } else if (langKey === 'hi') {
        answerParts.push(`मूल शोध पत्र तुलना (Pradhan et al., 2023): बैरियरलेंस NFHS-5 डेटा पर व्यक्तिगत बाधा श्रेणियों और K-Means क्लस्टरिंग विश्लेषण प्रदान करता है।`);
      } else {
        answerParts.push(`Base Paper Comparison (Pradhan et al., 2023 benchmark): BarrierLens extends prior research by analyzing individual barrier domain breakdowns and multi-barrier clustering on NFHS-5.`);
      }
    } else if (intent === "METHODOLOGY") {
      if (langKey === 'kn') {
        answerParts.push(`ಬ್ಯಾರಿಯರ್ ಲೆನ್ಸ್ ಅಧ್ಯಯನ ವಿಧಾನ: 36 ಭಾರತೀಯ ರಾಜ್ಯಗಳು/ಕೇಂದ್ರಾಡಳಿತ ಪ್ರದೇಶಗಳ 15-49 ವಯಸ್ಸಿನ 7,24,115 ಮಹಿಳೆಯರ NFHS-5 (2019-21) ದತ್ತಾಂಶವನ್ನು ಸೂಪರ್‌ವೈಸ್ಡ್ ML ಮತ್ತು K-Means ಕ್ಲಸ್ಟರಿಂಗ್ ಮೂಲಕ ವಿಶ್ಲೇಷಿಸುತ್ತದೆ.`);
      } else if (langKey === 'hi') {
        answerParts.push(`बैरियरलेंस अध्ययन पद्धति: 36 भारतीय राज्यों/केंद्र शासित प्रदेशों की 15-49 आयु वर्ग की 7,24,115 महिलाओं के NFHS-5 (2019-21) डेटा का supervised ML और K-Means क्लस्टरिंग द्वारा विश्लेषण करता है।`);
      } else {
        answerParts.push(`BarrierLens Methodology: Analyzes NFHS-5 (2019-21) national survey data of N = 724,115 women aged 15-49 across 36 Indian States/UTs using supervised ML classification and unsupervised K-Means clustering.`);
      }
    } else {
      if (evidencePayload.summary) {
        answerParts.push(evidencePayload.summary);
      } else if (langKey === 'kn') {
        answerParts.push(`NFHS-5 ದೃಢೀಕೃತ ದತ್ತಾಂಶದ ಪ್ರಕಾರ: 59.16% ಭಾರತೀಯ ಮಹಿಳೆಯರು ಕನಿಷ್ಠ ಒಂದು ಆರೋಗ್ಯ ಅಡಚಣೆಯನ್ನು ಎದುರಿಸುತ್ತಾರೆ (ಸೌಲಭ್ಯ: 46.01%, ಸಾರಿಗೆ: 31.61%, ಮನೆ: 27.16%).`);
      } else if (langKey === 'hi') {
        answerParts.push(`NFHS-5 सत्यापित डेटा के अनुसार: 59.16% भारतीय महिलाएं कम से कम एक स्वास्थ्य बाधा का सामना करती हैं (अस्पताल: 46.01%, परिवहन: 31.61%, घरेलू: 27.16%)।`);
      } else {
        answerParts.push(`According to verified BarrierLens NFHS-5 data: 59.16% of Indian women face healthcare access barriers (Facility: 46.01%, Logistic: 31.61%, Household: 27.16%).`);
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
        const langStr = String(language || "en").toLowerCase();
        const langKey = (langStr.startsWith('kn') || langStr.includes('kannada') || langStr.includes('ಕನ್ನಡ')) ? 'kn'
          : (langStr.startsWith('hi') || langStr.includes('hindi') || langStr.includes('हिंदी') || langStr.includes('हिन्दी')) ? 'hi' : 'en';

        let exploreAnswer = `🔍 **Select a Barrier Category to Explore:**\n\n• 🏥 **Facility Barrier (46.01%)**: Provider absence, medicine shortages\n• 🚗 **Logistic Barrier (31.61%)**: Distance to facilities & transport costs\n• 🏠 **Household Barrier (27.16%)**: Family permission & autonomy constraints\n• ⚠️ **Multiple Barriers (38.80%)**: Overlapping multi-domain vulnerability\n• 📊 **All Barriers (59.16%)**: Comprehensive national multi-barrier summary\n\n👉 *Click or type any barrier above to begin!*`;

        if (langKey === 'kn') {
          exploreAnswer = `🔍 **ವಿಶ್ಲೇಷಿಸಲು ಅಡಚಣೆಯ ವರ್ಗವನ್ನು ಆಯ್ಕೆಮಾಡಿ:**\n\n• 🏥 **ಆಸ್ಪತ್ರೆ / ಸೌಲಭ್ಯದ ಅಡಚಣೆ (46.01%)**: ವೈದ್ಯರ ಗೈರುಹಾಜರಿ, ಔಷಧಿಗಳ ಅಭಾವ\n• 🚗 **ಸಾರಿಗೆ / ವೆಚ್ಚದ ಅಡಚಣೆ (31.61%)**: ಆಸ್ಪತ್ರೆಯ ದೂರ ಮತ್ತು ಪ್ರಯಾಣದ ವೆಚ್ಚ\n• 🏠 **ಮನೆ/ಕುಟುಂಬದ ಅಡಚಣೆ (27.16%)**: ಅನುಮತಿ ಕೊರತೆ ಮತ್ತು ನಿರ್ಧಾರದ ತೊಂದರೆಗಳು\n• ⚠️ **ಅನೇಕ ಅಡಚಣೆಗಳು (38.80%)**: 2 ಅಥವಾ ಹೆಚ್ಚಿನ ಏಕಕಾಲೀನ ಅಡಚಣೆಗಳು\n• 📊 **ಎಲ್ಲಾ ಅಡಚಣೆಗಳ ಒಟ್ಟು ನೋಟ (59.16%)**: ಸಮಗ್ರ ರಾಷ್ಟ್ರೀಯ ಒಟ್ಟು ಪ್ರಮಾಣ\n\n👉 *ಪ್ರಾರಂಭಿಸಲು ಮೇಲಿನ ಯಾವುದೇ ಅಡಚಣೆಯನ್ನು ಕ್ಲಿಕ್ ಮಾಡಿ ಅಥವಾ ಟೈಪ್ ಮಾಡಿ!*`;
        } else if (langKey === 'hi') {
          exploreAnswer = `🔍 **अन्वेषण के लिए एक बाधा श्रेणी चुनें:**\n\n• 🏥 **अस्पताल / सुविधा की बाधा (46.01%)**: डॉक्टर की अनुपलब्धता, दवाइयों की कमी\n• 🚗 **परिवहन / लागत बाधा (31.61%)**: स्वास्थ्य केंद्र की दूरी और यात्रा लागत\n• 🏠 **घरेलू / पारिवारिक बाधा (27.16%)**: अनुमति की कमी या घरेलू निर्णय बाधाएं\n• ⚠️ **अनेक बाधाएं (38.80%)**: 2 या अधिक समवर्ती बाधाएं\n• 📊 **सभी बाधाओं का अवलोकन (59.16%)**: समग्र राष्ट्रीय बहु-बाधा विवरण\n\n👉 *शुरू करने के लिए ऊपर दी गई किसी भी बाधा पर क्लिक करें या टाइप करें!*`;
        }

        return {
          answer: exploreAnswer,
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
      if (ctx.intent !== "UNSUPPORTED" && (ctx.intent.startsWith("select_") || (BarrierSelector.isBarrierSelectionText(queryStr) && ctx.activeBarrier && !queryStr.includes("?")))) {
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
    const answer = formatDeterministicAnswer(evidencePayload, language);
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
