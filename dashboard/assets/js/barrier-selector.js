/**
 * BARRIERLENS — MEMBER 1: BARRIER SELECTOR
 * Handles barrier normalization, canonical key & name mapping, alias mapping (English/Kannada/Hindi),
 * Mode 2 selection options generation, and barrierContext object generation for the 5 canonical barriers:
 * - Household Barrier (household)
 * - Logistic Barrier (logistic)
 * - Facility Barrier (facility)
 * - Multiple Barriers (multiple)
 * - All Barriers (all)
 * Dual environment support: Browser (window.BarrierLensBarrierSelector) & Node.js (module.exports).
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.BarrierLensBarrierSelector = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Exactly 5 supported canonical barriers (Display Names)
  const CANONICAL_BARRIERS = [
    "Household Barrier",
    "Logistic Barrier",
    "Facility Barrier",
    "Multiple Barriers",
    "All Barriers"
  ];

  // Canonical barrier keys
  const CANONICAL_KEYS = [
    "household",
    "logistic",
    "facility",
    "multiple",
    "all"
  ];

  const KEY_TO_NAME = {
    "household": "Household Barrier",
    "logistic": "Logistic Barrier",
    "facility": "Facility Barrier",
    "multiple": "Multiple Barriers",
    "all": "All Barriers"
  };

  const NAME_TO_KEY = {
    "Household Barrier": "household",
    "Logistic Barrier": "logistic",
    "Facility Barrier": "facility",
    "Multiple Barriers": "multiple",
    "All Barriers": "all"
  };

  const BARRIER_ALIASES = {
    // Household Barrier
    "household barrier": "Household Barrier",
    "household": "Household Barrier",
    "house": "Household Barrier",
    "family": "Household Barrier",
    "permission": "Household Barrier",
    "alone": "Household Barrier",
    "select_household": "Household Barrier",
    "ಮನೆ": "Household Barrier",
    "ಕುಟುಂಬ": "Household Barrier",
    "ಅನುಮತಿ": "Household Barrier",
    "ಘರೇಲೂ": "Household Barrier",
    "घरेलू": "Household Barrier",
    "परिवार": "Household Barrier",

    // Logistic Barrier
    "logistic barrier": "Logistic Barrier",
    "logistic": "Logistic Barrier",
    "logistics": "Logistic Barrier",
    "transport": "Logistic Barrier",
    "distance": "Logistic Barrier",
    "cost": "Logistic Barrier",
    "escort": "Logistic Barrier",
    "money": "Logistic Barrier",
    "financial": "Logistic Barrier",
    "select_logistic": "Logistic Barrier",
    "ಸಾರಿಗೆ": "Logistic Barrier",
    "ಹಣ": "Logistic Barrier",
    "ವೆಚ್ಚ": "Logistic Barrier",
    "परिवहन": "Logistic Barrier",
    "लागत": "Logistic Barrier",

    // Facility Barrier
    "facility barrier": "Facility Barrier",
    "facility": "Facility Barrier",
    "facilities": "Facility Barrier",
    "doctor": "Facility Barrier",
    "provider": "Facility Barrier",
    "hospital": "Facility Barrier",
    "medicine": "Facility Barrier",
    "treatment": "Facility Barrier",
    "select_facility": "Facility Barrier",
    "ಆಸ್ಪತ್ರೆ": "Facility Barrier",
    "ವೈದ್ಯರು": "Facility Barrier",
    "ಸೌಲಭ್ಯ": "Facility Barrier",
    "अस्पताल": "Facility Barrier",
    "डॉक्टर": "Facility Barrier",
    "सुविधा": "Facility Barrier",

    // Multiple Barriers
    "multiple barriers": "Multiple Barriers",
    "multiple barrier": "Multiple Barriers",
    "multiple": "Multiple Barriers",
    "overlapping": "Multiple Barriers",
    "two or more": "Multiple Barriers",
    "2+": "Multiple Barriers",
    "select_multiple": "Multiple Barriers",
    "ಬಹಳಷ್ಟು": "Multiple Barriers",
    "ಅನೇಕ": "Multiple Barriers",
    "अनेक": "Multiple Barriers",
    "कई": "Multiple Barriers",

    // All Barriers
    "all barriers": "All Barriers",
    "all barrier": "All Barriers",
    "all": "All Barriers",
    "overall": "All Barriers",
    "composite": "All Barriers",
    "at least one": "All Barriers",
    "any barrier": "All Barriers",
    "select_all": "All Barriers",
    "ಎಲ್ಲಾ": "All Barriers",
    "ಎಲ್ಲ": "All Barriers",
    "सभी": "All Barriers"
  };

  const MENU_OPTIONS = {
    en: [
      { key: "household", label: "Household Barrier", intent: "select_household", description: "Family permission, travelling alone, and decision-making constraints." },
      { key: "logistic", label: "Logistic Barrier", intent: "select_logistic", description: "Transportation, distance to facility, and monetary constraints." },
      { key: "facility", label: "Facility Barrier", intent: "select_facility", description: "Absence of female providers, doctor availability, and medicine supply." },
      { key: "multiple", label: "Multiple Barriers", intent: "select_multiple", description: "Co-occurring overlapping barriers across 2 or more domains." },
      { key: "all", label: "All Barriers", intent: "select_all", description: "Comprehensive nationwide multi-barrier analytics." }
    ],
    kn: [
      { key: "household", label: "ಮನೆ ಅಡಚಣೆ (Household Barrier)", intent: "select_household", description: "ಕುಟುಂಬದ ಅನುಮತಿ, ಒಬ್ಬಂಟಿಯಾಗಿ ಪ್ರಯಾಣಿಸುವುದು ಮತ್ತು ನಿರ್ಧಾರ ಕೈಗೊಳ್ಳುವ ನಿರ್ಬಂಧಗಳು." },
      { key: "logistic", label: "ಸಾರಿಗೆ ಅಡಚಣೆ (Logistic Barrier)", intent: "select_logistic", description: "ಸಾರಿಗೆ ಕೊರತೆ, ಆಸ್ಪತ್ರೆಗೆ ದೂರ ಮತ್ತು ಹಣಕಾಸಿನ ಸಮಸ್ಯೆಗಳು." },
      { key: "facility", label: "ಸೌಲಭ್ಯ ಅಡಚಣೆ (Facility Barrier)", intent: "select_facility", description: "ಮಹಿಳಾ ವೈದ್ಯರ ಕೊರತೆ, ಚಿಕಿತ್ಸಾ ಲಭ್ಯತೆ ಮತ್ತು ಔಷಧಿಗಳ ಕೊರತೆ." },
      { key: "multiple", label: "ಅನೇಕ ಅಡಚಣೆಗಳು (Multiple Barriers)", intent: "select_multiple", description: "2 ಅಥವಾ ಹೆಚ್ಚಿನ ಏಕಕಾಲೀನ ಅಡಚಣೆಗಳು." },
      { key: "all", label: "ಎಲ್ಲಾ ಅಡಚಣೆಗಳು (All Barriers)", intent: "select_all", description: "ಸಮಗ್ರ ರಾಷ್ಟ್ರಮಟ್ಟದ ವಿಶ್ಲೇಷಣೆ." }
    ],
    hi: [
      { key: "household", label: "घरेलू बाधा (Household Barrier)", intent: "select_household", description: "पारिवारिक अनुमति, अकेले यात्रा और निर्णय लेने की बाधाएं।" },
      { key: "logistic", label: "रसद बाधा (Logistic Barrier)", intent: "select_logistic", description: "परिवहन की कमी, अस्पताल की दूरी और वित्तीय लागत।" },
      { key: "facility", label: "सुविधा बाधा (Facility Barrier)", intent: "select_facility", description: "महिला डॉक्टरों की अनुपलब्धता, स्वास्थ्य कर्मी और दवा की कमी।" },
      { key: "multiple", label: "अनेक बाधाएं (Multiple Barriers)", intent: "select_multiple", description: "2 या अधिक समवर्ती बाधाओं का सामना।" },
      { key: "all", label: "सभी बाधाएं (All Barriers)", intent: "select_all", description: "व्यापक राष्ट्रीय बहु-बाधा विश्लेषण।" }
    ]
  };

  /**
   * Get array of all 5 canonical barrier display names.
   */
  function getSupportedBarriers() {
    return [...CANONICAL_BARRIERS];
  }

  /**
   * Get array of all 5 canonical barrier keys.
   */
  function getSupportedBarrierKeys() {
    return [...CANONICAL_KEYS];
  }

  /**
   * Normalize an input string, selection name, or key to a canonical barrier display name.
   * e.g., "logistic" -> "Logistic Barrier", "Household Barrier" -> "Household Barrier"
   */
  function normalizeBarrierName(input) {
    if (!input || typeof input !== 'string') return null;
    const trimmed = input.trim();

    // Direct match check (case-insensitive) for canonical names
    for (const canonical of CANONICAL_BARRIERS) {
      if (canonical.toLowerCase() === trimmed.toLowerCase()) {
        return canonical;
      }
    }

    // Direct match check for canonical keys
    const lower = trimmed.toLowerCase();
    if (KEY_TO_NAME[lower]) {
      return KEY_TO_NAME[lower];
    }

    // Alias lookup
    if (BARRIER_ALIASES[lower]) {
      return BARRIER_ALIASES[lower];
    }

    // Partial substring matching
    if (/\bhousehold\b/i.test(trimmed) || /ಮನೆ|ಕುಟುಂಬ|ಘರೇಲೂ|घरेलू/i.test(trimmed)) return "Household Barrier";
    if (/\blogistic\b/i.test(trimmed) || /ಸಾರಿಗೆ|ಹಣ|ವೆಚ್ಚ|परिवहन|लागत/i.test(trimmed)) return "Logistic Barrier";
    if (/\bfacility\b/i.test(trimmed) || /ಆಸ್ಪತ್ರೆ|ವೈದ್ಯರು|ಸೌಲಭ್ಯ|अस्पताल|डॉक्टर|सुविधा/i.test(trimmed)) return "Facility Barrier";
    if (/\bmultiple\b/i.test(trimmed) || /ಬಹಳಷ್ಟು|ಅನೇಕ|अनेक|कई/i.test(trimmed)) return "Multiple Barriers";
    if (/\ball barriers\b|\ball\b/i.test(trimmed) || /ಎಲ್ಲಾ|ಎಲ್ಲ|सभी/i.test(trimmed)) return "All Barriers";

    return null;
  }

  /**
   * Normalize an input string, selection name, or key to canonical key:
   * "household", "logistic", "facility", "multiple", "all".
   */
  function normalizeBarrierKey(input) {
    const name = normalizeBarrierName(input);
    if (!name) return null;
    return NAME_TO_KEY[name] || "all";
  }

  /**
   * Detect explicit or implicit barrier reference in user text.
   */
  function detectBarrierFromText(text) {
    if (!text || typeof text !== 'string') return null;
    return normalizeBarrierName(text);
  }

  /**
   * Detect barrier canonical key from text.
   */
  function detectBarrierKeyFromText(text) {
    const name = detectBarrierFromText(text);
    return name ? NAME_TO_KEY[name] : null;
  }

  /**
   * Generate the structured barrierContext object.
   */
  function createBarrierContext(barrierInput) {
    const canonicalName = normalizeBarrierName(barrierInput) || "All Barriers";
    const canonicalKey = normalizeBarrierKey(barrierInput) || "all";
    return {
      barrier: canonicalName,
      key: canonicalKey,
      scope: "active"
    };
  }

  /**
   * Check if text is purely selecting or switching a barrier.
   */
  function isBarrierSelectionText(text) {
    if (!text || typeof text !== 'string') return false;
    const norm = normalizeBarrierName(text);
    if (norm) return true;

    return /\b(change|switch|select|show|set|choose|tell me about)\b.*\b(barrier|household|logistic|facility|multiple|all)\b/i.test(text);
  }

  /**
   * Get Mode 2 Barrier Selection Menu Options.
   */
  function getBarrierMenuOptions(lang = 'en') {
    const l = (lang || 'en').trim().toLowerCase();
    const code = (l.startsWith('kn') || l.includes('kannada')) ? 'kn' : (l.startsWith('hi') || l.includes('hindi')) ? 'hi' : 'en';
    return (MENU_OPTIONS[code] || MENU_OPTIONS.en).map(opt => ({ ...opt }));
  }

  return {
    CANONICAL_BARRIERS,
    CANONICAL_KEYS,
    KEY_TO_NAME,
    NAME_TO_KEY,
    getSupportedBarriers,
    getSupportedBarrierKeys,
    normalizeBarrierName,
    normalizeBarrierKey,
    detectBarrierFromText,
    detectBarrierKeyFromText,
    createBarrierContext,
    isBarrierSelectionText,
    getBarrierMenuOptions
  };
}));
