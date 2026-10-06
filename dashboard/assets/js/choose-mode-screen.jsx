/**
 * BARRIERLENS — MEMBER 4: CHOOSE MODE SCREEN (`choose-mode-screen.jsx`)
 * Displays the initial mode selection entry point inside the chatbot window.
 * Modes:
 *   1. "Explore Barriers"       -> Triggers Barrier Selection UI / menu
 *   2. "Chat with AI Assistant" -> Direct conversational interface (or open research questions)
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
        exploreTitle: "Explore Barriers",
        exploreDesc: "Select a barrier domain and explore verified NFHS-5 evidence, regional statistics, and solutions across 5 categories.",
        exploreBadge: "Verified Evidence Flow",
        exploreBtn: "Browse 5 Barrier Categories →",
        chatTitle: "Chat with AI Assistant",
        chatDesc: "Ask any open question about healthcare access barriers, national disparities, or ML models to converse directly with the assistant.",
        chatBadge: "Conversational AI",
        chatBtn: "Start Conversation ↓"
      },
      kn: {
        welcomeTitle: "ಬ್ಯಾರಿಯರ್ ಲೆನ್ಸ್ ಸಹಾಯಕಕ್ಕೆ ಸ್ವಾಗತ",
        welcomeSubtitle: "ನಿಮ್ಮ ಸಂಶೋಧನೆಯನ್ನು ಹೇಗೆ ಮುಂದುವರಿಸಬೇಕೆಂದು ಆಯ್ಕೆಮಾಡಿ:",
        exploreTitle: "ಅಡಚಣೆಗಳನ್ನು ಅನ್ವೇಷಿಸಿ",
        exploreDesc: "ಒಂದು ಅಡಚಣೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ ಮತ್ತು 5 ವರ್ಗಗಳಲ್ಲಿ ದೃಢೀಕೃತ ಮಾಹಿತಿ, ಅಂಕಿಅಂಶಗಳು ಮತ್ತು ಪರಿಹಾರಗಳನ್ನು ನೋಡಿ.",
        exploreBadge: "ನೇರ ವರ್ಗ ಆಯ್ಕೆ ಶೈಲಿ",
        exploreBtn: "5 ವರ್ಗಗಳನ್ನು ವೀಕ್ಷಿಸಿ →",
        chatTitle: "ಸಹಾಯಕನೊಂದಿಗೆ ಮಾತನಾಡಿ",
        chatDesc: "ಆರೋಗ್ಯ ಅಡಚಣೆಗಳು, ರಾಷ್ಟ್ರೀಯ ಅಂಕಿಅಂಶಗಳು ಅಥವಾ ML ಮಾದರಿಗಳ ಬಗ್ಗೆ ಯಾವುದೇ ಪ್ರಶ್ನೆ ಕೇಳಿ.",
        chatBadge: "AI ಸಂಭಾಷಣೆ",
        chatBtn: "ಸಂಭಾಷಣೆ ಪ್ರಾರಂಭಿಸಿ ↓"
      },
      hi: {
        welcomeTitle: "BarrierLens सहायक में आपका स्वागत है",
        welcomeSubtitle: "चुनें कि आप अपना शोध कैसे आगे बढ़ाना चाहते हैं:",
        exploreTitle: "बाधाओं का अन्वेषण करें",
        exploreDesc: "एक बाधा चुनें और 5 श्रेणियों में सत्यापित जानकारी, आँकड़े, तुलना और समाधान देखें।",
        exploreBadge: "प्रत्यक्ष श्रेणी प्रवाह",
        exploreBtn: "5 श्रेणियों को ब्राउज़ करें →",
        chatTitle: "एआई सहायक से चैट करें",
        chatDesc: "स्वास्थ्य पहुंच बाधाओं, राष्ट्रीय विश्लेषण या ML मॉडल के बारे में कोई भी प्रश्न पूछें।",
        chatBadge: "संवादात्मक एआई",
        chatBtn: "बातचीत शुरू करें ↓"
      }
    };

    let langKey = 'en';
    if (typeof window !== 'undefined' && window.BarrierLensI18n && typeof window.BarrierLensI18n.normalizeLanguageCode === 'function') {
      langKey = window.BarrierLensI18n.normalizeLanguageCode(activeLanguage);
    } else {
      const rawLang = String(activeLanguage || 'en').toLowerCase();
      langKey = (rawLang.startsWith('kn') || rawLang.includes('kannada') || rawLang.includes('ಕನ್ನಡ')) ? 'kn'
        : (rawLang.startsWith('hi') || rawLang.includes('hindi') || rawLang.includes('हिंदी') || rawLang.includes('हिन्दी')) ? 'hi'
        : 'en';
    }

    const text = labels[langKey] || labels.en;

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
          <!-- Option 1: Explore Barriers -->
          <div class="bl-mode-card bl-mode-explore" id="bl-mode-card-explore" tabIndex="0" role="button" aria-label="${text.exploreTitle}" style="background: #f8fafc; border: 2px solid #cbd5e1; border-radius: 12px; padding: 18px; cursor: pointer; transition: all 0.2s ease;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
              <span style="font-size: 0.75rem; font-weight: 700; background: #2563eb; color: #ffffff; padding: 3px 8px; border-radius: 999px; text-transform: uppercase;">
                ${text.exploreBadge}
              </span>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            </div>
            <h4 style="margin: 0 0 6px 0; font-size: 1.1rem; font-weight: 700; color: #0f172a;">
              1. ${text.exploreTitle}
            </h4>
            <p style="margin: 0 0 14px 0; font-size: 0.875rem; color: #475569; line-height: 1.45;">
              ${text.exploreDesc}
            </p>
            <button class="bl-btn-primary" id="bl-btn-mode-explore" style="width: 100%; padding: 10px 14px; background: #2563eb; color: #ffffff; border: none; border-radius: 8px; font-weight: 600; font-size: 0.9rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
              ${text.exploreBtn}
            </button>
          </div>

          <!-- Option 2: Chat with AI Assistant -->
          <div class="bl-mode-card bl-mode-chat" id="bl-mode-card-chat" tabIndex="0" role="button" aria-label="${text.chatTitle}" style="background: #ffffff; border: 2px solid #e2e8f0; border-radius: 12px; padding: 18px; cursor: pointer; transition: all 0.2s ease;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
              <span style="font-size: 0.75rem; font-weight: 700; background: #0f172a; color: #ffffff; padding: 3px 8px; border-radius: 999px; text-transform: uppercase;">
                ${text.chatBadge}
              </span>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0f172a" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            </div>
            <h4 style="margin: 0 0 6px 0; font-size: 1.1rem; font-weight: 700; color: #0f172a;">
              2. ${text.chatTitle}
            </h4>
            <p style="margin: 0 0 14px 0; font-size: 0.875rem; color: #475569; line-height: 1.45;">
              ${text.chatDesc}
            </p>
            <button class="bl-btn-secondary" id="bl-btn-mode-chat" style="width: 100%; padding: 10px 14px; background: #f8fafc; color: #0f172a; border: 1px solid #cbd5e1; border-radius: 8px; font-weight: 600; font-size: 0.9rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;">
              ${text.chatBtn}
            </button>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;

    // Attach Event Listeners
    const btnExplore = container.querySelector('#bl-btn-mode-explore');
    const cardExplore = container.querySelector('#bl-mode-card-explore');
    const btnChat = container.querySelector('#bl-btn-mode-chat');
    const cardChat = container.querySelector('#bl-mode-card-chat');

    const triggerExplore = (e) => {
      e.preventDefault();
      e.stopPropagation();
      onSelectExplore();
    };

    const triggerChat = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const input = document.getElementById('bl-chat-input');
      if (input) input.focus();
      if (typeof options.onStartChat === 'function') options.onStartChat();
    };

    if (btnExplore) btnExplore.addEventListener('click', triggerExplore);
    if (cardExplore) {
      cardExplore.addEventListener('click', (e) => {
        if (e.target !== btnExplore) triggerExplore(e);
      });
      cardExplore.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') triggerExplore(e);
      });
    }

    if (btnChat) btnChat.addEventListener('click', triggerChat);
    if (cardChat) {
      cardChat.addEventListener('click', (e) => {
        if (e.target !== btnChat) triggerChat(e);
      });
      cardChat.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') triggerChat(e);
      });
    }

    return container;
  }

  return {
    render
  };
}));
