/**
 * BARRIERLENS — MEMBER 3: MULTILINGUAL LOCALIZATION (i18n) MODULE
 * Provides full UI localization, suggested questions, voice state labels,
 * and error messages for English (en), Kannada (kn), and Hindi (hi).
 * Dual environment support: Browser (window.BarrierLensI18n) & Node.js (module.exports).
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.BarrierLensI18n = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const SUPPORTED_LANGUAGES = [
    { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧', speechCode: 'en-IN' },
    { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', flag: '🇮🇳', speechCode: 'kn-IN' },
    { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳', speechCode: 'hi-IN' }
  ];

  const TRANSLATIONS = {
    en: {
      // Header & Assistant Title
      assistantTitle: "BarrierLens Research Assistant",
      assistantSubtitle: "Verified NFHS-5 Intelligence & Explainability",
      assistantBadge: "NFHS-5 Grounded",
      onlineStatus: "Online • Verified Engine",

      // Welcome Message
      welcomeTitle: "Welcome to BarrierLens Research Intelligence",
      welcomeGreeting: "Hello! I am your research intelligence assistant for the BarrierLens platform (NFHS-5 dataset, N=724,115 Indian women). Ask questions about national prevalence, state comparisons, rural-urban disparities, risk archetypes, or SHAP explainability.",
      welcomeHelp: "Select a suggested question below or type/speak your own question in English, Kannada, or Hindi.",

      // Controls & Inputs
      inputPlaceholder: "Ask a research question or compare states...",
      sendButton: "Send question",
      micButton: "Use voice input",
      micStopButton: "Stop listening",
      stopSpeechButton: "Stop voice readout",
      closeButton: "Close assistant",
      minimizeButton: "Minimize assistant",
      clearChatButton: "Clear chat history",
      suggestedQuestionsHeader: "Suggested Research Questions",

      // Voice States
      voiceIdle: "Ready for voice input",
      voiceListening: "Listening... Speak now",
      voiceProcessing: "Processing speech & querying verified data...",
      voiceResponding: "Responding & reading out...",
      voiceError: "Voice error",

      // Voice Notices & Fallbacks
      voiceNotSupported: "Speech recognition is not supported in this browser. Please use text input.",
      voicePermissionDenied: "Microphone access was denied. Please allow microphone permissions in browser settings.",
      voiceNoSpeech: "No speech was detected. Please try speaking again.",
      voiceNetworkError: "Network error during speech recognition. Falling back to text input.",
      ttsNotSupported: "Speech synthesis is not supported on this device. Displaying text response.",
      ttsVoiceUnavailable: "Native voice not available for this language in your browser. Displaying text response.",

      // Response Card Labels
      verifiedSource: "Verified Source",
      barrierLensEvidence: "BarrierLens Evidence",
      externalEvidence: "External Evidence",
      recommendedSolution: "Recommended Solution",
      solutionSource: "Source",
      whyItMayHelp: "Why it may help",
      selectBarrier: "Select Barrier",
      activeBarrier: "Active Barrier",
      changeBarrier: "Change Barrier",
      changeLanguage: "Change Language",
      dataProvenance: "Data Provenance",
      keyMetrics: "Verified Metrics",
      calculatedValues: "Calculated Analysis",
      derivedBadge: "Derived / Calculated",
      viewAnalysis: "View Dashboard Analysis",
      methodologyNote: "Methodology Note",
      limitationNote: "Study Limitation",
      researchDisclaimer: "Research Safety Disclaimer",
      disclaimerText: "BarrierLens uses cross-sectional NFHS-5 survey data. Observed associations do not establish medical or clinical causality.",
      unavailableTitle: "Information Not Available",
      copyAnswer: "Copy answer",
      copied: "Copied to clipboard!",

      // Errors & Fallbacks
      errorTitle: "Query Error",
      errorMessage: "An error occurred while communicating with the central query engine. Please try again.",
      emptyQueryError: "Please enter or speak a question before sending.",
      offlineMessage: "You appear to be offline. Local cached data will be used if available.",

      // Accessibility Labels
      chatWindowAria: "BarrierLens Research Assistant Chat Dialog",
      messageListAria: "Conversation message history",
      userMessageAria: "You said",
      assistantMessageAria: "Assistant responded",
      languageSelectAria: "Select interaction language",
      statusAria: "Assistant status notification"
    },

    kn: {
      // Header & Assistant Title
      assistantTitle: "ಬ್ಯಾರಿಯರ್ ಲೆನ್ಸ್ ಸಂಶೋಧನಾ ಸಹಾಯಕ",
      assistantSubtitle: "ದೃಢೀಕೃತ NFHS-5 ಸಂಶೋಧನಾ ಮಾಹಿತಿ ಮತ್ತು ವಿವರಣೆ",
      assistantBadge: "NFHS-5 ದೃಢೀಕೃತ",
      onlineStatus: "ಆನ್‌ಲೈನ್ • ದೃಢೀಕೃತ ಎಂಜಿನ್",

      // Welcome Message
      welcomeTitle: "ಬ್ಯಾರಿಯರ್ ಲೆನ್ಸ್ ಸಂಶೋಧನಾ ಸಹಾಯಕಕ್ಕೆ ಸುಸ್ವಾಗತ",
      welcomeGreeting: "ನಮಸ್ಕಾರ! ನಾನು ಬ್ಯಾರಿಯರ್ ಲೆನ್ಸ್ ಪ್ಲಾಟ್‌ಫಾರ್ಮ್‌ನ (NFHS-5 ದತ್ತಾಂಶ, 7,24,115 ಭಾರತೀಯ ಮಹಿಳೆಯರು) ನಿಮ್ಮ ಸಂಶೋಧನಾ ಸಹಾಯಕ. ರಾಷ್ಟ್ರೀಯ ಮಟ್ಟದ ಅಡಚಣೆಗಳು, ರಾಜ್ಯಗಳ ಹೋಲಿಕೆ, ಗ್ರಾಮೀಣ-ನಗರ ವ್ಯತ್ಯಾಸಗಳು, ಅಪಾಯದ ಮಾದರಿಗಳು ಅಥವಾ SHAP ವಿವರಣೆಗಳ ಬಗ್ಗೆ ಪ್ರಶ್ನೆಗಳನ್ನು ಕೇಳಿ.",
      welcomeHelp: "ಕೆಳಗಿನ ಸೂಚಿಸಲಾದ ಪ್ರಶ್ನೆಯನ್ನು ಆರಿಸಿ ಅಥವಾ ಕನ್ನಡ, ಇಂಗ್ಲಿಷ್ ಅಥವಾ ಹಿಂದಿಯಲ್ಲಿ ನಿಮ್ಮ ಪ್ರಶ್ನೆಯನ್ನು ಟೈಪ್ ಮಾಡಿ/ಮಾತನಾಡಿ.",

      // Controls & Inputs
      inputPlaceholder: "ಸಂಶೋಧನಾ ಪ್ರಶ್ನೆ ಕೇಳಿ ಅಥವಾ ರಾಜ್ಯಗಳನ್ನು ಹೋಲಿಕೆ ಮಾಡಿ...",
      sendButton: "ಪ್ರಶ್ನೆ ಕಳುಹಿಸಿ",
      micButton: "ಧ್ವನಿ ಇನ್‌ಪುಟ್ ಬಳಸಿ",
      micStopButton: "ಕೇಳುವುದನ್ನು ನಿಲ್ಲಿಸಿ",
      stopSpeechButton: "ಧ್ವನಿ ವಾಚನ ನಿಲ್ಲಿಸಿ",
      closeButton: "ಸಹಾಯಕವನ್ನು ಮುಚ್ಚಿ",
      minimizeButton: "ಕಿಟಕಿಯನ್ನು ಕಿರಿದಾಗಿಸಿ",
      clearChatButton: "ಸಂಭಾಷಣೆಯನ್ನು ತೆರವುಗೊಳಿಸಿ",
      suggestedQuestionsHeader: "ಸೂಚಿಸಲಾದ ಸಂಶೋಧನಾ ಪ್ರಶ್ನೆಗಳು",

      // Voice States
      voiceIdle: "ಧ್ವನಿ ಇನ್‌ಪುಟ್‌ಗೆ ಸಿದ್ಧವಾಗಿದೆ",
      voiceListening: "ಆಲಿಸುತ್ತಿದೆ... ಈಗ ಮಾತನಾಡಿ",
      voiceProcessing: "ಧ್ವನಿಯನ್ನು ಪ್ರಕ್ರಿಯೆಗೊಳಿಸಲಾಗುತ್ತಿದೆ...",
      voiceResponding: "ಉತ್ತರಿಸಲಾಗುತ್ತಿದೆ...",
      voiceError: "ಧ್ವನಿ ದೋಷ",

      // Voice Notices & Fallbacks
      voiceNotSupported: "ಈ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ಧ್ವನಿ ಗುರುತಿಸುವಿಕೆ ಬೆಂಬಲಿತವಾಗಿಲ್ಲ. ದಯವಿಟ್ಟು ಪಠ್ಯ ಇನ್‌ಪುಟ್ ಬಳಸಿ.",
      voicePermissionDenied: "ಮೈಕ್ರೊಫೋನ್ ಪ್ರವೇಶವನ್ನು ನಿರಾಕರಿಸಲಾಗಿದೆ. ದಯವಿಟ್ಟು ಬ್ರೌಸರ್ ಸೆಟ್ಟಿಂಗ್‌ಗಳಲ್ಲಿ ಅನುಮತಿ ನೀಡಿ.",
      voiceNoSpeech: "ಯಾವುದೇ ಧ್ವನಿ ಪತ್ತೆಯಾಗಿಲ್ಲ. ದಯವಿಟ್ಟು ಮತ್ತೊಮ್ಮೆ ಮಾತನಾಡಿ.",
      voiceNetworkError: "ಧ್ವನಿ ಗುರುತಿಸುವಿಕೆಯಲ್ಲಿ ನೆಟ್‌ವರ್ಕ್ ದೋಷ. ಪಠ್ಯ ಇನ್‌ಪುಟ್‌ಗೆ ಬದಲಾಯಿಸಲಾಗುತ್ತಿದೆ.",
      ttsNotSupported: "ಈ ಸಾಧನದಲ್ಲಿ ಧ್ವನಿ ವಾಚನ ಬೆಂಬಲಿತವಾಗಿಲ್ಲ. ಪಠ್ಯ ಉತ್ತರವನ್ನು ಪ್ರದರ್ಶಿಸಲಾಗುತ್ತಿದೆ.",
      ttsVoiceUnavailable: "ಈ ಭಾಷೆಗೆ ನಿಮ್ಮ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ಧ್ವನಿ ಲಭ್ಯವಿಲ್ಲ. ಪಠ್ಯ ಉತ್ತರವನ್ನು ಪ್ರದರ್ಶಿಸಲಾಗುತ್ತಿದೆ.",

      // Response Card Labels
      verifiedSource: "ದೃಢೀಕೃತ ಮೂಲ",
      barrierLensEvidence: "ಬ್ಯಾರಿಯರ್ ಲೆನ್ಸ್ ದೃಢೀಕೃತ ಆಧಾರ",
      externalEvidence: "ಬಾಹ್ಯ ಅಧಿಕೃತ ಆಧಾರ",
      recommendedSolution: "ಶಿಫಾರಸು ಮಾಡಿದ ಪರಿಹಾರ",
      solutionSource: "ಮೂಲ / ಸಂಸ್ಥೆ",
      whyItMayHelp: "ಇದು ಏಕೆ ನೆರವಾಗುತ್ತದೆ",
      selectBarrier: "ಅಡಚಣೆಯನ್ನು ಆರಿಸಿ",
      activeBarrier: "ಸಕ್ರಿಯ ಅಡಚಣೆ",
      changeBarrier: "ಅಡಚಣೆ ಬದಲಾಯಿಸಿ",
      changeLanguage: "ಭಾಷೆ ಬದಲಾಯಿಸಿ",
      dataProvenance: "ದತ್ತಾಂಶ ಮೂಲ ಮಾಹಿತಿ",
      keyMetrics: "ದೃಢೀಕೃತ ಅಂಕಿಅಂಶಗಳು",
      calculatedValues: "ಲೆಕ್ಕಹಾಕಿದ ವಿಶ್ಲೇಷಣೆ",
      derivedBadge: "ಲೆಕ್ಕಹಾಕಲಾದ ವ್ಯತ್ಯಾಸ",
      viewAnalysis: "ವಿಶ್ಲೇಷಣೆ ಪುಟವನ್ನು ವೀಕ್ಷಿಸಿ",
      methodologyNote: "ವಿಧಾನದ ಟಿಪ್ಪಣಿ",
      limitationNote: "ಅಧ್ಯಯನದ ಮಿತಿ",
      researchDisclaimer: "ಸಂಶೋಧನಾ ಸುರಕ್ಷತಾ ಹಕ್ಕುತ್ಯಾಗ",
      disclaimerText: "ಬ್ಯಾರಿಯರ್ ಲೆನ್ಸ್ NFHS-5 ಸಮೀಕ್ಷಾ ದತ್ತಾಂಶವನ್ನು ಬಳಸುತ್ತದೆ. ಗಮನಿಸಿದ ಸಂಬಂಧಗಳು ವೈದ್ಯಕೀಯ ಅಥವಾ ಪ್ರಾಯೋಗಿಕ ಕಾರಣವನ್ನು ಸಾಬೀತುಪಡಿಸುವುದಿಲ್ಲ.",
      unavailableTitle: "ಮಾಹಿತಿ ಲಭ್ಯವಿಲ್ಲ",
      copyAnswer: "ಉತ್ತರವನ್ನು ನಕಲಿಸಿ",
      copied: "ನಕಲಿಸಲಾಗಿದೆ!",

      // Errors & Fallbacks
      errorTitle: "ಪ್ರಶ್ನೆ ದೋಷ",
      errorMessage: "ಕೇಂದ್ರ ಪ್ರಶ್ನಾ ಎಂಜಿನ್‌ನೊಂದಿಗೆ ಸಂವಹನ ನಡೆಸುವಾಗ ದೋಷ ಸಂಭವಿಸಿದೆ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.",
      emptyQueryError: "ದಯವಿಟ್ಟು ಕಳುಹಿಸುವ ಮೊದಲು ಪ್ರಶ್ನೆಯನ್ನು ಟೈಪ್ ಮಾಡಿ ಅಥವಾ ಮಾತನಾಡಿ.",
      offlineMessage: "ನೀವು ಆಫ್‌ಲೈನ್‌ನಲ್ಲಿದ್ದೀರಿ ಎಂದು ತೋರುತ್ತಿದೆ.",

      // Accessibility Labels
      chatWindowAria: "ಬ್ಯಾರಿಯರ್ ಲೆನ್ಸ್ ಸಂಶೋಧನಾ ಸಹಾಯಕ ಸಂಭಾಷಣಾ ಕಿಟಕಿ",
      messageListAria: "ಸಂಭಾಷಣೆಯ ಇತಿಹಾಸ",
      userMessageAria: "ನೀವು ಹೇಳಿದ್ದು",
      assistantMessageAria: "ಸಹಾಯಕರು ಉತ್ತರಿಸಿದ್ದು",
      languageSelectAria: "ಸಂವಾದದ ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ",
      statusAria: "ಸಹಾಯಕ ಸ್ಥಿತಿ ಅಧಿಸೂಚನೆ"
    },

    hi: {
      // Header & Assistant Title
      assistantTitle: "बैरियरलेंस अनुसंधान सहायक",
      assistantSubtitle: "सत्यापित NFHS-5 अनुसंधान विश्लेषण एवं व्याख्या",
      assistantBadge: "NFHS-5 सत्यापित",
      onlineStatus: "ऑनलाइन • सत्यापित इंजन",

      // Welcome Message
      welcomeTitle: "बैरियरलेंस अनुसंधान सहायक में आपका स्वागत है",
      welcomeGreeting: "नमस्ते! मैं बैरियरलेंस प्लेटफॉर्म (NFHS-5 डेटासेट, 7,24,115 भारतीय महिलाएं) का आपका अनुसंधान सहायक हूँ। राष्ट्रीय स्तर की बाधाओं, राज्यों की तुलना, ग्रामीण-शहरी अंतर, जोखिम प्रारूपों या SHAP व्याख्या के बारे में प्रश्न पूछें।",
      welcomeHelp: "नीचे दिए गए सुझाए गए प्रश्नों में से चुनें या हिंदी, अंग्रेजी या कन्नड़ में अपना प्रश्न टाइप करें/बोलें।",

      // Controls & Inputs
      inputPlaceholder: "अनुसंधान प्रश्न पूछें या राज्यों की तुलना करें...",
      sendButton: "प्रश्न भेजें",
      micButton: "ध्वनि इनपुट का उपयोग करें",
      micStopButton: "सुनना बंद करें",
      stopSpeechButton: "ध्वनि वाचन रोकें",
      closeButton: "सहायक बंद करें",
      minimizeButton: "सहायक छोटा करें",
      clearChatButton: "चैट इतिहास साफ़ करें",
      suggestedQuestionsHeader: "सुझाए गए अनुसंधान प्रश्न",

      // Voice States
      voiceIdle: "ध्वनि इनपुट के लिए तैयार",
      voiceListening: "सुन रहा हूँ... अब बोलें",
      voiceProcessing: "ध्वनि संसाधित की जा रही है...",
      voiceResponding: "उत्तर दिया जा रहा है...",
      voiceError: "ध्वनि त्रुटि",

      // Voice Notices & Fallbacks
      voiceNotSupported: "इस ब्राउज़र में वाक् पहचान (Speech Recognition) समर्थित नहीं है। कृपया टेक्स्ट इनपुट का उपयोग करें।",
      voicePermissionDenied: "माइक्रोफ़ोन अनुमति अस्वीकृत। कृपया ब्राउज़र सेटिंग्स में माइक्रोफ़ोन की अनुमति दें।",
      voiceNoSpeech: "कोई आवाज़ नहीं पहचानी गई। कृपया पुनः प्रयास करें।",
      voiceNetworkError: "वाक् पहचान में नेटवर्क त्रुटि। टेक्स्ट इनपुट पर वापस जाया जा रहा है।",
      ttsNotSupported: "इस डिवाइस पर वाक् संश्लेषण (TTS) समर्थित नहीं है। टेक्स्ट उत्तर दिखाया जा रहा है।",
      ttsVoiceUnavailable: "इस भाषा के लिए आपके ब्राउज़र में ध्वनि उपलब्ध नहीं है। टेक्स्ट उत्तर दिखाया जा रहा है।",

      // Response Card Labels
      verifiedSource: "सत्यापित स्रोत",
      barrierLensEvidence: "बैरियर लेंस सत्यापित साक्ष्य",
      externalEvidence: "बाह्य आधिकारिक साक्ष्य",
      recommendedSolution: "अनुशंसित समाधान",
      solutionSource: "स्रोतः",
      whyItMayHelp: "यह क्यों सहायक है",
      selectBarrier: "बाधा चुनें",
      activeBarrier: "सक्रिय बाधा",
      changeBarrier: "बाधा बदलें",
      changeLanguage: "भाषा बदलें",
      dataProvenance: "डेटा स्रोत विवरण",
      keyMetrics: "सत्यापित मेट्रिक्स",
      calculatedValues: "परिकलित विश्लेषण",
      derivedBadge: "परिकलित अंतर",
      viewAnalysis: "डैशबोर्ड विश्लेषण देखें",
      methodologyNote: "पद्धति संबंधी टिप्पणी",
      limitationNote: "अध्ययन सीमा",
      researchDisclaimer: "अनुसंधान सुरक्षा अस्वीकरण",
      disclaimerText: "बैरियरलेंस NFHS-5 क्रॉस-सेक्शनल सर्वेक्षण डेटा का उपयोग करता है। प्रेक्षित संबंध प्रत्यक्ष चिकित्सीय कारण संबंध स्थापित नहीं करते हैं।",
      unavailableTitle: "जानकारी उपलब्ध नहीं है",
      copyAnswer: "उत्तर कॉपी करें",
      copied: "कॉपी किया गया!",

      // Errors & Fallbacks
      errorTitle: "प्रश्न त्रुटि",
      errorMessage: "केंद्रीय क्वेरी इंजन के साथ संचार करते समय एक त्रुटि हुई। कृपया पुन: प्रयास करें।",
      emptyQueryError: "कृपया भेजने से पहले प्रश्न टाइप करें या बोलें।",
      offlineMessage: "लगता है आप ऑफ़लाइन हैं।",

      // Accessibility Labels
      chatWindowAria: "बैरियरलेंस अनुसंधान सहायक चैट संवाद",
      messageListAria: "वार्तालाप इतिहास",
      userMessageAria: "आपने कहा",
      assistantMessageAria: "सहायक का उत्तर",
      languageSelectAria: "बातचीत की भाषा चुनें",
      statusAria: "सहायक स्थिति अधिसूचना"
    }
  };

  const SUGGESTED_QUESTIONS = {
    en: [
      { text: "What is the most common barrier?", topic: "National Overview" },
      { text: "Compare Karnataka and Kerala.", topic: "State Comparison" },
      { text: "Compare rural and urban women.", topic: "Rural-Urban" },
      { text: "What are the risk archetypes?", topic: "Clustering" },
      { text: "What is SHAP?", topic: "Explainability" },
      { text: "Can BarrierLens prove causation?", topic: "Methodology" },
      { text: "What is the average hospital waiting time?", topic: "Out-of-scope Test" }
    ],
    kn: [
      { text: "ಅತ್ಯಂತ ಸಾಮಾನ್ಯವಾದ ಅಡಚಣೆ ಯಾವುದು?", topic: "ರಾಷ್ಟ್ರೀಯ ಅವಲೋಕನ" },
      { text: "ಕರ್ನಾಟಕ ಮತ್ತು ಕೇರಳವನ್ನು ಹೋಲಿಕೆ ಮಾಡಿ.", topic: "ರಾಜ್ಯಗಳ ಹೋಲಿಕೆ" },
      { text: "ಗ್ರಾಮೀಣ ಮತ್ತು ನಗರ ಮಹಿಳೆಯರನ್ನು ಹೋಲಿಕೆ ಮಾಡಿ.", topic: "ಗ್ರಾಮೀಣ-ನಗರ" },
      { text: "ಅಪಾಯದ ಮಾದರಿಗಳು (risk archetypes) ಯಾವುವು?", topic: "ಕ್ಲಸ್ಟರಿಂಗ್" },
      { text: "SHAP ಎಂದರೇನು?", topic: "ವಿವರಣೆ" },
      { text: "ಬ್ಯಾರಿಯರ್ ಲೆನ್ಸ್ ಕಾರಣಾತ್ಮಕತೆಯನ್ನು ಸಾಬೀತುಪಡಿಸಬಹುದೇ?", topic: "ಅಧ್ಯಯನದ ಮಿತಿಗಳು" },
      { text: "ಆಸ್ಪತ್ರೆಯ ಸರಾಸರಿ ಕಾಯುವ ಸಮಯ ಎಷ್ಟು?", topic: "ಲಭ್ಯವಿಲ್ಲದ ಮಾಹಿತಿ ಪರೀಕ್ಷೆ" }
    ],
    hi: [
      { text: "सबसे आम बाधा कौन सी है?", topic: "राष्ट्रीय अवलोकन" },
      { text: "कर्नाटक और केरल की तुलना करें।", topic: "राज्य तुलना" },
      { text: "ग्रामीण और शहरी महिलाओं की तुलना करें।", topic: "ग्रामीण-शहरी" },
      { text: "जोखिम के प्रकार (risk archetypes) क्या हैं?", topic: "क्लस्टरिंग" },
      { text: "SHAP क्या है?", topic: "व्याख्यात्मकता" },
      { text: "क्या बैरियरलेंस कारण संबंध साबित कर सकता है?", topic: "पद्धति" },
      { text: "अस्पताल में प्रतीक्षा का औसत समय क्या है?", topic: "अनुपलब्ध डेटा परीक्षण" }
    ]
  };

  let _currentLanguage = 'en';

  /**
   * Translate a given key to the specified or active language.
   */
  function t(key, lang = _currentLanguage) {
    const activeLang = TRANSLATIONS[lang] ? lang : 'en';
    if (TRANSLATIONS[activeLang] && TRANSLATIONS[activeLang][key] !== undefined) {
      return TRANSLATIONS[activeLang][key];
    }
    // Fallback to English
    if (TRANSLATIONS.en && TRANSLATIONS.en[key] !== undefined) {
      return TRANSLATIONS.en[key];
    }
    return key;
  }

  /**
   * Get suggested research questions for the specified language.
   */
  function getSuggestedQuestions(lang = _currentLanguage) {
    const activeLang = SUGGESTED_QUESTIONS[lang] ? lang : 'en';
    return SUGGESTED_QUESTIONS[activeLang] || SUGGESTED_QUESTIONS.en;
  }

  /**
   * Set active UI language.
   */
  function setLanguage(lang) {
    if (TRANSLATIONS[lang]) {
      _currentLanguage = lang;
      if (typeof document !== 'undefined') {
        document.documentElement.lang = lang;
      }
      return true;
    }
    return false;
  }

  /**
   * Get active UI language code.
   */
  function getCurrentLanguage() {
    return _currentLanguage;
  }

  /**
   * Get supported languages list with metadata.
   */
  function getSupportedLanguages() {
    return SUPPORTED_LANGUAGES;
  }

  /**
   * Map language code to Web Speech API locale string.
   */
  function getSpeechLocale(lang = _currentLanguage) {
    const found = SUPPORTED_LANGUAGES.find(l => l.code === lang);
    return found ? found.speechCode : 'en-IN';
  }

  return {
    SUPPORTED_LANGUAGES,
    TRANSLATIONS,
    SUGGESTED_QUESTIONS,
    t,
    getSuggestedQuestions,
    setLanguage,
    getCurrentLanguage,
    getSupportedLanguages,
    getSpeechLocale
  };
}));
