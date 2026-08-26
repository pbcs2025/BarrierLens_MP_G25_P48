/**
 * BARRIERLENS — MEMBER 1: GUIDED QUESTION SCHEMA
 * Defines the question schema and input specification for Mode 1 (Identify My Barrier).
 * Derived directly from the inspected raw feature requirements of Member 2's Stage 1 ML models.
 * Dual environment support: Browser (window.BarrierLensQuestionSchema) & Node.js (module.exports).
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.BarrierLensQuestionSchema = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /**
   * Question definitions mapped directly to NFHS-5 Stage 1 model features.
   */
  const QUESTIONS = [
    {
      id: "v012",
      featureName: "v012",
      category: "demographic",
      type: "number",
      min: 15,
      max: 49,
      default: 28,
      labels: {
        en: { title: "What is your current age?", subtitle: "Please enter your age (between 15 and 49 years)." },
        kn: { title: "ನಿಮ್ಮ ಪ್ರಸ್ತುತ ವಯಸ್ಸು ಎಷ್ಟು?", subtitle: "ದಯವಿಟ್ಟು ನಿಮ್ಮ ವಯಸ್ಸನ್ನು ನಮೂದಿಸಿ (15 ರಿಂದ 49 ವರ್ಷಗಳು)." },
        hi: { title: "आपकी वर्तमान आयु क्या है?", subtitle: "कृपया अपनी आयु दर्ज करें (15 से 49 वर्ष के बीच)।" }
      }
    },
    {
      id: "v106",
      featureName: "v106",
      category: "demographic",
      type: "select",
      default: "secondary",
      labels: {
        en: { title: "What is your highest level of education?", subtitle: "Select the highest education level you completed." },
        kn: { title: "ನಿಮ್ಮ ಗರಿಷ್ಠ ಶಿಕ್ಷಣ ಮಟ್ಟ ಯಾವುದು?", subtitle: "ನೀವು ಪೂರ್ಣಗೊಳಿಸಿದ ಗರಿಷ್ಠ ಶಿಕ್ಷಣವನ್ನು ಆಯ್ಕೆಮಾಡಿ." },
        hi: { title: "आपकी उच्चतम शिक्षा का स्तर क्या है?", subtitle: "आपके द्वारा पूरी की गई उच्चतम शिक्षा का चयन करें।" }
      },
      options: [
        { value: "no education", labels: { en: "No formal education", kn: "ಯಾವುದೇ ಔಪಚಾರಿಕ ಶಿಕ್ಷಣವಿಲ್ಲ", hi: "कोई औपचारिक शिक्षा नहीं" } },
        { value: "primary", labels: { en: "Primary school", kn: "ಪ್ರಾಥಮಿಕ ಶಾಲೆ", hi: "प्राथमिक विद्यालय" } },
        { value: "secondary", labels: { en: "Secondary / High school", kn: "ಪ್ರೌಢಶಾಲೆ", hi: "माध्यमिक / हाई स्कूल" } },
        { value: "higher", labels: { en: "Higher education / College", kn: "ಉನ್ನತ ಶಿಕ್ಷಣ / ಕಾಲೇಜು", hi: "उच्च शिक्षा / कॉलेज" } }
      ]
    },
    {
      id: "v190",
      featureName: "v190",
      category: "socioeconomic",
      type: "select",
      default: "middle",
      labels: {
        en: { title: "What is your household wealth quintile?", subtitle: "Select the economic bracket that best describes your household." },
        kn: { title: "ನಿಮ್ಮ ಮನೆಯ ಆರ್ಥಿಕ ಸ್ಥಿತಿ ಯಾವುದು?", subtitle: "ನಿಮ್ಮ ಮನೆಯನ್ನು ಅತ್ಯುತ್ತಮವಾಗಿ ವಿವರಿಸುವ ಆರ್ಥಿಕ ಶ್ರೇಣಿಯನ್ನು ಆಯ್ಕೆಮಾಡಿ." },
        hi: { title: "आपके परिवार का आर्थिक स्तर क्या है?", subtitle: "उस आर्थिक वर्ग का चयन करें जो आपके परिवार का सबसे अच्छा वर्णन करता है।" }
      },
      options: [
        { value: "poorest", labels: { en: "Poorest", kn: "ಅತ್ಯಂತ ಬಡ", hi: "अति निर्धन" } },
        { value: "poorer", labels: { en: "Poorer", kn: "ಬಡ", hi: "निर्धन" } },
        { value: "middle", labels: { en: "Middle", kn: "ಮಧ್ಯಮ", hi: "मध्यम" } },
        { value: "richer", labels: { en: "Richer", kn: "ಶ್ರೀಮಂತ", hi: "धनी" } },
        { value: "richest", labels: { en: "Richest", kn: "ಅತ್ಯಂತ ಶ್ರೀಮಂತ", hi: "अति धनी" } }
      ]
    },
    {
      id: "v025",
      featureName: "v025",
      category: "demographic",
      type: "select",
      default: "rural",
      labels: {
        en: { title: "Where is your residence located?", subtitle: "Select whether you live in a rural village or urban city/town." },
        kn: { title: "ನಿಮ್ಮ ವಾಸಸ್ಥಳ ಎಲ್ಲಿದೆ?", subtitle: "ನೀವು ಗ್ರಾಮೀಣ ಹಳ್ಳಿಯಲ್ಲಿ ಅಥವಾ ನಗರ/ಪಟ್ಟಣದಲ್ಲಿ ವಾಸಿಸುತ್ತಿದ್ದೀರಾ ಎಂದು ಆಯ್ಕೆಮಾಡಿ." },
        hi: { title: "आपका निवास स्थान कहाँ है?", subtitle: "चुनें कि आप ग्रामीण क्षेत्र में रहते हैं या शहरी शहर/कस्बे में।" }
      },
      options: [
        { value: "rural", labels: { en: "Rural / Village", kn: "ಗ್ರಾಮೀಣ / ಹಳ್ಳಿ", hi: "ग्रामीण / गाँव" } },
        { value: "urban", labels: { en: "Urban / Town / City", kn: "ನಗರ / ಪಟ್ಟಣ", hi: "शहरी / शहर" } }
      ]
    },
    {
      id: "v169a",
      featureName: "v169a",
      category: "digital",
      type: "select",
      default: "yes",
      labels: {
        en: { title: "Does your household have a mobile phone?", subtitle: "Mobile connectivity assists in finding healthcare information." },
        kn: { title: "ನಿಮ್ಮ ಮನೆಯಲ್ಲಿ ಮೊಬೈಲ್ ಫೋನ್ ಇದೆಯೇ?", subtitle: "ಮೊಬೈಲ್ ಸಂಪರ್ಕವು ಆರೋಗ್ಯ ಮಾಹಿತಿಯನ್ನು ಹುಡುಕಲು ಸಹಾಯ ಮಾಡುತ್ತದೆ." },
        hi: { title: "क्या आपके घर में मोबाइल फोन है?", subtitle: "मोबाइल फोन स्वास्थ्य जानकारी प्राप्त करने में मदद करता है।" }
      },
      options: [
        { value: "yes", labels: { en: "Yes", kn: "ಹೌದು", hi: "हाँ" } },
        { value: "no", labels: { en: "No", kn: "ಇಲ್ಲ", hi: "नहीं" } }
      ]
    },
    {
      id: "v170",
      featureName: "v170",
      category: "socioeconomic",
      type: "select",
      default: "yes",
      labels: {
        en: { title: "Do you or someone in your household have a bank account?", subtitle: "Financial inclusion reflects economic independence." },
        kn: { title: "ನಿಮ್ಮಲ್ಲಿ ಅಥವಾ ನಿಮ್ಮ ಮನೆಯವರಲ್ಲಿ ಬ್ಯಾಂಕ್ ಖಾತೆ ಇದೆಯೇ?", subtitle: "ಬ್ಯಾಂಕ್ ಖಾತೆಯು ಆರ್ಥಿಕ ಸ್ವಾತಂತ್ರ್ಯವನ್ನು ಸೂಚಿಸುತ್ತದೆ." },
        hi: { title: "क्या आपके या आपके परिवार के किसी सदस्य के पास बैंक खाता है?", subtitle: "बैंक खाता वित्तीय स्वतंत्रता को दर्शाता है।" }
      },
      options: [
        { value: "yes", labels: { en: "Yes", kn: "ಹೌದು", hi: "हाँ" } },
        { value: "no", labels: { en: "No", kn: "ಇಲ್ಲ", hi: "नहीं" } }
      ]
    },
    {
      id: "v481",
      featureName: "v481",
      category: "healthcare",
      type: "select",
      default: "no",
      labels: {
        en: { title: "Are you covered under any health insurance scheme?", subtitle: "e.g., PM-JAY, state health scheme, or private health insurance." },
        kn: { title: "ನೀವು ಯಾವುದೇ ಆರೋಗ್ಯ ವಿಮಾ ಯೋಜನೆಯ ಅಡಿಯಲ್ಲಿ ರಕ್ಷಣೆ ಹೊಂದಿದ್ದೀರಾ?", subtitle: "ಉದಾಹರಣೆಗೆ, ಆಯುಷ್ಮಾನ್ ಭಾರತ್, ರಾಜ್ಯ ಆರೋಗ್ಯ ಯೋಜನೆ ಅಥವಾ ಖಾಸಗಿ ವಿಮೆ." },
        hi: { title: "क्या आप किसी स्वास्थ्य बीमा योजना के तहत कवर हैं?", subtitle: "उदा. आयुष्मान भारत (PM-JAY), राज्य स्वास्थ्य योजना या निजी बीमा।" }
      },
      options: [
        { value: "yes", labels: { en: "Yes", kn: "ಹೌದು", hi: "हाँ" } },
        { value: "no", labels: { en: "No", kn: "ಇಲ್ಲ", hi: "नहीं" } }
      ]
    },
    {
      id: "v743f",
      featureName: "v743f",
      category: "autonomy",
      type: "select",
      default: "respondent and husband/partner",
      labels: {
        en: { title: "Who mainly makes decisions regarding your healthcare?", subtitle: "Autonomy in healthcare decisions affects household barriers." },
        kn: { title: "ನಿಮ್ಮ ಆರೋಗ್ಯ ರಕ್ಷಣೆಯ ಬಗ್ಗೆ ಯಾರು ಮುಖ್ಯವಾಗಿ ನಿರ್ಧಾರಗಳನ್ನು ತೆಗೆದುಕೊಳ್ಳುತ್ತಾರೆ?", subtitle: "ಆರೋಗ್ಯ ರಕ್ಷಣೆಯ ನಿರ್ಧಾರಗಳಲ್ಲಿನ ಸ್ವಾಯತ್ತತೆಯು ಮನೆ ಅಡಚಣೆಗಳ ಮೇಲೆ ಪ್ರಭಾವ ಬೀರುತ್ತದೆ." },
        hi: { title: "आपके स्वास्थ्य सेवा से जुड़े निर्णय मुख्य रूप से कौन लेता है?", subtitle: "स्वास्थ्य निर्णयों में स्वायत्तता पारिवारिक बाधाओं को प्रभावित करती है।" }
      },
      options: [
        { value: "respondent alone", labels: { en: "I decide alone", kn: "ನಾನೇ ಸ್ವತಃ ನಿರ್ಧರಿಸುತ್ತೇನೆ", hi: "मैं स्वयं निर्णय लेती हूँ" } },
        { value: "respondent and husband/partner", labels: { en: "Me and my husband/partner together", kn: "ನಾನು ಮತ್ತು ನನ್ನ ಪತಿ/ಜೊತೆಗಾರ ಇಬ್ಬರೂ ಸೇರಿ", hi: "मैं और मेरे पति/साथी मिलकर" } },
        { value: "husband/partner alone", labels: { en: "Husband / partner alone", kn: "ಪತಿ / ಜೊತೆಗಾರ ಮಾತ್ರ", hi: "केवल पति / साथी" } },
        { value: "someone else", labels: { en: "Family elders / someone else", kn: "ಕುಟುಂಬದ ಹಿರಿಯರು / ಬೇರೆಯವರು", hi: "परिवार के बड़े / कोई अन्य" } },
        { value: "other", labels: { en: "Other", kn: "ಇತರೆ", hi: "अन्य" } }
      ]
    },
    {
      id: "v159",
      featureName: "v159",
      category: "media",
      type: "select",
      default: "at least once a week",
      labels: {
        en: { title: "How often do you watch television?", subtitle: "Media exposure is a protective factor for health awareness." },
        kn: { title: "ನೀವು ಎಷ್ಟು ಬಾರಿ ದೂರದರ್ಶನ (ಟಿವಿ) ವೀಕ್ಷಿಸುತ್ತೀರಿ?", subtitle: "ಮಾಧ್ಯಮ ಸಂಪರ್ಕವು ಆರೋಗ್ಯ ಅರಿವಿಗೆ ಸಹಾಯಕವಾಗಿದೆ." },
        hi: { title: "आप कितनी बार टेलीविजन (टीवी) देखते हैं?", subtitle: "मीडिया का अनुभव स्वास्थ्य जागरूकता को बढ़ाता है।" }
      },
      options: [
        { value: "at least once a week", labels: { en: "Regularly (at least once a week)", kn: "ನಿಯಮಿತವಾಗಿ (ವಾರಕ್ಕೆ ಕನಿಷ್ಠ ಒಮ್ಮೆ)", hi: "नियमित रूप से (सप्ताह में कम से कम एक बार)" } },
        { value: "less than once a week", labels: { en: "Occasionally (less than once a week)", kn: "ಅಪರೂಪವಾಗಿ (ವಾರಕ್ಕೆ ಒಮ್ಮೆಗಿಂತ ಕಡಿಮೆ)", hi: "कभी-कभी (सप्ताह में एक बार से कम)" } },
        { value: "not at all", labels: { en: "Not at all", kn: "ವೀಕ್ಷಿಸುವುದಿಲ್ಲ", hi: "बिल्कुल नहीं" } }
      ]
    },
    {
      id: "v501",
      featureName: "v501",
      category: "demographic",
      type: "select",
      default: "married",
      labels: {
        en: { title: "What is your marital status?", subtitle: "Current marital status." },
        kn: { title: "ನಿಮ್ಮ ವೈವಾಹಿಕ ಸ್ಥಿತಿ ಯಾವುದು?", subtitle: "ಪ್ರಸ್ತುತ ವೈವಾಹಿಕ ಸ್ಥಿತಿ." },
        hi: { title: "आपकी वैवाहिक स्थिति क्या है?", subtitle: "वर्तमान वैवाहिक स्थिति।" }
      },
      options: [
        { value: "married", labels: { en: "Currently married", kn: "ವಿವಾಹಿತ", hi: "विवाहित" } },
        { value: "never in union", labels: { en: "Never married", kn: "ಅವಿವಾಹಿತ", hi: "अविवाहित" } },
        { value: "widowed", labels: { en: "Widowed", kn: "ವಿಧವೆ", hi: "विधवा" } },
        { value: "no longer living together/separated", labels: { en: "Separated / Divorced", kn: "ಪ್ರತ್ಯೇಕ / ವಿಚ್ಛೇದಿತ", hi: "अलग / तलाकशुदा" } }
      ]
    }
  ];

  /**
   * Normalize language code.
   */
  function normalizeLang(lang) {
    if (!lang || typeof lang !== 'string') return 'en';
    const l = lang.trim().toLowerCase();
    if (l.startsWith('kn') || l.includes('kannada') || l.includes('ಕನ್ನಡ')) return 'kn';
    if (l.startsWith('hi') || l.includes('hindi') || l.includes('हिंदी') || l.includes('हिन्दी')) return 'hi';
    return 'en';
  }

  /**
   * Get formatted question list for a specific language.
   */
  function getQuestionList(lang = 'en') {
    const code = normalizeLang(lang);
    return QUESTIONS.map((q, index) => {
      const labelObj = q.labels[code] || q.labels.en;
      const formattedOptions = q.options ? q.options.map(opt => {
        const optLabel = opt.labels[code] || opt.labels.en;
        return {
          value: opt.value,
          label: optLabel
        };
      }) : null;

      return {
        index: index + 1,
        total: QUESTIONS.length,
        id: q.id,
        featureName: q.featureName,
        category: q.category,
        type: q.type,
        min: q.min,
        max: q.max,
        title: labelObj.title,
        subtitle: labelObj.subtitle,
        default: q.default,
        options: formattedOptions
      };
    });
  }

  /**
   * Get single question by ID.
   */
  function getQuestion(id, lang = 'en') {
    const list = getQuestionList(lang);
    return list.find(q => q.id === id || q.featureName === id) || null;
  }

  /**
   * Get default answers mapping.
   */
  function getDefaultAnswers() {
    const defaults = {};
    for (const q of QUESTIONS) {
      defaults[q.id] = q.default;
    }
    return defaults;
  }

  /**
   * Validate raw user answers object against schema.
   */
  function validateAnswers(answers = {}) {
    const valid = {};
    const errors = [];

    for (const q of QUESTIONS) {
      const val = answers[q.id] !== undefined ? answers[q.id] : answers[q.featureName];
      if (val === undefined || val === null || val === '') {
        valid[q.id] = q.default;
        continue;
      }

      if (q.type === 'number') {
        const num = Number(val);
        if (isNaN(num)) {
          errors.push(`Invalid number for ${q.id}: ${val}`);
          valid[q.id] = q.default;
        } else {
          valid[q.id] = Math.max(q.min || 15, Math.min(q.max || 49, num));
        }
      } else if (q.type === 'select') {
        const strVal = String(val).trim().toLowerCase();
        const optionMatch = q.options.find(o => o.value.toLowerCase() === strVal);
        if (optionMatch) {
          valid[q.id] = optionMatch.value;
        } else {
          valid[q.id] = q.default;
        }
      }
    }

    return {
      isValid: errors.length === 0,
      answers: valid,
      errors: errors
    };
  }

  return {
    QUESTIONS,
    getQuestionList,
    getQuestion,
    getDefaultAnswers,
    validateAnswers,
    normalizeLang
  };
}));
