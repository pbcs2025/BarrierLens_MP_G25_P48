// Shared Rail A / Rail B Badge Component
const LabelRenderer = {
  renderRailBadge: function (railType) {
    if (railType === "A" || railType === "observed") {
      return `<span class="rail-badge rail-badge-a">
        <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor"><circle cx="4" cy="4" r="4"/></svg>
        Rail A — Observed NFHS-5 / Base Paper
      </span>`;
    } else {
      return `<span class="rail-badge rail-badge-b">
        <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor"><circle cx="4" cy="4" r="4"/></svg>
        Rail B — BarrierLens ML Prediction
      </span>`;
    }
  },
  renderMethodologyNote: function () {
    return `<div class="methodology-card">
      <div class="methodology-header">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
        <span>Data & Methodology Notes</span>
      </div>
      <p class="methodology-text">
        <strong>Sample Scope:</strong> Published reference benchmark statistics (Pradhan & De, 2025) rely on an ever-married sample ($N=108,785$) across 8 sub-items. BarrierLens machine learning predictions leverage the full nationwide NFHS-5 dataset ($N=724,115$) across 6 available barrier indicators (<code style="font-size:0.8rem; background:#e2e8f0; padding:1px 4px; border-radius:3px;">v467f</code> & <code style="font-size:0.8rem; background:#e2e8f0; padding:1px 4px; border-radius:3px;">v467i</code> omitted in public recode). Metrics reflect macro-level comparability.
      </p>
    </div>`;
  }
};

