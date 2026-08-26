/**
 * BARRIERLENS — MEMBER 1: INTENT ROUTER & ENTITY EXTRACTION
 * Implements NLU pipeline for:
 * - Intent classification: greeting, identify_barrier, explore_barrier,
 *   select_household, select_logistic, select_facility, select_multiple, select_all,
 *   change_barrier, ask_statistics, ask_state_analysis, ask_group_analysis,
 *   ask_comparison, ask_explanation, ask_solution, limitations, change_language, unknown.
 * - Entity extraction: state, demographic group, comparisonTarget, residence, gender, ageGroup.
 * - Solutions detection (isSolutionsQuery).
 * - Multilingual support across English, Kannada, and Hindi.
 * Dual environment support: Browser (window.BarrierLensIntentRouter) & Node.js (module.exports).
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.BarrierLensIntentRouter = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const SUPPORTED_INTENTS = [
    "greeting",
    "identify_barrier",
    "explore_barrier",
    "select_household",
    "select_logistic",
    "select_facility",
    "select_multiple",
    "select_all",
    "select_barrier",
    "change_barrier",
    "ask_statistics",
    "statistics",
    "ask_state_analysis",
    "affected_groups",
    "ask_group_analysis",
    "ask_comparison",
    "compare",
    "ask_explanation",
    "explain",
    "ask_solution",
    "solutions",
    "limitations",
    "change_language",
    "unknown"
  ];

  // 36 Indian States & UTs alias map
  const STATE_ALIASES = {
    "karnataka": "Karnataka", "ಕರ್ನಾಟಕ": "Karnataka", "ಕರ್ನಾಟಕದ": "Karnataka", "ಕರ್ನಾಟಕದಲ್ಲಿ": "Karnataka", "कर्नाटक": "Karnataka",
    "kerala": "Kerala", "ಕೇರಳ": "Kerala", "ಕೇರಳದ": "Kerala", "केरल": "Kerala",
    "tamil nadu": "Tamil Nadu", "tn": "Tamil Nadu", "ತಮಿಳುನಾಡು": "Tamil Nadu", "तमिलनाडु": "Tamil Nadu",
    "uttar pradesh": "Uttar Pradesh", "up": "Uttar Pradesh", "उत्तर प्रदेश": "Uttar Pradesh",
    "west bengal": "West Bengal", "wb": "West Bengal", "पश्चिम बंगाल": "West Bengal",
    "maharashtra": "Maharashtra", "महाराष्ट्र": "Maharashtra",
    "gujarat": "Gujarat", "गुजरात": "Gujarat",
    "rajasthan": "Rajasthan", "राजस्थान": "Rajasthan",
    "andhra pradesh": "Andhra Pradesh", "ap": "Andhra Pradesh", "ಆಂಧ್ರ ಪ್ರದೇಶ": "Andhra Pradesh", "आंध्र प्रदेश": "Andhra Pradesh",
    "telangana": "Telangana", "ತೆಲಂಗಾಣ": "Telangana", "तेलंगाना": "Telangana",
    "madhya pradesh": "Madhya Pradesh", "mp": "Madhya Pradesh", "ಮಧ್ಯ ಪ್ರದೇಶ": "Madhya Pradesh", "मध्य प्रदेश": "Madhya Pradesh",
    "bihar": "Bihar", "ಬಿಹಾರ": "Bihar", "बिहार": "Bihar",
    "assam": "Assam", "ಅಸ್ಸಾಂ": "Assam", "असम": "Assam",
    "punjab": "Punjab", "ಪಂಜಾಬ್": "Punjab", "पंजाब": "Punjab",
    "haryana": "Haryana", "ಹರಿಯಾಣ": "Haryana", "हरियाणा": "Haryana",
    "odisha": "Odisha", "orissa": "Odisha", "ಒಡಿಶಾ": "Odisha", "ओडिशा": "Odisha",
    "chhattisgarh": "Chhattisgarh", "ಛತ್ತೀಸ್‌ಗಢ": "Chhattisgarh", "छत्तीसगढ़": "Chhattisgarh",
    "jharkhand": "Jharkhand", "ಜಾರ್ಖಂಡ್": "Jharkhand", "झारखंड": "Jharkhand",
    "himachal pradesh": "Himachal Pradesh", "hp": "Himachal Pradesh", "ಹಿಮಾಚಲ ಪ್ರದೇಶ": "Himachal Pradesh", "हिमाचल प्रदेश": "Himachal Pradesh",
    "uttarakhand": "Uttarakhand", "ಉತ್ತರಾಖಂಡ": "Uttarakhand", "उत्तराखंड": "Uttarakhand",
    "jammu & kashmir": "Jammu & Kashmir", "jammu and kashmir": "Jammu & Kashmir", "j&k": "Jammu & Kashmir", "ಜಮ್ಮು ಮತ್ತು ಕಾಶ್ಮೀರ": "Jammu & Kashmir", "जम्मू और कश्मीर": "Jammu & Kashmir",
    "ladakh": "Ladakh", "ಲಡಾಖ್": "Ladakh", "लद्दाख": "Ladakh",
    "goa": "Goa", "ಗೋವಾ": "Goa", "गोवा": "Goa",
    "delhi": "Delhi", "nct delhi": "Delhi", "ದೆಹಲಿ": "Delhi", "दिल्ली": "Delhi",
    "chandigarh": "Chandigarh", "ಚಂಡೀಗಢ": "Chandigarh", "चंडीगढ़": "Chandigarh",
    "puducherry": "Puducherry", "pondicherry": "Puducherry", "ಪುದುಚೇರಿ": "Puducherry", "पुडुचेरी": "Puducherry",
    "tripura": "Tripura", "ತ್ರಿಪುರ": "Tripura", "त्रिपुरा": "Tripura",
    "meghalaya": "Meghalaya", "ಮೇಘಾಲಯ": "Meghalaya", "मेघालय": "Meghalaya",
    "manipur": "Manipur", "ಮಣಿಪುರ": "Manipur", "मणिपुर": "Manipur",
    "mizoram": "Mizoram", "ಮಿಜೋರಾಂ": "Mizoram", "मिजोरम": "Mizoram",
    "nagaland": "Nagaland", "ನಾಗಾಲ್ಯಾಂಡ್": "Nagaland", "नागालैंड": "Nagaland",
    "arunachal pradesh": "Arunachal Pradesh", "ಅರುಣಾಚಲ ಪ್ರದೇಶ": "Arunachal Pradesh", "अरुणाचल प्रदेश": "Arunachal Pradesh",
    "sikkim": "Sikkim", "ಸಿಕ್ಕಿಂ": "Sikkim", "सिक्किम": "Sikkim",
    "andaman & nicobar islands": "Andaman & Nicobar Islands", "andaman": "Andaman & Nicobar Islands", "ಅಂಡಮಾನ್": "Andaman & Nicobar Islands", "अंडमान": "Andaman & Nicobar Islands",
    "dadra & nagar haveli and daman & diu": "Dadra & Nagar Haveli and Daman & Diu",
    "lakshadweep": "Lakshadweep", "ಲಕ್ಷದ್ವೀಪ": "Lakshadweep", "लक्षद्वीप": "Lakshadweep"
  };

  /**
   * Helper to check word/phrase match in text.
   */
  function textContains(text, phrase) {
    if (!text || !phrase) return false;
    const lowerText = text.toLowerCase();
    const lowerPhrase = phrase.toLowerCase();
    return lowerText.includes(lowerPhrase);
  }

  /**
   * Normalize language names to standard string (English / Kannada / Hindi).
   */
  function normalizeLanguage(langInput) {
    if (!langInput || typeof langInput !== 'string') return "English";
    const lower = langInput.trim().toLowerCase();

    if (lower === "kannada" || lower === "kn" || lower.includes("ಕನ್ನಡ")) return "Kannada";
    if (lower === "hindi" || lower === "hi" || lower.includes("हिंदी") || lower.includes("हिन्दी")) return "Hindi";
    if (lower === "english" || lower === "en") return "English";

    return "English";
  }

  /**
   * Extract entities from user query text.
   */
  function extractEntities(text) {
    if (!text || typeof text !== 'string') {
      return {
        state: null,
        states: [],
        group: null,
        groups: [],
        comparisonTarget: null,
        residence: null,
        gender: null,
        ageGroup: null
      };
    }

    const lower = text.toLowerCase();

    // 1. Detect States
    const detectedStates = [];
    const sortedKeys = Object.keys(STATE_ALIASES).sort((a, b) => b.length - a.length);
    for (const key of sortedKeys) {
      if (textContains(lower, key)) {
        const stdState = STATE_ALIASES[key];
        if (!detectedStates.includes(stdState)) {
          detectedStates.push(stdState);
        }
      }
    }

    // 2. Detect Demographic Groups
    const detectedGroups = [];
    if (/\bpoorest\b|ಅತ್ಯಂತ ಬಡ|ಅತಿದರಿದ್ರ|अति निर्धन|सबसे गरीब/i.test(text)) detectedGroups.push("Poorest");
    if (/\bpoorer\b|ಬಡ|ನಿರ್ಧನ|गरीब|निर्धन/i.test(text)) detectedGroups.push("Poorer");
    if (/\bmiddle\b|ಮಧ್ಯಮ|मध्यम/i.test(text)) detectedGroups.push("Middle");
    if (/\bricher\b|ಶ್ರೀಮಂತ|धनी|अमीर/i.test(text)) detectedGroups.push("Richer");
    if (/\brichest\b|ಅತ್ಯಂತ ಶ್ರೀಮಂತ|अति धनी|सबसे अमीर/i.test(text)) detectedGroups.push("Richest");
    if (/\bno education\b|\buneducated\b|\billiterate\b|ಶಿಕ್ಷಣವಿಲ್ಲ|ಅನಕ್ಷರಸ್ಥ|अशिक्षित|निरक्षर/i.test(text)) detectedGroups.push("No education");
    if (/\bprimary\b|ಪ್ರಾಥಮಿಕ|प्राथमिक/i.test(text)) detectedGroups.push("Primary");
    if (/\bsecondary\b|ಪ್ರೌಢಶಾಲೆ|ಮಾಧ್ಯಮಿಕ|माध्यमिक/i.test(text)) detectedGroups.push("Secondary");
    if (/\bhigher\b|ಉನ್ನತ ಶಿಕ್ಷಣ|ಕಾಲೇಜು|उच्च शिक्षा/i.test(text)) detectedGroups.push("Higher");

    // 3. Detect Rural / Urban & Residence
    let residence = null;
    const hasRural = /\brural\b|ಗ್ರಾಮೀಣ|ಹಳ್ಳಿ|ग्रामीण|गांव/i.test(text);
    const hasUrban = /\burgent|urban|city|town\b|ನಗರ|ಪಟ್ಟಣ|शहरी|शहर/i.test(text);
    if (hasRural && hasUrban) residence = "rural_urban";
    else if (hasRural) residence = "rural";
    else if (hasUrban) residence = "urban";

    // 4. Detect Comparison Target
    let comparisonTarget = null;
    if (detectedStates.length >= 2) {
      comparisonTarget = [...detectedStates];
    } else if (hasRural && hasUrban) {
      comparisonTarget = ["rural", "urban"];
    } else if (/\bcompare\b|\bversus\b|\bvs\b|\bdifference\b|\bbetween\b|ಹೋಲಿಕೆ|ತುಲನಾ|तुलना/i.test(text)) {
      if (detectedStates.length === 1) {
        comparisonTarget = [detectedStates[0], "national average"];
      } else if (detectedGroups.length >= 2) {
        comparisonTarget = [...detectedGroups];
      }
    }

    // 5. Detect Age Group
    const ageMatch = text.match(/\b(15-19|20-24|25-29|30-34|35-39|40-44|45-49)\b/);
    const ageGroup = ageMatch ? ageMatch[1] : null;

    // 6. Detect Gender
    let gender = null;
    if (/\bwomen\b|\bwoman\b|\bfemale\b|\bgirls?\b|ಮಹಿಳೆ|ಮಹಿಳೆಯರು|महिला|महिलाएं/i.test(text)) {
      gender = "female";
    }

    return {
      state: detectedStates.length > 0 ? (detectedStates.length === 1 ? detectedStates[0] : detectedStates) : null,
      states: detectedStates,
      group: detectedGroups.length > 0 ? (detectedGroups.length === 1 ? detectedGroups[0] : detectedGroups) : null,
      groups: detectedGroups,
      comparisonTarget: comparisonTarget,
      residence: residence,
      gender: gender,
      ageGroup: ageGroup
    };
  }

  /**
   * Check if user text requests solutions.
   */
  function isSolutionsQuery(text) {
    if (!text || typeof text !== 'string') return false;
    return /\b(what can be done|how can.*solv(e|ed)|how can.*fix|what are the solutions|how can we improve|what should be done|solutions|recommendation|intervention|interventions|how to overcome|overcome barrier)s?\b|ಪರಿಹಾರ|ಉಪಾಯ|ಉಪಾಯಗಳು|समाधान|उपाय/i.test(text);
  }

  /**
   * Check if user text is a greeting.
   */
  function isGreeting(text) {
    if (!text || typeof text !== 'string') return false;
    const lower = text.trim().toLowerCase();
    return /^(hi|hello|hey|greetings|good morning|good afternoon|good evening|namaste|vanakkam|namaskara|ನಮಸ್ಕಾರ|ನಮಸ್ತೆ|नमस्ते|प्रणाम)[\s!.]*$/i.test(lower);
  }

  /**
   * Check if query is explicit language change request.
   */
  function detectLanguageChange(text) {
    if (!text || typeof text !== 'string') return null;

    if (/\b(switch|change|respond|in|use|speak|convert)\b.*\b(kannada|hindi|english)\b/i.test(text) ||
        /^(kannada|hindi|english)$/i.test(text.trim()) ||
        /^(ಕನ್ನಡ|हिंदी|हिन्दी)$/i.test(text.trim())) {
      if (/\bkannada\b|ಕನ್ನಡ/i.test(text)) return "Kannada";
      if (/\bhindi\b|हिंदी|हिन्दी/i.test(text)) return "Hindi";
      if (/\benglish\b/i.test(text)) return "English";
    }

    return null;
  }

  /**
   * Detect main intent from text, entities, and optional barrier selector.
   */
  function detectIntent(text, entities = {}, barrierSelector = null) {
    if (!text || (typeof text.trim === 'function' && !text.trim())) {
      return "unknown";
    }

    const trimmed = text.trim();
    const lower = trimmed.toLowerCase();

    // 1. Greeting trigger
    if (isGreeting(trimmed)) {
      return "greeting";
    }

    // 2. Language change trigger
    if (detectLanguageChange(trimmed)) {
      return "change_language";
    }

    // 3. Mode 1: Identify Barrier trigger
    if (
      /\b(identify my barrier|help me identify|identify barrier|predict my barrier|assess my barrier|find my barrier|check my barrier)\b/i.test(lower) ||
      lower.includes("ನನ್ನ ಅಡಚಣೆಯನ್ನು ಗುರುತಿಸಿ") ||
      lower.includes("मेरी बाधा पहचानें")
    ) {
      return "identify_barrier";
    }

    // 4. Mode 2: Explore Barrier trigger
    if (
      /\b(explore barriers|explore barrier|explore healthcare barriers|i want to explore|browse barriers|show all barriers)\b/i.test(lower) ||
      lower.includes("ಅಡಚಣೆಗಳನ್ನು ಅನ್ವೇಷಿಸಿ") ||
      lower.includes("बाधाओं का अन्वेषण करें")
    ) {
      return "explore_barrier";
    }

    // 5. Barrier selection or explicit barrier change triggers
    if (barrierSelector) {
      const isSelectText = barrierSelector.isBarrierSelectionText(trimmed);
      const detectedBarrierKey = barrierSelector.detectBarrierKeyFromText(trimmed);

      if (isSelectText || detectedBarrierKey) {
        if (/\b(change|switch|show.*instead|different barrier)\b/i.test(lower)) {
          return "change_barrier";
        }
        if (detectedBarrierKey === "household") return "select_household";
        if (detectedBarrierKey === "logistic") return "select_logistic";
        if (detectedBarrierKey === "facility") return "select_facility";
        if (detectedBarrierKey === "multiple") return "select_multiple";
        if (detectedBarrierKey === "all") return "select_all";
        return "select_barrier";
      }
    } else {
      // Direct intent matches for individual barrier selection
      if (/\b(household barrier|household|family permission|family does not allow)\b/i.test(lower)) {
        return "select_household";
      }
      if (/\b(logistic barrier|logistic|transportation|difficulty travelling|distance to hospital|money for treatment)\b/i.test(lower)) {
        return "select_logistic";
      }
      if (/\b(facility barrier|facility|no doctors|doctor absent|no female provider|no medicine)\b/i.test(lower)) {
        return "select_facility";
      }
      if (/\b(multiple barriers|multiple barrier|overlapping barriers)\b/i.test(lower)) {
        return "select_multiple";
      }
      if (/\b(all barriers|all barrier)\b/i.test(lower)) {
        return "select_all";
      }
    }

    // 6. Specific Barrier-Related Symptom / Context Queries
    if (/\b(family does not allow|need permission|alone to hospital|husband does not allow)\b/i.test(lower)) {
      return "select_household";
    }
    if (/\b(difficulty travelling|no transport|cannot afford bus|far away hospital|distance is far)\b/i.test(lower)) {
      return "select_logistic";
    }
    if (/\b(no doctors at the hospital|no female doctor|no medicine available|doctor was absent)\b/i.test(lower)) {
      return "select_facility";
    }

    // 7. Solutions trigger
    if (isSolutionsQuery(trimmed)) {
      return "ask_solution";
    }

    // 8. Comparison trigger
    if (entities.comparisonTarget || /\b(compare|versus|vs|difference between|difference|higher than|lower than)\b|ಹೋಲಿಕೆ|ತುಲನಾ|तुलना/i.test(lower)) {
      return "ask_comparison";
    }

    // 9. State analysis / affected states trigger
    if (/\b(which states|most affected|affected states|worst affected states|state analysis|where is)\b|ಹೆಚ್ಚು ಬಾಧಿತ|प्रभावित राज्य/i.test(lower)) {
      return "ask_state_analysis";
    }

    // 10. Socio-Demographic Group analysis trigger
    if (/\b(which groups|vulnerable groups|affected groups|wealth tier|by education|who faces|poorest women|richest women)\b|ಗುಂಪುಗಳು|समूह/i.test(lower)) {
      return "ask_group_analysis";
    }

    // 11. Statistics trigger
    if (/\b(statistic|statistics|rate|percent|percentage|data|numbers|figures|count|prevalence|how common|how many)\b|ಅಂಕಿಅಂಶ|ಆಂಕಡೆ|आंकड़े|प्रतिशत/i.test(lower)) {
      return "ask_statistics";
    }

    // 12. Limitations & Causality trigger
    if (/\b(limitation|limitations|causation|causal|prove|does.*cause|cross-sectional|survey limit)\b|ಮಿತಿಗಳು|सीमाएं/i.test(lower)) {
      return "limitations";
    }

    // 13. Explanation trigger
    if (/\b(what is|explain|tell me about|definition|describe|meaning|overview|why am i facing)\b|ವಿವರಣೆ|ವಿವರಿಸಿ|समझाएं|स्पष्ट करें/i.test(lower)) {
      return "ask_explanation";
    }

    // Default fallback
    return "ask_explanation";
  }

  return {
    SUPPORTED_INTENTS,
    STATE_ALIASES,
    normalizeLanguage,
    extractEntities,
    isSolutionsQuery,
    isGreeting,
    detectLanguageChange,
    detectIntent
  };
}));
