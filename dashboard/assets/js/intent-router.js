/**
 * BARRIERLENS — MEMBER 1: INTENT ROUTER & ENTITY EXTRACTION
 * Implements NLU pipeline for intent classification (10 Member 1 intents),
 * entity extraction (state, group, comparisonTarget, rural/urban, gender, age),
 * solutions detection (requiresSolutions), and switch detection (isBarrierChange, isLanguageChange).
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
    "select_barrier",
    "explain",
    "statistics",
    "compare",
    "affected_groups",
    "solutions",
    "limitations",
    "change_barrier",
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
    "andhra pradesh": "Andhra Pradesh", "ap": "Andhra Pradesh", "आंध्र प्रदेश": "Andhra Pradesh",
    "telangana": "Telangana", "तेलंगाना": "Telangana",
    "madhya pradesh": "Madhya Pradesh", "mp": "Madhya Pradesh", "मध्य प्रदेश": "Madhya Pradesh",
    "bihar": "Bihar", "बिहार": "Bihar",
    "assam": "Assam", "असम": "Assam",
    "punjab": "Punjab", "पंजाब": "Punjab",
    "haryana": "Haryana", "हरियाणा": "Haryana",
    "odisha": "Odisha", "orissa": "Odisha", "ओडिशा": "Odisha",
    "chhattisgarh": "Chhattisgarh", "छत्तीसगढ़": "Chhattisgarh",
    "jharkhand": "Jharkhand", "झारखंड": "Jharkhand",
    "himachal pradesh": "Himachal Pradesh", "hp": "Himachal Pradesh", "हिमाचल प्रदेश": "Himachal Pradesh",
    "uttarakhand": "Uttarakhand", "उत्तराखंड": "Uttarakhand",
    "jammu & kashmir": "Jammu & Kashmir", "jammu and kashmir": "Jammu & Kashmir", "j&k": "Jammu & Kashmir", "जम्मू और कश्मीर": "Jammu & Kashmir",
    "ladakh": "Ladakh", "लद्दाख": "Ladakh",
    "goa": "Goa", "गोवा": "Goa",
    "delhi": "Delhi", "nct delhi": "Delhi", "दिल्ली": "Delhi",
    "chandigarh": "Chandigarh", "चंडीगढ़": "Chandigarh",
    "puducherry": "Puducherry", "pondicherry": "Puducherry", "पुडुचेरी": "Puducherry",
    "tripura": "Tripura", "त्रिपुरा": "Tripura",
    "meghalaya": "Meghalaya", "मेघालय": "Meghalaya",
    "manipur": "Manipur", "मणिपुर": "Manipur",
    "mizoram": "Mizoram", "मिजोरम": "Mizoram",
    "nagaland": "Nagaland", "नागालैंड": "Nagaland",
    "arunachal pradesh": "Arunachal Pradesh", "अरुणाचल प्रदेश": "Arunachal Pradesh",
    "sikkim": "Sikkim", "सिक्किम": "Sikkim",
    "andaman & nicobar islands": "Andaman & Nicobar Islands", "andaman": "Andaman & Nicobar Islands",
    "dadra & nagar haveli and daman & diu": "Dadra & Nagar Haveli and Daman & Diu",
    "lakshadweep": "Lakshadweep", "लक्षद्वीप": "Lakshadweep"
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
   * Normalize language names to English, Kannada, Hindi.
   */
  function normalizeLanguage(langInput) {
    if (!langInput || typeof langInput !== 'string') return "English";
    const lower = langInput.trim().toLowerCase();

    if (lower === "kannada" || lower === "kn" || lower.includes("ಕನ್ನಡ")) return "Kannada";
    if (lower === "hindi" || lower === "hi" || lower.includes("हिंदी")) return "Hindi";
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
        group: null,
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
    if (/\bpoorest\b/i.test(text)) detectedGroups.push("Poorest");
    if (/\bpoorer\b/i.test(text)) detectedGroups.push("Poorer");
    if (/\bmiddle\b/i.test(text)) detectedGroups.push("Middle");
    if (/\bricher\b/i.test(text)) detectedGroups.push("Richer");
    if (/\brichest\b/i.test(text)) detectedGroups.push("Richest");
    if (/\bno education\b|\buneducated\b|\billiterate\b/i.test(text)) detectedGroups.push("No education");
    if (/\bprimary\b/i.test(text)) detectedGroups.push("Primary");
    if (/\bsecondary\b/i.test(text)) detectedGroups.push("Secondary");
    if (/\bhigher\b/i.test(text)) detectedGroups.push("Higher");

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
    } else if (/\bcompare\b|\bversus\b|\bvs\b|\bdifference\b|\bbetween\b|ಹೋಲಿಕೆ|ತುಲನಾ/i.test(text)) {
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
      group: detectedGroups.length > 0 ? (detectedGroups.length === 1 ? detectedGroups[0] : detectedGroups) : null,
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
    return /\b(what can be done|how can.*solv(e|ed)|how can.*fix|what are the solutions|how can we improve|what should be done|solutions|recommendation|intervention|how to overcome|overcome barrier)s?\b|ಪರಿಹಾರ|ಉಪಾಯ|ಉಪಾಯಗಳು|समाधान|उपाय/i.test(text);
  }

  /**
   * Check if query is explicit language change request.
   */
  function detectLanguageChange(text) {
    if (!text || typeof text !== 'string') return null;

    if (/\b(switch|change|respond|in|use|speak|convert)\b.*\b(kannada|hindi|english)\b/i.test(text) ||
        /^(kannada|hindi|english)$/i.test(text.trim()) ||
        /^(ಕನ್ನಡ|हिंदी)$/i.test(text.trim())) {
      if (/\bkannada\b|ಕನ್ನಡ/i.test(text)) return "Kannada";
      if (/\bhindi\b|हिंदी/i.test(text)) return "Hindi";
      if (/\benglish\b/i.test(text)) return "English";
    }

    return null;
  }

  /**
   * Detect main intent from text and context.
   */
  function detectIntent(text, entities, barrierSelector) {
    if (!text || typeof text.trim() === 'function' ? !text.trim() : !text) {
      return "unknown";
    }

    const trimmed = text.trim();

    // 1. Language change trigger
    if (detectLanguageChange(trimmed)) {
      return "change_language";
    }

    // 2. Barrier selection or explicit barrier change trigger
    if (barrierSelector && barrierSelector.isBarrierSelectionText(trimmed)) {
      if (/\b(change|switch|show.*instead|different)\b/i.test(trimmed)) {
        return "change_barrier";
      }
      return "select_barrier";
    }

    // 3. Solutions trigger
    if (isSolutionsQuery(trimmed)) {
      return "solutions";
    }

    // 4. Comparison trigger
    if (entities.comparisonTarget || /\b(compare|versus|vs|difference|between|higher than|lower than)\b|ಹೋಲಿಕೆ|तुलना/i.test(trimmed)) {
      return "compare";
    }

    // 5. Affected Groups trigger
    if (/\b(which states|most affected|affected states|affected groups|vulnerable|who faces|highest rate|worst affected|where is)\b|ಹೆಚ್ಚು ಬಾಧಿತ|प्रभावित/i.test(trimmed)) {
      return "affected_groups";
    }

    // 6. Statistics trigger
    if (/\b(statistic|statistics|rate|percent|percentage|data|numbers|figures|count|prevalence|how common|how many)\b|ಅಂಕಿಅಂಶ|ಆಂಕಡೆ/i.test(trimmed)) {
      return "statistics";
    }

    // 7. Limitations trigger
    if (/\b(limitation|limitations|causation|causal|prove|does.*cause|cross-sectional|survey limit)\b|ಮಿತಿಗಳು|सीमाएं/i.test(trimmed)) {
      return "limitations";
    }

    // 8. Explanation trigger
    if (/\b(what is|explain|tell me about|definition|describe|meaning|overview)\b|ವಿವರಣೆ|ವಿವರಿಸಿ|समझाएं|स्पष्ट करें/i.test(trimmed)) {
      return "explain";
    }

    // Default fallback for general queries
    return "explain";
  }

  return {
    SUPPORTED_INTENTS,
    STATE_ALIASES,
    normalizeLanguage,
    extractEntities,
    isSolutionsQuery,
    detectLanguageChange,
    detectIntent
  };
}));
