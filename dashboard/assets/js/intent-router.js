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
    "compound_solution",
    "personal_barrier_help",
    "ask_barrier_ranking",
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

  const UNSUPPORTED_KEYWORDS = [
    "waiting time", "wait time", "queue", "hospital stay", "bed count", "doctor salary",
    "cost of surgery", "patient satisfaction", "treatment plan", "medical diagnosis",
    "prescribe", "clinical advice", "individual diagnosis", "personal advice", "dosage",
    "hospital rating", "ambulance count", "nursing staff",
    "treatment cost", "cost of treatment", "operation cost", "surgery cost",
    "waited more than", "minutes", "hours", "wait duration",
    "number of hospitals", "hospital count", "number of beds", "bed availability",
    "doctor count", "number of doctors", "satisfaction rate", "satisfaction level",
    "clinical outcome", "individual prognosis", "affected hospitals", "hospital list",
    "ಕಾಯುವ ಸಮಯ", "ಕಾಯುವ", "ಪ್ರತೀಕ್ಷಾ ಸಮಯ", "ಪ್ರತೀಕ್ಷಾ", "ಪ್ರತೀಕ್ಷೆ", "ಪ್ರತೀಕ್ಷೆಯ", "ಪ್ರತೀಕ್ಷೆಯು", "ಚಿಕಿತ್ಸಾ ವೆಚ್ಚ", "ವೈದ್ಯರ ವೇತನ", "ಆಸ್ಪತ್ರೆ ಕಾಯುವ ಸಮಯ", "ಆಸ್ಪತ್ರೆಯ ಕಾಯುವ ಸಮಯ", "ಸರಾಸರಿ ಕಾಯುವ ಸಮಯ",
    "ಪ್ರತೀಕ್ಷಾ ಸಮಯ", "ಪ್ರತೀಕ್ಷೆಯ", "ಪ್ರತೀಕ್ಷೆ", "ಪ್ರತೀಕ್ಷೆಯು", "ಕಾಯುವ ಸಮಯ ಎಷ್ಟು", "ಆಸ್ಪತ್ರೆಯ ಸರಾಸರಿ",
    "प्रतीक्षा समय", "प्रतीक्षा का समय", "प्रतीक्षा", "इंतजार का समय", "इंतजार", "इंतज़ार का समय", "इंतज़ार", "इलाज की लागत", "डॉक्टर का वेतन", "प्रतीक्षा का औसत समय", "औसत समय"
  ];

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

    if (lower === "kannada" || lower.startsWith("kn") || lower.includes("ಕನ್ನಡ")) return "Kannada";
    if (lower === "hindi" || lower.startsWith("hi") || lower.includes("हिंदी") || lower.includes("ಹಿन्दी")) return "Hindi";
    if (lower === "english" || lower.startsWith("en")) return "English";

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
    return /\b(what can be done|what can (?:i|we|one)?\s*do|what should (?:i|we|one|a woman)?\s*do|what to do|what should be done|how to (?:solve|fix|handle|address|overcome|deal with)|how can.*solv(e|ed)|how can.*fix|how can.*overcome|what are the (?:solutions|schemes|interventions|recommendations|options)|what solutions exist|how can we improve|solutions|solution|recommendation|recommendations|intervention|interventions|how to overcome|overcome barrier|government schemes|schemes|remedy|remedies)s?\b|ಪರಿಹಾರ|ಉಪಾಯ|ಉಪಾಯಗಳು|ಏನು ಮಾಡಬಹುದು|ಏನು ಮಾಡಬೇಕು|ಯೋಜನೆಗಳು|ಯೋಜನೆ|समाधान|उपाय|क्या किया जा सकता है|क्या करना चाहिए|क्या कर सकते हैं|योजनाएं|योजना|सरकारी योजनाएं/i.test(text);
  }

  /**
   * Addendum 3: Check if text is a first-person statement of difficulty/barrier help.
   */
  function isPersonalProblemStatement(text) {
    if (!text || typeof text !== 'string') return false;
    const lower = text.toLowerCase();

    // Emergency phrases
    if (/\b(severe pain|heavy bleeding|labour|in labour|unconscious|can't breathe|cannot breathe|chest pain|bleeding heavily|emergency)\b/i.test(lower) ||
        /ತೀವ್ರ ನೋವು|ಹೆಚ್ಚು ರಕ್ತಸ್ರಾವ|ಹೆರಿಗೆ|ಹೆರಿಗೆ ನೋವು|ಪ್ರಜ್ಞಾಹೀನ/i.test(text) ||
        /अत्यधिक दर्द|गंभीर दर्द|भारी रक्तस्राव|प्रसव|प्रसव पीड़ा|बेहोश/i.test(text)) {
      return true;
    }

    // Direct guidance / barrier complaints (e.g., "i am facing facility level barrier what should i do")
    if (/facing (?:a )?(facility|household|logistic|multiple).*(?:barrier|problem|level)/i.test(lower) ||
        /i am facing/i.test(lower) || /i'm facing/i.test(lower)) {
      return true;
    }

    // Specific problem statements from Addendum 3
    if (/\b(hospital is far|clinic is far|no transport|no bus|can't afford|cannot afford|won't allow|doesn't allow|no one to go|nobody to go|not available|no lady doctor|no female doctor|no medicines|medicines are not available|trouble reaching|problem going to the hospital|problem going)\b/i.test(lower)) {
      return true;
    }

    // First person problem statements
    if (/\b(i have a problem|i have problem|can you help me|help me with|i need help|cannot reach hospital|can't reach hospital|cannot afford treatment|can't afford treatment)\b/i.test(lower)) {
      return true;
    }

    // Kannada & Hindi indicators
    if (/ಆಸ್ಪತ್ರೆ ದೂರ|ಅಸ್ಪತ್ರೆ ದೂರ|ಸಾರಿಗೆ ಇಲ್ಲ|ಔಷಧಿಗಳಿಲ್ಲ|ಮಹಿಳಾ ವೈದ್ಯರಿಲ್ಲ|ಚಿಕಿತ್ಸೆ ಭರಿಸಲು|ಕುಟುಂಬದವರು ಬಿಡುತ್ತಿಲ್ಲ|ಜೊತೆಗೆ ಯಾರೂ ಇಲ್ಲ|ತೊಂದರೆ ಇದೆ|ಸಮಸ್ಯೆ ಇದೆ/i.test(text)) return true;
    if (/अस्पताल दूर|सवारी नहीं|दवाएं नहीं|दवाइयां उपलब्ध नहीं|महिला डॉक्टर नहीं|खर्च नहीं उठा|अनुमति नहीं|साथ जाने वाला कोई नहीं|समस्या है|परेशानी है/i.test(text)) return true;

    return false;
  }

  /**
   * Check if user text is a greeting.
   */
  function isGreeting(text) {
    if (!text || typeof text !== 'string') return false;
    const lower = text.trim().toLowerCase();
    return /^(hi+|hey+|hello+|hlo|hiya|greetings|good\\s+(?:morning|afternoon|evening|day)|namaste|vanakkam|namaskara|ನಮಸ್ಕಾರ|ನಮಸ್ತೆ|नमस्ते|ಪ್ರಣಾಮ)[\\s!.,]*$/i.test(lower);
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

    // 4.5. Unsupported out-of-scope trigger
    if (UNSUPPORTED_KEYWORDS.some(kw => textContains(lower, kw))) {
      return "UNSUPPORTED";
    }

    // 4.6. Addendum 3: Personal Problem Statements ("I have a problem going to the hospital", "hospital is far", etc.)
    if (isPersonalProblemStatement(trimmed)) {
      return "personal_barrier_help";
    }

    // 4.7. Compound Solutions, Solutions & Pure Barrier Ranking triggers (prioritized before barrier selection)
    const hasBarrierRankingSignal = /\b(which barrier|barrier is (?:most affected|dominant|highest|biggest)|biggest.*barrier|dominant barrier|highest barrier)\b|ಯಾವ ಅಡಚಣೆ|ಅಡಚಣೆ ಹೆಚ್ಚಾಗಿದೆ|ಅಡಚಣೆ ಪ್ರಮುಖ|कौन सी बाधा|बाधा सबसे बड़ी|बाधा प्रमुख/i.test(lower) || (/\b(most affected here|dominant in|dominant here)\b/i.test(lower) && !/\bwhich states\b/i.test(lower));

    if (isSolutionsQuery(trimmed) && hasBarrierRankingSignal) {
      return "compound_solution";
    }
    if (isSolutionsQuery(trimmed)) {
      return "ask_solution";
    }
    if (hasBarrierRankingSignal) {
      return "ask_barrier_ranking";
    }

    // 4.8. Questions with comparison, state analysis, group analysis, statistics (prioritized before barrier selection)
    if (entities.comparisonTarget || /\b(compare|versus|vs|difference between|difference|higher than|lower than)\b|ಹೋಲಿಕೆ|ತುಲನಾ|तुलना/i.test(lower)) {
      return "ask_comparison";
    }
    if (/\b(which states|affected states|worst affected states|state analysis|where is)\b|ಹೆಚ್ಚು ಬಾಧಿತ|प्रभावित राज्य/i.test(lower)) {
      return "ask_state_analysis";
    }
    if (/\b(which groups|vulnerable groups|affected groups|wealth tier|by education|who faces|poorest women|richest women)\b|ಗುಂಪುಗಳು|समूह/i.test(lower)) {
      return "ask_group_analysis";
    }
    if (/\b(statistic|statistics|rate|percent|percentage|data|numbers|figures|count|prevalence|how common|how many)\b|ಅಂಕಿಅಂಶ|ಆಂಕಡೆ|आंकड़े|प्रतिशत/i.test(lower)) {
      return "ask_statistics";
    }
    // Explanation / Meaning trigger (prioritized before barrier selection)
    if (/\b(what is|what are|what does.*mean|what do you mean|what mean|definition|define|meaning of|meaning|explain|explanation|tell me about|describe|overview|why|reason|how come|cause|why am i facing)\b|ವಿವರಣೆ|ವಿವರಿಸಿ|ಅರ್ಥ|ಏನು|ಯಾಕೆ|ಕಾರಣ|समझाएं|स्पष्ट करें|परिभाषा|क्या है|क्या अर्थ|मतलब|क्यों|कारण/i.test(lower)) {
      return "ask_explanation";
    }

    // 5. Barrier selection or explicit barrier change triggers
    const hasQueryOrProblemWord = /[?]/i.test(trimmed) || /\b(what|how|why|when|where|which|who|should|can|could|would|help|do|does|tell me|explain|facing|problem|issue|have a|have|mean|meaning)\b/i.test(lower);

    if (barrierSelector) {
      const isSelectText = barrierSelector.isBarrierSelectionText(trimmed);
      const isPureBarrierClick = /^(?:select\s+)?(household|logistic|facility|multiple|all)(?:\s+barrier)?$/i.test(trimmed);

      if (isSelectText || (isPureBarrierClick && !hasQueryOrProblemWord)) {
        const detectedBarrierKey = barrierSelector.detectBarrierKeyFromText(trimmed);
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
      if (!hasQueryOrProblemWord) {
        if (/^(?:select\s+)?(household barrier|household|family permission)\b/i.test(lower)) {
          return "select_household";
        }
        if (/^(?:select\s+)?(logistic barrier|logistic|transportation)\b/i.test(lower)) {
          return "select_logistic";
        }
        if (/^(?:select\s+)?(facility barrier|facility)\b/i.test(lower)) {
          return "select_facility";
        }
        if (/^(?:select\s+)?(multiple barriers|multiple barrier|overlapping barriers)\b/i.test(lower)) {
          return "select_multiple";
        }
        if (/^(?:select\s+)?(all barriers|all barrier)\b/i.test(lower)) {
          return "select_all";
        }
      }
    }

    // 6. Specific Barrier-Related Symptom / Context Queries
    if (!hasQueryOrProblemWord) {
      if (/\b(family does not allow|need permission|alone to hospital|husband does not allow)\b/i.test(lower)) {
        return "select_household";
      }
      if (/\b(difficulty travelling|no transport|cannot afford bus|far away hospital|distance is far)\b/i.test(lower)) {
        return "select_logistic";
      }
      if (/\b(no doctors at the hospital|no female doctor|no medicine available|doctor was absent)\b/i.test(lower)) {
        return "select_facility";
      }
    }

    // 12. Limitations & Causality trigger
    if (/\b(limitation|limitations|causation|causal|prove|does.*cause|cross-sectional|survey limit)\b|ಮಿತಿಗಳು|सीमाएं/i.test(lower)) {
      return "limitations";
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
    isPersonalProblemStatement,
    isGreeting,
    detectLanguageChange,
    detectIntent
  };
}));
