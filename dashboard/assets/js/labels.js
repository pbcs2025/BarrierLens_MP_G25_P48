// Shared Rail A / Rail B labeling utilities for BarrierLens Dashboard
// Used by all dashboard pages (Members 1–4)

const RAIL_CONFIG = {
  A: {
    cssClass: "rail-badge-a",
    shortLabel: "Rail A",
    fullLabel: "Rail A — Observed / Reference Base Paper Statistic",
    description: "Published NFHS-5 reference statistics or directly observed prevalence from the survey extract."
  },
  B: {
    cssClass: "rail-badge-b",
    shortLabel: "Rail B",
    fullLabel: "Rail B — BarrierLens ML Prediction",
    description: "Model-computed statistics from BarrierLens Stage 1 / Stage 2 pipelines."
  },
  B_STAGE1: {
    cssClass: "rail-badge-b",
    shortLabel: "Rail B",
    fullLabel: "Rail B — Stage 1 ML Prediction",
    description: "Stage 1 logistic regression / ensemble out-of-fold barrier predictions."
  },
  B_STAGE2: {
    cssClass: "rail-badge-b",
    shortLabel: "Rail B",
    fullLabel: "Rail B — Stage 2 ML Prediction",
    description: "Stage 2 models predicting health outcomes (e.g., unmet FP) with barrier probabilities."
  },
  B_CLUSTER: {
    cssClass: "rail-badge-b",
    shortLabel: "Rail B",
    fullLabel: "Rail B — K-Means Risk Analysis",
    description: "K-Means cluster membership and vulnerability archetype profiles."
  },
  B_SHAP: {
    cssClass: "rail-badge-b",
    shortLabel: "Rail B",
    fullLabel: "Rail B — SHAP Explainability",
    description: "SHAP feature attributions from Random Forest / XGBoost models."
  }
};

function createRailABadge(type) {
  return LabelRenderer.renderRailBadge(type);
}

const LabelRenderer = {
  renderRailBadge: function (railType) {
    const key = String(railType || "B").toUpperCase();
    const config = RAIL_CONFIG[key] || RAIL_CONFIG.B;
    const badgeClass = config.cssClass === "rail-badge-a" ? "rail-badge-a" : "rail-badge-b";
    return `<span class="rail-badge ${badgeClass}" title="${config.description}">
      <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor"><circle cx="4" cy="4" r="4"/></svg>
      ${config.fullLabel}
    </span>`;
  },

  renderRailLegend: function () {
    return `<div class="rail-legend" style="display:flex; flex-wrap:wrap; gap:12px; align-items:center;">
      ${this.renderRailBadge("A")}
      ${this.renderRailBadge("B")}
    </div>`;
  },

  renderMethodologyNote: function () {
    return `<div class="methodology-card">
      <div class="methodology-header">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
        <span>Data & Methodology Notes</span>
      </div>
      <p class="methodology-text">
        <strong>Sample Scope:</strong> Published reference benchmark statistics (Pradhan &amp; De, 2025) rely on an ever-married sample (N ≈ 108,785) across 8 sub-items. BarrierLens machine learning predictions leverage the full nationwide NFHS-5 dataset (N = 724,115) across 6 available barrier indicators (<code style="font-size:0.8rem; background:#e2e8f0; padding:1px 4px; border-radius:3px;">v467f</code> &amp; <code style="font-size:0.8rem; background:#e2e8f0; padding:1px 4px; border-radius:3px;">v467i</code> omitted in public recode). NFHS-5 is cross-sectional — all associations are reported as observed or predictive, not causal.
      </p>
    </div>`;
  },

  renderDataUnavailable: function (message) {
    const text = message || "BarrierLens comparison data is not available for this metric.";
    return `<div class="callout callout-warning">${text}</div>`;
  },

  formatPercent: function (value, decimals) {
    if (value == null || isNaN(value)) return "—";
    const d = decimals != null ? decimals : 1;
    const pct = value <= 1 ? value * 100 : value;
    return pct.toFixed(d) + "%";
  },

  interpretOddsRatio: function (or) {
    if (or == null || isNaN(or)) return { label: "Unknown", cssClass: "or-neutral" };
    if (or > 1.05) return { label: "Higher odds (OR > 1)", cssClass: "or-risk" };
    if (or < 0.95) return { label: "Lower odds (OR < 1)", cssClass: "or-protective" };
    return { label: "Little association (OR ≈ 1)", cssClass: "or-neutral" };
  },

  describeAssociation: function (factorLabel, rateWith, rateWithout, barrierLabel) {
    if (rateWith == null || rateWithout == null) {
      return `Association between ${factorLabel} and ${barrierLabel} could not be computed from available data.`;
    }
    const diff = rateWith - rateWithout;
    const direction = diff < -0.001 ? "lower" : diff > 0.001 ? "higher" : "similar";
    return `Women with ${factorLabel} showed a ${direction} observed ${barrierLabel} rate in this dataset (${this.formatPercent(rateWith)} vs ${this.formatPercent(rateWithout)}). This reflects a cross-sectional association, not a causal effect.`;
  },

  renderAssociationCallout: function (text) {
    return `<div class="callout">${text}</div>`;
  }
};
