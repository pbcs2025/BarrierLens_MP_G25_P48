/**
 * BARRIERLENS — MEMBER 4: EVIDENCE CARD RENDERER (`evidence-card.jsx`)
 * Shared evidence card component for both Mode 1 (ML Prediction) and Mode 2 (Explore Barriers).
 * Displays verified BarrierLens findings, prevalence statistics, affected states/groups, comparisons,
 * and source attribution. Strictly grounded in NFHS-5 data without fabricated values.
 * Dual environment support: Browser (window.BarrierLensEvidenceCard) & Node.js (module.exports).
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.BarrierLensEvidenceCard = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function render(evidencePayload, options = {}) {
    if (!evidencePayload) return '';

    const barrierName = evidencePayload.activeBarrier || evidencePayload.barrier || "Healthcare Access Barrier";
    const barrierExplanation = evidencePayload.explanation || evidencePayload.summary || "Verified evidence from NFHS-5 national recode dataset (N=724,115 Indian women).";
    const statistics = evidencePayload.statistics || evidencePayload.metrics || [];
    const affectedStates = evidencePayload.affectedStates || evidencePayload.states || [];
    const affectedGroups = evidencePayload.affectedGroups || evidencePayload.demographics || [];
    const comparisons = evidencePayload.comparisons || evidencePayload.calculations || [];
    const sources = evidencePayload.source || evidencePayload.sources || ["NFHS-5 Individual Recode (IAIR7EFL)"];

    // Render Metrics Badges
    const metricsHtml = statistics.length > 0 ? `
      <div style="margin: 10px 0;">
        <div style="font-size: 0.8rem; font-weight: 700; color: #475569; margin-bottom: 6px; text-transform: uppercase;">Verified Statistics</div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 8px;">
          ${statistics.map(s => `
            <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; text-align: center;">
              <div style="font-size: 1.15rem; font-weight: 800; color: #1e3a8a;">${s.value || s.val}${s.unit || '%'}</div>
              <div style="font-size: 0.75rem; color: #64748b; margin-top: 2px;">${s.label || s.metric}</div>
            </div>
          `).join('')}
        </div>
      </div>
    ` : '';

    // Render Affected States & Demographic Groups
    let groupsHtml = '';
    if (affectedStates.length > 0 || affectedGroups.length > 0) {
      groupsHtml = `
        <div style="margin: 10px 0; padding: 10px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 0.825rem;">
          ${affectedStates.length > 0 ? `
            <div style="margin-bottom: 6px;">
              <strong style="color: #0f172a;">Highest Prevalence States:</strong>
              <span style="color: #334155;"> ${affectedStates.join(', ')}</span>
            </div>
          ` : ''}
          ${affectedGroups.length > 0 ? `
            <div>
              <strong style="color: #0f172a;">Most Affected Groups:</strong>
              <span style="color: #334155;"> ${affectedGroups.join(', ')}</span>
            </div>
          ` : ''}
        </div>
      `;
    }

    // Render Derived Comparisons
    const comparisonsHtml = comparisons.length > 0 ? `
      <div style="margin: 10px 0; font-size: 0.825rem; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 8px 10px;">
        <strong style="color: #166534;">Calculated Disparity Analysis:</strong>
        <ul style="margin: 4px 0 0 16px; padding: 0; color: #15803d;">
          ${comparisons.map(c => `<li>${c.interpretation || c.label || c}</li>`).join('')}
        </ul>
      </div>
    ` : '';

    // Render Source Attribution Tag
    const sourcesText = Array.isArray(sources) ? sources.join(' • ') : String(sources);

    return `
      <div class="bl-evidence-card-container" style="background: #ffffff; border: 1.5px solid #2563eb; border-radius: 10px; padding: 14px; margin: 10px 0; font-family: system-ui, -apple-system, sans-serif; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
        <!-- Title Badge -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span style="font-size: 0.75rem; font-weight: 800; background: #2563eb; color: #ffffff; padding: 3px 8px; border-radius: 4px; text-transform: uppercase;">
            BarrierLens Evidence
          </span>
          <span style="font-size: 0.75rem; font-weight: 600; color: #2563eb;">${barrierName}</span>
        </div>

        <!-- Explanation -->
        <p style="margin: 0 0 8px 0; font-size: 0.875rem; color: #1e293b; line-height: 1.5;">
          ${barrierExplanation}
        </p>

        ${metricsHtml}
        ${groupsHtml}
        ${comparisonsHtml}

        <!-- Source Attribution Footer -->
        <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid #e2e8f0; font-size: 0.75rem; color: #64748b; display: flex; align-items: center; gap: 4px;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
          <span>Source: <strong>${sourcesText}</strong></span>
        </div>
      </div>
    `;
  }

  return {
    render
  };
}));
