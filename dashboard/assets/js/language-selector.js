/**
 * BARRIERLENS — MEMBER 4: LANGUAGE SELECTOR UI (`language-selector.js`)
 * Renders language selection controls for English, Kannada, and Hindi.
 * Updates active language while strictly preserving session context, conversation history, and active barrier.
 * Dual environment support: Browser (window.BarrierLensLanguageSelector) & Node.js (module.exports).
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.BarrierLensLanguageSelector = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const LANGUAGES = [
    { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
    { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', flag: '🇮🇳' },
    { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' }
  ];

  function renderDropdown(containerId, options = {}) {
    const container = typeof containerId === 'string'
      ? document.getElementById(containerId)
      : containerId;

    if (!container) return null;

    const currentLang = options.currentLang || 'en';
    const onChangeLanguage = options.onChangeLanguage || function() {};

    const optionsHtml = LANGUAGES.map(l => 
      `<option value="${l.code}" ${l.code === currentLang ? 'selected' : ''}>${l.flag} ${l.nativeName}</option>`
    ).join('');

    container.innerHTML = `
      <select class="bl-lang-select-dropdown" aria-label="Select Language" style="padding: 4px 8px; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 0.825rem; background: #ffffff; color: #0f172a; cursor: pointer;">
        ${optionsHtml}
      </select>
    `;

    const selectEl = container.querySelector('select');
    if (selectEl) {
      selectEl.addEventListener('change', (e) => {
        onChangeLanguage(e.target.value);
      });
    }

    return container;
  }

  function renderButtons(containerId, options = {}) {
    const container = typeof containerId === 'string'
      ? document.getElementById(containerId)
      : containerId;

    if (!container) return null;

    const currentLang = options.currentLang || 'en';
    const onChangeLanguage = options.onChangeLanguage || function() {};

    const buttonsHtml = LANGUAGES.map(l => {
      const isSelected = l.code === currentLang;
      const bg = isSelected ? '#2563eb' : '#f1f5f9';
      const color = isSelected ? '#ffffff' : '#334155';
      const border = isSelected ? '#2563eb' : '#cbd5e1';

      return `
        <button class="bl-lang-btn" data-lang="${l.code}" style="padding: 6px 12px; background: ${bg}; color: ${color}; border: 1px solid ${border}; border-radius: 6px; font-size: 0.825rem; font-weight: 600; cursor: pointer; transition: all 0.15s ease;">
          ${l.flag} ${l.nativeName}
        </button>
      `;
    }).join('');

    container.innerHTML = `
      <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
        <span style="font-size: 0.8rem; font-weight: 600; color: #64748b;">Language:</span>
        ${buttonsHtml}
      </div>
    `;

    container.querySelectorAll('.bl-lang-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const langCode = btn.getAttribute('data-lang');
        onChangeLanguage(langCode);
      });
    });

    return container;
  }

  return {
    LANGUAGES,
    renderDropdown,
    renderButtons
  };
}));
