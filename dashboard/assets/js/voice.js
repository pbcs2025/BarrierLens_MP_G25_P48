/**
 * BARRIERLENS — MEMBER 3: VOICE STATE MACHINE & ORCHESTRATION MODULE
 * Manages the 5-state voice interaction lifecycle:
 * IDLE -> LISTENING -> PROCESSING -> RESPONDING -> IDLE (or ERROR -> IDLE recovery)
 * Routes speech-to-text directly to Member 1's central `processUserQuery` engine.
 * Dual environment support: Browser (window.BarrierLensVoice) & Node.js (module.exports).
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.BarrierLensVoice = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // The 5 canonical voice states
  const STATES = {
    IDLE: 'IDLE',
    LISTENING: 'LISTENING',
    PROCESSING: 'PROCESSING',
    RESPONDING: 'RESPONDING',
    ERROR: 'ERROR'
  };

  let _currentState = STATES.IDLE;
  let _stateListeners = [];
  let _currentLanguage = 'en';
  let _errorTimeout = null;

  /**
   * Get module references (Speech, TTS, Central Query Engine, I18n) safely.
   */
  function getSpeechModule() {
    if (typeof window !== 'undefined' && window.BarrierLensSpeech) return window.BarrierLensSpeech;
    if (typeof require !== 'undefined') {
      try { return require('./speech.js'); } catch (e) {}
    }
    return null;
  }

  function getTTSModule() {
    if (typeof window !== 'undefined' && window.BarrierLensTTS) return window.BarrierLensTTS;
    if (typeof require !== 'undefined') {
      try { return require('./tts.js'); } catch (e) {}
    }
    return null;
  }

  function getI18nModule() {
    if (typeof window !== 'undefined' && window.BarrierLensI18n) return window.BarrierLensI18n;
    if (typeof require !== 'undefined') {
      try { return require('./i18n.js'); } catch (e) {}
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

  /**
   * Transition state machine to a new state and notify all subscribers.
   */
  function transitionTo(newState, data = {}) {
    const oldState = _currentState;
    if (oldState === newState && newState !== STATES.ERROR) return;

    if (_errorTimeout) {
      clearTimeout(_errorTimeout);
      _errorTimeout = null;
    }

    _currentState = newState;

    // Notify registered UI state listeners
    _stateListeners.forEach(listener => {
      try {
        listener(oldState, newState, data);
      } catch (err) {
        console.error("Error in BarrierLensVoice state listener:", err);
      }
    });

    // Auto-recovery for ERROR state: revert to IDLE after 4 seconds
    if (newState === STATES.ERROR) {
      _errorTimeout = setTimeout(() => {
        if (_currentState === STATES.ERROR) {
          transitionTo(STATES.IDLE);
        }
      }, 4000);
    }
  }

  /**
   * Subscribe to state transition events.
   * @param {Function} callback (oldState, newState, data) => void
   */
  function onStateChange(callback) {
    if (typeof callback === 'function' && !_stateListeners.includes(callback)) {
      _stateListeners.push(callback);
    }
    return () => {
      _stateListeners = _stateListeners.filter(cb => cb !== callback);
    };
  }

  /**
   * Get current voice state.
   */
  function getState() {
    return _currentState;
  }

  /**
   * Start voice recognition session.
   * @param {string} lang Interaction language code: 'en', 'kn', or 'hi'
   * @param {Object} options Handlers for query submission & display
   * @param {Function} options.onTranscriptUpdate (text, isFinal) => void
   * @param {Function} options.onQuerySubmit (text, lang) => Promise<response>
   * @param {Function} options.onResponse (response) => void
   */
  function startListening(lang = _currentLanguage, options = {}) {
    const speech = getSpeechModule();
    const tts = getTTSModule();
    _currentLanguage = lang || 'en';

    // Cancel any active speech synthesis readout
    if (tts && tts.isSpeaking()) {
      tts.stop();
    }

    if (!speech || !speech.isSupported()) {
      transitionTo(STATES.ERROR, {
        errorType: 'not-supported',
        message: 'Speech recognition is not supported in this browser. Please use text input.'
      });
      return false;
    }

    transitionTo(STATES.LISTENING, { language: _currentLanguage });

    const started = speech.start({
      language: _currentLanguage,
      onStart: () => {
        transitionTo(STATES.LISTENING, { language: _currentLanguage });
      },
      onResult: (transcript, isFinal) => {
        if (options.onTranscriptUpdate) {
          options.onTranscriptUpdate(transcript, isFinal);
        }
        if (isFinal) {
          handleRecognizedSpeech(transcript, _currentLanguage, options);
        }
      },
      onError: (errorType, message, rawError) => {
        // If aborted intentionally by user or idle, return to idle
        if (errorType === 'aborted') {
          transitionTo(STATES.IDLE);
        } else {
          transitionTo(STATES.ERROR, {
            errorType: errorType,
            message: message,
            rawError: rawError
          });
        }
      },
      onEnd: (finalTranscript) => {
        // If session ended without final speech result and we're still in LISTENING
        if (_currentState === STATES.LISTENING) {
          if (finalTranscript && finalTranscript.trim()) {
            handleRecognizedSpeech(finalTranscript, _currentLanguage, options);
          } else {
            transitionTo(STATES.IDLE);
          }
        }
      }
    });

    return started;
  }

  /**
   * Handle captured speech transcript: query central engine and trigger TTS readout.
   */
  async function handleRecognizedSpeech(transcript, lang, options = {}) {
    const text = transcript ? transcript.trim() : '';
    if (!text) {
      transitionTo(STATES.IDLE);
      return;
    }

    transitionTo(STATES.PROCESSING, { transcript: text, language: lang });

    try {
      let response = null;

      if (options.onQuerySubmit) {
        response = await options.onQuerySubmit(text, lang);
      } else {
        // Direct central engine fallback
        const responseEngine = getResponseEngine();
        if (responseEngine && responseEngine.processUserQuery) {
          response = await responseEngine.processUserQuery(text, lang);
        } else {
          throw new Error("Central query engine is unavailable.");
        }
      }

      if (options.onResponse) {
        options.onResponse(response);
      }

      // Transition to RESPONDING and speak answer via TTS
      readOutResponse(response ? response.answer : '', lang, () => {
        transitionTo(STATES.IDLE);
      });
    } catch (err) {
      console.error("Voice query processing error:", err);
      transitionTo(STATES.ERROR, {
        errorType: 'query-error',
        message: err.message || 'Failed to process voice query.'
      });
    }
  }

  /**
   * Speak response answer through Text-to-Speech safely.
   */
  function readOutResponse(answerText, lang, onComplete) {
    const tts = getTTSModule();
    transitionTo(STATES.RESPONDING, { answer: answerText, language: lang });

    if (!tts || !tts.isSupported() || !answerText) {
      // Safe fallback: end responding state immediately if TTS is unavailable
      setTimeout(() => {
        transitionTo(STATES.IDLE);
        if (onComplete) onComplete();
      }, 500);
      return;
    }

    tts.speak(answerText, lang, {
      onStart: () => {
        // Remain in RESPONDING
      },
      onEnd: () => {
        transitionTo(STATES.IDLE);
        if (onComplete) onComplete();
      },
      onError: (err) => {
        // Safe fallback on TTS error
        transitionTo(STATES.IDLE);
        if (onComplete) onComplete();
      }
    });
  }

  /**
   * Stop active voice listening.
   */
  function stopListening() {
    const speech = getSpeechModule();
    if (speech) {
      speech.stop();
    }
    if (_currentState === STATES.LISTENING) {
      transitionTo(STATES.IDLE);
    }
  }

  /**
   * Stop active speech synthesis readout.
   */
  function stopSpeaking() {
    const tts = getTTSModule();
    if (tts) {
      tts.stop();
    }
    if (_currentState === STATES.RESPONDING) {
      transitionTo(STATES.IDLE);
    }
  }

  /**
   * Reset state machine to IDLE unconditionally.
   */
  function resetToIdle() {
    const speech = getSpeechModule();
    const tts = getTTSModule();
    if (speech) speech.abort();
    if (tts) tts.stop();
    transitionTo(STATES.IDLE);
  }

  return {
    STATES,
    getState,
    transitionTo,
    onStateChange,
    startListening,
    stopListening,
    stopSpeaking,
    readOutResponse,
    resetToIdle
  };
}));
