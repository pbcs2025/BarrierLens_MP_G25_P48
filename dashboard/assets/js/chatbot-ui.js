/**
 * BARRIERLENS — MEMBER 3: CHATBOT UI CONTROLLER
 * Floating launcher, responsive chat panel, conversation thread,
 * structured evidence & metric cards, multilingual UI, voice state management,
 * keyboard accessibility, and direct connection to Member 1's `processUserQuery`.
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
  let _activeBarrier = null;

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

  function getBarrierUI() {
    if (typeof window !== 'undefined' && window.BarrierLensBarrierUI) return window.BarrierLensBarrierUI;
    if (typeof require !== 'undefined') {
      try { return require('./barrier-ui.js'); } catch (e) {}
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

  /**
   * Helper to translate key using I18n module
   */
  function t(key, lang = _currentLang) {
    const i18n = getI18n();
    return i18n ? i18n.t(key, lang) : key;
  }

  /**
   * Update active barrier banner in header
   */
  function updateActiveBarrierHeader() {
    const slot = document.getElementById('bl-active-barrier-header-slot');
    if (!slot) return;
    const barrierUI = getBarrierUI();
    const ctx = getContextManager();
    const active = ctx && ctx.getActiveBarrier ? ctx.getActiveBarrier() : _activeBarrier;
    
    if (active && barrierUI) {
      slot.innerHTML = barrierUI.buildActiveBarrierBannerHtml(active, _currentLang);
      slot.style.display = 'block';
      const changeBtn = slot.querySelector('#bl-change-barrier-btn');
      if (changeBtn) {
        changeBtn.addEventListener('click', promptChangeBarrier);
      }
    } else {
      slot.innerHTML = '';
      slot.style.display = 'none';
    }
  }

  /**
   * Prompt user to change barrier mid-conversation
   */
  function promptChangeBarrier() {
    const barrierUI = getBarrierUI();
    if (!barrierUI) return;
    const container = document.getElementById('bl-chat-messages');
    if (!container) return;

    const html = `
      <div class="bl-message-row bl-bot-row">
        <div class="bl-message-avatar bl-bot-avatar" aria-hidden="true">BL</div>
        <div class="bl-bubble-wrap">
          <div class="bl-message-bubble">
            ${barrierUI.buildBarrierSelectionGridHtml(_currentLang, _activeBarrier)}
          </div>
        </div>
      </div>
    `;
    container.insertAdjacentHTML('beforeend', html);
    bindBarrierGridEvents();
    scrollToBottom();
  }

  /**
   * Attach click handlers to barrier selection grid cards
   */
  function bindBarrierGridEvents() {
    if (typeof document === 'undefined') return;
    const gridCards = document.querySelectorAll('.bl-barrier-grid-card');
    gridCards.forEach(card => {
      if (card.getAttribute('data-bound')) return;
      card.setAttribute('data-bound', 'true');
      card.addEventListener('click', (e) => {
        e.preventDefault();
        const barrierId = card.getAttribute('data-barrier-id');
        if (barrierId) {
          const ctx = getContextManager();
          if (ctx && ctx.setActiveBarrier) {
            ctx.setActiveBarrier(barrierId);
          }
          _activeBarrier = barrierId;
          updateActiveBarrierHeader();
          sendUserMessage(barrierId);
        }
      });
    });
  }

  /**
   * Detect relative asset path based on whether current page is in /pages/ or root
   */
  function getAssetPrefix() {
    if (typeof window === 'undefined' || !window.location) return '';
    const pathname = window.location.pathname.replace(/\\/g, '/');
    return pathname.includes('/pages/') ? '../' : '';
  }

  /**
   * Format relative page URL based on current page location
   */
  function resolvePageLink(relatedPageObj) {
    if (!relatedPageObj) return null;
    const prefix = getAssetPrefix();
    const targetFile = relatedPageObj.url.split('/').pop();
    if (prefix === '../') {
      return targetFile; // inside /pages/, just link to sibling file
    } else {
      return `pages/${targetFile}`; // in root, link to pages/
    }
  }

  /**
   * Format message text with basic HTML escaping and markdown bold/bullets
   */
  function formatText(text) {
    if (!text) return '';
    let escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Bold **text**
    escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Bullet points
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

  /**
   * Format current time (e.g. "10:45 AM")
   */
  function formatTime(date = new Date()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  /**
   * Build Floating Launcher HTML
   */
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

  /**
   * Build Chat Modal HTML
   */
  function buildModalHtml() {
    const i18n = getI18n();
    const barrierUI = getBarrierUI();
    const languages = i18n ? i18n.getSupportedLanguages() : [
      { code: 'en', nativeName: 'English' },
      { code: 'kn', nativeName: 'ಕನ್ನಡ' },
      { code: 'hi', nativeName: 'ಹಿನ್ದೀ' }
    ];

    const langOptions = languages.map(l => 
      `<option value="${l.code}" ${l.code === _currentLang ? 'selected' : ''}>${l.nativeName}</option>`
    ).join('');

    const gridHtml = barrierUI ? barrierUI.buildBarrierSelectionGridHtml(_currentLang, _activeBarrier) : '';

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
          <div class="bl-chat-header-actions">
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

        <!-- Active Barrier Toolbar Slot -->
        <div id="bl-active-barrier-header-slot" style="display: none;"></div>

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
          <!-- Initial Welcome Card -->
          <div class="bl-welcome-card" id="bl-welcome-card">
            <span class="bl-welcome-badge">${t('assistantBadge')}</span>
            <h4 class="bl-welcome-title">${t('welcomeTitle')}</h4>
            <p class="bl-welcome-desc">${t('welcomeGreeting')}</p>
            <p class="bl-welcome-tip">${t('welcomeHelp')}</p>
            ${gridHtml}
          </div>
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

  /**
   * Mount Chatbot Elements into DOM
   */
  function initDOM() {
    if (typeof document === 'undefined' || _domMounted) return;

    // Inject CSS links if not already present
    const prefix = getAssetPrefix();
    if (!document.querySelector('link[href*="chatbot.css"]')) {
      const linkChat = document.createElement('link');
      linkChat.rel = 'stylesheet';
      linkChat.href = `${prefix}assets/css/chatbot.css`;
      document.head.appendChild(linkChat);
    }
    if (!document.querySelector('link[href*="voice.css"]')) {
      const linkVoice = document.createElement('link');
      linkVoice.rel = 'stylesheet';
      linkVoice.href = `${prefix}assets/css/voice.css`;
      document.head.appendChild(linkVoice);
    }

    // Inject Launcher & Modal
    document.body.insertAdjacentHTML('beforeend', buildLauncherHtml());
    document.body.insertAdjacentHTML('beforeend', buildModalHtml());

    _domMounted = true;
    bindEvents();
    bindBarrierGridEvents();
    updateActiveBarrierHeader();
    renderSuggestedQuestions();
    bindVoiceStateMachine();
  }

  /**
   * Render Suggested Question Chips
   */
  function renderSuggestedQuestions() {
    const i18n = getI18n();
    const suggestions = i18n ? i18n.getSuggestedQuestions(_currentLang) : [];
    const container = document.getElementById('bl-suggestions-scroll');
    if (!container) return;

    container.innerHTML = suggestions.map(q => `
      <button class="bl-suggestion-chip" data-query="${q.text}">${q.text}</button>
    `).join('');

    // Attach click handlers
    container.querySelectorAll('.bl-suggestion-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        const queryText = btn.getAttribute('data-query');
        sendUserMessage(queryText);
      });
    });
  }

  /**
   * Update UI Text upon Language Switch
   */
  function updateUILanguage(newLang) {
    _currentLang = newLang;
    const i18n = getI18n();
    if (i18n) {
      i18n.setLanguage(newLang);
    }

    // Update Launcher
    const launcherLabel = document.getElementById('bl-launcher-label');
    if (launcherLabel) launcherLabel.textContent = t('assistantTitle');

    // Update Header
    const modalTitle = document.getElementById('bl-modal-title');
    if (modalTitle) modalTitle.textContent = t('assistantTitle');
    const headerStatus = document.getElementById('bl-header-status');
    if (headerStatus) headerStatus.textContent = t('onlineStatus');

    // Update Welcome Card
    const welcomeCard = document.getElementById('bl-welcome-card');
    if (welcomeCard) {
      welcomeCard.innerHTML = `
        <span class="bl-welcome-badge">${t('assistantBadge')}</span>
        <h4 class="bl-welcome-title">${t('welcomeTitle')}</h4>
        <p class="bl-welcome-desc">${t('welcomeGreeting')}</p>
        <p class="bl-welcome-tip">${t('welcomeHelp')}</p>
      `;
    }

    // Update Suggestions Header & Chips
    const suggestionsHeader = document.getElementById('bl-suggestions-header');
    if (suggestionsHeader) suggestionsHeader.textContent = t('suggestedQuestionsHeader');
    renderSuggestedQuestions();

    // Update Input Placeholder & Buttons
    const input = document.getElementById('bl-chat-input');
    if (input) {
      input.placeholder = t('inputPlaceholder');
      input.setAttribute('aria-label', t('inputPlaceholder'));
    }
    const sendBtn = document.getElementById('bl-send-btn');
    if (sendBtn) {
      sendBtn.title = t('sendButton');
      sendBtn.setAttribute('aria-label', t('sendButton'));
    }
    const micBtn = document.getElementById('bl-mic-btn');
    if (micBtn) {
      micBtn.title = t('micButton');
      micBtn.setAttribute('aria-label', t('micButton'));
    }
    const clearBtn = document.getElementById('bl-clear-btn');
    if (clearBtn) {
      clearBtn.title = t('clearChatButton');
      clearBtn.setAttribute('aria-label', t('clearChatButton'));
    }
    const closeBtn = document.getElementById('bl-close-btn');
    if (closeBtn) {
      closeBtn.title = t('closeButton');
      closeBtn.setAttribute('aria-label', t('closeButton'));
    }
  }

  /**
   * Bind DOM Events & Keyboard Shortcuts
   */
  function bindEvents() {
    const launcher = document.getElementById('bl-chat-launcher');
    const modal = document.getElementById('bl-chat-modal');
    const closeBtn = document.getElementById('bl-close-btn');
    const clearBtn = document.getElementById('bl-clear-btn');
    const sendBtn = document.getElementById('bl-send-btn');
    const input = document.getElementById('bl-chat-input');
    const langSelect = document.getElementById('bl-lang-select');
    const micBtn = document.getElementById('bl-mic-btn');
    const voiceStopBtn = document.getElementById('bl-voice-stop-btn');

    // Toggle Chat
    if (launcher) {
      launcher.addEventListener('click', toggleChat);
    }
    if (closeBtn) {
      closeBtn.addEventListener('click', closeChat);
    }

    // Clear Chat
    if (clearBtn) {
      clearBtn.addEventListener('click', clearChat);
    }

    // Send Message
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

    // Language Selector
    if (langSelect) {
      langSelect.addEventListener('change', (e) => {
        updateUILanguage(e.target.value);
      });
    }

    // Microphone Voice Input
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
              _lastQueryText = text;
              if (input) input.value = '';
              renderUserMessage(text);
              return await executeQuery(text, lang);
            },
            onResponse: (response) => {
              renderAssistantResponse(response);
            }
          });
        }
      });
    }

    // Stop TTS speaking button in voice bar
    if (voiceStopBtn) {
      voiceStopBtn.addEventListener('click', () => {
        const voice = getVoice();
        if (voice) voice.stopSpeaking();
      });
    }

    // Global Keyboard Listeners (Escape to close)
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && _isOpen) {
        closeChat();
      }
    });
  }

  /**
   * Bind Voice State Machine to UI Indicator Badges
   */
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

      // Reset state classes
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
          if (statusIcon) statusIcon.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line></svg>`;
          if (stopBtn) stopBtn.style.display = 'none';
          break;

        case voice.STATES.RESPONDING:
          micBtn.classList.add('bl-state-responding');
          statusBar.classList.add('bl-status-responding');
          statusBar.style.display = 'flex';
          statusText.textContent = t('voiceResponding');
          if (statusIcon) statusIcon.innerHTML = `<span class="bl-audio-equalizer"><span class="bl-eq-bar"></span><span class="bl-eq-bar"></span><span class="bl-eq-bar"></span><span class="bl-eq-bar"></span></span>`;
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

  /**
   * Open Chatbot Panel
   */
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

    // Focus input
    if (input) {
      setTimeout(() => input.focus(), 150);
    }
  }

  /**
   * Close Chatbot Panel
   */
  function closeChat() {
    const modal = document.getElementById('bl-chat-modal');
    const launcher = document.getElementById('bl-chat-launcher');
    if (!modal) return;

    _isOpen = false;
    modal.classList.remove('bl-chat-open');
    modal.setAttribute('aria-modal', 'false');
    if (launcher) launcher.setAttribute('aria-expanded', 'false');

    // Stop any ongoing voice listening or speaking
    const voice = getVoice();
    if (voice) {
      voice.stopListening();
      voice.stopSpeaking();
    }
  }

  /**
   * Toggle Open/Close
   */
  function toggleChat() {
    if (_isOpen) closeChat();
    else openChat();
  }

  /**
   * Clear Chat History
   */
  function clearChat() {
    _messages = [];
    const container = document.getElementById('bl-chat-messages');
    if (!container) return;
    container.innerHTML = `
      <div class="bl-welcome-card" id="bl-welcome-card">
        <span class="bl-welcome-badge">${t('assistantBadge')}</span>
        <h4 class="bl-welcome-title">${t('welcomeTitle')}</h4>
        <p class="bl-welcome-desc">${t('welcomeGreeting')}</p>
        <p class="bl-welcome-tip">${t('welcomeHelp')}</p>
      </div>
    `;
  }

  /**
   * Send User Message through pipeline
   */
  async function sendUserMessage(text) {
    if (!text || !text.trim() || _isProcessing) return;
    const query = text.trim();
    _lastQueryText = query;

    // Clear input
    const input = document.getElementById('bl-chat-input');
    if (input) input.value = '';

    // Render User Message
    renderUserMessage(query);

    // Render Loading Typing Indicator
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

  /**
   * Call Central Query Engine (Member 1)
   */
  async function executeQuery(query, lang) {
    const responseEngine = getResponseEngine();
    if (!responseEngine || !responseEngine.processUserQuery) {
      throw new Error("Central processUserQuery function not found.");
    }
    return await responseEngine.processUserQuery(query, lang);
  }

  /**
   * Render User Message Bubble
   */
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

  /**
   * Render Structured Assistant Response Bubble
   */
  function renderAssistantResponse(res) {
    const container = document.getElementById('bl-chat-messages');
    if (!container || !res) return;

    // Track active barrier from response context if present
    const ctx = getContextManager();
    if (res.activeBarrier) {
      _activeBarrier = res.activeBarrier;
    } else if (res.barrierContext && res.barrierContext.barrier) {
      _activeBarrier = res.barrierContext.barrier;
    }
    updateActiveBarrierHeader();

    const barrierUI = getBarrierUI();
    const timeStr = formatTime();
    let structuredCardsHtml = '';

    // 0. Visually Distinct Evidence Cards (BarrierLens Evidence vs External Evidence)
    if (barrierUI) {
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

    // 1. Metrics Cards (if not already handled by BarrierLens evidence card)
    if (!barrierUI && res.metrics && res.metrics.length > 0) {
      const metricsList = res.metrics.map(m => {
        return `
          <div class="bl-metric-chip">
            <span class="bl-metric-val">${m.value}${m.unit ? m.unit : ''}</span>
            <span class="bl-metric-lbl">${m.label}${m.entity ? ` (${m.entity})` : ''}</span>
          </div>
        `;
      }).join('');

      structuredCardsHtml += `
        <div class="bl-structured-card">
          <div class="bl-card-section-title">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 20V10"></path><path d="M12 20V4"></path><path d="M6 20v-6"></path></svg>
            ${t('keyMetrics')}
          </div>
          <div class="bl-metrics-grid">
            ${metricsList}
          </div>
        </div>
      `;
    }

    // 2. Calculations / Derived Difference Card
    if (res.calculations && res.calculations.length > 0) {
      const calcsHtml = res.calculations.map(c => `
        <div style="margin-top: 4px;">
          <div>${c.interpretation || c.description}</div>
          <span class="bl-derived-tag">${t('derivedBadge')}: ${c.result} ${c.unit || ''}</span>
        </div>
      `).join('');

      structuredCardsHtml += `
        <div class="bl-structured-card" style="border-left: 3px solid #d97706;">
          <div class="bl-card-section-title">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            ${t('calculatedValues')}
          </div>
          ${calcsHtml}
        </div>
      `;
    }

    // 3. Data Source Provenance Card
    if (res.source && res.source.length > 0) {
      const sourcesHtml = res.source.map(s => {
        const filename = s.split('/').pop();
        return `<span class="bl-source-tag">📄 ${filename}</span>`;
      }).join(' ');

      structuredCardsHtml += `
        <div class="bl-structured-card">
          <div class="bl-card-section-title">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
            ${t('dataProvenance')}
          </div>
          <div>${sourcesHtml}</div>
        </div>
      `;
    }

    // 4. Related Page Link Action Button
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

    // 4.5 Report Generation Actions
    if (res.status === 'verified') {
      const isComparison = res.intent === 'STATE_COMPARISON' || (res.calculations && res.calculations.length > 0);
      structuredCardsHtml += `
        <div class="bl-report-actions-block">
          <div class="bl-report-block-title">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
            <span>Generate Research Report:</span>
          </div>
          <div class="bl-report-btns-row">
            <button class="bl-report-action-btn" data-report-type="executive" title="Executive Research Report">Executive</button>
            <button class="bl-report-action-btn" data-report-type="topic" title="Topic Research Report">Topic</button>
            ${isComparison ? `<button class="bl-report-action-btn bl-report-highlight" data-report-type="comparison" title="Comparison Research Report">Comparison</button>` : ''}
            <button class="bl-report-action-btn" data-report-type="complete" title="Complete Study Report">Complete</button>
          </div>
        </div>
      `;
    }

    // 5. Research Disclaimer / Limitation Note
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

    const lastRow = container.lastElementChild;
    if (lastRow) {
      lastRow.querySelectorAll('.bl-report-action-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const reportType = btn.getAttribute('data-report-type') || 'executive';
          const gen = getReportGenerator();
          if (gen) {
            const reportPayload = Object.assign({}, res, { query: _lastQueryText || res.query || '' });
            const report = gen.generateReport(reportType, reportPayload);
            gen.openReportModal(report);
          }
        });
      });
    }

    scrollToBottom();
  }

  /**
   * Render Error Message
   */
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

  /**
   * Show Typing Indicator
   */
  function showTypingIndicator() {
    const sendBtn = document.getElementById('bl-send-btn');
    const input = document.getElementById('bl-chat-input');
    if (sendBtn) sendBtn.disabled = true;
    if (input) input.setAttribute('aria-busy', 'true');

    const container = document.getElementById('bl-chat-messages');
    if (!container || document.getElementById('bl-typing-loader')) return;

    const html = `
      <div class="bl-message-row bl-bot-row" id="bl-typing-loader" role="status" aria-live="polite">
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

  /**
   * Hide Typing Indicator
   */
  function hideTypingIndicator() {
    const sendBtn = document.getElementById('bl-send-btn');
    const input = document.getElementById('bl-chat-input');
    if (sendBtn) sendBtn.disabled = false;
    if (input) input.removeAttribute('aria-busy');

    const loader = document.getElementById('bl-typing-loader');
    if (loader) loader.remove();
  }

  /**
   * Scroll Messages Area to Bottom
   */
  function scrollToBottom() {
    const container = document.getElementById('bl-chat-messages');
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }

  // Auto-initialize on DOM ready
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
    renderUserMessage
  };
}));
