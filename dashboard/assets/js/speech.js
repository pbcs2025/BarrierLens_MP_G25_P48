/**
 * BARRIERLENS — MEMBER 3: SPEECH-TO-TEXT (STT) MODULE
 * Browser Speech Recognition handler supporting English (en-IN),
 * Kannada (kn-IN), and Hindi (hi-IN) with graceful fallback and robust error handling.
 * Dual environment support: Browser (window.BarrierLensSpeech) & Node.js (module.exports).
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.BarrierLensSpeech = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Check browser SpeechRecognition implementation
  const SpeechRecognitionAPI = typeof window !== 'undefined' ?
    (window.SpeechRecognition || window.webkitSpeechRecognition || null) : null;

  let _recognition = null;
  let _isListening = false;
  let _currentLang = 'en';

  const LANGUAGE_LOCALE_MAP = {
    en: 'en-IN',
    kn: 'kn-IN',
    hi: 'hi-IN'
  };

  /**
   * Check if speech recognition is supported in the current environment.
   */
  function isSupported() {
    return SpeechRecognitionAPI !== null;
  }

  /**
   * Check if currently listening.
   */
  function isListening() {
    return _isListening;
  }

  /**
   * Map standard 2-letter language code to speech recognition locale.
   */
  function resolveLocale(langCode) {
    return LANGUAGE_LOCALE_MAP[langCode] || 'en-IN';
  }

  /**
   * Start speech recognition.
   * @param {Object} options Configuration and callback hooks
   * @param {string} options.language 'en', 'kn', or 'hi'
   * @param {Function} options.onStart Callback when microphone activates
   * @param {Function} options.onResult Callback when speech transcript is received (transcript, isFinal)
   * @param {Function} options.onError Callback on error (errorType, message, rawError)
   * @param {Function} options.onEnd Callback when recognition session ends
   */
  function start(options = {}) {
    if (!isSupported()) {
      if (options.onError) {
        options.onError('not-supported', 'Speech recognition is not supported in this browser.', null);
      }
      return false;
    }

    // Stop any existing active session
    stop();

    _currentLang = options.language || 'en';
    const locale = resolveLocale(_currentLang);

    try {
      _recognition = new SpeechRecognitionAPI();
      _recognition.lang = locale;
      _recognition.continuous = false;
      _recognition.interimResults = true;
      _recognition.maxAlternatives = 1;

      let finalTranscript = '';

      _recognition.onstart = function () {
        _isListening = true;
        if (options.onStart) {
          options.onStart();
        }
      };

      _recognition.onresult = function (event) {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const result = event.results[i];
          const transcriptChunk = result[0].transcript;
          if (result.isFinal) {
            finalTranscript += transcriptChunk;
          } else {
            interimTranscript += transcriptChunk;
          }
        }

        const activeText = finalTranscript || interimTranscript;
        const isFinal = Boolean(finalTranscript);

        if (options.onResult && activeText.trim()) {
          options.onResult(activeText.trim(), isFinal);
        }
      };

      _recognition.onerror = function (event) {
        _isListening = false;
        let errorType = event.error || 'unknown';
        let errorMsg = 'An error occurred during speech recognition.';

        switch (errorType) {
          case 'not-allowed':
          case 'permission-denied':
            errorMsg = 'Microphone permission was denied. Please allow microphone access in browser settings.';
            break;
          case 'no-speech':
            errorMsg = 'No speech was detected. Please try again.';
            break;
          case 'network':
            errorMsg = 'Network error during speech recognition.';
            break;
          case 'audio-capture':
            errorMsg = 'No microphone device was found or audio capture failed.';
            break;
          case 'language-not-supported':
            errorMsg = `Voice recognition for locale "${locale}" is not supported by your browser.`;
            break;
          case 'aborted':
            errorMsg = 'Speech listening was cancelled.';
            break;
        }

        if (options.onError) {
          options.onError(errorType, errorMsg, event);
        }
      };

      _recognition.onend = function () {
        _isListening = false;
        if (options.onEnd) {
          options.onEnd(finalTranscript.trim());
        }
      };

      _recognition.start();
      return true;
    } catch (err) {
      _isListening = false;
      if (options.onError) {
        options.onError('exception', err.message || 'Failed to start speech recognition.', err);
      }
      return false;
    }
  }

  /**
   * Stop active speech recognition safely.
   */
  function stop() {
    if (_recognition) {
      try {
        _recognition.stop();
      } catch (e) {
        // Safe ignore if already stopped
      }
      _isListening = false;
    }
  }

  /**
   * Abort speech recognition immediately.
   */
  function abort() {
    if (_recognition) {
      try {
        _recognition.abort();
      } catch (e) {
        // Safe ignore
      }
      _isListening = false;
    }
  }

  return {
    isSupported,
    isListening,
    resolveLocale,
    start,
    stop,
    abort
  };
}));
