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
    return `<div class="callout">
      <strong>Methodological Note:</strong> Base Paper reference statistics are drawn from Pradhan & De (2025) using an ever-married sample (N=108,785) across 8 barrier sub-items. BarrierLens predictions are derived from the full NFHS-5 sample (N=724,115) using 6 available sub-items (v467f & v467i absent). Values are broadly comparable, not identical.
    </div>`;
  }
};
