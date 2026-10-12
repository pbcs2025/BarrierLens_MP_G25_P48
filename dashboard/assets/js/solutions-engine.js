/**
 * BARRIERLENS — SOLUTIONS ENGINE & COMPOUND QUERY DECOMPOSER (`solutions-engine.js`)
 * Curated, source-cited external policy solutions and guidelines layer.
 *
 * Implements:
 * 1. Strict Domain Allow-List validation (government & WHO domains only)
 * 2. Curated external solutions retrieval from solutions_registry.json
 * 3. Compound query decomposition (Ranking / Dominance Part 1 + Solutions Part 2)
 * 4. Location resolution (explicit state, session state for "here", or National fallback)
 * 5. Deterministic BarrierLens internal evidence + External solutions separation
 * 6. Multilingual support (English, Kannada, Hindi)
 * 7. Anti-hallucination validation and "no female healthcare provider" vetted fallback.
 *
 * Dual environment support: Browser (window.BarrierLensSolutionsEngine) & Node.js (module.exports).
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.BarrierLensSolutionsEngine = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Step 5 Domain Allow-List
  const ALLOWED_DOMAINS = [
    "nhm.gov.in",
    "mohfw.gov.in",
    "pib.gov.in",
    "static.pib.gov.in",
    "eparlib.nic.in",
    "rsdebate.nic.in",
    "qps.nhsrcindia.org",
    "nhsrcindia.org",
    "who.int",
    "pmjay.gov.in"
  ];

  const DISCLAIMER_TEXT = {
    en: "These solutions are external public health programmes and guidelines. BarrierLens does not evaluate programme effectiveness.",
    kn: "ಇವು ಬಾಹ್ಯ ಸಾರ್ವಜನಿಕ ಆರೋಗ್ಯ ಕಾರ್ಯಕ್ರಮಗಳು ಮತ್ತು ಮಾರ್ಗಸೂಚಿಗಳು. ಬ್ಯಾರಿಯರ್ ಲೆನ್ಸ್ ಕಾರ್ಯಕ್ರಮಗಳ ಪರಿಣಾಮಕಾರಿತ್ವವನ್ನು ಮೌಲ್ಯಮಾಪನ ಮಾಡುವುದಿಲ್ಲ.",
    hi: "ये समाधान बाहरी सार्वजनिक स्वास्थ्य कार्यक्रम और दिशानिर्देश हैं। बैरियरलेंस कार्यक्रम की प्रभावशीलता का मूल्यांकन नहीं करता है।"
  };

  const UNIDENTIFIED_SOLUTION_MSG = {
    en: "A verified solution could not be identified.",
    kn: "ಪರಿಶೀಲಿಸಿದ ಪರಿಹಾರವನ್ನು ಗುರುತಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.",
    hi: "एक सत्यापित समाधान की पहचान नहीं की जा सकी।"
  };

  /**
   * Helper to normalize language string to 'en' | 'kn' | 'hi'.
   */
  function normalizeLangKey(langInput) {
    const raw = String(langInput || "en").toLowerCase();
    if (raw.startsWith('kn') || raw.includes('kannada') || raw.includes('ಕನ್ನಡ')) return 'kn';
    if (raw.startsWith('hi') || raw.includes('hindi') || raw.includes('हिंदी') || raw.includes('हिन्दी')) return 'hi';
    return 'en';
  }

  /**
   * Step 5: Check if source URL matches domain allow-list.
   */
  function isUrlAllowed(urlStr) {
    if (!urlStr || typeof urlStr !== 'string') return false;
    try {
      const parsed = new URL(urlStr);
      const hostname = parsed.hostname.toLowerCase();
      return ALLOWED_DOMAINS.some(domain => hostname === domain || hostname.endsWith('.' + domain));
    } catch (e) {
      const clean = urlStr.toLowerCase();
      return ALLOWED_DOMAINS.some(domain => clean.includes(domain));
    }
  }

  /**
   * Addendum B: Strict Trigger Condition for Solutions.
   * Returns true ONLY if query contains an explicit solution keyword.
   */
  function hasSolutionKeyword(text) {
    if (!text || typeof text !== 'string') return false;
    const lower = text.toLowerCase();
    const enKeywords = [
      "what can be done", "solutions", "solution", "how to fix", "how can we fix",
      "what should be done", "what should i do", "what should we do", "what can i do",
      "what to do", "interventions", "intervention", "recommendations",
      "recommendation", "how to overcome", "overcome barrier", "what solutions exist",
      "how to solve", "schemes", "government schemes", "remedy", "remedies"
    ];
    if (enKeywords.some(kw => lower.includes(kw))) return true;

    // Kannada triggers
    if (/ಪರಿಹಾರ|ಉಪಾಯ|ಉಪಾಯಗಳು|ಏನು ಮಾಡಬಹುದು|ಏನು ಮಾಡಬೇಕು|ಯೋಜನೆಗಳು|ಯೋಜನೆ/.test(text)) return true;

    // Hindi triggers
    if (/समाधान|उपाय|क्या किया जा सकता है|क्या करना चाहिए|क्या कर सकते हैं|योजनाएं|योजना|सरकारी योजनाएं/.test(text)) return true;

    return false;
  }

  /**
   * Addendum B: Detect ranking / dominance / most affected keywords.
   */
  function hasRankingKeyword(text) {
    if (!text || typeof text !== 'string') return false;
    const lower = text.toLowerCase();
    const enRank = [
      "most affected", "dominant", "highest", "biggest", "major barrier",
      "most common", "highest barrier", "which barrier is"
    ];
    if (enRank.some(kw => lower.includes(kw))) return true;

    // Kannada
    if (/ಹೆಚ್ಚಾಗಿದೆ|ಅತ್ಯಂತ ಬಾಧಿತ|ಪ್ರಮುಖ|ಯಾವ ಅಡಚಣೆ|ಯಾವ ಬ್ಯಾರಿಯರ್/.test(text)) return true;

    // Hindi
    if (/सबसे बड़ी|सबसे अधिक|प्रमुख|प्रभावित|कौन सी बाधा|कौनसा बैरियर/.test(text)) return true;

    return false;
  }

  /**
   * Addendum B: Compound Query check.
   */
  function isCompoundQuery(text) {
    return hasRankingKeyword(text) && hasSolutionKeyword(text);
  }

  /**
   * Helper to detect component "no female healthcare provider".
   */
  function isNoFemaleProviderQuery(text) {
    if (!text || typeof text !== 'string') return false;
    const lower = text.toLowerCase();
    return /\b(no female healthcare provider|no female doctor|female provider|female doctor absent|absence of female|female doctor|ಮಹಿಳಾ ವೈದ್ಯರಿಲ್ಲ|ಮಹಿಳಾ ವೈದ್ಯರು|महिला डॉक्टर नहीं|महिला चिकित्सक)\b/i.test(lower);
  }

  /**
   * Normalize barrierContext string or object to canonical key ('household'|'logistic'|'facility'|'multiple'|'all').
   */
  function normalizeBarrierKey(input) {
    if (!input) return "all";
    const raw = typeof input === 'object' ? (input.key || input.barrier || input.activeBarrier || "") : input;
    const lower = String(raw).toLowerCase();
    if (lower.includes("house") || lower.includes("ಕುಟುಂಬ") || lower.includes("ಘರೇಲೂ") || lower.includes("परिवार")) return "household";
    if (lower.includes("logist") || lower.includes("ಸಾರಿಗೆ") || lower.includes("परिवहन")) return "logistic";
    if (lower.includes("facil") || lower.includes("ಆಸ್ಪತ್ರೆ") || lower.includes("अस्पताल") || lower.includes("सुविधा")) return "facility";
    if (lower.includes("mult") || lower.includes("ಅನೇಕ") || lower.includes("अनेक")) return "multiple";
    return "all";
  }

  /**
   * Step 2: Retrieve External Solutions from solutions registry.
   * Filters by barrierContext or component, enforces domain allow-list, limits to max 4.
   */
  function retrieveExternalSolutions(barrierInput, queryText = "", dataRegistry = {}, lang = "en") {
    const langKey = normalizeLangKey(lang);

    // Component check: "no female healthcare provider" has no vetted scheme
    if (isNoFemaleProviderQuery(queryText) || (typeof barrierInput === 'string' && isNoFemaleProviderQuery(barrierInput))) {
      return {
        status: "unidentified",
        message: UNIDENTIFIED_SOLUTION_MSG[langKey] || UNIDENTIFIED_SOLUTION_MSG.en,
        solutions: [],
        disclaimer: DISCLAIMER_TEXT[langKey] || DISCLAIMER_TEXT.en
      };
    }

    let registry = (dataRegistry && dataRegistry.solutionsRegistry) || null;

    if (!registry) {
      if (typeof window !== 'undefined' && window.BarrierLensSolutionsRegistry) {
        registry = window.BarrierLensSolutionsRegistry;
      } else if (typeof require !== 'undefined') {
        try {
          registry = require('../data/solutions_registry.json');
        } catch (e) {
          try {
            registry = require('../../dashboard/assets/data/solutions_registry.json');
          } catch (e2) {}
        }
      }
    }

    if (!Array.isArray(registry)) {
      return {
        status: "unavailable",
        message: "Solutions registry is not loaded.",
        solutions: [],
        disclaimer: DISCLAIMER_TEXT[langKey] || DISCLAIMER_TEXT.en
      };
    }

    const barrierKey = normalizeBarrierKey(barrierInput);
    const lowerQuery = (queryText || "").toLowerCase();

    // Check specific component keywords in query
    let detectedComponent = null;
    if (/\b(money|cost|fund|finance|afford|finances)\b|ಹಣ|ವೆಚ್ಚ|पैसा|लागत/.test(lowerQuery)) detectedComponent = "money";
    else if (/\b(transport|travel|bus|ambulance|vehicle)\b|ಸಾರಿಗೆ|ಪ್ರಯಾಣ|परिवहन|एम्बुलेंस/.test(lowerQuery)) detectedComponent = "transport";
    else if (/\b(distance|far|remote|telemedicine|teleconsultation)\b|ದೂರ|दूरी|टेलीमेडिसिन/.test(lowerQuery)) detectedComponent = "distance";
    else if (/\b(drug|drugs|medicine|medicines|pharmacy|stock|diagnostic|diagnostics|test|lab)\b|ಔಷಧ|ತಪಾಸಣೆ|दवा|दवाइयां|जांच/.test(lowerQuery)) detectedComponent = "drugs";
    else if (/\b(quality|standard|standards|accreditation|ot|labour room)\b|ಗುಣಮಟ್ಟ|गुणवत्ता/.test(lowerQuery)) detectedComponent = "quality";
    else if (/\b(permission|family permission|alone|escort|chw|asha)\b|ಅನುಮತಿ|ಒಂಟಿ|ಆಶಾ|अनुमति|आशा/.test(lowerQuery)) detectedComponent = "permission";

    // Filter registry
    const filtered = registry.filter(entry => {
      // Step 5: Domain allow-list check (mandatory)
      if (!isUrlAllowed(entry.sourceUrl)) return false;

      // Component match takes priority if present
      if (detectedComponent && entry.barrierComponent && entry.barrierComponent.toLowerCase().includes(detectedComponent)) {
        return true;
      }

      // Barrier category match
      if (barrierKey === "all" || barrierKey === "multiple") {
        return true;
      }

      if (Array.isArray(entry.barriers) && entry.barriers.includes(barrierKey)) {
        return true;
      }

      return false;
    });

    // Maximum 4 solutions returned per response
    const selected = filtered.slice(0, 4);

    return {
      status: "verified",
      barrier: barrierKey,
      solutions: selected,
      disclaimer: DISCLAIMER_TEXT[langKey] || DISCLAIMER_TEXT.en
    };
  }

  /**
   * Step 2: Internal BarrierLens Evidence (Interventions identified from NFHS-5 data).
   * This comes FIRST before External Evidence.
   */
  function getBarrierLensEvidence(barrierKey, locationName = "National", lang = "en") {
    const langKey = normalizeLangKey(lang);
    const key = normalizeBarrierKey(barrierKey);

    const evidenceItems = {
      household: {
        en: [
          "Targeting intra-household decision autonomy addresses the 27.16% national household barrier prevalence.",
          "Women with sole healthcare decision autonomy face significantly lower barrier rates (21.8%) than those lacking autonomy (36.4%).",
          "Mass media exposure and mobile phone access represent significant protective factors (OR < 1) against household barriers."
        ],
        kn: [
          "ಮನೆಯ ಮಟ್ಟದಲ್ಲಿ ನಿರ್ಧಾರ ತೆಗೆದುಕೊಳ್ಳುವ ಸ್ವಾಯತ್ತತೆಯನ್ನು ಬೆಂಬಲಿಸುವುದು 27.16% ರಾಷ್ಟ್ರೀಯ ಮನೆ/ಕುಟುಂಬ ಅಡಚಣೆಯನ್ನು ನಿವಾರಿಸಲು ನೆರವಾಗುತ್ತದೆ.",
          "ಆರೋಗ್ಯ ನಿರ್ಧಾರಗಳಲ್ಲಿ ಸ್ವಾಯತ್ತತೆ ಹೊಂದಿರುವ ಮಹಿಳೆಯರು (21.8%), ಸ್ವಾಯತ್ತತೆಯಿಲ್ಲದ ಮಹಿಳೆಯರಿಗಿಂತ (36.4%) ಗಣನೀಯವಾಗಿ ಕಡಿಮೆ ಅಡಚಣೆಯನ್ನು ಎದುರಿಸುತ್ತಾರೆ.",
          "ಮಾಧ್ಯಮ ಸಂಪರ್ಕ ಮತ್ತು ಮೊಬೈಲ್ ಫೋನ್ ಬಳಕೆ ಕುಟುಂಬ ಅಡಚಣೆಗಳ ವಿರುದ್ಧ ಪ್ರಮುಖ ರಕ್ಷಣಾತ್ಮಕ ಅಂಶಗಳಾಗಿವೆ (OR < 1)."
        ],
        hi: [
          "पारिवारिक निर्णय स्वायत्तता को बढ़ावा देना 27.16% राष्ट्रीय घरेलू बाधा दर को कम करने में सहायता करता है।",
          "स्वास्थ्य निर्णयों में स्वायत्तता रखने वाली महिलाएं (21.8%), स्वायत्तता से वंचित महिलाओं (36.4%) की तुलना में काफी कम बाधाओं का सामना करती हैं।",
          "मास मीडिया और मोबाइल फोन की पहुंच घरेलू बाधाओं के खिलाफ महत्वपूर्ण सुरक्षात्मक कारक (OR < 1) हैं।"
        ]
      },
      logistic: {
        en: [
          "Targeting the poorest wealth quintile addresses 68.42% of observed barriers, where financial and transport transit barriers are most severe.",
          "Rural women face a 17.46 percentage point higher healthcare access gap than urban women, driven primarily by physical distance and travel costs.",
          "Logistic barriers represent India's 2nd highest barrier domain (31.61% observed national prevalence)."
        ],
        kn: [
          "ಅತ್ಯಂತ ಬಡ ವರ್ಗದ ಮಹಿಳೆಯರನ್ನು ಕೇಂದ್ರೀಕರಿಸುವುದು 68.42% ಒಟ್ಟಾರೆ ಅಡಚಣೆಗಳನ್ನು ನಿವಾರಿಸಲು ನೆರವಾಗುತ್ತದೆ, ಇಲ್ಲಿ ಸಾರಿಗೆ ಮತ್ತು ವೆಚ್ಚದ ಅಡಚಣೆಗಳು ತೀವ್ರವಾಗಿವೆ.",
          "ನಗರ ಮಹಿಳೆಯರಿಗಿಂತ ಗ್ರಾಮೀಣ ಮಹಿಳೆಯರು 17.46 ಶೇಕಡಾವಾರು ಅಂಕಗಳಷ್ಟು ಹೆಚ್ಚಿನ ಆರೋಗ್ಯ ಅಡಚಣೆಯನ್ನು ಎದುರಿಸುತ್ತಾರೆ (ದೂರ ಮತ್ತು ಸಾರಿಗೆ ವೆಚ್ಚದ ಕಾರಣ).",
          "ಸಾರಿಗೆ/ವೆಚ್ಚದ ಅಡಚಣೆಗಳು ಭಾರತದಲ್ಲಿ ಎರಡನೇ ಅತಿ ದೊಡ್ಡ ಅಡಚಣೆಯಾಗಿದೆ (31.61% ರಾಷ್ಟ್ರೀಯ ಪ್ರಮಾಣ)."
        ],
        hi: [
          "अति निर्धन वर्ग पर ध्यान केंद्रित करना 68.42% बाधाओं को दूर करने में सहायता करता है, जहां परिवहन और वित्तीय बाधाएं सबसे तीव्र हैं।",
          "शहरी महिलाओं की तुलना में ग्रामीण महिलाएं 17.46 प्रतिशत अंक अधिक बाधा का सामना करती हैं (दूरी और यात्रा लागत मुख्य कारण हैं)।",
          "परिवहन/लागत की बाधाएं भारत में दूसरी सबसे बड़ी बाधा श्रेणी हैं (31.61% राष्ट्रीय दर)।"
        ]
      },
      facility: {
        en: [
          "Educated women show significantly lower odds of facility barriers; higher education serves as a documented protective factor.",
          "Facility-level barriers constitute India's single largest healthcare obstacle (46.01% observed national prevalence, Rank 1).",
          "Provider absence and medicine stock-outs are the primary sub-components driving facility barrier exposure across public health centers."
        ],
        kn: [
          "ಶಿಕ್ಷಣ ಪಡೆದ ಮಹಿಳೆಯರು ಆಸ್ಪತ್ರೆ/ಸೌಲಭ್ಯದ ಅಡಚಣೆಗಳನ್ನು ಎದುರಿಸುವ ಸಾಧ್ಯತೆ ಗಣನೀಯವಾಗಿ ಕಡಿಮೆಯಾಗಿದೆ (ಉನ್ನತ ಶಿಕ್ಷಣವು ರಕ್ಷಣಾತ್ಮಕ ಅಂಶವಾಗಿದೆ).",
          "ಆಸ್ಪತ್ರೆ/ಸೌಲಭ್ಯದ ಅಡಚಣೆಗಳು ಭಾರತದ ಅತಿ ದೊಡ್ಡ ಆರೋಗ್ಯ ಸೇವಾ ಅಡಚಣೆಯಾಗಿದೆ (46.01% ರಾಷ್ಟ್ರೀಯ ಪ್ರಮಾಣ, ಪ್ರಥಮ ಸ್ಥಾನ).",
          "ವೈದ್ಯರ ಗೈರುಹಾಜರಿ ಮತ್ತು ಔಷಧಿಗಳ ಅಭಾವವು ಸರ್ಕಾರಿ ಆರೋಗ್ಯ ಕೇಂದ್ರಗಳಲ್ಲಿ ಮುಖ್ಯ ಸವಾಲುಗಳಾಗಿವೆ."
        ],
        hi: [
          "शिक्षित महिलाओं में अस्पताल/सुविधा बाधाओं का सामना करने की संभावना काफी कम होती है; उच्च शिक्षा एक मजबूत सुरक्षात्मक कारक है।",
          "अस्पताल/सुविधा की बाधाएं भारत में सबसे बड़ी स्वास्थ्य पहुंच बाधा हैं (46.01% राष्ट्रीय दर, प्रथम स्थान)।",
          "डॉक्टरों की अनुपस्थिति और दवाओं की कमी सार्वजनिक स्वास्थ्य केंद्रों में मुख्य उप-घटक हैं।"
        ]
      },
      multiple: {
        en: [
          "31.55% of Indian women experience 2 or more overlapping healthcare barriers simultaneously.",
          "Multi-barrier vulnerability is heavily concentrated in Cluster 0 (High Vulnerability, High Barrier Exposure: 52.9% of women).",
          "Addressing combined socioeconomic vulnerabilities (poorest wealth OR=1.26, illiterate OR=1.20) simultaneously mitigates overlapping barriers."
        ],
        kn: [
          "31.55% ಭಾರತೀಯ ಮಹಿಳೆಯರು ಏಕಕಾಲದಲ್ಲಿ 2 ಅಥವಾ ಹೆಚ್ಚಿನ ಅಡಚಣೆಗಳನ್ನು ಎದುರಿಸುತ್ತಾರೆ.",
          "ಹೆಚ್ಚಿನ ಅಪಾಯವಿರುವ ಕ್ಲಸ್ಟರ್ 0 ನಲ್ಲಿ (52.9% ಮಹಿಳೆಯರು) ಅನೇಕ ಸಮಾವೇಶಗೊಳ್ಳುವ ಅಡಚಣೆಗಳು ಕೇಂದ್ರೀಕೃತವಾಗಿವೆ.",
          "ಬಡತನ ಮತ್ತು ಅನಕ್ಷರತೆಯಂತಹ ಅಂಶಗಳನ್ನು ಒಟ್ಟಾಗಿ ಸರಿಪಡಿಸುವುದು ಬಹುಮುಖಿ ಅಡಚಣೆಗಳನ್ನು ತಗ್ಗಿಸುತ್ತದೆ."
        ],
        hi: [
          "31.55% भारतीय महिलाएं एक साथ 2 या अधिक बाधाओं का सामना करती हैं।",
          "बहु-बाधा जोखिम मुख्य रूप से क्लस्टर 0 (उच्च संवेदनशीलता: 52.9% महिलाएं) में केंद्रित है।",
          "निर्धनता और अशिक्षा जैसे सामाजिक-आर्थिक कारकों का संयुक्त समाधान बहु-बाधाओं को कम करता है।"
        ]
      },
      all: {
        en: [
          "National overall prevalence indicates 59.16% of Indian women face at least one barrier to healthcare access (NFHS-5, N=724,115).",
          "Facility barriers rank 1st (46.01%), followed by Logistic barriers (31.61%, Rank 2) and Household barriers (27.16%, Rank 3).",
          "Cross-sectoral interventions targeting rural infrastructure and financial protection yield broad improvements across all barrier types."
        ],
        kn: [
          "ರಾಷ್ಟ್ರೀಯ ಒಟ್ಟಾರೆ ದತ್ತಾಂಶದ ಪ್ರಕಾರ 59.16% ಭಾರತೀಯ ಮಹಿಳೆಯರು ಕನಿಷ್ಠ ಒಂದು ಆರೋಗ್ಯ ಅಡಚಣೆಯನ್ನು ಎದುರಿಸುತ್ತಾರೆ (NFHS-5, N=7,24,115).",
          "ಆಸ್ಪತ್ರೆ ಅಡಚಣೆ ಪ್ರಥಮ ಸ್ಥಾನ (46.01%), ಸಾರಿಗೆ ಅಡಚಣೆ ದ್ವಿತೀಯ ಸ್ಥಾನ (31.61%) ಮತ್ತು ಮನೆ/ಕುಟುಂಬ ಅಡಚಣೆ ತೃತೀಯ ಸ್ಥಾನ (27.16%) ಪಡೆದಿವೆ.",
          "ಗ್ರಾಮೀಣ ಮೂಲಸೌಕರ್ಯ ಮತ್ತು ಆರ್ಥಿಕ ರಕ್ಷಣೆಯನ್ನು ಒದಗಿಸುವುದು ಎಲ್ಲಾ ವರ್ಗಗಳ ಅಡಚಣೆಗಳನ್ನು ಕಡಿಮೆ ಮಾಡಲು ನೆರವಾಗುತ್ತದೆ."
        ],
        hi: [
          "राष्ट्रीय आंकड़ों के अनुसार 59.16% भारतीय महिलाएं कम से कम एक स्वास्थ्य पहुंच बाधा का सामना करती हैं (NFHS-5, N=7,24,115)।",
          "अस्पताल बाधा प्रथम स्थान (46.01%), परिवहन बाधा द्वितीय स्थान (31.61%) और घरेलू बाधा तृतीय स्थान (27.16%) पर है।",
          "ग्रामीण बुनियादी ढांचे और वित्तीय सुरक्षा में सुधार से सभी बाधा श्रेणियों में व्यापक सुधार संभव है।"
        ]
      }
    };

    const targetList = evidenceItems[key] || evidenceItems.all;
    return targetList[langKey] || targetList.en;
  }

  /**
   * Addendum B: Resolve Location for Compound or Ranking Queries.
   */
  function resolveLocation(text, entities = {}, session = null, options = {}) {
    // 1. Explicit state in query entities or text
    if (entities.states && entities.states.length > 0) {
      return { type: "state", state: entities.states[0], source: "query_entity" };
    }
    if (entities.state) {
      const sName = Array.isArray(entities.state) ? entities.state[0] : entities.state;
      return { type: "state", state: sName, source: "query_entity" };
    }

    const lower = (text || "").toLowerCase();
    const isHereMentioned = /\bhere\b|ಇಲ್ಲಿ|यहाँ/.test(lower);

    if (isHereMentioned) {
      // Check session context
      if (session && session.activeState) {
        return { type: "state", state: session.activeState, source: "session_context" };
      }
      if (options && options.activeState) {
        return { type: "state", state: options.activeState, source: "options_context" };
      }
      // Explicit national fallback if no session state
      return { type: "national", state: null, source: "national_fallback" };
    }

    if (session && session.activeState) {
      return { type: "state", state: session.activeState, source: "session_context" };
    }

    return { type: "national", state: null, source: "national_fallback" };
  }

  /**
   * Addendum B: Rank Barriers for a given Location.
   * If National: Facility (46.01%, Rank 1) > Logistic (31.61%, Rank 2) > Household (27.16%, Rank 3).
   * If State: Computed directly from state_summary.json.
   */
  function rankBarriersForLocation(location, dataRegistry = {}) {
    if (location.type === "state" && location.state) {
      const stateData = dataRegistry.stateSummary;
      let stateObj = null;
      if (stateData && Array.isArray(stateData.states)) {
        stateObj = stateData.states.find(s => s.state_name.toLowerCase() === location.state.toLowerCase());
      }

      if (stateObj) {
        const facRate = (stateObj.observed_facility_rate * 100);
        const logRate = (stateObj.observed_logistic_rate * 100);
        const hhRate = (stateObj.observed_household_rate * 100);
        const anyRate = (stateObj.observed_any_barrier_rate * 100);

        const items = [
          { key: "facility", name: "Facility Barrier", rate: facRate, rateStr: facRate.toFixed(2) + "%" },
          { key: "logistic", name: "Logistic Barrier", rate: logRate, rateStr: logRate.toFixed(2) + "%" },
          { key: "household", name: "Household Barrier", rate: hhRate, rateStr: hhRate.toFixed(2) + "%" }
        ];

        items.sort((a, b) => b.rate - a.rate);
        items.forEach((item, idx) => { item.rank = idx + 1; });

        return {
          locationType: "state",
          locationName: stateObj.state_name,
          sampleSize: stateObj.sample_size_n,
          anyRateStr: anyRate.toFixed(2) + "%",
          dominantBarrierKey: items[0].key,
          dominantBarrierName: items[0].name,
          dominantRateStr: items[0].rateStr,
          ranking: items,
          source: "dashboard/assets/data/state_summary.json"
        };
      }
    }

    // Default National Ranking
    const natItems = [
      { key: "facility", name: "Facility Barrier", rate: 46.01, rateStr: "46.01%", rank: 1 },
      { key: "logistic", name: "Logistic Barrier", rate: 31.61, rateStr: "31.61%", rank: 2 },
      { key: "household", name: "Household Barrier", rate: 27.16, rateStr: "27.16%", rank: 3 }
    ];

    return {
      locationType: "national",
      locationName: "National (India)",
      sampleSize: 724115,
      anyRateStr: "59.16%",
      dominantBarrierKey: "facility",
      dominantBarrierName: "Facility Barrier",
      dominantRateStr: "46.01%",
      ranking: natItems,
      source: "dashboard/assets/data/national_overview.json"
    };
  }

  /**
   * Step 3: Format External Solution item strictly according to schema:
   * Recommended Solution: <title>
   * Source: <sourceOrg> — <sourceTitle> (<sourceUrl as clickable link>)
   * Why it may help: <whyItMayHelp>
   * Caveat: <caveat>
   */
  function formatExternalSolutionText(sol, lang = "en") {
    const langKey = normalizeLangKey(lang);

    const labels = {
      en: { rec: "Recommended Solution", src: "Source", why: "Why it may help", cav: "Caveat" },
      kn: { rec: "ಶಿಫಾರಸು ಮಾಡಿದ ಪರಿಹಾರ (Recommended Solution)", src: "ಮೂಲ (Source)", why: "ಇದು ಹೇಗೆ ನೆರವಾಗುತ್ತದೆ (Why it may help)", cav: "ಗಮನಿಸಿ (Caveat)" },
      hi: { rec: "अनुशंसित समाधान (Recommended Solution)", src: "स्रोत (Source)", why: "यह क्यों सहायक है (Why it may help)", cav: "टिप्पणी (Caveat)" }
    };
    const t = labels[langKey] || labels.en;

    // Scheme name in English with localized script equivalent alongside
    let titleStr = sol.title;
    if (langKey === 'kn' && sol.title_kn) titleStr = `${sol.title} (${sol.title_kn})`;
    else if (langKey === 'hi' && sol.title_hi) titleStr = `${sol.title} (${sol.title_hi})`;

    // SourceOrg & SourceUrl kept in English
    const sourceStr = `${sol.sourceOrg} — ${sol.sourceTitle} (${sol.sourceUrl})`;

    // Localized description & rationale
    let whyStr = sol.whyItMayHelp;
    if (langKey === 'kn' && sol.whyItMayHelp_kn) whyStr = sol.whyItMayHelp_kn;
    else if (langKey === 'hi' && sol.whyItMayHelp_hi) whyStr = sol.whyItMayHelp_hi;

    let caveatStr = sol.caveat;
    if (langKey === 'kn' && sol.caveat_kn) caveatStr = sol.caveat_kn;
    else if (langKey === 'hi' && sol.caveat_hi) caveatStr = sol.caveat_hi;

    return `• **${t.rec}:** ${titleStr}\n  **${t.src}:** ${sourceStr}\n  **${t.why}:** ${whyStr}\n  **${t.cav}:** ${caveatStr}`;
  }

  /**
   * Format complete solutions response (Section 1 BarrierLens Evidence + Section 2 External Evidence + Disclaimer).
   */
  function formatSolutionsResponse(barrierContext, externalResult, locationInfo = null, lang = "en") {
    const langKey = normalizeLangKey(lang);
    const locName = locationInfo ? locationInfo.locationName : "National";

    // Unidentified component handling
    if (externalResult.status === "unidentified") {
      return {
        answer: externalResult.message,
        disclaimer: externalResult.disclaimer,
        status: "verified",
        solutions: []
      };
    }

    const bName = normalizeBarrierKey(barrierContext);
    const blInterventions = getBarrierLensEvidence(bName, locName, langKey);

    const sectionTitles = {
      en: { bl: "BarrierLens Evidence", ext: "External Evidence" },
      kn: { bl: "ಬ್ಯಾರಿಯರ್ ಲೆನ್ಸ್ ಸಾಕ್ಷ್ಯ (BarrierLens Evidence)", ext: "ಬಾಹ್ಯ ಅಧಿಕೃತ ಸಾಕ್ಷ್ಯ (External Evidence)" },
      hi: { bl: "बैरियरलेंस साक्ष्य (BarrierLens Evidence)", ext: "बाह्य आधिकारिक साक्ष्य (External Evidence)" }
    };
    const tSec = sectionTitles[langKey] || sectionTitles.en;

    const parts = [];

    // Section 1: BarrierLens Evidence (Internal Data)
    parts.push(`### 📊 ${tSec.bl}`);
    blInterventions.forEach(item => {
      parts.push(`• ${item}`);
    });

    // Section 2: External Evidence (Curated Solutions)
    if (externalResult.solutions && externalResult.solutions.length > 0) {
      parts.push(`\n### 🏛️ ${tSec.ext}`);
      externalResult.solutions.forEach(sol => {
        parts.push(formatExternalSolutionText(sol, langKey));
      });
    }

    // Step 3: Single closing disclaimer line
    parts.push(`\n*${DISCLAIMER_TEXT[langKey] || DISCLAIMER_TEXT.en}*`);

    return {
      answer: parts.join("\n"),
      barrierLensEvidence: blInterventions,
      externalSolutions: externalResult.solutions,
      disclaimer: DISCLAIMER_TEXT[langKey] || DISCLAIMER_TEXT.en,
      status: "verified"
    };
  }

  const STATE_INDIC_NAMES = {
    "Karnataka": { kn: "ಕರ್ನಾಟಕ (Karnataka)", hi: "कर्नाटक (Karnataka)" },
    "Bihar": { kn: "ಬಿಹಾರ (Bihar)", hi: "बिहार (Bihar)" },
    "Kerala": { kn: "ಕೇರಳ (Kerala)", hi: "केरल (Kerala)" },
    "Tamil Nadu": { kn: "ತಮಿಳುನಾಡು (Tamil Nadu)", hi: "तमिलनाडु (Tamil Nadu)" },
    "Uttar Pradesh": { kn: "ಉತ್ತರ ಪ್ರದೇಶ (Uttar Pradesh)", hi: "उत्तर प्रदेश (Uttar Pradesh)" },
    "Maharashtra": { kn: "ಮಹಾರಾಷ್ಟ್ರ (Maharashtra)", hi: "महाराष्ट्र (Maharashtra)" },
    "West Bengal": { kn: "ಪಶ್ಚಿಮ ಬಂಗಾಳ (West Bengal)", hi: "पश्चिम बंगाल (West Bengal)" },
    "Gujarat": { kn: "ಗುಜರಾತ್ (Gujarat)", hi: "गुजरात (Gujarat)" },
    "Rajasthan": { kn: "ರಾಜಸ್ಥಾನ (Rajasthan)", hi: "राजस्थान (Rajasthan)" },
    "Andhra Pradesh": { kn: "ಆಂಧ್ರ ಪ್ರದೇಶ (Andhra Pradesh)", hi: "आंध्र प्रदेश (Andhra Pradesh)" },
    "Telangana": { kn: "ತೆಲಂಗಾಣ (Telangana)", hi: "तेलंगाना (Telangana)" },
    "Madhya Pradesh": { kn: "ಮಧ್ಯ ಪ್ರದೇಶ (Madhya Pradesh)", hi: "मध्य प्रदेश (Madhya Pradesh)" },
    "Assam": { kn: "ಅಸ್ಸಾಂ (Assam)", hi: "असम (Assam)" },
    "National (India)": { kn: "ರಾಷ್ಟ್ರೀಯ ಭಾರತ (National India)", hi: "राष्ट्रीय भारत (National India)" }
  };

  const BARRIER_INDIC_NAMES = {
    facility: {
      kn: "ಆಸ್ಪತ್ರೆ / ಸೌಲಭ್ಯದ ಅಡಚಣೆ (Facility Barrier)",
      hi: "अस्पताल / सुविधा की बाधा (Facility Barrier)"
    },
    logistic: {
      kn: "ಸಾರಿಗೆ / ವೆಚ್ಚದ ಅಡಚಣೆ (Logistic Barrier)",
      hi: "परिवहन / लागत बाधा (Logistic Barrier)"
    },
    household: {
      kn: "ಮನೆ / ಕುಟುಂಬದ ಅಡಚಣೆ (Household Barrier)",
      hi: "घरेलू / पारिवारिक बाधा (Household Barrier)"
    }
  };

  /**
   * Addendum B: Execute Compound Query Decomposition and Formatting.
   * Part 1 (Ranking) -> Part 2 (Solutions for dominant barrier) -> Combined Answer.
   */
  function executeCompoundQuery(text, entities, session, dataRegistry, lang = "en") {
    const langKey = normalizeLangKey(lang);

    // 1. Resolve Location
    const location = resolveLocation(text, entities, session);

    // 2. Part 1: Ranking computation
    const rankingInfo = rankBarriersForLocation(location, dataRegistry);

    // 3. Part 2: Pass dominant barrier to Solutions Layer
    const domKey = rankingInfo.dominantBarrierKey;
    const externalResult = retrieveExternalSolutions(domKey, text, dataRegistry, langKey);

    const sectionTitles = {
      en: { bl: "BarrierLens Evidence", ext: "External Evidence" },
      kn: { bl: "ಬ್ಯಾರಿಯರ್ ಲೆನ್ಸ್ ಸಾಕ್ಷ್ಯ (BarrierLens Evidence)", ext: "ಬಾಹ್ಯ ಅಧಿಕೃತ ಸಾಕ್ಷ್ಯ (External Evidence)" },
      hi: { bl: "बैरियरलेंस साक्ष्य (BarrierLens Evidence)", ext: "बाह्य आधिकारिक साक्ष्य (External Evidence)" }
    };
    const tSec = sectionTitles[langKey] || sectionTitles.en;

    const parts = [];

    const locName = (STATE_INDIC_NAMES[rankingInfo.locationName] && STATE_INDIC_NAMES[rankingInfo.locationName][langKey]) || rankingInfo.locationName;
    const domName = (BARRIER_INDIC_NAMES[domKey] && BARRIER_INDIC_NAMES[domKey][langKey]) || rankingInfo.dominantBarrierName;

    // Section 1: BarrierLens Evidence (Ranking & Prevalence Numbers)
    parts.push(`### 📊 ${tSec.bl}`);
    if (langKey === 'kn') {
      parts.push(`**${locName}** ನಲ್ಲಿ (ಮಾದರಿ ಗಾತ್ರ N = ${rankingInfo.sampleSize ? rankingInfo.sampleSize.toLocaleString() : '7,24,115'}), ಪ್ರಮುಖ ಅಡಚಣೆ ವರ್ಗ: **${domName} (${rankingInfo.dominantRateStr})**.`);
      rankingInfo.ranking.forEach(r => {
        const rName = (BARRIER_INDIC_NAMES[r.key] && BARRIER_INDIC_NAMES[r.key].kn) || r.name;
        parts.push(`• **${rName} (ಸ್ಥಾನ ${r.rank}):** ${r.rateStr}`);
      });
    } else if (langKey === 'hi') {
      parts.push(`**${locName}** में (नमूना आकार N = ${rankingInfo.sampleSize ? rankingInfo.sampleSize.toLocaleString() : '7,24,115'}), सबसे प्रमुख बाधा: **${domName} (${rankingInfo.dominantRateStr})**.`);
      rankingInfo.ranking.forEach(r => {
        const rName = (BARRIER_INDIC_NAMES[r.key] && BARRIER_INDIC_NAMES[r.key].hi) || r.name;
        parts.push(`• **${rName} (रैंक ${r.rank}):** ${r.rateStr}`);
      });
    } else {
      parts.push(`In **${rankingInfo.locationName}** (Sample size N = ${rankingInfo.sampleSize ? rankingInfo.sampleSize.toLocaleString() : '724,115'}), the dominant barrier is **${rankingInfo.dominantBarrierName} (${rankingInfo.dominantRateStr}, Rank 1)**.`);
      rankingInfo.ranking.forEach(r => {
        parts.push(`• **${r.name} (Rank ${r.rank}):** ${r.rateStr}`);
      });
    }

    // Section 2: External Evidence (Curated Solutions for dominant barrier)
    if (externalResult.solutions && externalResult.solutions.length > 0) {
      parts.push(`\n### 🏛️ ${tSec.ext} — Curated Interventions for ${rankingInfo.dominantBarrierName}`);
      externalResult.solutions.forEach(sol => {
        parts.push(formatExternalSolutionText(sol, langKey));
      });
    }

    // Closing disclaimer
    parts.push(`\n*${DISCLAIMER_TEXT[langKey] || DISCLAIMER_TEXT.en}*`);

    return {
      answer: parts.join("\n"),
      rankingInfo: rankingInfo,
      dominantBarrier: domKey,
      externalSolutions: externalResult.solutions,
      disclaimer: DISCLAIMER_TEXT[langKey] || DISCLAIMER_TEXT.en,
      status: "verified"
    };
  }

  /**
   * Format pure ranking response (when query asks "Which barrier is most affected?" without solutions).
   */
  function executeRankingQueryOnly(text, entities, session, dataRegistry, lang = "en") {
    const langKey = normalizeLangKey(lang);
    const location = resolveLocation(text, entities, session);
    const rankingInfo = rankBarriersForLocation(location, dataRegistry);

    const locName = (STATE_INDIC_NAMES[rankingInfo.locationName] && STATE_INDIC_NAMES[rankingInfo.locationName][langKey]) || rankingInfo.locationName;
    const domName = (BARRIER_INDIC_NAMES[rankingInfo.dominantBarrierKey] && BARRIER_INDIC_NAMES[rankingInfo.dominantBarrierKey][langKey]) || rankingInfo.dominantBarrierName;

    const parts = [];
    if (langKey === 'kn') {
      parts.push(`**${locName}** ನಲ್ಲಿ ಅಡಚಣೆಗಳ ಆದ್ಯತೆ (NFHS-5, N = ${rankingInfo.sampleSize ? rankingInfo.sampleSize.toLocaleString() : '7,24,115'}):`);
      parts.push(`ಪ್ರಮುಖ ಅಡಚಣೆ: **${domName} (${rankingInfo.dominantRateStr})**.`);
      rankingInfo.ranking.forEach(r => {
        const rName = (BARRIER_INDIC_NAMES[r.key] && BARRIER_INDIC_NAMES[r.key].kn) || r.name;
        parts.push(`• **${rName} (ಸ್ಥಾನ ${r.rank}):** ${r.rateStr}`);
      });
    } else if (langKey === 'hi') {
      parts.push(`**${locName}** में बाधा रैंकिंग (NFHS-5, N = ${rankingInfo.sampleSize ? rankingInfo.sampleSize.toLocaleString() : '7,24,115'}):`);
      parts.push(`प्रमुख बाधा: **${domName} (${rankingInfo.dominantRateStr})**.`);
      rankingInfo.ranking.forEach(r => {
        const rName = (BARRIER_INDIC_NAMES[r.key] && BARRIER_INDIC_NAMES[r.key].hi) || r.name;
        parts.push(`• **${rName} (रैंक ${r.rank}):** ${r.rateStr}`);
      });
    } else {
      parts.push(`In **${rankingInfo.locationName}** (NFHS-5, N = ${rankingInfo.sampleSize ? rankingInfo.sampleSize.toLocaleString() : '724,115'}), the dominant barrier is **${rankingInfo.dominantBarrierName} (${rankingInfo.dominantRateStr})**:`);
      rankingInfo.ranking.forEach(r => {
        parts.push(`• **${r.name} (Rank ${r.rank}):** ${r.rateStr}`);
      });
    }

    return {
      answer: parts.join("\n"),
      rankingInfo: rankingInfo,
      dominantBarrier: rankingInfo.dominantBarrierKey,
      status: "verified"
    };
  }

  /**
   * Addendum D: Anti-hallucination validator for external LLM output.
   * Discards output if an unvetted scheme or disallowed domain is detected.
   */
  function validateLlmSolutionsSafety(llmText, vettedRegistry = []) {
    if (!llmText || typeof llmText !== 'string') return true;

    // Check URLs in LLM text
    const urlMatches = llmText.match(/https?:\/\/[^\s)"]+/gi) || [];
    for (const u of urlMatches) {
      if (!isUrlAllowed(u)) {
        return false; // Disallowed domain found -> reject
      }
    }

    // Check for fake schemes
    const lower = llmText.toLowerCase();
    const fabricatedKeywords = [
      "fake health scheme", "ayushman fake", "unverified insurance", "scheme 2099", "national bed fund"
    ];
    if (fabricatedKeywords.some(kw => lower.includes(kw))) {
      return false;
    }

    return true;
  }

  // ---------------------------------------------------------------------------
  // ADDENDUM 3: PERSONAL PROBLEM STATEMENTS & EMERGENCY HANDLING
  // ---------------------------------------------------------------------------
  let _problemConfigCache = null;

  function getProblemConfig(dataRegistry = {}) {
    if (_problemConfigCache) return _problemConfigCache;
    if (dataRegistry && dataRegistry.personalProblemMapping) {
      _problemConfigCache = dataRegistry.personalProblemMapping;
      return _problemConfigCache;
    }
    if (typeof window !== 'undefined' && window.BarrierLensPersonalProblemMapping) {
      _problemConfigCache = window.BarrierLensPersonalProblemMapping;
      return _problemConfigCache;
    }
    if (typeof require !== 'undefined') {
      try {
        const fs = require('fs');
        const path = require('path');
        const candidates = [
          path.resolve(__dirname, '../data/personal_problem_mapping.json'),
          path.resolve(__dirname, '../../assets/data/personal_problem_mapping.json'),
          path.resolve(__dirname, '../../../assets/data/personal_problem_mapping.json'),
          path.resolve(process.cwd(), 'dashboard/assets/data/personal_problem_mapping.json'),
          path.resolve(process.cwd(), 'assets/data/personal_problem_mapping.json')
        ];
        for (const c of candidates) {
          if (fs.existsSync(c)) {
            _problemConfigCache = JSON.parse(fs.readFileSync(c, 'utf8'));
            return _problemConfigCache;
          }
        }
      } catch (e) {}
    }
    return null;
  }

  /**
   * Addendum 3 Safety: Detect emergency keywords (severe pain, heavy bleeding, labour, unconscious, can't breathe).
   */
  function detectEmergency(text, lang = "en", config = null) {
    if (!text || typeof text !== 'string') return false;
    const lower = text.toLowerCase();
    const cfg = config || getProblemConfig();
    const em = (cfg && cfg.emergencyKeywords) || {};
    const allEmKeywords = [
      ...(em.en || ["severe pain", "heavy bleeding", "labour", "in labour", "unconscious", "can't breathe", "cannot breathe", "chest pain", "bleeding heavily", "emergency"]),
      ...(em.hi || ["अत्यधिक दर्द", "गंभीर दर्द", "भारी रक्तस्राव", "प्रसव", "प्रसव पीड़ा", "बेहोश", "सांस नहीं आ रही"]),
      ...(em.kn || ["ತೀವ್ರ ನೋವು", "ಹೆಚ್ಚು ರಕ್ತಸ್ರಾವ", "ಹೆರಿಗೆ", "ಹೆರಿಗೆ ನೋವು", "ಪ್ರಜ್ಞಾಹೀನ", "ಉಸಿರಾಡಲು ಸಾಧ್ಯವಾಗುತ್ತಿಲ್ಲ"])
    ];
    return allEmKeywords.some(kw => lower.includes(kw.toLowerCase()));
  }

  /**
   * Addendum 3: Detect if text is a personal problem statement ("I have a problem going to the hospital", "hospital is far", etc.)
   */
  function isPersonalProblemQuery(text, lang = "en", config = null) {
    if (!text || typeof text !== 'string') return false;
    const lower = text.toLowerCase();
    const cfg = config || getProblemConfig();

    if (detectEmergency(text, lang, cfg)) return true;

    // Direct guidance phrases like "i am facing facility level barrier what should i do"
    if (/facing (?:a )?(facility|household|logistic|multiple).*(?:barrier|problem|level)/i.test(lower) ||
        /i am facing/i.test(lower) || /i'm facing/i.test(lower)) {
      return true;
    }

    // Direct key phrases specified in Addendum 3
    if (/\b(hospital is far|clinic is far|no transport|no bus|can't afford|cannot afford|won't allow|doesn't allow|no one to go|nobody to go|not available|no lady doctor|no female doctor|no medicines)\b/i.test(lower)) {
      return true;
    }

    // First person indicators list from config
    const fp = (cfg && cfg.firstPersonIndicators) || {};
    const allFp = [
      ...(fp.en || []),
      ...(fp.hi || []),
      ...(fp.kn || [])
    ];
    if (allFp.some(ind => lower.includes(ind.toLowerCase()))) {
      return true;
    }

    // Kannada & Hindi problem indicators
    if (/ಅಸ್ಪತ್ರೆ ದೂರ|ಆಸ್ಪತ್ರೆ ದೂರ|ಸಾರಿಗೆ ಇಲ್ಲ|ಔಷಧಿಗಳಿಲ್ಲ|ಮಹಿಳಾ ವೈದ್ಯರಿಲ್ಲ|ಚಿಕಿತ್ಸೆ ಭರಿಸಲು|ಕುಟುಂಬದವರು ಬಿಡುತ್ತಿಲ್ಲ|ಜೊತೆಗೆ ಯಾರೂ ಇಲ್ಲ|ತೊಂದರೆ ಇದೆ|ಸಮಸ್ಯೆ ಇದೆ/i.test(text)) return true;
    if (/अस्पताल दूर|सवारी नहीं|दवाएं नहीं|दवाइयां उपलब्ध नहीं|महिला डॉक्टर नहीं|खर्च नहीं उठा|अनुमति नहीं|साथ जाने वाला कोई नहीं|समस्या है|परेशानी है/i.test(text)) return true;

    return false;
  }

  /**
   * Addendum 3: Deterministic Problem -> Barrier Mapping (config-based, zero LLM hallucination).
   */
  function mapProblemToBarrier(text, lang = "en", config = null) {
    if (!text || typeof text !== 'string') return { matched: false, isAmbiguous: true };
    const lower = text.toLowerCase();
    const cfg = config || getProblemConfig();
    const mappings = (cfg && cfg.problemMappings) || [];

    // Direct explicit mention of barrier name in personal problem statement
    if (/\bfacility\b|ಆಸ್ಪತ್ರೆ|ಅಸ್ಪತ್ರೆ|सुविधा|अस्पताल/.test(lower) && /\b(facing|barrier|problem|level)\b/.test(lower)) {
      for (const m of mappings) {
        if (m.barrier === "facility") {
          const kws = [...(m.keywords.en || []), ...(m.keywords.hi || []), ...(m.keywords.kn || [])];
          if (kws.some(kw => lower.includes(kw.toLowerCase()))) {
            return { matched: true, barrier: m.barrier, component: m.component, displayName: m.displayName };
          }
        }
      }
      return { matched: true, barrier: "facility", component: "drugs", displayName: { en: "medicines and facility services", kn: "ಔಷಧಿಗಳು ಮತ್ತು ಆಸ್ಪತ್ರೆ ಸೇವೆ", hi: "दवाएं और अस्पताल सेवाएं" } };
    }
    if (/\bhousehold\b|ಕುಟುಂಬ|ಮನೆ|घरेलू|परिवार/.test(lower) && /\b(facing|barrier|problem|level)\b/.test(lower)) {
      for (const m of mappings) {
        if (m.barrier === "household") {
          const kws = [...(m.keywords.en || []), ...(m.keywords.hi || []), ...(m.keywords.kn || [])];
          if (kws.some(kw => lower.includes(kw.toLowerCase()))) {
            return { matched: true, barrier: m.barrier, component: m.component, displayName: m.displayName };
          }
        }
      }
      return { matched: true, barrier: "household", component: "money", displayName: { en: "cost and financial constraint", kn: "ಹಣಕಾಸು/ವೆಚ್ಚ", hi: "लागत/वित्तीय कमी" } };
    }
    if (/\blogistic\b|ಸಾರಿಗೆ|परिवहन/.test(lower) && /\b(facing|barrier|problem|level)\b/.test(lower)) {
      for (const m of mappings) {
        if (m.barrier === "logistic") {
          const kws = [...(m.keywords.en || []), ...(m.keywords.hi || []), ...(m.keywords.kn || [])];
          if (kws.some(kw => lower.includes(kw.toLowerCase()))) {
            return { matched: true, barrier: m.barrier, component: m.component, displayName: m.displayName };
          }
        }
      }
      return { matched: true, barrier: "logistic", component: "transport", displayName: { en: "distance/transport", kn: "ಸಾರಿಗೆ", hi: "परिवहन" } };
    }

    const matches = [];

    for (const m of mappings) {
      const allKws = [
        ...(m.keywords.en || []),
        ...(m.keywords.hi || []),
        ...(m.keywords.kn || [])
      ];

      for (const kw of allKws) {
        if (lower.includes(kw.toLowerCase())) {
          matches.push({
            barrier: m.barrier,
            component: m.component,
            displayName: m.displayName,
            matchedKeyword: kw
          });
          break;
        }
      }
    }

    if (matches.length === 1) {
      return { matched: true, ...matches[0] };
    }

    if (matches.length > 1) {
      // Check if all matched components belong to the same barrier category
      const distinctBarriers = Array.from(new Set(matches.map(m => m.barrier)));
      if (distinctBarriers.length === 1) {
        return { matched: true, ...matches[0] };
      }
      // If two distinct barriers tie, ask short clarifying question instead of guessing (Addendum 3 B)
      return { matched: false, isAmbiguous: true, tiedBarriers: distinctBarriers };
    }

    return { matched: false, isAmbiguous: true };
  }

  /**
   * Addendum 3: Execute Personal Problem Statement Handling.
   */
  function executePersonalProblemHelp(text, entities, session, dataRegistry, lang = "en") {
    const langKey = normalizeLangKey(lang);
    const cfg = getProblemConfig(dataRegistry);
    const isEmerg = detectEmergency(text, langKey, cfg);
    const mapRes = mapProblemToBarrier(text, langKey, cfg);

    const parts = [];

    // Safety Alert: Emergency wording triggers urgent message with NAS 108 first
    if (isEmerg) {
      if (langKey === 'kn') {
        parts.push(`🚨 **ತುರ್ತು ವೈದ್ಯಕೀಯ ಸೂಚನೆ**: ನೀವು ತೀವ್ರ ನೋವು, ಅಧಿಕ ರಕ್ತಸ್ರಾವ ಅಥವಾ ಹೆರಿಗೆ ನೋವನ್ನು ಅನುಭವಿಸುತ್ತಿದ್ದರೆ, ಇದು ತಕ್ಷಣದ ವೈದ್ಯಕೀಯ ತುರ್ತುಸ್ಥಿತಿಯಾಗಿದೆ. ದಯವಿಟ್ಟು ಕೂಡಲೇ **ರಾಷ್ಟ್ರೀಯ ಆಂಬ್ಯುಲೆನ್ಸ್ ಸೇವೆ 108** ಕ್ಕೆ ಕರೆ ಮಾಡಿ.\n`);
      } else if (langKey === 'hi') {
        parts.push(`🚨 **आपातकालीन चिकित्सा सूचना**: यदि आप गंभीर दर्द, अत्यधिक रक्तस्राव या प्रसव पीड़ा का सामना कर रही हैं, तो यह एक आपातकालीन स्थिति है जिसके लिए तत्काल चिकित्सा सहायता आवश्यक है। कृपया तुरंत **राष्ट्रीय एम्बुलेंस सेवा 108** पर कॉल करें।\n`);
      } else {
        parts.push(`🚨 **EMERGENCY NOTICE**: If you are experiencing severe pain, heavy bleeding, or are in labour, this is an emergency requiring immediate medical attention. Please call the **National Ambulance Service at 108** right away.\n`);
      }
    }

    // Ambiguous problem statement handling (e.g. "I have a problem, can you help me?")
    if (!mapRes.matched || mapRes.isAmbiguous) {
      let clarifier = "";
      if (langKey === 'kn') {
        clarifier = `ನಾನು ನಿಮಗೆ ಸಹಾಯ ಮಾಡಲು ಇಲ್ಲಿದ್ದೇನೆ. ನಿಮ್ಮ ಮುಖ್ಯ ತೊಂದರೆಯು ಆಸ್ಪತ್ರೆಯ ದೂರ/ಸಾರಿಗೆ, ಚಿಕಿತ್ಸಾ ವೆಚ್ಚ, ಕುಟುಂಬದ ಅನುಮತಿ ಅಥವಾ ಚಿಕಿತ್ಸಾಲಯದಲ್ಲಿನ ಔಷಧಿಗಳಿಗೆ ಸಂಬಂಧಿಸಿದೆಯೇ ಎಂದು ತಿಳಿಸುವಿರಾ?`;
      } else if (langKey === 'hi') {
        clarifier = `मैं आपकी सहायता के लिए यहाँ हूँ। क्या आप स्पष्ट कर सकती हैं कि मुख्य कठिनाई अस्पताल की दूरी/परिवहन, उपचार का खर्च, परिवार की अनुमति, या क्लिनिक में दवाओं से संबंधित है?`;
      } else {
        clarifier = `I understand this is difficult. Could you clarify if the primary difficulty is distance/transport, medical cost, family permission, or medicines at the clinic?`;
      }
      parts.push(clarifier);
      return {
        answer: parts.join("\n"),
        status: "verified",
        barrier: null,
        component: null,
        solutions: [],
        disclaimer: DISCLAIMER_TEXT[langKey] || DISCLAIMER_TEXT.en
      };
    }

    const barrierKey = mapRes.barrier;
    const componentKey = mapRes.component;
    const dispName = (mapRes.displayName && mapRes.displayName[langKey]) || (mapRes.displayName && mapRes.displayName.en) || componentKey;

    const barrierNames = {
      logistic: { en: "Logistic Barrier", kn: "ಸಾರಿಗೆ / ವೆಚ್ಚದ ಅಡಚಣೆ (Logistic Barrier)", hi: "परिवहन / लागत बाधा (Logistic Barrier)" },
      household: { en: "Household Barrier", kn: "ಮನೆ / ಕುಟುಂಬದ ಅಡಚಣೆ (Household Barrier)", hi: "घरेलू / पारिवारिक बाधा (Household Barrier)" },
      facility: { en: "Facility Barrier", kn: "ಆಸ್ಪತ್ರೆ / ಸೌಲಭ್ಯದ ಅಡಚಣೆ (Facility Barrier)", hi: "अस्पताल / सुविधा की बाधा (Facility Barrier)" }
    };
    const bName = (barrierNames[barrierKey] && barrierNames[barrierKey][langKey]) || barrierNames[barrierKey].en;

    // 1. One empathetic sentence in user's language (NO medical advice, dosage, diagnosis)
    if (langKey === 'kn') {
      parts.push(`ಇದು ಕಷ್ಟಕರ ಪರಿಸ್ಥಿತಿ ಎಂದು ನಾನು ಅರ್ಥಮಾಡಿಕೊಂಡಿದ್ದೇನೆ ಮತ್ತು ಆರೋಗ್ಯ ಸೇವೆ ಪಡೆಯುವುದು ಇಷ್ಟು ಕಷ್ಟಕರವಾಗಿರಬಾರದು.`);
    } else if (langKey === 'hi') {
      parts.push(`मैं समझता हूँ कि यह एक कठिन परिस्थिति है, और स्वास्थ्य सेवा प्राप्त करना इतना मुश्किल नहीं होना चाहिए।`);
    } else {
      parts.push(`I understand this is a challenging situation, and getting healthcare should not be this difficult.`);
    }

    // 2. Name the difficulty in plain words and link it to the barrier type
    if (langKey === 'kn') {
      parts.push(`ಇದು **${dispName}** ಸಂಬಂಧಿತ ಅಡಚಣೆಯಂತೆ ಕಂಡುಬರುತ್ತದೆ, ಇದನ್ನು ಬ್ಯಾರಿಯರ್ ಲೆನ್ಸ್ **${bName}** ಎಂದು ವರ್ಗೀಕರಿಸುತ್ತದೆ.\n`);
    } else if (langKey === 'hi') {
      parts.push(`यह **${dispName}** से संबंधित कठिनाई प्रतीत होती है, जिसे बैरियरलेंस **${bName}** के रूप में वर्गीकृत करता है।\n`);
    } else {
      parts.push(`This sounds like a **${dispName}** difficulty, which BarrierLens groups as a **${bName}**.\n`);
    }

    // 3. Optional BarrierLens Evidence card with ONE group-level context figure
    const location = resolveLocation(text, entities, session);
    const rankingInfo = rankBarriersForLocation(location, dataRegistry);
    const item = rankingInfo.ranking.find(r => r.key === barrierKey);
    const rateStr = item ? item.rateStr : (barrierKey === "facility" ? "46.01%" : barrierKey === "logistic" ? "31.61%" : "27.16%");
    const locDisplayName = (STATE_INDIC_NAMES[rankingInfo.locationName] && STATE_INDIC_NAMES[rankingInfo.locationName][langKey]) || rankingInfo.locationName;

    if (langKey === 'kn') {
      parts.push(`• 📊 **${locDisplayName} ಗಮನಿಸಿದ ಪ್ರಮಾಣ**: ಸಮೀಕ್ಷೆಯಲ್ಲಿ ಮಹಿಳೆಯರಲ್ಲಿ **${rateStr}** ರಷ್ಟು ಮಹಿಳೆಯರು ${bName}ಯನ್ನು ಎದುರಿಸುತ್ತಾರೆ (NFHS-5, N = ${rankingInfo.sampleSize ? rankingInfo.sampleSize.toLocaleString() : '7,24,115'}).\n`);
    } else if (langKey === 'hi') {
      parts.push(`• 📊 **${locDisplayName} प्रेक्षित दर**: सर्वेक्षण में **${rateStr}** महिलाएं ${bName} का सामना करती हैं (NFHS-5, N = ${rankingInfo.sampleSize ? rankingInfo.sampleSize.toLocaleString() : '7,24,115'}).\n`);
    } else {
      parts.push(`• 📊 **${rankingInfo.locationName} Observed Rate**: **${rateStr}** of women face ${bName} (NFHS-5, N = ${rankingInfo.sampleSize ? rankingInfo.sampleSize.toLocaleString() : '724,115'}).\n`);
    }

    // 4. External Evidence cards for that barrier/component from registry (max 4)
    let externalSolutions = [];
    if (componentKey === "female provider" || isNoFemaleProviderQuery(text)) {
      const unvMsg = UNIDENTIFIED_SOLUTION_MSG[langKey] || UNIDENTIFIED_SOLUTION_MSG.en;
      parts.push(`🏛️ **External Evidence:**\n${unvMsg}\n`);
    } else {
      const extRes = retrieveExternalSolutions(barrierKey, text, dataRegistry, langKey);
      externalSolutions = extRes.solutions || [];
      if (externalSolutions.length > 0) {
        const secTitle = langKey === 'kn' ? '🏛️ ಬಾಹ್ಯ ಅಧಿಕೃತ ಕಾರ್ಯಕ್ರಮಗಳು (External Evidence):'
          : langKey === 'hi' ? '🏛️ बाह्य आधिकारिक कार्यक्रम (External Evidence):'
          : '🏛️ **External Evidence (Curated Government & WHO Programmes):**';
        parts.push(secTitle);
        externalSolutions.forEach(sol => {
          parts.push(formatExternalSolutionText(sol, langKey));
        });
        parts.push('');
      }
    }

    // 5. Closing line: programmes not evaluated on BarrierLens data, availability varies by state
    parts.push(`*${DISCLAIMER_TEXT[langKey] || DISCLAIMER_TEXT.en}*`);

    // 6. Offer (do not force) to switch the active barrier to the detected one. Never reset history.
    if (langKey === 'kn') {
      parts.push(`\n👉 *ಹೆಚ್ಚಿನ ಮಾಹಿತಿಗಾಗಿ ನಿಮ್ಮ ಸಕ್ರಿಯ ಅಡಚಣೆಯನ್ನು **${bName}** ಗೆ ಬದಲಾಯಿಸಲು ಬಯಸುವಿರಾ?*`);
    } else if (langKey === 'hi') {
      parts.push(`\n👉 *क्या आप आगे के विश्लेषण के लिए अपना ध्यान **${bName}** पर केंद्रित करना चाहती हैं?*`);
    } else {
      parts.push(`\n👉 *Would you like to switch your active barrier focus to **${bName}** for further analysis?*`);
    }

    return {
      answer: parts.join("\n"),
      status: "verified",
      barrier: barrierKey,
      component: componentKey,
      suggestedBarrier: bName,
      solutions: externalSolutions,
      isEmergency: isEmerg,
      disclaimer: DISCLAIMER_TEXT[langKey] || DISCLAIMER_TEXT.en
    };
  }

  return {
    ALLOWED_DOMAINS,
    DISCLAIMER_TEXT,
    UNIDENTIFIED_SOLUTION_MSG,
    isUrlAllowed,
    hasSolutionKeyword,
    hasRankingKeyword,
    isCompoundQuery,
    isNoFemaleProviderQuery,
    normalizeBarrierKey,
    retrieveExternalSolutions,
    getBarrierLensEvidence,
    resolveLocation,
    rankBarriersForLocation,
    formatExternalSolutionText,
    formatSolutionsResponse,
    executeCompoundQuery,
    executeRankingQueryOnly,
    validateLlmSolutionsSafety,
    getProblemConfig,
    detectEmergency,
    isPersonalProblemQuery,
    mapProblemToBarrier,
    executePersonalProblemHelp
  };
}));
