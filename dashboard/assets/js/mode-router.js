/**
 * BARRIERLENS — MEMBER 1: MODE ROUTER
 * Handles Welcome prompt and Entry Mode routing for BarrierLens Chatbot:
 * - Mode 1: Identify My Barrier (Guided ML Questions flow)
 * - Mode 2: Explore Barriers (Barrier selection & evidence research flow)
 * Dual environment support: Browser (window.BarrierLensModeRouter) & Node.js (module.exports).
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.BarrierLensModeRouter = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const MODES = {
    IDENTIFY: "identify",
    EXPLORE: "explore"
  };

  const PROMPTS = {
    en: {
      welcome: "Hello! Welcome to BarrierLens.\nWhat would you like to do?",
      options: [
        {
          id: "identify",
          mode: MODES.IDENTIFY,
          label: "Identify My Barrier",
          intent: "identify_barrier",
          description: "Answer guided questions to predict your primary healthcare barrier using machine learning."
        },
        {
          id: "explore",
          mode: MODES.EXPLORE,
          label: "Explore Barriers",
          intent: "explore_barrier",
          description: "Explore verified BarrierLens evidence across Household, Logistic, and Facility barriers."
        }
      ],
      mode1Prompt: "Let's identify the healthcare access barriers you may be facing based on demographic and household factors.",
      mode2Prompt: "Please select a barrier to explore verified BarrierLens evidence:"
    },
    kn: {
      welcome: "ನಮಸ್ಕಾರ! ಬ್ಯಾರಿಯರ್‌ಲೆನ್ಸ್‌ಗೆ ಸುಸ್ವಾಗತ.\nನೀವು ಏನು ಮಾಡಲು ಬಯಸುತ್ತೀರಿ?",
      options: [
        {
          id: "identify",
          mode: MODES.IDENTIFY,
          label: "ನನ್ನ ಅಡಚಣೆಯನ್ನು ಗುರುತಿಸಿ",
          intent: "identify_barrier",
          description: "ಮೆಷಿನ್ ಲರ್ನಿಂಗ್ ಬಳಸಿ ನಿಮ್ಮ ಪ್ರಾಥಮಿಕ ಆರೋಗ್ಯ ಅಡಚಣೆಯನ್ನು ಗುರುತಿಸಲು ಪ್ರಶ್ನೆಗಳಿಗೆ ಉತ್ತರಿಸಿ."
        },
        {
          id: "explore",
          mode: MODES.EXPLORE,
          label: "ಅಡಚಣೆಗಳನ್ನು ಅನ್ವೇಷಿಸಿ",
          intent: "explore_barrier",
          description: "ಮನೆ, ಸಾರಿಗೆ ಮತ್ತು ಸೌಲಭ್ಯ ಅಡಚಣೆಗಳ ಪರಿಶೀಲಿಸಿದ ಸಾಕ್ಷ್ಯಗಳನ್ನು ಅನ್ವೇಷಿಸಿ."
        }
      ],
      mode1Prompt: "ಜನಸಂಖ್ಯಾಶಾಸ್ತ್ರೀಯ ಮತ್ತು ಮನೆಯ ಅಂಶಗಳ ಆಧಾರದ ಮೇಲೆ ನಿಮ್ಮ ಆರೋಗ್ಯ ರಕ್ಷಣೆಯ ಅಡಚಣೆಯನ್ನು ಗುರುತಿಸೋಣ.",
      mode2Prompt: "ಪರಿಶೀಲಿಸಿದ ಬ್ಯಾರಿಯರ್‌ಲೆನ್ಸ್ ಸಾಕ್ಷ್ಯವನ್ನು ಅನ್ವೇಷಿಸಲು ದಯವಿಟ್ಟು ಒಂದು ಅಡಚಣೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ:"
    },
    hi: {
      welcome: "नमस्ते! बैरियरलेंस में आपका स्वागत है।\nआप क्या करना चाहेंगे?",
      options: [
        {
          id: "identify",
          mode: MODES.IDENTIFY,
          label: "मेरी बाधा पहचानें",
          intent: "identify_barrier",
          description: "मशीन लर्निंग का उपयोग करके अपनी प्राथमिक स्वास्थ्य सेवा बाधा की पहचान करने के लिए प्रश्नों के उत्तर दें।"
        },
        {
          id: "explore",
          mode: MODES.EXPLORE,
          label: "बाधाओं का अन्वेषण करें",
          intent: "explore_barrier",
          description: "घरेलू, रसद और सुविधा बाधाओं के सत्यापित साक्ष्यों का अन्वेषण करें।"
        }
      ],
      mode1Prompt: "आइए जनसांख्यिकीय और पारिवारिक कारकों के आधार पर आपके सामने आने वाली स्वास्थ्य बाधाओं की पहचान करें।",
      mode2Prompt: "सत्यापित बैरियरलेंस साक्ष्य देखने के लिए कृपया एक बाधा चुनें:"
    }
  };

  /**
   * Normalize language code to 'en', 'kn', or 'hi'.
   */
  function normalizeLang(lang) {
    if (!lang || typeof lang !== 'string') return 'en';
    const l = lang.trim().toLowerCase();
    if (l.startsWith('kn') || l.includes('kannada') || l.includes('ಕನ್ನಡ')) return 'kn';
    if (l.startsWith('hi') || l.includes('hindi') || l.includes('हिंदी') || l.includes('हिन्दी')) return 'hi';
    return 'en';
  }

  /**
   * Get Welcome Prompt & Mode Selection Options.
   */
  function getWelcomeMessage(lang = 'en') {
    const code = normalizeLang(lang);
    const data = PROMPTS[code] || PROMPTS.en;
    return {
      message: data.welcome,
      options: data.options.map(opt => ({ ...opt })),
      language: code
    };
  }

  /**
   * Get introductory prompt for selected mode.
   */
  function getModePrompt(mode, lang = 'en') {
    const code = normalizeLang(lang);
    const data = PROMPTS[code] || PROMPTS.en;
    if (mode === MODES.IDENTIFY) {
      return data.mode1Prompt;
    }
    return data.mode2Prompt;
  }

  /**
   * Determine if text indicates Mode 1 (Identify Barrier) or Mode 2 (Explore Barrier).
   */
  function detectModeChoice(text) {
    if (!text || typeof text !== 'string') return null;
    const lower = text.toLowerCase().trim();

    // Mode 1: Identify
    if (
      /\b(identify|predict|find my barrier|check my barrier|assess|diagnose|my barrier|identify my barrier|help me identify)\b/i.test(lower) ||
      lower.includes("ನನ್ನ ಅಡಚಣೆ") ||
      lower.includes("ಗುರುತಿಸಿ") ||
      lower.includes("मेरी बाधा") ||
      lower.includes("पहचान")
    ) {
      return MODES.IDENTIFY;
    }

    // Mode 2: Explore
    if (
      /\b(explore|browse|research|view|study|all barriers|barrier options|explore barriers|i want to explore)\b/i.test(lower) ||
      lower.includes("ಅನ್ವೇಷಿಸಿ") ||
      lower.includes("ಅನ್ವೇಷಣೆ") ||
      lower.includes("अन्वेषण") ||
      lower.includes("खोजें")
    ) {
      return MODES.EXPLORE;
    }

    return null;
  }

  return {
    MODES,
    getWelcomeMessage,
    getModePrompt,
    detectModeChoice,
    normalizeLang
  };
}));
