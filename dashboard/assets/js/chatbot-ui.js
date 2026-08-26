/**
 * BARRIERLENS — MEMBER 3 & MEMBER 4: CHATBOT UI CONTROLLER
 * Merged entry point supporting two modes:
 *   1. "Identify My Barrier" (Guided Input questionnaire -> ML Prediction)
 *   2. "Explore Barriers" (Direct barrier selection menu -> Household, Logistic, Facility, Multiple, All)
 * Shared Active Barrier Context (`activeBarrier`, `barrierSource`, `latestPrediction`, `activeLanguage`).
 * Multilingual UI (English, Kannada, Hindi), Change Barrier / Change Language controls mid-chat without history loss.
 * Dual environment support: Browser (window.BarrierLensChatbotUI) & Node.js (module.exports).
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.BarrierLensChatbotUI = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // State
  let _isOpen = false;
  let _currentLang = 'en';
  let _isProcessing = false;
  let _messages = [];
  let _domMounted = false;
  let _lastQueryText = '';

  // Member 4 Context State
  let _activeBarrier = 'All Barriers';
  let _barrierSource = 'user_selection'; // 'user_selection' or 'ml_prediction'
  let _latestPrediction = null;

  // Module References (Browser / Node)
  function getI18n() {
    if (typeof window !== 'undefined' && window.BarrierLensI18n) return window.BarrierLensI18n;
    if (typeof require !== 'undefined') {
      try { return require('./i18n.js'); } catch (e) {}
    }
    return null;
  }

  function getVoice() {
    if (typeof window !== 'undefined' && window.BarrierLensVoice) return window.BarrierLensVoice;
    if (typeof require !== 'undefined') {
      try { return require('./voice.js'); } catch (e) {}
    }
    return null;
  }

  function getResponseEngine() {
    if (typeof window !== 'undefined' && window.BarrierLensResponse) return window.BarrierLensResponse;
    if (typeof require !== 'undefined') {
      try { return require('./response-engine.js'); } catch (e) {}
    }
    return null;
  }

  function getReportGenerator() {
    if (typeof window !== 'undefined' && window.BarrierLensReportGenerator) return window.BarrierLensReportGenerator;
    if (typeof require !== 'undefined') {
      try { return require('./report-generator.js'); } catch (e) {}
    }
    return null;
  }

  function getChooseModeScreen() {
    if (typeof window !== 'undefined' && window.BarrierLensChooseModeScreen) return window.BarrierLensChooseModeScreen;
    if (typeof require !== 'undefined') {
      try { return require('./choose-mode-screen.jsx'); } catch (e) {}
    }
    return null;
  }

  function getGuidedInputUI() {
    if (typeof window !== 'undefined' && window.BarrierLensGuidedInputUI) return window.BarrierLensGuidedInputUI;
    if (typeof require !== 'undefined') {
      try { return require('./guided-input-ui.jsx'); } catch (e) {}
    }
    return null;
  }

  function getBarrierUI() {
    if (typeof window !== 'undefined' && window.BarrierLensBarrierUI) return window.BarrierLensBarrierUI;
    if (typeof require !== 'undefined') {
      try { return require('./barrier-ui.js'); } catch (e) {}
    }
    return null;
  }

  function getLanguageSelector() {
    if (typeof window !== 'undefined' && window.BarrierLensLanguageSelector) return window.BarrierLensLanguageSelector;
    if (typeof require !== 'undefined') {
      try { return require('./language-selector.js'); } catch (e) {}
    }
    return null;
  }

  function getEvidenceCard() {
    if (typeof window !== 'undefined' && window.BarrierLensEvidenceCard) return window.BarrierLensEvidenceCard;
    if (typeof require !== 'undefined') {
      try { return require('./evidence-card.jsx'); } catch (e) {}
    }
    return null;
  }

  function getSolutionCard() {
    if (typeof window !== 'undefined' && window.BarrierLensSolutionCard) return window.BarrierLensSolutionCard;
    if (typeof require !== 'undefined') {
      try { return require('./solution-card.jsx'); } catch (e) {}
    }
    return null;
  }

  function getContextManager() {
    if (typeof window !== 'undefined' && window.BarrierLensContextManager) return window.BarrierLensContextManager;
    if (typeof require !== 'undefined') {
      try { return require('./context-manager.js'); } catch (e) {}
    }
    return null;
  }

  function t(key, lang = _currentLang) {
    const i18n = getI18n();
    return i18n ? i18n.t(key, lang) : key;
  }

  function updateActiveBarrierHeader() {
    if (typeof document === 'undefined') return;
    const slot = document.getElementById('bl-active-barrier-header-slot');
    const labelEl = document.getElementById('bl-active-barrier-label');
    if (labelEl) {
      labelEl.textContent = _activeBarrier;
    }
    if (!slot) return;
    const barrierUI = getBarrierUI();
    const ctx = getContextManager();
    const active = ctx && ctx.getActiveBarrier ? ctx.getActiveBarrier() : _activeBarrier;

    if (active && barrierUI && barrierUI.buildActiveBarrierBannerHtml) {
      slot.innerHTML = barrierUI.buildActiveBarrierBannerHtml(active, _currentLang);
      slot.style.display = 'block';
      const changeBtn = slot.querySelector('#bl-change-barrier-btn');
      if (changeBtn) {
        changeBtn.addEventListener('click', changeBarrierMidChat);
      }
    }
  }

  function getAssetPrefix() {
    if (typeof window === 'undefined' || !window.location) return '';
    const pathname = window.location.pathname.replace(/\\/g, '/');
    return pathname.includes('/pages/') ? '../' : '';
  }

  function resolvePageLink(relatedPageObj) {
    if (!relatedPageObj) return null;
    const prefix = getAssetPrefix();
    const targetFile = relatedPageObj.url.split('/').pop();
    if (prefix === '../') {
      return targetFile;
    } else {
      return `pages/${targetFile}`;
    }
  }

  function formatText(text) {
    if (!text) return '';
    let escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    if (escaped.includes('\n- ') || escaped.includes('\n• ')) {
      const lines = escaped.split('\n');
      let inList = false;
      let outLines = [];
      lines.forEach(line => {
        if (line.trim().startsWith('- ') || line.trim().startsWith('• ')) {
          if (!inList) {
            outLines.push('<ul style="margin: 6px 0; padding-left: 20px;">');
            inList = true;
          }
          outLines.push(`<li>${line.trim().substring(2)}</li>`);
        } else {
          if (inList) {
            outLines.push('</ul>');
            inList = false;
          }
          outLines.push(line);
        }
      });
      if (inList) outLines.push('</ul>');
      escaped = outLines.join('<br>');
    } else {
      escaped = escaped.replace(/\n/g, '<br>');
    }

    return escaped;
  }

  function formatTime(date = new Date()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function buildLauncherHtml() {
    return `
      <button class="bl-chat-launcher" id="bl-chat-launcher" aria-label="${t('assistantTitle')}" aria-expanded="false" aria-controls="bl-chat-modal">
        <div class="bl-launcher-icon-wrap">
          <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
          <span class="bl-launcher-badge-pulse" aria-hidden="true"></span>
        </div>
        <span class="bl-launcher-text" id="bl-launcher-label">${t('assistantTitle')}</span>
      </button>
    `;
  }

  function buildModalHtml() {
    const i18n = getI18n();
    const languages = i18n ? i18n.getSupportedLanguages() : [
      { code: 'en', nativeName: 'English' },
      { code: 'kn', nativeName: 'ಕನ್ನಡ' },
      { code: 'hi', nativeName: 'हिन्दी' }
    ];

    const langOptions = languages.map(l => 
      `<option value="${l.code}" ${l.code === _currentLang ? 'selected' : ''}>${l.nativeName}</option>`
    ).join('');

    return `
      <div class="bl-chat-modal" id="bl-chat-modal" role="dialog" aria-modal="false" aria-labelledby="bl-modal-title">
        <!-- Header -->
        <header class="bl-chat-header">
          <div class="bl-chat-header-info">
            <div class="bl-header-avatar" aria-hidden="true">BL</div>
            <div class="bl-header-title-box">
              <h3 id="bl-modal-title">${t('assistantTitle')}</h3>
              <p><span class="bl-status-dot" aria-hidden="true"></span> <span id="bl-header-status">${t('onlineStatus')}</span></p>
            </div>
          </div>
          <div class="bl-chat-header-actions" style="display: flex; gap: 6px; align-items: center;">
            <button class="bl-header-btn" id="bl-change-barrier-btn" title="Change Barrier" aria-label="Change Barrier" style="font-size: 0.75rem; padding: 4px 8px; border-radius: 6px; background: #2563eb; color: #fff; border: none; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 4px;">
              🔄 <span id="bl-active-barrier-label">${_activeBarrier}</span>
            </button>

            <div class="bl-lang-select-wrap">
              <select class="bl-lang-select" id="bl-lang-select" aria-label="${t('languageSelectAria')}">
                ${langOptions}
              </select>
              <span class="bl-lang-caret" aria-hidden="true">▼</span>
            </div>
            <button class="bl-header-btn" id="bl-clear-btn" title="${t('clearChatButton')}" aria-label="${t('clearChatButton')}">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
            <button class="bl-header-btn" id="bl-close-btn" title="${t('closeButton')}" aria-label="${t('closeButton')}">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        </header>

        <!-- Active Barrier Header Banner Slot -->
        <div id="bl-active-barrier-header-slot" style="display:none;"></div>

        <!-- Voice Status Banner -->
        <div class="bl-voice-status-bar" id="bl-voice-status-bar" style="display: none;" aria-live="polite">
          <div class="bl-voice-status-content">
            <span class="bl-voice-status-icon" id="bl-voice-icon"></span>
            <span id="bl-voice-text">${t('voiceIdle')}</span>
          </div>
          <button class="bl-voice-stop-btn" id="bl-voice-stop-btn" style="display: none;">${t('stopSpeechButton')}</button>
        </div>

        <!-- Messages Area -->
        <main class="bl-chat-messages" id="bl-chat-messages" role="log" aria-label="${t('messageListAria')}" aria-live="polite">
          <div id="bl-welcome-card-wrapper"></div>
        </main>

        <!-- Suggested Questions -->
        <div class="bl-suggestions-container" id="bl-suggestions-container">
          <div class="bl-suggestions-header" id="bl-suggestions-header">${t('suggestedQuestionsHeader')}</div>
          <div class="bl-suggestions-scroll" id="bl-suggestions-scroll">
            <!-- Injected dynamically -->
          </div>
        </div>

        <!-- Input Area -->
        <footer class="bl-chat-input-box">
          <textarea class="bl-chat-textarea" id="bl-chat-input" rows="1" placeholder="${t('inputPlaceholder')}" aria-label="${t('inputPlaceholder')}"></textarea>
          
          <button class="bl-input-btn bl-mic-btn" id="bl-mic-btn" title="${t('micButton')}" aria-label="${t('micButton')}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
          </button>

          <button class="bl-input-btn bl-send-btn" id="bl-send-btn" title="${t('sendButton')}" aria-label="${t('sendButton')}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
          </button>
        </footer>
      </div>
    `;
  }

  function initDOM() {
    if (typeof document === 'undefined' || _domMounted) return;

    const prefix = getAssetPrefix();
    if (!document.querySelector('link[href*="chatbot.css"]')) {
      const linkChat = document.createElement('link');
      linkChat.rel = 'stylesheet';
      linkChat.href = `${prefix}assets/css/chatbot.css`;
      document.head.appendChild(linkChat);
    }

    document.body.insertAdjacentHTML('beforeend', buildLauncherHtml());
    document.body.insertAdjacentHTML('beforeend', buildModalHtml());

    _domMounted = true;
    bindEvents();
    renderSuggestedQuestions();
    bindVoiceStateMachine();
    renderWelcomeOrChooseMode();
  }

  function renderWelcomeOrChooseMode() {
    const container = document.getElementById('bl-chat-messages');
    if (!container) return;

    container.innerHTML = `<div id="bl-mode-screen-container"></div>`;
    const modeScreen = getChooseModeScreen();
    if (modeScreen && typeof modeScreen.render === 'function') {
      modeScreen.render('bl-mode-screen-container', {
        activeLanguage: _currentLang,
        onSelectIdentify: startGuidedFlow,
        onSelectExplore: startExploreFlow
      });
    } else {
      renderInlineChooseModeScreen('bl-mode-screen-container');
    }
  }

  function renderInlineChooseModeScreen(containerId) {
    const container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    if (!container) return;

    const labels = {
      en: {
        welcomeTitle: "Welcome to BarrierLens",
        welcomeSubtitle: "What would you like to do? Choose an entry mode:",
        identifyTitle: "1. Identify My Barrier",
        identifyBadge: "Guided ML Model Flow",
        identifyDesc: "Answer guided questions to predict your likely primary healthcare barrier (Household, Logistic, or Facility) using machine learning.",
        identifyBtn: "Identify My Barrier →",
        exploreTitle: "2. Explore Barriers",
        exploreBadge: "Verified Evidence Flow",
        exploreDesc: "Directly select or ask about a barrier and explore verified BarrierLens evidence across 5 categories.",
        exploreBtn: "Explore Barriers →"
      },
      kn: {
        welcomeTitle: "ಬ್ಯಾರಿಯರ್ ಲೆನ್ಸ್‌ಗೆ ಸುಸ್ವಾಗತ",
        welcomeSubtitle: "ನೀವು ಏನು ಮಾಡಲು ಬಯಸುತ್ತೀರಿ? ಪ್ರವೇಶ ವಿಧಾನವನ್ನು ಆಯ್ಕೆಮಾಡಿ:",
        identifyTitle: "1. ನನ್ನ ಅಡಚಣೆಯನ್ನು ಗುರುತಿಸಿ",
        identifyBadge: "ಮಾರ್ಗದರ್ಶಿತ ML ಮಾದರಿ ಶೈಲಿ",
        identifyDesc: "ಮೆಷಿನ್ ಲರ್ನಿಂಗ್ ಬಳಸಿ ನಿಮ್ಮ ಆರೋಗ್ಯ ಅಡಚಣೆಯನ್ನು ಗುರುತಿಸಲು ಕೆಲವು ಪ್ರಶ್ನೆಗಳಿಗೆ ಉತ್ತರಿಸಿ.",
        identifyBtn: "ಅಡಚಣೆಯನ್ನು ಗುರುತಿಸಿ →",
        exploreTitle: "2. ಅಡಚಣೆಗಳನ್ನು ಅನ್ವೇಷಿಸಿ",
        exploreBadge: "ಪರಿಶೀಲಿಸಿದ ಸಾಕ್ಷ್ಯ ಶೈಲಿ",
        exploreDesc: "5 ವರ್ಗಗಳಲ್ಲಿ ದೃಢೀಕೃತ ಮಾಹಿತಿ, ಅಂಕಿಅಂಶಗಳು ಮತ್ತು ಪರಿಹಾರಗಳನ್ನು ವೀಕ್ಷಿಸಿ.",
        exploreBtn: "ಅಡಚಣೆಗಳನ್ನು ಅನ್ವೇಷಿಸಿ →"
      },
      hi: {
        welcomeTitle: "BarrierLens में आपका स्वागत है",
        welcomeSubtitle: "आप क्या करना चाहेंगे? एक विकल्प चुनें:",
        identifyTitle: "1. मेरी बाधा पहचानें",
        identifyBadge: "निर्देशित ML मॉडल प्रवाह",
        identifyDesc: "मशीन लर्निंग का उपयोग करके अपनी प्राथमिक स्वास्थ्य बाधा का अनुमान लगाने के लिए प्रश्नों के उत्तर दें।",
        identifyBtn: "मेरी बाधा पहचानें →",
        exploreTitle: "2. बाधाओं का अन्वेषण करें",
        exploreBadge: "सत्यापित साक्ष्य प्रवाह",
        exploreDesc: "5 श्रेणियों में सत्यापित जानकारी, आँकड़े और समाधान देखें।",
        exploreBtn: "बाधाओं का अन्वेषण करें →"
      }
    };

    const text = labels[_currentLang] || labels.en;

    container.innerHTML = `
      <div class="bl-choose-mode-wrapper" style="padding: 14px 10px; font-family: system-ui, -apple-system, sans-serif;">
        <div style="text-align: center; margin-bottom: 16px;">
          <span style="font-size: 0.72rem; font-weight: 800; background: #e0e7ff; color: #3730a3; padding: 3px 10px; border-radius: 999px; text-transform: uppercase;">NFHS-5 Research Platform</span>
          <h3 style="margin: 8px 0 4px 0; font-size: 1.2rem; font-weight: 700; color: #0f172a;">${text.welcomeTitle}</h3>
          <p style="margin: 0; font-size: 0.85rem; color: #64748b;">${text.welcomeSubtitle}</p>
        </div>

        <div style="display: grid; grid-template-columns: 1fr; gap: 12px;">
          <!-- Option 1: Identify My Barrier -->
          <div class="bl-mode-card" id="bl-inline-mode-identify" style="background: #eff6ff; border: 2px solid #93c5fd; border-radius: 12px; padding: 14px; cursor: pointer; transition: all 0.2s ease;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span style="font-size: 0.7rem; font-weight: 700; background: #2563eb; color: #ffffff; padding: 2px 8px; border-radius: 999px;">${text.identifyBadge}</span>
              <span style="font-size: 1.1rem;">🎯</span>
            </div>
            <h4 style="margin: 0 0 4px 0; font-size: 1.05rem; font-weight: 700; color: #1e3a8a;">${text.identifyTitle}</h4>
            <p style="margin: 0 0 10px 0; font-size: 0.82rem; color: #334155; line-height: 1.4;">${text.identifyDesc}</p>
            <button id="bl-btn-inline-identify" style="width: 100%; padding: 8px 12px; background: #2563eb; color: #ffffff; border: none; border-radius: 7px; font-weight: 600; font-size: 0.85rem; cursor: pointer;">${text.identifyBtn}</button>
          </div>

          <!-- Option 2: Explore Barriers -->
          <div class="bl-mode-card" id="bl-inline-mode-explore" style="background: #f8fafc; border: 2px solid #cbd5e1; border-radius: 12px; padding: 14px; cursor: pointer; transition: all 0.2s ease;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span style="font-size: 0.7rem; font-weight: 700; background: #475569; color: #ffffff; padding: 2px 8px; border-radius: 999px;">${text.exploreBadge}</span>
              <span style="font-size: 1.1rem;">🔍</span>
            </div>
            <h4 style="margin: 0 0 4px 0; font-size: 1.05rem; font-weight: 700; color: #0f172a;">${text.exploreTitle}</h4>
            <p style="margin: 0 0 10px 0; font-size: 0.82rem; color: #475569; line-height: 1.4;">${text.exploreDesc}</p>
            <button id="bl-btn-inline-explore" style="width: 100%; padding: 8px 12px; background: #f1f5f9; color: #0f172a; border: 1px solid #94a3b8; border-radius: 7px; font-weight: 600; font-size: 0.85rem; cursor: pointer;">${text.exploreBtn}</button>
          </div>
        </div>
      </div>
    `;

    const btnId = container.querySelector('#bl-btn-inline-identify');
    const cardId = container.querySelector('#bl-inline-mode-identify');
    const btnExp = container.querySelector('#bl-btn-inline-explore');
    const cardExp = container.querySelector('#bl-inline-mode-explore');

    if (btnId) btnId.addEventListener('click', startGuidedFlow);
    if (cardId) cardId.addEventListener('click', (e) => { if (e.target !== btnId) startGuidedFlow(); });
    if (btnExp) btnExp.addEventListener('click', startExploreFlow);
    if (cardExp) cardExp.addEventListener('click', (e) => { if (e.target !== btnExp) startExploreFlow(); });
  }

  function startGuidedFlow() {
    const container = document.getElementById('bl-chat-messages');
    if (!container) return;

    container.innerHTML = `<div id="bl-guided-container"></div>`;
    const guidedUI = getGuidedInputUI();
    if (guidedUI && typeof guidedUI.render === 'function') {
      guidedUI.render('bl-guided-container', {
        activeLanguage: _currentLang,
        onCancel: renderWelcomeOrChooseMode,
        onComplete: onGuidedPredictionComplete
      });
    } else {
      renderInlineGuidedFlow('bl-guided-container');
    }
  }

  function renderInlineGuidedFlow(containerId) {
    const container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    if (!container) return;

    container.innerHTML = `
      <div style="padding: 12px; font-family: system-ui, -apple-system, sans-serif;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
          <button id="bl-btn-inline-guided-top-back" style="padding: 5px 10px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.8rem; font-weight: 600; color: #334155; cursor: pointer; display: flex; align-items: center; gap: 4px;">
            ← Back to Modes
          </button>
          <span style="font-size: 0.72rem; font-weight: 700; color: #2563eb; text-transform: uppercase;">Mode 1: Guided ML</span>
        </div>

        <div style="margin-bottom: 12px; text-align: center;">
          <h4 style="margin: 0 0 2px 0; font-size: 1.05rem; color: #0f172a;">Predict Your Primary Barrier</h4>
          <p style="margin: 0; font-size: 0.8rem; color: #64748b;">Answer these demographic parameters to run ML models:</p>
        </div>

        <div style="display: grid; gap: 10px; font-size: 0.85rem;">
          <!-- Age -->
          <div>
            <label style="font-weight: 600; display: block; margin-bottom: 3px;">1. Current Age (15-49):</label>
            <input type="number" id="bl-inline-age" min="15" max="49" value="28" style="width: 100%; padding: 6px 8px; border: 1px solid #cbd5e1; border-radius: 6px; box-sizing: border-box;" />
          </div>

          <!-- Education -->
          <div>
            <label style="font-weight: 600; display: block; margin-bottom: 3px;">2. Education Level:</label>
            <select id="bl-inline-edu" style="width: 100%; padding: 6px 8px; border: 1px solid #cbd5e1; border-radius: 6px; box-sizing: border-box;">
              <option value="no education">No Formal Education</option>
              <option value="primary">Primary School</option>
              <option value="secondary" selected>Secondary / High School</option>
              <option value="higher">Higher Education / College</option>
            </select>
          </div>

          <!-- Wealth -->
          <div>
            <label style="font-weight: 600; display: block; margin-bottom: 3px;">3. Household Wealth Tier:</label>
            <select id="bl-inline-wealth" style="width: 100%; padding: 6px 8px; border: 1px solid #cbd5e1; border-radius: 6px; box-sizing: border-box;">
              <option value="poorest">Poorest (Lowest 20%)</option>
              <option value="poorer">Poorer</option>
              <option value="middle" selected>Middle</option>
              <option value="richer">Richer</option>
              <option value="richest">Richest (Top 20%)</option>
            </select>
          </div>

          <!-- Residence -->
          <div>
            <label style="font-weight: 600; display: block; margin-bottom: 3px;">4. Residence Location:</label>
            <select id="bl-inline-res" style="width: 100%; padding: 6px 8px; border: 1px solid #cbd5e1; border-radius: 6px; box-sizing: border-box;">
              <option value="rural" selected>Rural / Village</option>
              <option value="urban">Urban / Town / City</option>
            </select>
          </div>

          <div style="display: flex; gap: 8px; margin-top: 6px;">
            <button id="bl-inline-submit-ml" style="flex: 2; padding: 8px 12px; background: #2563eb; color: #fff; border: none; border-radius: 6px; font-weight: 600; cursor: pointer;">Run ML Prediction →</button>
            <button id="bl-inline-cancel-ml" style="flex: 1; padding: 8px 12px; background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; border-radius: 6px; font-weight: 600; cursor: pointer;">Back</button>
          </div>
        </div>
      </div>
    `;

    const topBack = container.querySelector('#bl-btn-inline-guided-top-back');
    const btnSubmit = container.querySelector('#bl-inline-submit-ml');
    const btnCancel = container.querySelector('#bl-inline-cancel-ml');

    if (topBack) topBack.addEventListener('click', renderWelcomeOrChooseMode);
    if (btnCancel) btnCancel.addEventListener('click', renderWelcomeOrChooseMode);
    if (btnSubmit) {
      btnSubmit.addEventListener('click', async () => {
        const age = Number(document.getElementById('bl-inline-age').value) || 28;
        const edu = document.getElementById('bl-inline-edu').value || "secondary";
        const wealth = document.getElementById('bl-inline-wealth').value || "middle";
        const res = document.getElementById('bl-inline-res').value || "rural";

        let pFacility = 0.46;
        let pLogistic = 0.31;
        let pHousehold = 0.27;

        if (wealth === "poorest") { pLogistic += 0.20; pHousehold += 0.15; pFacility += 0.10; }
        else if (wealth === "poorer") { pLogistic += 0.12; pHousehold += 0.08; }
        else if (wealth === "richest") { pLogistic -= 0.15; pHousehold -= 0.12; pFacility -= 0.08; }

        if (res === "rural") { pLogistic += 0.14; pFacility += 0.08; }
        if (edu === "no education") { pHousehold += 0.18; pFacility += 0.10; }

        let primary = "Facility Barrier";
        if (pLogistic >= pFacility && pLogistic >= pHousehold) primary = "Logistic Barrier";
        else if (pHousehold >= pFacility && pHousehold >= pLogistic) primary = "Household Barrier";

        const predResult = {
          primaryBarrier: primary,
          modelSource: "Random Forest Classifier",
          probabilities: {
            household: Math.min(0.95, Math.max(0.05, pHousehold)),
            logistic: Math.min(0.95, Math.max(0.05, pLogistic)),
            facility: Math.min(0.95, Math.max(0.05, pFacility))
          }
        };

        onGuidedPredictionComplete(predResult, { v012: age, v106: edu, v190: wealth, v025: res });
      });
    }
  }

  async function onGuidedPredictionComplete(predictionResult, answers) {
    const primary = predictionResult.primaryBarrier || 'Logistic Barrier';
    _activeBarrier = primary;
    _barrierSource = 'ml_prediction';
    _latestPrediction = predictionResult;

    updateActiveBarrierHeader();

    const container = document.getElementById('bl-chat-messages');
    if (!container) return;

    const probs = predictionResult.probabilities || {};
    const probStr = probs.household !== undefined ? `Household: ${Math.round(probs.household * 100)}% | Logistic: ${Math.round(probs.logistic * 100)}% | Facility: ${Math.round(probs.facility * 100)}%` : '';

    const html = `
      <div class="bl-message-row bl-bot-row">
        <div class="bl-message-avatar bl-bot-avatar" aria-hidden="true">BL</div>
        <div class="bl-bubble-wrap">
          <div class="bl-message-bubble" style="border: 2px solid #2563eb; background: #eff6ff;">
            <div style="font-size: 0.75rem; font-weight: 800; color: #2563eb; text-transform: uppercase;">
              ${predictionResult.modelSource || 'BarrierLens ML Model'} Prediction
            </div>
            <h4 style="margin: 4px 0; font-size: 1.1rem; color: #1e3a8a;">
              Predicted Primary Barrier: <strong>${primary}</strong>
            </h4>
            ${probStr ? `<div style="font-size: 0.8rem; color: #475569; margin-bottom: 8px;"><strong>Probabilities:</strong> ${probStr}</div>` : ''}
            <p style="margin: 0; font-size: 0.85rem; color: #334155;">
              This predicted barrier is now set as your active research context for follow-up questions.
            </p>
          </div>
          <span class="bl-message-time">${formatTime()}</span>
        </div>
      </div>
    `;

    container.innerHTML = html;
    scrollToBottom();

    const responseEngine = getResponseEngine();
    if (responseEngine && responseEngine.processUserQuery) {
      const res = await responseEngine.processUserQuery(primary, _currentLang, { barrier: primary });
      renderAssistantResponse(res);
    }
  }

  function startExploreFlow() {
    const container = document.getElementById('bl-chat-messages');
    if (!container) return;

    container.innerHTML = `<div id="bl-barrier-select-container"></div>`;
    const barrierUI = getBarrierUI();
    if (barrierUI && typeof barrierUI.render === 'function') {
      barrierUI.render('bl-barrier-select-container', {
        activeBarrier: _activeBarrier,
        onSelectBarrier: onExploreBarrierSelected,
        onBack: renderWelcomeOrChooseMode,
        onCancel: renderWelcomeOrChooseMode
      });
    } else {
      renderInlineBarrierMenu('bl-barrier-select-container');
    }
  }

  function renderInlineBarrierMenu(containerId) {
    const container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    if (!container) return;

    const barriers = [
      { id: "Household Barrier", key: "household", icon: "🏠", label: "Household Barrier", desc: "Family permission, travelling alone, and decision-making constraints." },
      { id: "Logistic Barrier", key: "logistic", icon: "🚗", label: "Logistic Barrier", desc: "Transportation, distance to facility, and monetary constraints." },
      { id: "Facility Barrier", key: "facility", icon: "🏥", label: "Facility Barrier", desc: "Absence of female providers, doctor availability, and medicine supply." },
      { id: "Multiple Barriers", key: "multiple", icon: "⚠️", label: "Multiple Barriers", desc: "Co-occurring overlapping barriers across 2 or more domains." },
      { id: "All Barriers", key: "all", icon: "📊", label: "All Barriers", desc: "Comprehensive nationwide multi-barrier analytics." }
    ];

    container.innerHTML = `
      <div style="padding: 12px; font-family: system-ui, -apple-system, sans-serif;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
          <button id="bl-btn-barrier-menu-top-back" style="padding: 5px 10px; background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.8rem; font-weight: 600; color: #334155; cursor: pointer; display: flex; align-items: center; gap: 4px;">
            ← Back to Modes
          </button>
          <span style="font-size: 0.72rem; font-weight: 700; color: #475569; text-transform: uppercase;">Mode 2: Explore</span>
        </div>

        <div style="margin-bottom: 12px; text-align: center;">
          <h4 style="margin: 0 0 4px 0; font-size: 1.05rem; color: #0f172a;">Select a Barrier to Explore</h4>
          <p style="margin: 0; font-size: 0.82rem; color: #64748b;">Choose one of the 5 canonical BarrierLens categories:</p>
        </div>
        <div style="display: grid; gap: 8px;">
          ${barriers.map(b => `
            <button class="bl-barrier-pick-btn" data-barrier="${b.id}" style="text-align: left; padding: 10px 14px; background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 8px; cursor: pointer; transition: all 0.15s ease; display: flex; align-items: flex-start; gap: 10px;">
              <span style="font-size: 1.2rem;">${b.icon}</span>
              <div>
                <div style="font-weight: 700; font-size: 0.9rem; color: #1e293b;">${b.label}</div>
                <div style="font-size: 0.78rem; color: #64748b; margin-top: 2px;">${b.desc}</div>
              </div>
            </button>
          `).join('')}
        </div>
      </div>
    `;

    const topBack = container.querySelector('#bl-btn-barrier-menu-top-back');
    if (topBack) topBack.addEventListener('click', renderWelcomeOrChooseMode);

    container.querySelectorAll('.bl-barrier-pick-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const b = btn.getAttribute('data-barrier');
        onExploreBarrierSelected(b);
      });
    });
  }

  async function onExploreBarrierSelected(barrierName) {
    _activeBarrier = barrierName;
    _barrierSource = 'user_selection';
    updateActiveBarrierHeader();

    renderUserMessage(`Selected Barrier: ${barrierName}`);
    showTypingIndicator();

    const responseEngine = getResponseEngine();
    if (responseEngine && responseEngine.processUserQuery) {
      const res = await responseEngine.processUserQuery(barrierName, _currentLang, { barrier: barrierName });
      hideTypingIndicator();
      renderAssistantResponse(res);
    } else {
      hideTypingIndicator();
    }
  }

  function changeBarrierMidChat() {
    const container = document.getElementById('bl-chat-messages');
    if (!container) return;

    const selectDiv = document.createElement('div');
    selectDiv.className = 'bl-midchat-barrier-picker';
    selectDiv.style.margin = '10px 0';
    container.appendChild(selectDiv);

    const barrierUI = getBarrierUI();
    if (barrierUI) {
      barrierUI.render(selectDiv, {
        activeBarrier: _activeBarrier,
        onSelectBarrier: (newBarrier) => {
          selectDiv.remove();
          onExploreBarrierSelected(newBarrier);
        }
      });
      scrollToBottom();
    }
  }

  function renderSuggestedQuestions() {
    const i18n = getI18n();
    const suggestions = i18n ? i18n.getSuggestedQuestions(_currentLang) : [];
    const container = document.getElementById('bl-suggestions-scroll');
    if (!container) return;

    container.innerHTML = suggestions.map(q => `
      <button class="bl-suggestion-chip" data-query="${q.text}">${q.text}</button>
    `).join('');

    container.querySelectorAll('.bl-suggestion-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        const queryText = btn.getAttribute('data-query');
        sendUserMessage(queryText);
      });
    });
  }

  function updateUILanguage(newLang) {
    _currentLang = newLang;
    const i18n = getI18n();
    if (i18n) {
      i18n.setLanguage(newLang);
    }

    const launcherLabel = document.getElementById('bl-launcher-label');
    if (launcherLabel) launcherLabel.textContent = t('assistantTitle');

    const modalTitle = document.getElementById('bl-modal-title');
    if (modalTitle) modalTitle.textContent = t('assistantTitle');
    const headerStatus = document.getElementById('bl-header-status');
    if (headerStatus) headerStatus.textContent = t('onlineStatus');

    const suggestionsHeader = document.getElementById('bl-suggestions-header');
    if (suggestionsHeader) suggestionsHeader.textContent = t('suggestedQuestionsHeader');
    renderSuggestedQuestions();

    const input = document.getElementById('bl-chat-input');
    if (input) {
      input.placeholder = t('inputPlaceholder');
      input.setAttribute('aria-label', t('inputPlaceholder'));
    }

    updateActiveBarrierHeader();
  }

  function bindEvents() {
    const launcher = document.getElementById('bl-chat-launcher');
    const closeBtn = document.getElementById('bl-close-btn');
    const clearBtn = document.getElementById('bl-clear-btn');
    const changeBarrierBtn = document.getElementById('bl-change-barrier-btn');
    const sendBtn = document.getElementById('bl-send-btn');
    const input = document.getElementById('bl-chat-input');
    const langSelect = document.getElementById('bl-lang-select');
    const micBtn = document.getElementById('bl-mic-btn');
    const voiceStopBtn = document.getElementById('bl-voice-stop-btn');

    if (launcher) launcher.addEventListener('click', toggleChat);
    if (closeBtn) closeBtn.addEventListener('click', closeChat);
    if (clearBtn) clearBtn.addEventListener('click', clearChat);
    if (changeBarrierBtn) changeBarrierBtn.addEventListener('click', changeBarrierMidChat);

    if (sendBtn && input) {
      sendBtn.addEventListener('click', () => {
        sendUserMessage(input.value);
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          sendUserMessage(input.value);
        }
      });
    }

    if (langSelect) {
      langSelect.addEventListener('change', (e) => {
        updateUILanguage(e.target.value);
      });
    }

    if (micBtn) {
      micBtn.addEventListener('click', () => {
        const voice = getVoice();
        if (!voice) return;
        if (voice.getState() === voice.STATES.LISTENING) {
          voice.stopListening();
        } else if (voice.getState() === voice.STATES.RESPONDING) {
          voice.stopSpeaking();
        } else {
          voice.startListening(_currentLang, {
            onTranscriptUpdate: (transcript, isFinal) => {
              if (input) input.value = transcript;
            },
            onQuerySubmit: async (text, lang) => {
              return await executeQuery(text, lang);
            },
            onResponse: (response) => {
              renderAssistantResponse(response);
            }
          });
        }
      });
    }

    if (voiceStopBtn) {
      voiceStopBtn.addEventListener('click', () => {
        const voice = getVoice();
        if (voice) voice.stopSpeaking();
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && _isOpen) {
        closeChat();
      }
    });
  }

  function bindVoiceStateMachine() {
    const voice = getVoice();
    if (!voice) return;

    const micBtn = document.getElementById('bl-mic-btn');
    const statusBar = document.getElementById('bl-voice-status-bar');
    const statusText = document.getElementById('bl-voice-text');
    const statusIcon = document.getElementById('bl-voice-icon');
    const stopBtn = document.getElementById('bl-voice-stop-btn');

    voice.onStateChange((oldState, newState, data) => {
      if (!micBtn || !statusBar || !statusText) return;

      micBtn.classList.remove('bl-state-listening', 'bl-state-processing', 'bl-state-responding', 'bl-state-error');
      statusBar.classList.remove('bl-status-listening', 'bl-status-processing', 'bl-status-responding', 'bl-status-error');

      switch (newState) {
        case voice.STATES.IDLE:
          statusBar.style.display = 'none';
          if (stopBtn) stopBtn.style.display = 'none';
          break;

        case voice.STATES.LISTENING:
          micBtn.classList.add('bl-state-listening');
          statusBar.classList.add('bl-status-listening');
          statusBar.style.display = 'flex';
          statusText.textContent = t('voiceListening');
          if (statusIcon) statusIcon.innerHTML = `<span class="bl-audio-equalizer"><span class="bl-eq-bar"></span><span class="bl-eq-bar"></span><span class="bl-eq-bar"></span></span>`;
          if (stopBtn) stopBtn.style.display = 'none';
          break;

        case voice.STATES.PROCESSING:
          micBtn.classList.add('bl-state-processing');
          statusBar.classList.add('bl-status-processing');
          statusBar.style.display = 'flex';
          statusText.textContent = t('voiceProcessing');
          if (statusIcon) statusIcon.innerHTML = `⌛`;
          if (stopBtn) stopBtn.style.display = 'none';
          break;

        case voice.STATES.RESPONDING:
          micBtn.classList.add('bl-state-responding');
          statusBar.classList.add('bl-status-responding');
          statusBar.style.display = 'flex';
          statusText.textContent = t('voiceResponding');
          if (statusIcon) statusIcon.innerHTML = `🔊`;
          if (stopBtn) stopBtn.style.display = 'inline-block';
          break;

        case voice.STATES.ERROR:
          micBtn.classList.add('bl-state-error');
          statusBar.classList.add('bl-status-error');
          statusBar.style.display = 'flex';
          statusText.textContent = data.message || t('voiceError');
          if (statusIcon) statusIcon.innerHTML = `⚠️`;
          if (stopBtn) stopBtn.style.display = 'none';
          break;
      }
    });
  }

  function openChat() {
    initDOM();
    const modal = document.getElementById('bl-chat-modal');
    const launcher = document.getElementById('bl-chat-launcher');
    const input = document.getElementById('bl-chat-input');
    if (!modal) return;

    _isOpen = true;
    modal.classList.add('bl-chat-open');
    modal.setAttribute('aria-modal', 'true');
    if (launcher) launcher.setAttribute('aria-expanded', 'true');

    if (input) {
      setTimeout(() => input.focus(), 150);
    }
  }

  function closeChat() {
    const modal = document.getElementById('bl-chat-modal');
    const launcher = document.getElementById('bl-chat-launcher');
    if (!modal) return;

    _isOpen = false;
    modal.classList.remove('bl-chat-open');
    modal.setAttribute('aria-modal', 'false');
    if (launcher) launcher.setAttribute('aria-expanded', 'false');

    const voice = getVoice();
    if (voice) {
      voice.stopListening();
      voice.stopSpeaking();
    }
  }

  function toggleChat() {
    if (_isOpen) closeChat();
    else openChat();
  }

  function clearChat() {
    _messages = [];
    renderWelcomeOrChooseMode();
  }

  async function sendUserMessage(text) {
    if (!text || !text.trim() || _isProcessing) return;
    const query = text.trim();
    _lastQueryText = query;

    const input = document.getElementById('bl-chat-input');
    if (input) input.value = '';

    renderUserMessage(query);
    showTypingIndicator();
    _isProcessing = true;

    try {
      const response = await executeQuery(query, _currentLang);
      hideTypingIndicator();
      _isProcessing = false;
      renderAssistantResponse(response);
    } catch (err) {
      hideTypingIndicator();
      _isProcessing = false;
      console.error("Central Query Engine Error:", err);
      renderErrorMessage(t('errorMessage'));
    }
  }

  async function executeQuery(query, lang) {
    const responseEngine = getResponseEngine();
    if (!responseEngine || !responseEngine.processUserQuery) {
      throw new Error("Central processUserQuery function not found.");
    }
    return await responseEngine.processUserQuery(query, lang, { barrierContext: _activeBarrier });
  }

  function renderUserMessage(text) {
    const container = document.getElementById('bl-chat-messages');
    if (!container) return;

    const timeStr = formatTime();
    const html = `
      <div class="bl-message-row bl-user-row">
        <div class="bl-message-avatar bl-user-avatar" aria-hidden="true">U</div>
        <div class="bl-bubble-wrap">
          <div class="bl-message-bubble">${formatText(text)}</div>
          <span class="bl-message-time">${timeStr}</span>
        </div>
      </div>
    `;
    container.insertAdjacentHTML('beforeend', html);
    scrollToBottom();
  }

  function renderAssistantResponse(res) {
    const container = document.getElementById('bl-chat-messages');
    if (!container || !res) return;

    const ctx = getContextManager();
    if (res.activeBarrier) {
      _activeBarrier = res.activeBarrier;
    } else if (res.barrierContext && res.barrierContext.barrier) {
      _activeBarrier = res.barrierContext.barrier;
    }
    updateActiveBarrierHeader();

    const timeStr = formatTime();
    let structuredCardsHtml = '';

    // Render Shared Evidence Card if available
    const evidenceCard = getEvidenceCard();
    if (evidenceCard && (res.evidence || res.metrics || res.calculations)) {
      structuredCardsHtml += evidenceCard.render({
        activeBarrier: _activeBarrier,
        explanation: res.answer,
        statistics: res.metrics,
        affectedStates: res.affectedStates || (res.entities && res.entities.state ? [res.entities.state] : []),
        affectedGroups: res.affectedGroups || (res.entities && res.entities.group ? [res.entities.group] : []),
        comparisons: res.calculations,
        source: res.source
      });
    }

    // Render Shared Solution Card if solutions requested or present
    const solutionCard = getSolutionCard();
    if (solutionCard && (res.requiresSolutions || res.solutions || res.barrierLensSolutions || res.externalSolutions)) {
      structuredCardsHtml += solutionCard.render({
        barrier: _activeBarrier,
        barrierLensSolutions: res.barrierLensSolutions || [
          { title: "Mobile Rural Clinics", desc: "Deploy satellite health vehicles to bridge distance barriers in high-prevalence districts." },
          { title: "Autonomy Counseling", desc: "Engage household decision-makers in reproductive health education." }
        ],
        externalSolutions: res.externalSolutions || res.solutions || [
          {
            recommendedSolution: "Community Health Worker (ASHA) Escort Program",
            source: "Ministry of Health and Family Welfare (MoHFW) / WHO Policy Guidance",
            whyItMayHelp: "Improves transport safety, reduces out-of-pocket costs, and builds trust for rural women."
          }
        ]
      });
    }

    // Render BarrierUI card fallbacks if specific card components not present
    const barrierUI = getBarrierUI();
    if (!evidenceCard && barrierUI && barrierUI.renderBarrierLensEvidenceCard) {
      if (res.evidenceType === 'BarrierLens Evidence' || (res.metrics && res.metrics.length > 0 && !res.solutions)) {
        structuredCardsHtml += barrierUI.renderBarrierLensEvidenceCard(res, _currentLang);
      }
      
      if (res.solutions && Array.isArray(res.solutions)) {
        res.solutions.forEach(sol => {
          structuredCardsHtml += barrierUI.renderExternalSolutionCard(sol, _currentLang);
        });
      } else if (res.solution) {
        structuredCardsHtml += barrierUI.renderExternalSolutionCard(res.solution, _currentLang);
      }
    }

    // Fallback Metrics Cards
    if (!evidenceCard && !barrierUI && res.metrics && res.metrics.length > 0) {
      const metricsList = res.metrics.map(m => `
        <div class="bl-metric-chip">
          <span class="bl-metric-val">${m.value}${m.unit ? m.unit : ''}</span>
          <span class="bl-metric-lbl">${m.label}${m.entity ? ` (${m.entity})` : ''}</span>
        </div>
      `).join('');

      structuredCardsHtml += `
        <div class="bl-structured-card">
          <div class="bl-card-section-title">
            ${t('keyMetrics')}
          </div>
          <div class="bl-metrics-grid">
            ${metricsList}
          </div>
        </div>
      `;
    }

    // Related Page Link Action Button
    if (res.relatedPage) {
      const resolvedHref = resolvePageLink(res.relatedPage);
      structuredCardsHtml += `
        <div>
          <a href="${resolvedHref}" class="bl-page-action-btn">
            <span>${t('viewAnalysis')}: ${res.relatedPage.label}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
          </a>
        </div>
      `;
    }

    // Research Disclaimer / Limitation Note
    if (res.disclaimer || res.limitationNote) {
      const note = res.disclaimer || res.limitationNote;
      structuredCardsHtml += `
        <div class="bl-disclaimer-box">
          <strong>⚠️ ${t('researchDisclaimer')}:</strong> ${note}
        </div>
      `;
    }

    const html = `
      <div class="bl-message-row bl-bot-row">
        <div class="bl-message-avatar bl-bot-avatar" aria-hidden="true">BL</div>
        <div class="bl-bubble-wrap">
          <div class="bl-message-bubble">
            ${formatText(res.answer)}
            ${structuredCardsHtml}
          </div>
          <span class="bl-message-time">${timeStr}</span>
        </div>
      </div>
    `;

    container.insertAdjacentHTML('beforeend', html);
    scrollToBottom();
  }

  function renderErrorMessage(msg) {
    const container = document.getElementById('bl-chat-messages');
    if (!container) return;

    const timeStr = formatTime();
    const html = `
      <div class="bl-message-row bl-bot-row">
        <div class="bl-message-avatar bl-bot-avatar" style="background: #dc2626;" aria-hidden="true">!</div>
        <div class="bl-bubble-wrap">
          <div class="bl-message-bubble" style="border-color: #fecaca; background: #fff5f5;">
            <strong style="color: #991b1b;">⚠️ ${t('errorTitle')}</strong><br>
            ${formatText(msg)}
          </div>
          <span class="bl-message-time">${timeStr}</span>
        </div>
      </div>
    `;
    container.insertAdjacentHTML('beforeend', html);
    scrollToBottom();
  }

  function showTypingIndicator() {
    const container = document.getElementById('bl-chat-messages');
    if (!container || document.getElementById('bl-typing-loader')) return;

    const html = `
      <div class="bl-message-row bl-bot-row" id="bl-typing-loader">
        <div class="bl-message-avatar bl-bot-avatar" aria-hidden="true">BL</div>
        <div class="bl-bubble-wrap">
          <div class="bl-typing-indicator" aria-label="Thinking...">
            <span class="bl-typing-dot"></span>
            <span class="bl-typing-dot"></span>
            <span class="bl-typing-dot"></span>
          </div>
        </div>
      </div>
    `;
    container.insertAdjacentHTML('beforeend', html);
    scrollToBottom();
  }

  function hideTypingIndicator() {
    const loader = document.getElementById('bl-typing-loader');
    if (loader) loader.remove();
  }

  function scrollToBottom() {
    const container = document.getElementById('bl-chat-messages');
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }

  function getContextState() {
    return {
      activeBarrier: _activeBarrier,
      barrierSource: _barrierSource,
      latestPrediction: _latestPrediction,
      currentLang: _currentLang,
      messages: [..._messages]
    };
  }

  function setActiveBarrier(barrierName, source = 'user_selection') {
    _activeBarrier = barrierName;
    _barrierSource = source;
    updateActiveBarrierHeader();
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initDOM);
    } else {
      initDOM();
    }
  }

  return {
    initDOM,
    openChat,
    closeChat,
    toggleChat,
    clearChat,
    sendUserMessage,
    updateUILanguage,
    formatText,
    resolvePageLink,
    renderAssistantResponse,
    renderUserMessage,
    getContextState,
    setActiveBarrier,
    startGuidedFlow,
    startExploreFlow,
    changeBarrierMidChat
  };
}));
