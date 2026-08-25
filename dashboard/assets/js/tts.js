/**
 * BARRIERLENS — MEMBER 3: TEXT-TO-SPEECH (TTS) MODULE
 * Browser Speech Synthesis handler supporting English (en-IN),
 * Kannada (kn-IN), and Hindi (hi-IN) with voice selection and safe fallback.
 * Dual environment support: Browser (window.BarrierLensTTS) & Node.js (module.exports).
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.BarrierLensTTS = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const hasSpeechSynthesis = typeof window !== 'undefined' && 'speechSynthesis' in window;

  let _currentUtterance = null;
  let _voicesLoaded = false;
  let _cachedVoices = [];

  /**
   * Check if Speech Synthesis is supported.
   */
  function isSupported() {
    return hasSpeechSynthesis;
  }

  /**
   * Check if speech synthesis is actively speaking.
   */
  function isSpeaking() {
    if (!hasSpeechSynthesis) return false;
    return window.speechSynthesis.speaking;
  }

  /**
   * Load and cache system voices.
   */
  function loadVoices() {
    if (!hasSpeechSynthesis) return [];
    _cachedVoices = window.speechSynthesis.getVoices() || [];
    if (_cachedVoices.length > 0) {
      _voicesLoaded = true;
    }
    return _cachedVoices;
  }

  if (hasSpeechSynthesis) {
    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = function () {
        loadVoices();
      };
    }
  }

  /**
   * Clean text for clean auditory reading (strip markdown symbols, bullets, URLs, code blocks).
   */
  function sanitizeTextForSpeech(text) {
    if (!text || typeof text !== 'string') return '';
    return text
      .replace(/```[\s\S]*?```/g, '') // remove code blocks
      .replace(/`([^`]+)`/g, '$1') // inline code
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // markdown links
      .replace(/[*_#~]/g, '') // bold, italic, headers
      .replace(/^[\s*•\-]+/gm, '') // list bullets (escaped hyphen)
      .replace(/\s+/g, ' ') // collapse whitespaces
      .trim();
  }

  /**
   * Find best matching voice for the target language.
   */
  function findVoiceForLanguage(langCode) {
    const voices = loadVoices();
    if (voices.length === 0) return null;

    let targetPrefix = 'en';
    if (langCode === 'kn') targetPrefix = 'kn';
    else if (langCode === 'hi') targetPrefix = 'hi';

    // 1. Exact match with region (e.g., kn-IN, hi-IN, en-IN)
    let match = voices.find(v => v.lang.toLowerCase() === `${targetPrefix}-in`);
    if (match) return match;

    // 2. Prefix match (e.g., kn, hi, en)
    match = voices.find(v => v.lang.toLowerCase().startsWith(targetPrefix));
    if (match) return match;

    // 3. Name includes language
    const langNameMap = { kn: 'kannada', hi: 'hindi', en: 'english' };
    const nameKey = langNameMap[langCode] || 'english';
    match = voices.find(v => v.name.toLowerCase().includes(nameKey));
    if (match) return match;

    // 4. Fallback: default voice
    return voices.find(v => v.default) || voices[0] || null;
  }

  /**
   * Speak response text out loud.
   * @param {string} text The text to speak
   * @param {string} lang Language code: 'en', 'kn', or 'hi'
   * @param {Object} options Callback hooks and audio settings
   */
  function speak(text, lang = 'en', options = {}) {
    if (!isSupported()) {
      if (options.onError) {
        options.onError(new Error('SpeechSynthesis not supported'));
      }
      return false;
    }

    // Stop any ongoing utterance
    stop();

    const cleanText = sanitizeTextForSpeech(text);
    if (!cleanText) {
      if (options.onEnd) options.onEnd();
      return false;
    }

    try {
      const utterance = new SpeechSynthesisUtterance(cleanText);
      const voice = findVoiceForLanguage(lang);

      if (voice) {
        utterance.voice = voice;
      }

      // Configure speech parameters
      const langLocaleMap = { en: 'en-IN', kn: 'kn-IN', hi: 'hi-IN' };
      utterance.lang = langLocaleMap[lang] || 'en-IN';
      utterance.rate = options.rate !== undefined ? options.rate : (lang === 'kn' || lang === 'hi' ? 0.9 : 1.0);
      utterance.pitch = options.pitch !== undefined ? options.pitch : 1.0;
      utterance.volume = options.volume !== undefined ? options.volume : 1.0;

      utterance.onstart = function () {
        if (options.onStart) options.onStart();
      };

      utterance.onend = function () {
        _currentUtterance = null;
        if (options.onEnd) options.onEnd();
      };

      utterance.onerror = function (event) {
        _currentUtterance = null;
        // Don't crash if interrupted or cancelled
        if (event.error !== 'interrupted' && event.error !== 'canceled') {
          if (options.onError) options.onError(event);
        } else {
          if (options.onEnd) options.onEnd();
        }
      };

      _currentUtterance = utterance;
      window.speechSynthesis.speak(utterance);
      return true;
    } catch (err) {
      _currentUtterance = null;
      if (options.onError) options.onError(err);
      return false;
    }
  }

  /**
   * Stop active speech synthesis playback.
   */
  function stop() {
    if (!hasSpeechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      _currentUtterance = null;
    } catch (e) {
      // Safe ignore
    }
  }

  return {
    isSupported,
    isSpeaking,
    loadVoices,
    sanitizeTextForSpeech,
    findVoiceForLanguage,
    speak,
    stop
  };
}));
