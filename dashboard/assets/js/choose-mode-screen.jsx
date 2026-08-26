/**
 * BARRIERLENS — MEMBER 4: CHOOSE MODE SCREEN (`choose-mode-screen.jsx`)
 * Displays the initial mode selection entry point inside the chatbot window.
 * Modes:
 *   1. "Identify My Barrier" -> Triggers Guided Input UI
 *   2. "Explore Barriers"   -> Triggers Barrier Selection UI / menu
 * Dual environment support: Browser (window.BarrierLensChooseModeScreen) & Node.js (module.exports).
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.BarrierLensChooseModeScreen = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function render(containerId, options = {}) {
    const container = typeof containerId === 'string' 
      ? document.getElementById(containerId) 
      : containerId;

    if (!container) return null;

    const onSelectIdentify = options.onSelectIdentify || function() {};
    const onSelectExplore = options.onSelectExplore || function() {};
    const activeLanguage = options.activeLanguage || 'en';

    // Multilingual Strings
    const labels = {
      en: {
        welcomeTitle: "Welcome to BarrierLens Assistant",
        welcomeSubtitle: "Select how you would like to proceed with your research:",
        identifyTitle: "Identify My Barrier",
        identifyDesc: "Answer a few questions and let BarrierLens identify the most likely barrier.",
        identifyBadge: "Guided ML Model Flow",
        identifyBtn: "Start Guided Questions →",
        exploreTitle: "Explore Barriers",
        exploreDesc: "Select a barrier and explore verified information, statistics, comparisons and solutions.",
        exploreBadge: "Direct Category Flow",
        exploreBtn: "Browse 5 Barrier Categories →"
      },
      kn: {
        welcomeTitle: "ಬ್ಯಾರಿಯರ್ ಲೆನ್ಸ್ ಸಹಾಯಕಕ್ಕೆ ಸ್ವಾಗತ",
        welcomeSubtitle: "ನಿಮ್ಮ ಸಂಶೋಧನೆಯನ್ನು ಹೇಗೆ ಮುಂದುವರಿಸಬೇಕೆಂದು ಆಯ್ಕೆಮಾಡಿ:",
        identifyTitle: "ನನ್ನ ತಡೆಯನ್ನು ಗುರುತಿಸಿ",
        identifyDesc: "ಕೆಲವು ಪ್ರಶ್ನೆಗಳಿಗೆ ಉತ್ತರಿಸಿ ಮತ್ತು ಸಾಧಾರಣ ತಡೆಯನ್ನು BarrierLens ಗುರುತಿಸಲು ಬಿಡಿ.",
        identifyBadge: "ಮಾರ್ಗದರ್ಶಿತ ML ಮಾದರಿ ಶೈಲಿ",
        identifyBtn: "ಪ್ರಶ್ನೆಗಳನ್ನು ಪ್ರಾರಂಭಿಸಿ →",
        exploreTitle: "ತಡೆಗಳನ್ನು ಅನ್ವೇಷಿಸಿ",
        exploreDesc: "ಒಂದು ತಡೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ ಮತ್ತು ದೃಢೀಕೃತ ಮಾಹಿತಿ ಮತ್ತು ಪರಿಹಾರಗಳನ್ನು ನೋಡಿ.",
        exploreBadge: "ನೇರ ವರ್ಗ ಆಯ್ಕೆ ಶೈಲಿ",
        exploreBtn: "5 ವರ್ಗಗಳನ್ನು ವೀಕ್ಷಿಸಿ →"
      },
      hi: {
        welcomeTitle: "BarrierLens सहायक में आपका स्वागत है",
        welcomeSubtitle: "चुनें कि आप अपना शोध कैसे आगे बढ़ाना चाहते हैं:",
        identifyTitle: "मेरी बाधा की पहचान करें",
        identifyDesc: "कुछ प्रश्नों के उत्तर दें और BarrierLens को सबसे संभावित बाधा की पहचान करने दें।",
        identifyBadge: "निर्देशित ML मॉडल प्रवाह",
        identifyBtn: "प्रश्नावली शुरू करें →",
        exploreTitle: "बाधाओं का अन्वेषण करें",
        exploreDesc: "एक बाधा चुनें और सत्यापित जानकारी, आँकड़े, तुलना और समाधान देखें।",
        exploreBadge: "प्रत्यक्ष श्रेणी प्रवाह",
        exploreBtn: "5 श्रेणियों को ब्राउज़ करें →"
      }
    };

    const text = labels[activeLanguage] || labels.en;

    const html = `
      <div class="bl-choose-mode-wrapper" id="bl-choose-mode-wrapper" style="padding: 16px; font-family: system-ui, -apple-system, sans-serif;">
        <div class="bl-choose-mode-header" style="text-align: center; margin-bottom: 20px;">
          <h3 style="margin: 0 0 6px 0; font-size: 1.25rem; font-weight: 700; color: #0f172a;">
            ${text.welcomeTitle}
          </h3>
          <p style="margin: 0; font-size: 0.9rem; color: #64748b;">
            ${text.welcomeSubtitle}
          </p>
        </div>

        <div class="bl-mode-cards-grid" style="display: grid; grid-template-columns: 1fr; gap: 14px;">
          <!-- Option 1: Identify My Barrier -->
          <div class="bl-mode-card bl-mode-identify" id="bl-mode-card-identify" tabIndex="0" role="button" aria-label="${text.identifyTitle}" style="background: #eff6ff; border: 2px solid #bfdbfe; border-radius: 12px; padding: 18px; cursor: pointer; transition: all 0.2s ease;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
              <span style="font-size: 0.75rem; font-weight: 700; background: #2563eb; color: #ffffff; padding: 3px 8px; border-radius: 999px; text-transform: uppercase;">
                ${text.identifyBadge}
              </span>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            </div>
            <h4 style="margin: 0 0 6px 0; font-size: 1.1rem; font-weight: 700; color: #1e3a8a;">
              1. ${text.identifyTitle}
            </h4>
            <p style="margin: 0 0 14px 0; font-size: 0.875rem; color: #334155; line-height: 1.45;">
              ${text.identifyDesc}
            </p>
            <button class="bl-btn-primary" id="bl-btn-mode-identify" style="width: 100%; padding: 10px 14px; background: #2563eb; color: #ffffff; border: none; border-radius: 8px; font-weight: 600; font-size: 0.9rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
              ${text.identifyBtn}
            </button>
          </div>

          <!-- Option 2: Explore Barriers -->
          <div class="bl-mode-card bl-mode-explore" id="bl-mode-card-explore" tabIndex="0" role="button" aria-label="${text.exploreTitle}" style="background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 12px; padding: 18px; cursor: pointer; transition: all 0.2s ease;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
              <span style="font-size: 0.75rem; font-weight: 700; background: #475569; color: #ffffff; padding: 3px 8px; border-radius: 999px; text-transform: uppercase;">
                ${text.exploreBadge}
              </span>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#475569" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            </div>
            <h4 style="margin: 0 0 6px 0; font-size: 1.1rem; font-weight: 700; color: #0f172a;">
              2. ${text.exploreTitle}
            </h4>
            <p style="margin: 0 0 14px 0; font-size: 0.875rem; color: #475569; line-height: 1.45;">
              ${text.exploreDesc}
            </p>
            <button class="bl-btn-secondary" id="bl-btn-mode-explore" style="width: 100%; padding: 10px 14px; background: #f1f5f9; color: #0f172a; border: 1px solid #cbd5e1; border-radius: 8px; font-weight: 600; font-size: 0.9rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
              ${text.exploreBtn}
            </button>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;

    // Attach Event Listeners
    const btnIdentify = container.querySelector('#bl-btn-mode-identify');
    const cardIdentify = container.querySelector('#bl-mode-card-identify');
    const btnExplore = container.querySelector('#bl-btn-mode-explore');
    const cardExplore = container.querySelector('#bl-mode-card-explore');

    const triggerIdentify = (e) => {
      e.preventDefault();
      e.stopPropagation();
      onSelectIdentify();
    };

    const triggerExplore = (e) => {
      e.preventDefault();
      e.stopPropagation();
      onSelectExplore();
    };

    if (btnIdentify) btnIdentify.addEventListener('click', triggerIdentify);
    if (cardIdentify) {
      cardIdentify.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') triggerIdentify(e);
      });
    }

    if (btnExplore) btnExplore.addEventListener('click', triggerExplore);
    if (cardExplore) {
      cardExplore.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') triggerExplore(e);
      });
    }

    return container;
  }

  return {
    render
  };
}));
