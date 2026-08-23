/**
 * BARRIERLENS — MEMBER 1: QUERY NORMALIZATION, ENTITY EXTRACTION & INTENT ENGINE
 * Deterministic NLP pipeline, entity extraction for 36 Indian states, demographics, barrier types,
 * multilingual keyword support (Kannada/Hindi), and rule-based intent classification scoring.
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.BarrierLensIntent = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Complete 36 Indian States & UTs in verified dataset
  const ALL_STATES = [
    "Andaman & Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam",
    "Bihar", "Chandigarh", "Chhattisgarh", "Dadra & Nagar Haveli and Daman & Diu",
    "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu & Kashmir",
    "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh",
    "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha",
    "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
    "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"
  ];

  // Comprehensive alias mapping to standard state names (English, Kannada, Hindi)
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
    "andaman & nicobar islands": "Andaman & Nicobar Islands", "andaman": "Andaman & Nicobar Islands", "andaman and nicobar": "Andaman & Nicobar Islands",
    "dadra & nagar haveli and daman & diu": "Dadra & Nagar Haveli and Daman & Diu", "dadra": "Dadra & Nagar Haveli and Daman & Diu", "daman": "Dadra & Nagar Haveli and Daman & Diu",
    "lakshadweep": "Lakshadweep", "लक्षद्वीप": "Lakshadweep"
  };

  const COMPARISON_KEYWORDS = [
    "compare", "versus", "vs", "difference", "higher", "lower", "between", "better", "worse",
    "contrast", "differ", "exceeds", "compared",
    "ಹೋಲಿಕೆ", "ವ್ಯತ್ಯಾಸ", "ಹೋಲಿಸಿ", "ಹೋಲಿಸು", "ನಡುವೆ",
    "तुलना", "अंतर", "बनाम", "बीच"
  ];

  const UNSUPPORTED_KEYWORDS = [
    "waiting time", "wait time", "queue", "hospital stay", "bed count", "doctor salary",
    "cost of surgery", "patient satisfaction", "treatment plan", "medical diagnosis",
    "prescribe", "clinical advice", "individual diagnosis", "personal advice", "dosage",
    "hospital rating", "ambulance count", "nursing staff",
    "treatment cost", "cost of treatment", "operation cost", "surgery cost",
    "waited more than", "minutes", "hours", "wait duration",
    "number of hospitals", "hospital count", "number of beds", "bed availability",
    "doctor count", "number of doctors", "satisfaction rate", "satisfaction level",
    "clinical outcome", "individual prognosis", "affected hospitals", "hospital list"
  ];

  /**
   * Normalize input query text.
   */
  function normalizeQuery(text) {
    if (!text || typeof text !== 'string') {
      return { originalText: "", normalizedText: "", tokens: [] };
    }

    let trimmed = text.trim();
    if (trimmed.length > 5000) {
      trimmed = trimmed.substring(0, 5000);
    }

    let lower = trimmed.toLowerCase();

    // Standardize comparison tokens
    lower = lower.replace(/\bvs\.\b/g, " vs ")
                 .replace(/\bversus\b/g, " vs ")
                 .replace(/\bkarnatka\b/g, "karnataka")
                 .replace(/\bkerla\b/g, "kerala")
                 .replace(/\bunmet need\b/g, "unmet family planning");

    const cleaned = lower.replace(/[^\w\s\-\%&\u0900-\u097F\u0C80-\u0CFF]/g, " ").replace(/\s+/g, " ").trim();
    const tokens = cleaned.split(" ").filter(t => t.length > 0);

    return {
      originalText: trimmed,
      normalizedText: cleaned,
      tokens: tokens
    };
  }

  /**
   * Helper function to test regex word boundary safety for multi-word and Indic aliases.
   */
  function matchesAlias(text, aliasKey) {
    const escaped = aliasKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (/^[a-z0-9&]{1,3}$/i.test(aliasKey)) {
      const regex = new RegExp(`(?:^|\\s)${escaped}(?:$|\\s)`, 'i');
      return regex.test(text);
    }
    if (/^[a-z0-9\s&]+$/i.test(aliasKey)) {
      const regex = new RegExp(`(?:^|\\s)${escaped}(?:$|\\s)`, 'i');
      return regex.test(text);
    }
    return text.includes(aliasKey);
  }

  /**
   * Extract entities from normalized query.
   */
  function extractEntities(normalized) {
    const text = normalized.normalizedText;

    // 1. Detect States
    const detectedStates = [];
    const sortedAliasKeys = Object.keys(STATE_ALIASES).sort((a, b) => b.length - a.length);
    for (const key of sortedAliasKeys) {
      if (matchesAlias(text, key)) {
        const stdName = STATE_ALIASES[key];
        if (!detectedStates.includes(stdName)) {
          detectedStates.push(stdName);
        }
      }
    }

    // 2. Detect Barrier Types
    const barrierTypes = [];
    if (/\b(household|family|permission|alone)s?\b|ಮನೆ|ಕುಟುಂಬ|ಅನುಮತಿ|घरेलू|परिवार/.test(text)) barrierTypes.push("household");
    if (/\b(logistic|transport|distance|cost|money|escort)s?\b|ಸಾರಿಗೆ|ಹಣ|ವೆಚ್ಚ|परಿವಹನ|पैसा|लागत/.test(text)) barrierTypes.push("logistic");
    if (/\b(facility|doctor|provider|female provider|medicine|treatment)s?\b|ಆಸ್ಪತ್ರೆ|ವೈದ್ಯರು|ಸೌಲಭ್ಯ|अस्पताल|डॉक्टर|सुविधा/.test(text)) barrierTypes.push("facility");
    if (/\b(any barrier|composite|at least one|overall barrier)s?\b/.test(text)) barrierTypes.push("any");

    // 3. Detect Demographic Dimensions & Groups
    const demographicGroups = [];
    const dimensions = [];

    // Wealth Tiers
    if (/\bpoorest\b/.test(text)) { demographicGroups.push("Poorest"); dimensions.push("wealth"); }
    if (/\bpoorer\b/.test(text)) { demographicGroups.push("Poorer"); dimensions.push("wealth"); }
    if (/\bmiddle\b/.test(text)) { demographicGroups.push("Middle"); dimensions.push("wealth"); }
    if (/\bricher\b/.test(text)) { demographicGroups.push("Richer"); dimensions.push("wealth"); }
    if (/\brichest\b/.test(text)) { demographicGroups.push("Richest"); dimensions.push("wealth"); }
    if (/\b(wealth|quintile|income|poverty|wealth group)s?\b/.test(text) && dimensions.length === 0) {
      dimensions.push("wealth");
    }

    // Residence
    if (/\brural\b|ಗ್ರಾಮೀಣ|ಹಳ್ಳಿ|ग्रामीण|गांव/.test(text)) { demographicGroups.push("Rural"); dimensions.push("residence"); }
    if (/\burgent|urban|city|town\b|ನಗರ|ಪಟ್ಟಣ|ಶಹರೀ|शहर/.test(text)) { demographicGroups.push("Urban"); dimensions.push("residence"); }
    if (/\b(residence|living area)s?\b/.test(text) && !dimensions.includes("residence")) {
      dimensions.push("residence");
    }

    // Education
    if (/\b(no education|uneducated|illiterate)\b/.test(text)) { demographicGroups.push("No education"); dimensions.push("education"); }
    if (/\bprimary\b/.test(text)) { demographicGroups.push("Primary"); dimensions.push("education"); }
    if (/\bsecondary\b/.test(text)) { demographicGroups.push("Secondary"); dimensions.push("education"); }
    if (/\bhigher\b/.test(text)) { demographicGroups.push("Higher"); dimensions.push("education"); }
    if (/\b(education|literacy|schooling)\b/.test(text) && !dimensions.includes("education")) {
      dimensions.push("education");
    }

    // Age
    const ageMatch = text.match(/\b(15-19|20-24|25-29|30-34|35-39|40-44|45-49)\b/);
    if (ageMatch) {
      demographicGroups.push(ageMatch[1]);
      dimensions.push("age");
    } else if (/\bage|age group\b/.test(text)) {
      dimensions.push("age");
    }

    // 4. Topic Extraction
    let topic = null;
    if (/\b(predict|predicts|predictor|predictors|regression|odds ratio|odds ratios|logistic regression|coefficient|coefficients|or > 1|or < 1)\b/.test(text)) topic = "regression";
    else if (/\b(unmet|family planning|fp|unmet fp)\b/.test(text)) topic = "unmet_fp";
    else if (/\b(anc|antenatal|prenatal)\b/.test(text)) topic = "anc_gap";
    else if (/\b(cluster|clusters|archetype|archetypes|risk archetype|risk archetypes|kmeans|vulnerability group|vulnerability groups)\b/.test(text)) topic = "cluster";
    else if (/\b(shap|feature importance|explainability|driver|drivers|model driver|model drivers)\b/.test(text)) topic = "shap";
    else if (/\b(base paper|pradhan|reference paper|reference finding|reference findings)\b/.test(text)) topic = "base_paper";
    else if (/\b(methodology|nfhs-5|nfhs|sample size|dataset|survey)\b/.test(text)) topic = "methodology";
    else if (/\b(causation|causal|causes|causing|does.*cause|prove causation|limitation|limitations|causality)\b|cause barrier/.test(text)) topic = "limitations";
    else if (/\b(empowerment|autonomy|bank account|mobile phone|decision)\b/.test(text)) topic = "empowerment";
    else if (/\b(multiple barrier|multiple barriers|overlapping|2\+|two or more|3 barrier|barrier count)\b/.test(text)) topic = "multiple_barrier";

    // 5. Comparison Signal
    const hasComparisonKeyword = COMPARISON_KEYWORDS.some(kw => text.includes(kw));

    // 6. Unsupported Signal
    const hasUnsupportedKeyword = UNSUPPORTED_KEYWORDS.some(kw => text.includes(kw));

    return {
      states: detectedStates,
      barrierTypes: barrierTypes,
      demographicGroups: Array.from(new Set(demographicGroups)),
      dimensions: Array.from(new Set(dimensions)),
      topic: topic,
      hasComparisonKeyword: hasComparisonKeyword,
      hasUnsupportedKeyword: hasUnsupportedKeyword
    };
  }

  /**
   * Score candidate intents and return intent detection object.
   */
  function detectIntent(normalized, entities) {
    const text = normalized.normalizedText;

    if (!text || text.length === 0) {
      return { intent: "UNSUPPORTED", confidence: 1.0, reason: "Empty query provided." };
    }

    if (entities.hasUnsupportedKeyword) {
      return {
        intent: "UNSUPPORTED",
        confidence: 0.99,
        reason: "Query requests metrics or services outside the scope of verified BarrierLens NFHS-5 data."
      };
    }

    // Candidate scoring dictionary
    const scores = {
      NATIONAL_OVERVIEW: 0,
      STATE_COMPARISON: 0,
      STATE_ANALYSIS: 0,
      RURAL_URBAN: 0,
      DEMOGRAPHIC_ANALYSIS: 0,
      MULTIPLE_BARRIER: 0,
      RISK_ARCHETYPE: 0,
      EMPOWERMENT: 0,
      OUTCOME_IMPACT: 0,
      REGRESSION: 0,
      SHAP: 0,
      BASE_PAPER: 0,
      METHODOLOGY: 0,
      LIMITATIONS: 0,
      UNSUPPORTED: 0
    };

    // Rule 1: State comparison (2+ states or 1 state + explicit comparison signal)
    if (entities.states.length >= 2) {
      scores.STATE_COMPARISON += 0.95;
    } else if (entities.states.length === 1 && entities.hasComparisonKeyword) {
      scores.STATE_COMPARISON += 0.70;
    } else if (entities.states.length === 1) {
      scores.STATE_ANALYSIS += 0.90;
    }

    // Rule 2: Rural / Urban
    if (/\b(rural|urban|village|city)\b|ಗ್ರಾಮೀಣ|ಹಳ್ಳಿ|ನಗರ|ಪಟ್ಟಣ|ग्रामीण|गांव|शहरी|शहर/.test(text)) {
      if (/\b(rural.*urban|urban.*rural|compare rural|rural vs urban)\b/.test(text) || entities.demographicGroups.length >= 2 || entities.hasComparisonKeyword) {
        scores.RURAL_URBAN += 0.90;
      } else {
        scores.RURAL_URBAN += 0.60;
        scores.DEMOGRAPHIC_ANALYSIS += 0.50;
      }
    }

    // Rule 3: National Overview
    if (/\b(national|overall|most common|highest barrier|national overview|india|prevalence|broadest|country)\b/.test(text) && entities.states.length === 0) {
      scores.NATIONAL_OVERVIEW += 0.85;
    }

    // Rule 4: Demographic Analysis
    if (entities.dimensions.length > 0 || /\b(wealth|education|age|occupation|employment|richest|poorest|caste)\b/.test(text)) {
      if (!entities.topic || entities.topic === "demographic") {
        scores.DEMOGRAPHIC_ANALYSIS += 0.85;
      }
    }

    // Rule 5: Multiple Barriers
    if (entities.topic === "multiple_barrier" || /\b(multiple|overlapping|2\+|3 barrier|barrier count|how many barriers)\b/.test(text)) {
      scores.MULTIPLE_BARRIER += 0.90;
    }

    // Rule 6: Risk Archetypes / Clusters
    if (entities.topic === "cluster" || /\b(archetype|archetypes|cluster|clusters|vulnerab|high vulnerability|segment|kmeans)\b/.test(text)) {
      scores.RISK_ARCHETYPE += 0.90;
    }

    // Rule 7: Empowerment
    if (entities.topic === "empowerment" || /\b(empowerment|autonomy|bank account|mobile phone|medical autonomy)\b/.test(text)) {
      scores.EMPOWERMENT += 0.95;
    }

    // Rule 8: Outcome Impact (Unmet FP & ANC)
    if ((entities.topic === "unmet_fp" || entities.topic === "anc_gap" || /\b(unmet|family planning|anc|antenatal|utilization|outcome|impact)\b/.test(text)) && entities.topic !== "regression") {
      scores.OUTCOME_IMPACT += 0.90;
    }

    // Rule 9: Regression / Logistic Model
    if (entities.topic === "regression" || /\b(regression|odds ratio|odds|risk factor|protective factor|coefficient|predictor|predicts|predict)\b/.test(text)) {
      scores.REGRESSION += 0.95;
    }

    // Rule 10: SHAP / Feature Importance
    if (entities.topic === "shap" || /\b(shap|explainability|model driver|feature importance|shapley)\b/.test(text)) {
      scores.SHAP += 0.95;
    }

    // Rule 11: Base Paper Reference
    if (entities.topic === "base_paper" || /\b(base paper|pradhan|reference finding|rail a|published paper)\b/.test(text)) {
      scores.BASE_PAPER += 0.95;
    }

    // Rule 12: Methodology
    if (entities.topic === "methodology" || /\b(methodology|nfhs-5|nfhs|sample size|724115|how many women|how is it calculated)\b/.test(text)) {
      scores.METHODOLOGY += 0.85;
    }

    // Rule 13: Limitations / Causation
    if (entities.topic === "limitations" || /\b(causation|causal|causes|causing|does.*cause|prove causation|limitation|limitations|cross-sectional|correlation)\b/.test(text)) {
      scores.LIMITATIONS += 0.95;
    }

    // Default fallback if query is general barrier query with no state/demographic
    if (entities.states.length === 0 && entities.barrierTypes.length > 0 && Math.max(...Object.values(scores)) < 0.4) {
      scores.NATIONAL_OVERVIEW += 0.60;
    }

    // Find max scoring intent
    let bestIntent = "UNSUPPORTED";
    let maxScore = 0;

    for (const [intent, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        bestIntent = intent;
      }
    }

    if (maxScore < 0.35) {
      bestIntent = "UNSUPPORTED";
      maxScore = 0.20;
    }

    return {
      intent: bestIntent,
      confidence: Math.min(parseFloat(maxScore.toFixed(2)), 1.0),
      scores: scores
    };
  }

  return {
    ALL_STATES,
    STATE_ALIASES,
    COMPARISON_KEYWORDS,
    UNSUPPORTED_KEYWORDS,
    normalizeQuery,
    extractEntities,
    detectIntent
  };
}));
