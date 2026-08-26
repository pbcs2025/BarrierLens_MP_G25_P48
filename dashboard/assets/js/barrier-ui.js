/**
 * BARRIERLENS — MEMBER 4: BARRIER SELECTION & MULTILINGUAL UI COMPONENT
 * Guided barrier selection menu, active barrier context toolbar, 
 * language switching controls, and visual card renderers.
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

  // 5 Canonical Barriers Metadata
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

  /**
   * Get barrier metadata by canonical name
   */
  function getBarrierInfo(barrierName) {
    if (!barrierName) return BARRIER_DEFINITIONS[0];
    const found = BARRIER_DEFINITIONS.find(b => b.id.toLowerCase() === barrierName.toLowerCase());
    return found || BARRIER_DEFINITIONS[0];
  }

  /**
   * Render Guided Barrier Selection Grid HTML
   */
  function buildBarrierSelectionGridHtml(activeLang = 'en', currentBarrier = null) {
    const cards = BARRIER_DEFINITIONS.map(b => {
      const isSelected = currentBarrier && currentBarrier.toLowerCase() === b.id.toLowerCase();
      const titleText = b.title[activeLang] || b.title.en;
      const descText = b.desc[activeLang] || b.desc.en;

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

    return `
      <div class="bl-barrier-selection-container" id="bl-barrier-selection-container">
        <div class="bl-barrier-selection-header">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>
          <span>${activeLang === 'kn' ? 'ವಿಶ್ಲೇಷಿಸಲು ಅಡಚಣೆಯನ್ನು ಆರಿಸಿ:' : activeLang === 'hi' ? 'विश्लेषण के लिए बाधा चुनें:' : 'Select Barrier to Explore:'}</span>
        </div>
        <div class="bl-barrier-grid">
          ${cards}
        </div>
      </div>
    `;
  }

  /**
   * Build Active Barrier Banner Header HTML
   */
  function buildActiveBarrierBannerHtml(activeBarrier, activeLang = 'en') {
    if (!activeBarrier) return '';
    const info = getBarrierInfo(activeBarrier);
    const titleText = info.title[activeLang] || info.title.en;

    const changeBarrierText = activeLang === 'kn' ? 'ಬದಲಾಯಿಸಿ' : activeLang === 'hi' ? 'बदलें' : 'Change';
    const activeLabelText = activeLang === 'kn' ? 'ಸಕ್ರಿಯ ಅಡಚಣೆ:' : activeLang === 'hi' ? 'सक्रिय बाधा:' : 'Active Barrier:';

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

  /**
   * Render BarrierLens Evidence Card (Verified Data)
   */
  function renderBarrierLensEvidenceCard(data, activeLang = 'en') {
    if (!data) return '';
    const badgeText = activeLang === 'kn' ? 'ಬ್ಯಾರಿಯರ್ ಲೆನ್ಸ್ ದೃಢೀಕೃತ ಆಧಾರ' : activeLang === 'hi' ? 'बैरियर लेंस सत्यापित साक्ष्य' : 'BarrierLens Evidence';
    
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

  /**
   * Render External Evidence & Solution Card (WHO / Government Sourced)
   */
  function renderExternalSolutionCard(solutionObj, activeLang = 'en') {
    if (!solutionObj) return '';
    const badgeText = activeLang === 'kn' ? 'ಬಾಹ್ಯ ಅಧಿಕೃತ ಆಧಾರ' : activeLang === 'hi' ? 'बाह्य आधिकारिक साक्ष्य' : 'External Evidence';
    const recLabel = activeLang === 'kn' ? 'ಶಿಫಾರಸು ಮಾಡಿದ ಪರಿಹಾರ' : activeLang === 'hi' ? 'अनुशंसित समाधान' : 'Recommended Solution';
    const sourceLabel = activeLang === 'kn' ? 'ಮೂಲ / ಸಂಸ್ಥೆ' : activeLang === 'hi' ? 'स्रोतः' : 'Source';
    const whyLabel = activeLang === 'kn' ? 'ಇದು ಏಕೆ ನೆರವಾಗುತ್ತದೆ' : activeLang === 'hi' ? 'यह क्यों सहायक है' : 'Why it may help';

    const solutionName = solutionObj.solution || solutionObj.recommendation || solutionObj.title || '';
    const sourceName = solutionObj.source || solutionObj.organization || 'WHO / Official Health Agency';
    const whyReason = solutionObj.why || solutionObj.rationale || solutionObj.reason || '';

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
    BARRIER_DEFINITIONS,
    getBarrierInfo,
    buildBarrierSelectionGridHtml,
    buildActiveBarrierBannerHtml,
    renderBarrierLensEvidenceCard,
    renderExternalSolutionCard
  };
}));
