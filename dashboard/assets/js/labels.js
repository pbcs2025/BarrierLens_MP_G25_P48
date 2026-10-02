// Shared Rail A / Rail B & Authoritative Variable Labeling utilities for BarrierLens Dashboard
// Authoritative NFHS-5 Variable Definitions from Column Reference PDF

const COLUMN_DICTIONARY = {
  caseid: "Unique Respondent ID",
  v001: "Cluster (Primary Sampling Unit) Number",
  v002: "Household Number",
  v021: "Sample Cluster Number",
  v024: "State/Union Territory",
  v025: "Type of Residence (Urban/Rural)",
  v012: "Respondent's Current Age",
  v013: "Age Group (5-Year Groups)",
  v106: "Highest Educational Level",
  v130: "Religion",
  v131: "Caste/Tribe",
  v501: "Current Marital Status",
  v717: "Current Occupation",
  v190: "Wealth Index Quintile",
  v169a: "Household Has a Mobile Phone",
  v170: "Household Has a Bank Account",
  v481: "Covered by Health Insurance",
  v157: "Frequency of Reading Newspapers/Magazines",
  v158: "Frequency of Listening to Radio",
  v159: "Frequency of Watching Television",
  v743f: "Respondent Owns a Mobile Phone",
  v466: "Owns and Uses the Internet",
  v467b: "Used the Internet in the Last 12 Months",
  v467c: "Frequency of Internet Use",
  v467d: "Uses Internet Almost Every Day",
  v467e: "Uses Internet At Least Once a Week",
  v467g: "Uses Internet Less Than Once a Week",
  v467h: "Never Uses the Internet",
  v626a: "Unmet Need for Family Planning"
};

const DUMMY_FEATURE_MAP = {
  "v130_christian": "Religion: Christian",
  "v130_hindu": "Religion: Hindu",
  "v130_muslim": "Religion: Muslim",
  "v130_sikh": "Religion: Sikh",
  "v130_buddhist": "Religion: Buddhist/Neo-Buddhist",
  "v130_no religion": "Religion: No Religion",
  "v130_other": "Religion: Other Religion",
  "v190_poorest": "Wealth Index: Poorest",
  "v190_poorer": "Wealth Index: Poorer",
  "v190_middle": "Wealth Index: Middle",
  "v190_richer": "Wealth Index: Richer",
  "v190_richest": "Wealth Index: Richest",
  "v106_no education": "Highest Educational Level: No Education",
  "v106_primary": "Highest Educational Level: Primary",
  "v106_secondary": "Highest Educational Level: Secondary",
  "v106_higher": "Highest Educational Level: Higher",
  "v501_married": "Current Marital Status: Married",
  "v501_currently married": "Current Marital Status: Currently Married",
  "v501_never married": "Current Marital Status: Never Married",
  "v501_widowed": "Current Marital Status: Widowed",
  "v501_divorced / separated": "Current Marital Status: Divorced / Separated",
  "v131_no caste / tribe": "Caste/Tribe: No Caste/Tribe",
  "v131_scheduled caste": "Caste/Tribe: Scheduled Caste (SC)",
  "v131_scheduled tribe": "Caste/Tribe: Scheduled Tribe (ST)",
  "v131_obc": "Caste/Tribe: Other Backward Class (OBC)",
  "v717_agricultural": "Current Occupation: Agricultural Laborer",
  "v717_not working": "Current Occupation: Not Working",
  "v717_professional / technical / managerial": "Current Occupation: Professional/Technical",
  "v717_clerical": "Current Occupation: Clerical",
  "v717_sales": "Current Occupation: Sales / Business",
  "v717_services": "Current Occupation: Services",
  "v717_skilled manual": "Current Occupation: Skilled Manual",
  "v717_unskilled manual": "Current Occupation: Unskilled Manual",
  "v025_rural": "Type of Residence: Rural",
  "v025_urban": "Type of Residence: Urban",
  "v012": "Respondent's Current Age",
  "v012_age": "Respondent's Current Age (Years)",
  "v013_15-19": "Age Group: 15–19 Years",
  "v013_20-24": "Age Group: 20–24 Years",
  "v013_25-29": "Age Group: 25–29 Years",
  "v013_30-34": "Age Group: 30–34 Years",
  "v013_35-39": "Age Group: 35–39 Years",
  "v013_40-44": "Age Group: 40–44 Years",
  "v013_45-49": "Age Group: 45–49 Years",
  "3f_respondent and husband/partner": "Respondent Mobile Phone: Jointly with Spouse",
  "media_exposure_index": "Media Exposure Index",
  "v157_not at all": "Reading Newspapers/Magazines: Not at all",
  "v158_not at all": "Listening to Radio: Not at all",
  "v159_not at all": "Watching Television: Not at all",
  "v743f_missing": "Respondent Mobile Phone Ownership: Missing/Not Stated",
  "v743f_respondent and husband/partner": "Respondent Mobile Phone Ownership: Jointly with Spouse",
  "v743f_respondent alone": "Respondent Mobile Phone Ownership: Owns Alone",
  "v743f_does not own": "Respondent Mobile Phone Ownership: Does Not Own",
  "v466_yes": "Owns and Uses Internet: Yes",
  "v466_no": "Owns and Uses Internet: No",
  "v169a_yes": "Household Has a Mobile Phone: Yes",
  "v169a_no": "Household Has a Mobile Phone: No",
  "v170_yes": "Household Bank Account: Has Account",
  "v170_no": "Household Bank Account: No Account",
  "v481_yes": "Covered by Health Insurance: Yes",
  "v481_no": "Covered by Health Insurance: No"
};

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
  }
};

