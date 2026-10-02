/**
 * BARRIERLENS — MEMBER 4: SOLUTION CARD RENDERER (`solution-card.jsx`)
 * Renders structured solutions while strictly separating BarrierLens Evidence from External Evidence.
 * Preserves exact backend structure for external solutions:
 *   - Recommended Solution
 *   - Source
 *   - Why it may help
 * Never textually or visually merges external evidence with BarrierLens internal evidence.
 * Dual environment support: Browser (window.BarrierLensSolutionCard) & Node.js (module.exports).
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.BarrierLensSolutionCard = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function render(solutionPayload, options = {}) {
    if (!solutionPayload) return '';

    const activeLang = options.activeLanguage || options.lang || solutionPayload.language || "en";
    const rawLang = String(activeLang).toLowerCase();
    const langKey = (rawLang.startsWith('kn') || rawLang.includes('kannada') || rawLang.includes('ಕನ್ನಡ')) ? 'kn'
      : (rawLang.startsWith('hi') || rawLang.includes('hindi') || rawLang.includes('हिंदी') || rawLang.includes('हिन्दी')) ? 'hi'
      : 'en';

    const cardLabels = {
      en: {
        blTag: "BarrierLens Evidence",
        blSubtitle: "NFHS-5 Data-Backed Interventions",
        extTag: "External Evidence",
        extSubtitle: "Trusted Global & Public Health Policy",
        recSolution: "Recommended Solution:",
        source: "Source:",
        whyHelp: "Why it may help:",
        availableMsg: (b) => `Verified evidence-based solutions for <strong>${b}</strong> are available in the BarrierLens policy dataset.`
      },
      kn: {
        blTag: "ಬ್ಯಾರಿಯರ್ ಲೆನ್ಸ್ ಸಾಕ್ಷ್ಯ",
        blSubtitle: "NFHS-5 ಆಧಾರಿತ ಪರಿಹಾರ ಕ್ರಮಗಳು",
        extTag: "ಬಾಹ್ಯ ಅಧಿಕೃತ ಸಾಕ್ಷ್ಯ",
        extSubtitle: "ಜಾಗತಿಕ ಮತ್ತು ಸಾರ್ವಜನಿಕ ಆರೋಗ್ಯ ನೀತಿ",
        recSolution: "ಶಿಫಾರಸು ಮಾಡಿದ ಪರಿಹಾರ:",
        source: "ಮೂಲ ಸಂಸ್ಥೆ:",
        whyHelp: "ಇದು ಹೇಗೆ ನೆರವಾಗುತ್ತದೆ:",
        availableMsg: (b) => `<strong>${b}</strong> ಗಾಗಿ ಪರಿಶೀಲಿಸಿದ ಪರಿಹಾರ ಕ್ರಮಗಳು ಲಭ್ಯವಿದೆ.`
      },
      hi: {
        blTag: "बैरियरलेंस साक्ष्य",
        blSubtitle: "NFHS-5 आधारित हस्तक्षेप",
        extTag: "बाह्य आधिकारिक साक्ष्य",
        extSubtitle: "विश्वसनीय वैश्विक एवं सार्वजनिक स्वास्थ्य नीति",
        recSolution: "अनुशंसित समाधान:",
        source: "स्रोत संस्था:",
        whyHelp: "यह क्यों सहायक है:",
        availableMsg: (b) => `<strong>${b}</strong> के लिए सत्यापित नीतिगत समाधान उपलब्ध हैं।`
      }
    };
    const tSol = cardLabels[langKey] || cardLabels.en;

    const barrierLensSolutions = solutionPayload.barrierLensSolutions || solutionPayload.internalSolutions || [];
    const externalSolutions = solutionPayload.externalSolutions || solutionPayload.solutions || [];
    const barrierName = solutionPayload.barrier || "Healthcare Access Barrier";

    // 1. BarrierLens Evidence Section
    const barrierLensHtml = barrierLensSolutions.length > 0 ? `
      <div class="bl-solution-section-barrierlens" style="margin-bottom: 14px; background: #eff6ff; border: 1.5px solid #3b82f6; border-radius: 8px; padding: 12px;">
        <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
          <span style="font-size: 0.75rem; font-weight: 800; background: #2563eb; color: #ffffff; padding: 2px 8px; border-radius: 4px; text-transform: uppercase;">
            ${tSol.blTag}
          </span>
          <span style="font-size: 0.8rem; font-weight: 600; color: #1d4ed8;">${tSol.blSubtitle}</span>
        </div>
        <ul style="margin: 4px 0 0 18px; padding: 0; font-size: 0.85rem; color: #1e3a8a; line-height: 1.45;">
          ${barrierLensSolutions.map(s => `<li><strong>${s.title || 'Intervention'}:</strong> ${s.desc || s.solution || s}</li>`).join('')}
        </ul>
      </div>
    ` : '';

    // 2. External Evidence Section
    const externalHtml = externalSolutions.length > 0 ? `
      <div class="bl-solution-section-external" style="background: #fdf4ff; border: 1.5px solid #c084fc; border-radius: 8px; padding: 12px;">
        <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 8px;">
          <span style="font-size: 0.75rem; font-weight: 800; background: #9333ea; color: #ffffff; padding: 2px 8px; border-radius: 4px; text-transform: uppercase;">
            ${tSol.extTag}
          </span>
          <span style="font-size: 0.8rem; font-weight: 600; color: #7e22ce;">${tSol.extSubtitle}</span>
        </div>

        ${externalSolutions.map((ext, idx) => `
          <div style="background: #ffffff; border: 1px solid #e9d5ff; border-radius: 6px; padding: 10px; margin-bottom: ${idx === externalSolutions.length - 1 ? '0' : '8px'};">
            <div style="font-weight: 700; font-size: 0.875rem; color: #581c87; margin-bottom: 4px;">
              ${tSol.recSolution} <span style="color: #0f172a;">${ext.recommendedSolution || ext.solution || ext.title || 'Policy Recommendation'}</span>
            </div>
            <div style="font-size: 0.8rem; color: #475569; margin-bottom: 4px;">
              <strong>${tSol.source}</strong> <span style="color: #7e22ce; font-weight: 600;">${ext.source || ext.organization || 'WHO / MoHFW'}</span>
            </div>
            <div style="font-size: 0.8rem; color: #334155; line-height: 1.4;">
              <strong>${tSol.whyHelp}</strong> ${ext.whyItMayHelp || ext.why_it_may_help || ext.rationale || 'Supported by international public health evidence.'}
            </div>
          </div>
        `).join('')}
      </div>
    ` : '';

    if (!barrierLensHtml && !externalHtml) {
      return `
        <div style="padding: 12px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.85rem; color: #475569;">
          ${tSol.availableMsg(barrierName)}
        </div>
      `;
    }

    return `
      <div class="bl-solution-card-wrapper" style="margin: 10px 0; font-family: system-ui, -apple-system, sans-serif;">
        ${barrierLensHtml}
        ${externalHtml}
      </div>
    `;
  }

  return {
    render
  };
}));
