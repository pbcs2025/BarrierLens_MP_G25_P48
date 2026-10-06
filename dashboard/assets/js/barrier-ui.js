/**
 * BARRIERLENS — MEMBER 4: BARRIER SELECTION & MULTILINGUAL UI COMPONENT (`barrier-ui.js`)
 * Renders interactive menu for the 5 canonical barrier categories (Household, Logistic, Facility, Multiple, All).
 * Provides active barrier context toolbar, language switching controls, and visual card renderers.
 * Dual environment support: Browser (window.BarrierLensBarrierUI) & Node.js (module.exports).
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.BarrierLensBarrierUI = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const BARRIER_OPTIONS = [
    {
      id: "household",
      name: "Household Barrier",
      icon: "🏠",
      desc: "Autonomy, family permissions, and household decision constraints"
    },
    {
      id: "logistic",
      name: "Logistic Barrier",
      icon: "🚗",
      desc: "Transportation, distance to facility, travel costs, and escort needs"
    },
    {
      id: "facility",
      name: "Facility Barrier",
      icon: "🏥",
      desc: "Provider availability, medicines, facility infrastructure, and treatment"
    },
    {
      id: "multiple",
      name: "Multiple Barriers",
      icon: "⚠️",
      desc: "Overlapping compound barriers (2 or more barrier dimensions)"
    },
    {
      id: "all",
      name: "All Barriers",
      icon: "📊",
      desc: "Overall composite national and state-level healthcare access prevalence"
    }
  ];

  // 5 Canonical Barriers Metadata (Multilingual)
  const BARRIER_DEFINITIONS = [
    {
      id: "Household Barrier",
      key: "household",
      icon: "🏠",
      title: {
        en: "Household Barrier",
        kn: "ಮನೆ/ಕುಟುಂಬದ ಅಡಚಣೆ",
        hi: "घरेलू / पारिवारिक बाधा"
      },
      desc: {
        en: "Permission to go, not wanting to go alone, distance concerns at home.",
        kn: "ಅನುಮತಿ ಕೊರತೆ, ಒಬ್ಬರೇ ಹೋಗಲು ಇಷ್ಟವಿಲ್ಲದಿರುವುದು, ಮನೆಯ ಹಂತದ ತೊಂದರೆಗಳು.",
        hi: "अकेले जाने की अनिच्छा, अनुमति की कमी या घरेलू निर्णय बाधाएं।"
      }
    },
    {
      id: "Logistic Barrier",
      key: "logistic",
      icon: "🚗",
      title: {
        en: "Logistic Barrier",
        kn: "ಸಾರಿಗೆ / ವೆಚ್ಚದ ಅಡಚಣೆ",
        hi: "परिवहन / लागत बाधा"
      },
      desc: {
        en: "Transport availability, monetary costs, distance to healthcare facility.",
        kn: "ಸಾರಿಗೆ ಸೌಲಭ್ಯದ ಅಭಾವ, ಚಿಕಿತ್ಸಾ ವೆಚ್ಚ ಮತ್ತು ಆಸ್ಪತ್ರೆಯ ದೂರ.",
        hi: "परिवहन की अनुपलब्धता, स्वास्थ्य केंद्र की दूरी और यात्रा लागत।"
      }
    },
    {
      id: "Facility Barrier",
      key: "facility",
      icon: "🏥",
      title: {
        en: "Facility Barrier",
        kn: "ಆಸ್ಪತ್ರೆ / ಸೌಲಭ್ಯದ ಅಡಚಣೆ",
        hi: "अस्पताल / सुविधा की बाधा"
      },
      desc: {
        en: "Absence of doctor, lack of medicines, provider attitudes at facility.",
        kn: "ವೈದ್ಯರ ಗೈರುಹಾಜರಿ, ಔಷಧಿಗಳ ಅಭಾವ ಮತ್ತು ಸಿಬ್ಬಂದಿಯ ನಡವಳಿಕೆ.",
        hi: "डॉक्टर की अनुपलब्धता, दवाइयों की कमी या स्वास्थ्यकर्मियों का व्यवहार।"
      }
    },
    {
      id: "Multiple Barriers",
      key: "multiple",
      icon: "⚠️",
      title: {
        en: "Multiple Barriers",
        kn: "ಅನೇಕ ಅಡಚಣೆಗಳು (2+)",
        hi: "अनेक बाधाएं (2+)"
      },
      desc: {
        en: "Overlapping compound barriers (facing 2 or more barriers simultaneously).",
        kn: "ಒಂದಕ್ಕಿಂತ ಹೆಚ್ಚು (2+) ಅಡಚಣೆಗಳನ್ನು ಏಕಕಾಲದಲ್ಲಿ ಎದುರಿಸುವುದು.",
        hi: "एक से अधिक (2+) बाधाओं का एक साथ सामना करना।"
      }
    },
    {
      id: "All Barriers",
      key: "all",
      icon: "📊",
      title: {
        en: "All Barriers",
        kn: "ಎಲ್ಲಾ ಅಡಚಣೆಗಳ ಒಟ್ಟು ನೋಟ",
        hi: "सभी बाधाओं का अवलोकन"
      },
      desc: {
        en: "Composite national prevalence across any of the healthcare barriers.",
        kn: "ಯಾವುದೇ ಒಂದಾದರೂ ಅಡಚಣೆಯನ್ನು ಎದುರಿಸುತ್ತಿರುವ ಒಟ್ಟಾರೆ ರಾಷ್ಟ್ರೀಯ ಪ್ರಮಾಣ.",
        hi: "कम से कम एक स्वास्थ्य बाधा का सामना करने वाली महिलाओं की समग्र दर।"
      }
    }
  ];

  function resolveLangKey(lang) {
    if (!lang || typeof lang !== 'string') return 'en';
    const l = lang.trim().toLowerCase();
    if (l === 'kn' || l.startsWith('kn') || l.includes('kannada') || l.includes('ಕನ್ನಡ')) return 'kn';
    if (l === 'hi' || l.startsWith('hi') || l.includes('hindi') || l.includes('हिंदी') || l.includes('हिन्दी')) return 'hi';
    return 'en';
  }

  function getBarrierInfo(barrierName) {
    if (!barrierName) return BARRIER_DEFINITIONS[0];
    const found = BARRIER_DEFINITIONS.find(b => b.id.toLowerCase() === barrierName.toLowerCase() || b.key.toLowerCase() === barrierName.toLowerCase());
    return found || BARRIER_DEFINITIONS[0];
  }

  function render(containerId, options = {}) {
    const container = typeof containerId === 'string'
      ? document.getElementById(containerId)
      : containerId;

    if (!container) return null;

    const onSelectBarrier = options.onSelectBarrier || function() {};
    const onBack = options.onBack || options.onCancel || function() {};
    const activeBarrier = options.activeBarrier || "All Barriers";

    const activeLanguage = options.activeLanguage || options.lang || 'en';
    const langKey = resolveLangKey(activeLanguage);

    const headerTexts = {
      en: {
        back: "← Back to Modes",
        modeTag: "Mode 2: Explore",
        title: "Explore Healthcare Access Barriers",
        subtitle: "Select a barrier category to view verified NFHS-5 evidence & solutions:",
        activeBadge: "Active"
      },
      kn: {
        back: "← ಪ್ರವೇಶ ವಿಧಾನಗಳಿಗೆ ಹಿಂತಿರುಗಿ",
        modeTag: "ವಿಧಾನ 2: ಅನ್ವೇಷಣೆ",
        title: "ಆರೋಗ್ಯ ಅಡಚಣೆಗಳನ್ನು ಅನ್ವೇಷಿಸಿ",
        subtitle: "ದೃಢೀಕೃತ NFHS-5 ಮಾಹಿತಿ ಮತ್ತು ಪರಿಹಾರಗಳನ್ನು ವೀಕ್ಷಿಸಲು ಒಂದು ಅಡಚಣೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ:",
        activeBadge: "ಸಕ್ರಿಯ"
      },
      hi: {
        back: "← मोड पर वापस जाएं",
        modeTag: "मोड 2: अन्वेषण",
        title: "स्वास्थ्य देखभाल बाधाओं का अन्वेषण करें",
        subtitle: "सत्यापित NFHS-5 साक्ष्य और समाधान देखने के लिए एक श्रेणी चुनें:",
        activeBadge: "सक्रिय"
      }
    };
    const tHeader = headerTexts[langKey] || headerTexts.en;

    const buttonsHtml = BARRIER_DEFINITIONS.map(b => {
      const isSelected = b.id.toLowerCase() === activeBarrier.toLowerCase();
      const bg = isSelected ? '#eff6ff' : '#ffffff';
      const border = isSelected ? '#2563eb' : '#e2e8f0';
      const textColor = isSelected ? '#1e40af' : '#0f172a';
      const titleText = b.title[langKey] || b.title.en;
      const descText = b.desc[langKey] || b.desc.en;

      return `
        <button class="bl-barrier-select-btn" data-barrier="${b.id}" style="width: 100%; text-align: left; padding: 12px 14px; background: ${bg}; border: 1.5px solid ${border}; border-radius: 8px; margin-bottom: 8px; cursor: pointer; transition: all 0.15s ease; display: flex; align-items: flex-start; gap: 10px;">
          <span style="font-size: 1.25rem;">${b.icon}</span>
          <div style="flex: 1;">
            <div style="font-weight: 700; font-size: 0.925rem; color: ${textColor}; display: flex; justify-content: space-between; align-items: center;">
              <span>${titleText}</span>
              ${isSelected ? `<span style="font-size: 0.75rem; background: #2563eb; color: #fff; padding: 2px 6px; border-radius: 4px;">${tHeader.activeBadge}</span>` : ''}
            </div>
            <div style="font-size: 0.8rem; color: #64748b; margin-top: 2px;">${descText}</div>
          </div>
        </button>
      `;
    }).join('');

    container.innerHTML = `
      <div class="bl-barrier-ui-wrapper" style="padding: 14px; font-family: system-ui, -apple-system, sans-serif;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
          <button id="bl-btn-barrier-ui-back" style="padding: 5px 10px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.8rem; font-weight: 600; color: #334155; cursor: pointer; display: flex; align-items: center; gap: 4px;">
            ${tHeader.back}
          </button>
          <span style="font-size: 0.72rem; font-weight: 700; color: #64748b; text-transform: uppercase;">${tHeader.modeTag}</span>
        </div>
        <div style="margin-bottom: 12px; text-align: center;">
          <h4 style="margin: 0 0 4px 0; font-size: 1.05rem; color: #0f172a;">${tHeader.title}</h4>
          <p style="margin: 0; font-size: 0.825rem; color: #64748b;">${tHeader.subtitle}</p>
        </div>
        <div class="bl-barrier-buttons-list">
          ${buttonsHtml}
        </div>
      </div>
    `;

    const btnBack = container.querySelector('#bl-btn-barrier-ui-back');
    if (btnBack) btnBack.addEventListener('click', onBack);

    container.querySelectorAll('.bl-barrier-select-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const selected = btn.getAttribute('data-barrier');
        onSelectBarrier(selected);
      });
    });

    return container;
  }

  function buildBarrierSelectionGridHtml(activeLang = 'en', currentBarrier = null) {
    const langKey = resolveLangKey(activeLang);

    const cards = BARRIER_DEFINITIONS.map(b => {
      const isSelected = currentBarrier && currentBarrier.toLowerCase() === b.id.toLowerCase();
      const titleText = b.title[langKey] || b.title.en;
      const descText = b.desc[langKey] || b.desc.en;

      return `
        <button class="bl-barrier-grid-card ${isSelected ? 'active' : ''}" data-barrier-id="${b.id}" aria-label="${titleText}">
          <div class="bl-barrier-card-header">
            <span class="bl-barrier-icon">${b.icon}</span>
            <span class="bl-barrier-title">${titleText}</span>
          </div>
          <p class="bl-barrier-desc">${descText}</p>
        </button>
      `;
    }).join('');

    const headerText = langKey === 'kn' ? 'ವಿಶ್ಲೇಷಿಸಲು ಅಡಚಣೆಯನ್ನು ಆರಿಸಿ:' : langKey === 'hi' ? 'विश्लेषण के लिए बाधा चुनें:' : 'Select Barrier to Explore:';

    return `
      <div class="bl-barrier-selection-container" id="bl-barrier-selection-container">
        <div class="bl-barrier-selection-header">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>
          <span>${headerText}</span>
        </div>
        <div class="bl-barrier-grid">
          ${cards}
        </div>
      </div>
    `;
  }

  function buildActiveBarrierBannerHtml(activeBarrier, activeLang = 'en') {
    if (!activeBarrier) return '';
    const langKey = resolveLangKey(activeLang);
    const info = getBarrierInfo(activeBarrier);
    const titleText = info.title[langKey] || info.title.en;

    const changeBarrierText = langKey === 'kn' ? 'ಬದಲಾಯಿಸಿ' : langKey === 'hi' ? 'बदलें' : 'Change';
    const activeLabelText = langKey === 'kn' ? 'ಸಕ್ರಿಯ ಅಡಚಣೆ:' : langKey === 'hi' ? 'सक्रिय बाधा:' : 'Active Barrier:';

    return `
      <div class="bl-active-barrier-bar" id="bl-active-barrier-bar">
        <div class="bl-active-barrier-info">
          <span class="bl-active-badge-dot"></span>
          <span class="bl-active-lbl">${activeLabelText}</span>
          <strong class="bl-active-name">${info.icon} ${titleText}</strong>
        </div>
        <button class="bl-change-barrier-btn" id="bl-change-barrier-btn" title="Change active barrier scope">
          <span>🔄 ${changeBarrierText}</span>
        </button>
      </div>
    `;
  }

  function renderBarrierLensEvidenceCard(data, activeLang = 'en') {
    if (!data) return '';
    const langKey = resolveLangKey(activeLang);
    const badgeText = langKey === 'kn' ? 'ಬ್ಯಾರಿಯರ್ ಲೆನ್ಸ್ ದೃಢೀಕೃತ ಆಧಾರ' : langKey === 'hi' ? 'बैरियर लेंस सत्यापित साक्ष्य' : 'BarrierLens Evidence';
    
    let metricsHtml = '';
    if (data.metrics && data.metrics.length > 0) {
      metricsHtml = `
        <div class="bl-metrics-grid">
          ${data.metrics.map(m => `
            <div class="bl-metric-chip bl-chip-barrierlens">
              <span class="bl-metric-val">${m.value}${m.unit || ''}</span>
              <span class="bl-metric-lbl">${m.label}${m.entity ? ` (${m.entity})` : ''}</span>
            </div>
          `).join('')}
        </div>
      `;
    }

    let sourcesHtml = '';
    if (data.source && data.source.length > 0) {
      sourcesHtml = `
        <div class="bl-evidence-source-tag">
          📄 ${Array.isArray(data.source) ? data.source.map(s => s.split('/').pop()).join(', ') : data.source}
        </div>
      `;
    }

    return `
      <div class="bl-evidence-card bl-evidence-card-barrierlens">
        <div class="bl-evidence-card-header">
          <span class="bl-evidence-badge bl-badge-barrierlens">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
            ${badgeText}
          </span>
          ${sourcesHtml}
        </div>
        ${metricsHtml}
      </div>
    `;
  }

  function renderExternalSolutionCard(solutionObj, activeLang = 'en') {
    if (!solutionObj) return '';
    const langKey = resolveLangKey(activeLang);
    const badgeText = langKey === 'kn' ? 'ಬಾಹ್ಯ ಅಧಿಕೃತ ಆಧಾರ' : langKey === 'hi' ? 'बाह्य आधिकारिक साक्ष्य' : 'External Evidence';
    const recLabel = langKey === 'kn' ? 'ಶಿಫಾರಸು ಮಾಡಿದ ಪರಿಹಾರ' : langKey === 'hi' ? 'अनुशंसित समाधान' : 'Recommended Solution';
    const sourceLabel = langKey === 'kn' ? 'ಮೂಲ / ಸಂಸ್ಥೆ' : langKey === 'hi' ? 'स्रोतः' : 'Source';
    const whyLabel = langKey === 'kn' ? 'ಇದು ಏಕೆ ನೆರವಾಗುತ್ತದೆ' : langKey === 'hi' ? 'यह क्यों सहायक है' : 'Why it may help';

    const solutionName = solutionObj.recommendedSolution || solutionObj.solution || solutionObj.recommendation || solutionObj.title || '';
    const sourceName = solutionObj.source || solutionObj.organization || 'WHO / Official Health Agency';
    const whyReason = solutionObj.whyItMayHelp || solutionObj.why || solutionObj.rationale || solutionObj.reason || '';

    return `
      <div class="bl-evidence-card bl-evidence-card-external">
        <div class="bl-evidence-card-header">
          <span class="bl-evidence-badge bl-badge-external">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
            ${badgeText}
          </span>
          <span class="bl-solution-source-pill">🔗 ${sourceName}</span>
        </div>
        <div class="bl-solution-body">
          <div class="bl-solution-item">
            <strong class="bl-solution-field-lbl">💡 ${recLabel}:</strong>
            <p class="bl-solution-text">${solutionName}</p>
          </div>
          <div class="bl-solution-item">
            <strong class="bl-solution-field-lbl">🏛️ ${sourceLabel}:</strong>
            <span class="bl-solution-source-text">${sourceName}</span>
          </div>
          ${whyReason ? `
            <div class="bl-solution-item bl-why-box">
              <strong class="bl-solution-field-lbl">🎯 ${whyLabel}:</strong>
              <p class="bl-solution-why-text">${whyReason}</p>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  return {
    BARRIER_OPTIONS,
    BARRIER_DEFINITIONS,
    getBarrierInfo,
    render,
    buildBarrierSelectionGridHtml,
    buildActiveBarrierBannerHtml,
    renderBarrierLensEvidenceCard,
    renderExternalSolutionCard
  };
}));