const LabelRenderer = {
  getVariableLabel: function (code) {
    if (!code) return "";
    const cleanCode = String(code).trim().toLowerCase();
    return COLUMN_DICTIONARY[cleanCode] || COLUMN_DICTIONARY[code] || code;
  },

  formatFeatureName: function (rawFeature) {
    if (!rawFeature) return "";
    let str = String(rawFeature).trim();

    // Preserve parenthetical target suffixes if present, e.g. " (logistic)" or " (household)"
    let suffix = "";
    if (str.includes(" (") && str.endsWith(")")) {
      const idx = str.indexOf(" (");
      suffix = str.substring(idx);
      str = str.substring(0, idx).trim();
    }

    const lower = str.toLowerCase();
    let result = str;

    if (DUMMY_FEATURE_MAP[lower]) {
      result = DUMMY_FEATURE_MAP[lower];
    } else if (COLUMN_DICTIONARY[lower]) {
      result = COLUMN_DICTIONARY[lower];
    } else if (str.includes("_")) {
      const parts = str.split("_");
      const code = parts[0].toLowerCase();
      const val = parts.slice(1).join(" ");

      if (COLUMN_DICTIONARY[code]) {
        const varLabel = COLUMN_DICTIONARY[code];
        const formattedVal = val.charAt(0).toUpperCase() + val.slice(1);
        result = `${varLabel}: ${formattedVal}`;
      }
    }

    return result + suffix;
  },

  renderRailBadge: function (railType, customLabel) {
    const key = String(railType || "B").toUpperCase();
    const config = RAIL_CONFIG[key] || RAIL_CONFIG.B;
    const labelText = customLabel || config.fullLabel;
    const badgeClass = config.cssClass === "rail-badge-a" ? "rail-badge-a" : "rail-badge-b";
    return `<span class="rail-badge ${badgeClass}" title="${config.description}">
      <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor"><circle cx="4" cy="4" r="4"/></svg>
      ${labelText}
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
        <span>Data &amp; Methodology Notes</span>
      </div>
      <p class="methodology-text">
        <strong>Sample Scope:</strong> Published reference benchmark statistics (Pradhan &amp; De, 2025) rely on an ever-married sample (N &approx; 108,785) across 8 sub-items. BarrierLens machine learning predictions leverage the full nationwide NFHS-5 dataset (N = 724,115) across available barrier indicators. NFHS-5 is cross-sectional &mdash; all associations are reported as observed or predictive model contributions, not causal effects.
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
    if (or > 1.05) return { label: "Higher odds of barrier (OR > 1)", cssClass: "or-risk" };
    if (or < 0.95) return { label: "Lower odds of barrier (OR < 1)", cssClass: "or-protective" };
    return { label: "Little association (OR ≈ 1)", cssClass: "or-neutral" };
  }
};
