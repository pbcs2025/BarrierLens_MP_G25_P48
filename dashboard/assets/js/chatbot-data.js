/**
 * BARRIERLENS — MEMBER 1: CHATBOT DATA REGISTRY & LOADER
 * Central data configuration, asynchronous loader, cache management, embedded fallbacks, and multilingual term mapping.
 * Dual environment support: Browser (fetch) & Node.js (fs).
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.BarrierLensData = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /**
   * Central Data Source Registry mapping keys to relative file paths and metadata.
   */
  const CHATBOT_DATA_SOURCES = {
    nationalOverview: {
      file: "dashboard/assets/data/national_overview.json",
      purpose: "National-level BarrierLens overview"
    },
    stateSummary: {
      file: "dashboard/assets/data/state_summary.json",
      purpose: "State-level healthcare access barrier analysis"
    },
    demographicSummary: {
      file: "dashboard/assets/data/demographic_summary.json",
      purpose: "Socio-demographic barrier breakdown (wealth, education, age, etc.)"
    },
    ruralUrbanSummary: {
      file: "dashboard/assets/data/rural_urban_summary.json",
      purpose: "Rural vs Urban healthcare barrier comparison"
    },
    clusterSummary: {
      file: "dashboard/assets/data/cluster_summary.json",
      purpose: "K-Means cluster risk archetypes"
    },
    regressionSummary: {
      file: "dashboard/assets/data/regression_summary.json",
      purpose: "Stage 1 logistic regression odds ratios and coefficients"
    },
    outcomeImpactSummary: {
      file: "dashboard/assets/data/outcome_impact_summary.json",
      purpose: "Stage 2 healthcare utilization impact (unmet FP & ANC gap)"
    },
    empowermentSummary: {
      file: "dashboard/assets/data/empowerment_summary.json",
      purpose: "Household empowerment and medical autonomy analysis"
    },
    multipleBarrierSummary: {
      file: "dashboard/assets/data/multiple_barrier_summary.json",
      purpose: "Multiple overlapping barrier count analysis (0-3 barriers)"
    },
    basePaperReference: {
      file: "dashboard/assets/data/base_paper_reference.json",
      purpose: "Base paper reference findings (Pradhan & De, 2025)"
    },
    validationReport: {
      file: "dashboard/assets/data/validation_report.json",
      purpose: "Verified data integrity & validation report"
    }
  };

  /**
   * Verified Embedded Data Fallbacks guaranteeing 100% data availability
   * even if network fetch or file path resolution fails.
   */
  const EMBEDDED_DATA_FALLBACKS = {
  "basePaperReference": {
    "metadata": {
      "title": "Base Paper Reference Statistics (Pradhan & De, 2025)",
      "source": "Published base-paper findings — NFHS-5 cross-sectional survey",
      "sample_note": "Ever-married women subset (N ≈ 108,785) with 8 barrier sub-items",
      "rail_label": "Rail A — Observed / Reference Base Paper Statistic",
      "comparability_note": "BarrierLens uses the full NFHS-5 extract (N = 724,115) with 6 barrier indicators. National rates are broadly comparable but not identical."
    },
    "national_prevalence": {
      "at_least_one_barrier": 0.84,
      "facility_barrier": 0.553,
      "logistic_barrier": 0.505,
      "household_barrier": 0.246
    },
    "highest_barrier_states": [
      "Chhattisgarh",
      "Arunachal Pradesh",
      "Nagaland"
    ],
    "lowest_barrier_state": {
      "state_name": "Kerala",
      "household_barrier": 0.017,
      "logistic_barrier": 0.075,
      "facility_barrier": 0.032
    },
    "protective_factors": [
      {
        "factor": "Higher education",
        "reported_direction": "AOR < 1",
        "interpretation": "Associated with lower odds of barriers in the base paper"
      },
      {
        "factor": "Mass media exposure",
        "reported_direction": "AOR < 1",
        "interpretation": "Associated with lower odds of barriers in the base paper"
      },
      {
        "factor": "Professional occupation",
        "reported_direction": "AOR < 1",
        "interpretation": "Associated with lower odds of barriers in the base paper"
      },
      {
        "factor": "Bank account",
        "reported_direction": "AOR < 1",
        "interpretation": "Associated with lower odds of barriers in the base paper"
      },
      {
        "factor": "Mobile phone",
        "reported_direction": "AOR < 1",
        "interpretation": "Associated with lower odds of barriers in the base paper"
      },
      {
        "factor": "Rich wealth",
        "reported_direction": "AOR < 1",
        "interpretation": "Associated with lower odds of barriers in the base paper"
      },
      {
        "factor": "Age 35–49",
        "reported_direction": "AOR < 1",
        "interpretation": "Associated with lower odds of barriers in the base paper"
      }
    ],
    "risk_factors": [
      {
        "factor": "SC & ST caste",
        "reported_direction": "AOR > 1",
        "interpretation": "Associated with higher odds of barriers in the base paper"
      },
      {
        "factor": "Muslim religion",
        "reported_direction": "AOR > 1",
        "interpretation": "Associated with higher odds of barriers in the base paper"
      },
      {
        "factor": "Agricultural occupation",
        "reported_direction": "AOR > 1",
        "interpretation": "Associated with higher odds of barriers in the base paper"
      },
      {
        "factor": "Rural residence",
        "reported_direction": "AOR > 1",
        "interpretation": "Associated with higher odds of barriers in the base paper"
      },
      {
        "factor": "Poor wealth",
        "reported_direction": "AOR > 1",
        "interpretation": "Associated with higher odds of barriers in the base paper"
      }
    ]
  },
  "clusterSummary": {
    "metadata": {
      "title": "K-Means Cluster Archetype Summary (k=2 confirmed)",
      "total_women": 724115,
      "k_selected": 2,
      "silhouette_score_k2": 0.3986
    },
    "clusters": [
      {
        "cluster_id": 0,
        "archetype_name": "High Vulnerability, High Barrier Exposure",
        "sample_size_n": 383077,
        "pct_total_women": 0.529,
        "media_exposure_index": 0.3493,
        "digital_inclusion_index": 0.0794,
        "vulnerability_score": 0.7694,
        "predicted_household_prob": 0.5907,
        "predicted_logistic_prob": 0.5957,
        "predicted_facility_prob": 0.5741,
        "predicted_composite_score": 0.5868
      },
      {
        "cluster_id": 1,
        "archetype_name": "High Media & Digital Inclusion",
        "sample_size_n": 341038,
        "pct_total_women": 0.471,
        "media_exposure_index": 0.9149,
        "digital_inclusion_index": 0.1225,
        "vulnerability_score": 0.2623,
        "predicted_household_prob": 0.3557,
        "predicted_logistic_prob": 0.3588,
        "predicted_facility_prob": 0.4137,
        "predicted_composite_score": 0.3761
      }
    ]
  },
  "demographicSummary": {
    "metadata": {
      "title": "Socio-Demographic Healthcare Barrier Breakdown",
      "suppression_threshold": 30,
      "total_women": 724115,
      "dimensions": [
        "Age (v013)",
        "Education (v106)",
        "Wealth (v190)",
        "Residence (v025)",
        "Occupation / Employment (v717)"
      ],
      "targets": [
        "target_household",
        "target_logistic",
        "target_facility"
      ]
    },
    "by_wealth": [
      {
        "group_keys": {
          "wealth_clean": "Middle"
        },
        "sample_size_n": 151505,
        "pct_national_sample": 0.2092,
        "suppressed": false,
        "observed_household_rate": 0.2535,
        "observed_logistic_rate": 0.3058,
        "observed_facility_rate": 0.4518,
        "observed_any_barrier_rate": 0.5869,
        "predicted_household_prob": 0.4713,
        "predicted_logistic_prob": 0.4849,
        "predicted_facility_prob": 0.491
      },
      {
        "group_keys": {
          "wealth_clean": "Poorer"
        },
        "sample_size_n": 160340,
        "pct_national_sample": 0.2214,
        "suppressed": false,
        "observed_household_rate": 0.3269,
        "observed_logistic_rate": 0.3807,
        "observed_facility_rate": 0.508,
        "observed_any_barrier_rate": 0.6647,
        "predicted_household_prob": 0.5603,
        "predicted_logistic_prob": 0.567,
        "predicted_facility_prob": 0.5472
      },
      {
        "group_keys": {
          "wealth_clean": "Poorest"
        },
        "sample_size_n": 149844,
        "pct_national_sample": 0.2069,
        "suppressed": false,
        "observed_household_rate": 0.4237,
        "observed_logistic_rate": 0.4775,
        "observed_facility_rate": 0.589,
        "observed_any_barrier_rate": 0.7562,
        "predicted_household_prob": 0.6587,
        "predicted_logistic_prob": 0.6602,
        "predicted_facility_prob": 0.6264
      },
      {
        "group_keys": {
          "wealth_clean": "Richer"
        },
        "sample_size_n": 139607,
        "pct_national_sample": 0.1928,
        "suppressed": false,
        "observed_household_rate": 0.1929,
        "observed_logistic_rate": 0.2314,
        "observed_facility_rate": 0.4002,
        "observed_any_barrier_rate": 0.5089,
        "predicted_household_prob": 0.3834,
        "predicted_logistic_prob": 0.3896,
        "predicted_facility_prob": 0.4379
      },
      {
        "group_keys": {
          "wealth_clean": "Richest"
        },
        "sample_size_n": 122819,
        "pct_national_sample": 0.1696,
        "suppressed": false,
        "observed_household_rate": 0.1254,
        "observed_logistic_rate": 0.1436,
        "observed_facility_rate": 0.3184,
        "observed_any_barrier_rate": 0.3953,
        "predicted_household_prob": 0.2709,
        "predicted_logistic_prob": 0.2608,
        "predicted_facility_prob": 0.3529
      }
    ],
    "by_residence": [
      {
        "group_keys": {
          "residence_clean": "Rural"
        },
        "sample_size_n": 544580,
        "pct_national_sample": 0.7521,
        "suppressed": false,
        "observed_household_rate": 0.2995,
        "observed_logistic_rate": 0.363,
        "observed_facility_rate": 0.4918,
        "observed_any_barrier_rate": 0.6349,
        "predicted_household_prob": 0.5157,
        "predicted_logistic_prob": 0.5225,
        "predicted_facility_prob": 0.523
      },
      {
        "group_keys": {
          "residence_clean": "Urban"
        },
        "sample_size_n": 179535,
        "pct_national_sample": 0.2479,
        "suppressed": false,
        "observed_household_rate": 0.1868,
        "observed_logistic_rate": 0.1736,
        "observed_facility_rate": 0.3637,
        "observed_any_barrier_rate": 0.4603,
        "predicted_household_prob": 0.367,
        "predicted_logistic_prob": 0.3631,
        "predicted_facility_prob": 0.4214
      }
    ],
    "by_education": [
      {
        "group_keys": {
          "education_clean": "Higher"
        },
        "sample_size_n": 101816,
        "pct_national_sample": 0.1406,
        "suppressed": false,
        "observed_household_rate": 0.152,
        "observed_logistic_rate": 0.1886,
        "observed_facility_rate": 0.355,
        "observed_any_barrier_rate": 0.4471,
        "predicted_household_prob": 0.3139,
        "predicted_logistic_prob": 0.3235,
        "predicted_facility_prob": 0.3925
      },
      {
        "group_keys": {
          "education_clean": "No Education"
        },
        "sample_size_n": 167304,
        "pct_national_sample": 0.231,
        "suppressed": false,
        "observed_household_rate": 0.3492,
        "observed_logistic_rate": 0.4053,
        "observed_facility_rate": 0.5245,
        "observed_any_barrier_rate": 0.6786,
        "predicted_household_prob": 0.5777,
        "predicted_logistic_prob": 0.5862,
        "predicted_facility_prob": 0.5621
      },
      {
        "group_keys": {
          "education_clean": "Primary"
        },
        "sample_size_n": 84983,
        "pct_national_sample": 0.1174,
        "suppressed": false,
        "observed_household_rate": 0.321,
        "observed_logistic_rate": 0.3657,
        "observed_facility_rate": 0.4991,
        "observed_any_barrier_rate": 0.6499,
        "predicted_household_prob": 0.5419,
        "predicted_logistic_prob": 0.5427,
        "predicted_facility_prob": 0.5368
      },
      {
        "group_keys": {
          "education_clean": "Secondary"
        },
        "sample_size_n": 370012,
        "pct_national_sample": 0.511,
        "suppressed": false,
        "observed_household_rate": 0.258,
        "observed_logistic_rate": 0.2994,
        "observed_facility_rate": 0.4509,
        "observed_any_barrier_rate": 0.5787,
        "predicted_household_prob": 0.4651,
        "predicted_logistic_prob": 0.4665,
        "predicted_facility_prob": 0.4888
      }
    ],
    "by_age": [
      {
        "group_keys": {
          "age_clean": "15-19"
        },
        "sample_size_n": 122480,
        "pct_national_sample": 0.1691,
        "suppressed": false,
        "observed_household_rate": 0.2899,
        "observed_logistic_rate": 0.326,
        "observed_facility_rate": 0.4811,
        "observed_any_barrier_rate": 0.611,
        "predicted_household_prob": 0.5061,
        "predicted_logistic_prob": 0.4973,
        "predicted_facility_prob": 0.5196
      },
      {
        "group_keys": {
          "age_clean": "20-24"
        },
        "sample_size_n": 118700,
        "pct_national_sample": 0.1639,
        "suppressed": false,
        "observed_household_rate": 0.2703,
        "observed_logistic_rate": 0.3109,
        "observed_facility_rate": 0.468,
        "observed_any_barrier_rate": 0.5956,
        "predicted_household_prob": 0.4797,
        "predicted_logistic_prob": 0.4788,
        "predicted_facility_prob": 0.5062
      },
      {
        "group_keys": {
          "age_clean": "25-29"
        },
        "sample_size_n": 118379,
        "pct_national_sample": 0.1635,
        "suppressed": false,
        "observed_household_rate": 0.2688,
        "observed_logistic_rate": 0.311,
        "observed_facility_rate": 0.4574,
        "observed_any_barrier_rate": 0.5879,
        "predicted_household_prob": 0.4757,
        "predicted_logistic_prob": 0.4772,
        "predicted_facility_prob": 0.4952
      },
      {
        "group_keys": {
          "age_clean": "30-34"
        },
        "sample_size_n": 101049,
        "pct_national_sample": 0.1395,
        "suppressed": false,
        "observed_household_rate": 0.2675,
        "observed_logistic_rate": 0.3149,
        "observed_facility_rate": 0.4567,
        "observed_any_barrier_rate": 0.5867,
        "predicted_household_prob": 0.4721,
        "predicted_logistic_prob": 0.4802,
        "predicted_facility_prob": 0.4942
      },
      {
        "group_keys": {
          "age_clean": "35-39"
        },
        "sample_size_n": 98068,
        "pct_national_sample": 0.1354,
        "suppressed": false,
        "observed_household_rate": 0.2687,
        "observed_logistic_rate": 0.3184,
        "observed_facility_rate": 0.454,
        "observed_any_barrier_rate": 0.5887,
        "predicted_household_prob": 0.4742,
        "predicted_logistic_prob": 0.4844,
        "predicted_facility_prob": 0.4914
      },
      {
        "group_keys": {
          "age_clean": "40-44"
        },
        "sample_size_n": 81380,
        "pct_national_sample": 0.1124,
        "suppressed": false,
        "observed_household_rate": 0.2614,
        "observed_logistic_rate": 0.3126,
        "observed_facility_rate": 0.4459,
        "observed_any_barrier_rate": 0.5802,
        "predicted_household_prob": 0.4635,
        "predicted_logistic_prob": 0.4772,
        "predicted_facility_prob": 0.4832
      },
      {
        "group_keys": {
          "age_clean": "45-49"
        },
        "sample_size_n": 84059,
        "pct_national_sample": 0.1161,
        "suppressed": false,
        "observed_household_rate": 0.2684,
        "observed_logistic_rate": 0.318,
        "observed_facility_rate": 0.4468,
        "observed_any_barrier_rate": 0.5834,
        "predicted_household_prob": 0.4708,
        "predicted_logistic_prob": 0.4833,
        "predicted_facility_prob": 0.4838
      }
    ],
    "by_occupation": [
      {
        "group_keys": {
          "occupation_clean": "Agricultural"
        },
        "sample_size_n": 18031,
        "pct_national_sample": 0.0249,
        "suppressed": false,
        "observed_household_rate": 0.3279,
        "observed_logistic_rate": 0.4093,
        "observed_facility_rate": 0.5161,
        "observed_any_barrier_rate": 0.6712,
        "predicted_household_prob": 0.5497,
        "predicted_logistic_prob": 0.5848,
        "predicted_facility_prob": 0.5516
      },
      {
        "group_keys": {
          "occupation_clean": "Clerical"
        },
        "sample_size_n": 479,
        "pct_national_sample": 0.0007,
        "suppressed": false,
        "observed_household_rate": 0.19,
        "observed_logistic_rate": 0.2255,
        "observed_facility_rate": 0.3653,
        "observed_any_barrier_rate": 0.4697,
        "predicted_household_prob": 0.3242,
        "predicted_logistic_prob": 0.3344,
        "predicted_facility_prob": 0.3976
      },
      {
        "group_keys": {
          "occupation_clean": "Don't Know"
        },
        "sample_size_n": 131,
        "pct_national_sample": 0.0002,
        "suppressed": false,
        "observed_household_rate": 0.3511,
        "observed_logistic_rate": 0.3435,
        "observed_facility_rate": 0.3282,
        "observed_any_barrier_rate": 0.5573,
        "predicted_household_prob": 0.4819,
        "predicted_logistic_prob": 0.4852,
        "predicted_facility_prob": 0.3435
      },
      {
        "group_keys": {
          "occupation_clean": "Missing"
        },
        "sample_size_n": 615330,
        "pct_national_sample": 0.8498,
        "suppressed": false,
        "observed_household_rate": 0.272,
        "observed_logistic_rate": 0.3169,
        "observed_facility_rate": 0.4604,
        "observed_any_barrier_rate": 0.5922,
        "predicted_household_prob": 0.4805,
        "predicted_logistic_prob": 0.4847,
        "predicted_facility_prob": 0.4983
      },
      {
        "group_keys": {
          "occupation_clean": "Not Working"
        },
        "sample_size_n": 73809,
        "pct_national_sample": 0.1019,
        "suppressed": false,
        "observed_household_rate": 0.2598,
        "observed_logistic_rate": 0.294,
        "observed_facility_rate": 0.4535,
        "observed_any_barrier_rate": 0.5762,
        "predicted_household_prob": 0.46,
        "predicted_logistic_prob": 0.4555,
        "predicted_facility_prob": 0.4912
      },
      {
        "group_keys": {
          "occupation_clean": "Other"
        },
        "sample_size_n": 1477,
        "pct_national_sample": 0.002,
        "suppressed": false,
        "observed_household_rate": 0.2769,
        "observed_logistic_rate": 0.3439,
        "observed_facility_rate": 0.4489,
        "observed_any_barrier_rate": 0.5728,
        "predicted_household_prob": 0.4586,
        "predicted_logistic_prob": 0.4957,
        "predicted_facility_prob": 0.4853
      },
      {
        "group_keys": {
          "occupation_clean": "Professional / Technical / Managerial"
        },
        "sample_size_n": 2985,
        "pct_national_sample": 0.0041,
        "suppressed": false,
        "observed_household_rate": 0.14,
        "observed_logistic_rate": 0.1752,
        "observed_facility_rate": 0.329,
        "observed_any_barrier_rate": 0.4194,
        "predicted_household_prob": 0.2667,
        "predicted_logistic_prob": 0.2875,
        "predicted_facility_prob": 0.3625
      },
      {
        "group_keys": {
          "occupation_clean": "Sales"
        },
        "sample_size_n": 2046,
        "pct_national_sample": 0.0028,
        "suppressed": false,
        "observed_household_rate": 0.2639,
        "observed_logistic_rate": 0.2898,
        "observed_facility_rate": 0.414,
        "observed_any_barrier_rate": 0.545,
        "predicted_household_prob": 0.4495,
        "predicted_logistic_prob": 0.4445,
        "predicted_facility_prob": 0.4497
      },
      {
        "group_keys": {
          "occupation_clean": "Services / Household and Domestic"
        },
        "sample_size_n": 3433,
        "pct_national_sample": 0.0047,
        "suppressed": false,
        "observed_household_rate": 0.245,
        "observed_logistic_rate": 0.2925,
        "observed_facility_rate": 0.4232,
        "observed_any_barrier_rate": 0.5552,
        "predicted_household_prob": 0.4266,
        "predicted_logistic_prob": 0.4446,
        "predicted_facility_prob": 0.4575
      },
      {
        "group_keys": {
          "occupation_clean": "Skilled and Unskilled Manual"
        },
        "sample_size_n": 6394,
        "pct_national_sample": 0.0088,
        "suppressed": false,
        "observed_household_rate": 0.2889,
        "observed_logistic_rate": 0.3139,
        "observed_facility_rate": 0.4573,
        "observed_any_barrier_rate": 0.6128,
        "predicted_household_prob": 0.4893,
        "predicted_logistic_prob": 0.4769,
        "predicted_facility_prob": 0.4934
      }
    ],
    "by_employment": [
      {
        "group_keys": {
          "occupation_clean": "Agricultural"
        },
        "sample_size_n": 18031,
        "pct_national_sample": 0.0249,
        "suppressed": false,
        "observed_household_rate": 0.3279,
        "observed_logistic_rate": 0.4093,
        "observed_facility_rate": 0.5161,
        "observed_any_barrier_rate": 0.6712,
        "predicted_household_prob": 0.5497,
        "predicted_logistic_prob": 0.5848,
        "predicted_facility_prob": 0.5516
      },
      {
        "group_keys": {
          "occupation_clean": "Clerical"
        },
        "sample_size_n": 479,
        "pct_national_sample": 0.0007,
        "suppressed": false,
        "observed_household_rate": 0.19,
        "observed_logistic_rate": 0.2255,
        "observed_facility_rate": 0.3653,
        "observed_any_barrier_rate": 0.4697,
        "predicted_household_prob": 0.3242,
        "predicted_logistic_prob": 0.3344,
        "predicted_facility_prob": 0.3976
      },
      {
        "group_keys": {
          "occupation_clean": "Don't Know"
        },
        "sample_size_n": 131,
        "pct_national_sample": 0.0002,
        "suppressed": false,
        "observed_household_rate": 0.3511,
        "observed_logistic_rate": 0.3435,
        "observed_facility_rate": 0.3282,
        "observed_any_barrier_rate": 0.5573,
        "predicted_household_prob": 0.4819,
        "predicted_logistic_prob": 0.4852,
        "predicted_facility_prob": 0.3435
      },
      {
        "group_keys": {
          "occupation_clean": "Missing"
        },
        "sample_size_n": 615330,
        "pct_national_sample": 0.8498,
        "suppressed": false,
        "observed_household_rate": 0.272,
        "observed_logistic_rate": 0.3169,
        "observed_facility_rate": 0.4604,
        "observed_any_barrier_rate": 0.5922,
        "predicted_household_prob": 0.4805,
        "predicted_logistic_prob": 0.4847,
        "predicted_facility_prob": 0.4983
      },
      {
        "group_keys": {
          "occupation_clean": "Not Working"
        },
        "sample_size_n": 73809,
        "pct_national_sample": 0.1019,
        "suppressed": false,
        "observed_household_rate": 0.2598,
        "observed_logistic_rate": 0.294,
        "observed_facility_rate": 0.4535,
        "observed_any_barrier_rate": 0.5762,
        "predicted_household_prob": 0.46,
        "predicted_logistic_prob": 0.4555,
        "predicted_facility_prob": 0.4912
      },
      {
        "group_keys": {
          "occupation_clean": "Other"
        },
        "sample_size_n": 1477,
        "pct_national_sample": 0.002,
        "suppressed": false,
        "observed_household_rate": 0.2769,
        "observed_logistic_rate": 0.3439,
        "observed_facility_rate": 0.4489,
        "observed_any_barrier_rate": 0.5728,
        "predicted_household_prob": 0.4586,
        "predicted_logistic_prob": 0.4957,
        "predicted_facility_prob": 0.4853
      },
      {
        "group_keys": {
          "occupation_clean": "Professional / Technical / Managerial"
        },
        "sample_size_n": 2985,
        "pct_national_sample": 0.0041,
        "suppressed": false,
        "observed_household_rate": 0.14,
        "observed_logistic_rate": 0.1752,
        "observed_facility_rate": 0.329,
        "observed_any_barrier_rate": 0.4194,
        "predicted_household_prob": 0.2667,
        "predicted_logistic_prob": 0.2875,
        "predicted_facility_prob": 0.3625
      },
      {
        "group_keys": {
          "occupation_clean": "Sales"
        },
        "sample_size_n": 2046,
        "pct_national_sample": 0.0028,
        "suppressed": false,
        "observed_household_rate": 0.2639,
        "observed_logistic_rate": 0.2898,
        "observed_facility_rate": 0.414,
        "observed_any_barrier_rate": 0.545,
        "predicted_household_prob": 0.4495,
        "predicted_logistic_prob": 0.4445,
        "predicted_facility_prob": 0.4497
      },
      {
        "group_keys": {
          "occupation_clean": "Services / Household and Domestic"
        },
        "sample_size_n": 3433,
        "pct_national_sample": 0.0047,
        "suppressed": false,
        "observed_household_rate": 0.245,
        "observed_logistic_rate": 0.2925,
        "observed_facility_rate": 0.4232,
        "observed_any_barrier_rate": 0.5552,
        "predicted_household_prob": 0.4266,
        "predicted_logistic_prob": 0.4446,
        "predicted_facility_prob": 0.4575
      },
      {
        "group_keys": {
          "occupation_clean": "Skilled and Unskilled Manual"
        },
        "sample_size_n": 6394,
        "pct_national_sample": 0.0088,
        "suppressed": false,
        "observed_household_rate": 0.2889,
        "observed_logistic_rate": 0.3139,
        "observed_facility_rate": 0.4573,
        "observed_any_barrier_rate": 0.6128,
        "predicted_household_prob": 0.4893,
        "predicted_logistic_prob": 0.4769,
        "predicted_facility_prob": 0.4934
      }
    ],
    "by_wealth_residence": [
      {
        "group_keys": {
          "wealth_clean": "Middle",
          "residence_clean": "Rural"
        },
        "sample_size_n": 121345,
        "pct_national_sample": 0.1676,
        "suppressed": false,
        "observed_household_rate": 0.2536,
        "observed_logistic_rate": 0.3251,
        "observed_facility_rate": 0.4609,
        "observed_any_barrier_rate": 0.5981,
        "predicted_household_prob": 0.4714,
        "predicted_logistic_prob": 0.4865,
        "predicted_facility_prob": 0.4923
      },
      {
        "group_keys": {
          "wealth_clean": "Middle",
          "residence_clean": "Urban"
        },
        "sample_size_n": 30160,
        "pct_national_sample": 0.0417,
        "suppressed": false,
        "observed_household_rate": 0.2532,
        "observed_logistic_rate": 0.228,
        "observed_facility_rate": 0.4156,
        "observed_any_barrier_rate": 0.5418,
        "predicted_household_prob": 0.4712,
        "predicted_logistic_prob": 0.4783,
        "predicted_facility_prob": 0.4858
      },
      {
        "group_keys": {
          "wealth_clean": "Poorer",
          "residence_clean": "Rural"
        },
        "sample_size_n": 146628,
        "pct_national_sample": 0.2025,
        "suppressed": false,
        "observed_household_rate": 0.327,
        "observed_logistic_rate": 0.3912,
        "observed_facility_rate": 0.5132,
        "observed_any_barrier_rate": 0.6703,
        "predicted_household_prob": 0.5603,
        "predicted_logistic_prob": 0.5677,
        "predicted_facility_prob": 0.548
      },
      {
        "group_keys": {
          "wealth_clean": "Poorer",
          "residence_clean": "Urban"
        },
        "sample_size_n": 13712,
        "pct_national_sample": 0.0189,
        "suppressed": false,
        "observed_household_rate": 0.3264,
        "observed_logistic_rate": 0.2686,
        "observed_facility_rate": 0.4529,
        "observed_any_barrier_rate": 0.6045,
        "predicted_household_prob": 0.5594,
        "predicted_logistic_prob": 0.5595,
        "predicted_facility_prob": 0.5391
      },
      {
        "group_keys": {
          "wealth_clean": "Poorest",
          "residence_clean": "Rural"
        },
        "sample_size_n": 144482,
        "pct_national_sample": 0.1995,
        "suppressed": false,
        "observed_household_rate": 0.4237,
        "observed_logistic_rate": 0.4827,
        "observed_facility_rate": 0.5914,
        "observed_any_barrier_rate": 0.7584,
        "predicted_household_prob": 0.6589,
        "predicted_logistic_prob": 0.6608,
        "predicted_facility_prob": 0.6269
      },
      {
        "group_keys": {
          "wealth_clean": "Poorest",
          "residence_clean": "Urban"
        },
        "sample_size_n": 5362,
        "pct_national_sample": 0.0074,
        "suppressed": false,
        "observed_household_rate": 0.4217,
        "observed_logistic_rate": 0.337,
        "observed_facility_rate": 0.5257,
        "observed_any_barrier_rate": 0.6979,
        "predicted_household_prob": 0.6533,
        "predicted_logistic_prob": 0.6458,
        "predicted_facility_prob": 0.6105
      },
      {
        "group_keys": {
          "wealth_clean": "Richer",
          "residence_clean": "Rural"
        },
        "sample_size_n": 85993,
        "pct_national_sample": 0.1188,
        "suppressed": false,
        "observed_household_rate": 0.1934,
        "observed_logistic_rate": 0.262,
        "observed_facility_rate": 0.4117,
        "observed_any_barrier_rate": 0.5269,
        "predicted_household_prob": 0.386,
        "predicted_logistic_prob": 0.3953,
        "predicted_facility_prob": 0.4401
      },
      {
        "group_keys": {
          "wealth_clean": "Richer",
          "residence_clean": "Urban"
        },
        "sample_size_n": 53614,
        "pct_national_sample": 0.074,
        "suppressed": false,
        "observed_household_rate": 0.192,
        "observed_logistic_rate": 0.1825,
        "observed_facility_rate": 0.3817,
        "observed_any_barrier_rate": 0.48,
        "predicted_household_prob": 0.3792,
        "predicted_logistic_prob": 0.3805,
        "predicted_facility_prob": 0.4345
      },
      {
        "group_keys": {
          "wealth_clean": "Richest",
          "residence_clean": "Rural"
        },
        "sample_size_n": 46132,
        "pct_national_sample": 0.0637,
        "suppressed": false,
        "observed_household_rate": 0.1417,
        "observed_logistic_rate": 0.1869,
        "observed_facility_rate": 0.3431,
        "observed_any_barrier_rate": 0.4341,
        "predicted_household_prob": 0.284,
        "predicted_logistic_prob": 0.2776,
        "predicted_facility_prob": 0.3533
      },
      {
        "group_keys": {
          "wealth_clean": "Richest",
          "residence_clean": "Urban"
        },
        "sample_size_n": 76687,
        "pct_national_sample": 0.1059,
        "suppressed": false,
        "observed_household_rate": 0.1156,
        "observed_logistic_rate": 0.1175,
        "observed_facility_rate": 0.3035,
        "observed_any_barrier_rate": 0.372,
        "predicted_household_prob": 0.263,
        "predicted_logistic_prob": 0.2508,
        "predicted_facility_prob": 0.3527
      }
    ],
    "by_wealth_education": [
      {
        "group_keys": {
          "wealth_clean": "Middle",
          "education_clean": "Higher"
        },
        "sample_size_n": 16793,
        "pct_national_sample": 0.0232,
        "suppressed": false,
        "observed_household_rate": 0.2003,
        "observed_logistic_rate": 0.2671,
        "observed_facility_rate": 0.419,
        "observed_any_barrier_rate": 0.5418,
        "predicted_household_prob": 0.405,
        "predicted_logistic_prob": 0.4399,
        "predicted_facility_prob": 0.4612
      },
      {
        "group_keys": {
          "wealth_clean": "Middle",
          "education_clean": "No Education"
        },
        "sample_size_n": 30995,
        "pct_national_sample": 0.0428,
        "suppressed": false,
        "observed_household_rate": 0.287,
        "observed_logistic_rate": 0.3405,
        "observed_facility_rate": 0.4705,
        "observed_any_barrier_rate": 0.6184,
        "predicted_household_prob": 0.5139,
        "predicted_logistic_prob": 0.5271,
        "predicted_facility_prob": 0.5081
      },
      {
        "group_keys": {
          "wealth_clean": "Middle",
          "education_clean": "Primary"
        },
        "sample_size_n": 18401,
        "pct_national_sample": 0.0254,
        "suppressed": false,
        "observed_household_rate": 0.2651,
        "observed_logistic_rate": 0.3183,
        "observed_facility_rate": 0.4596,
        "observed_any_barrier_rate": 0.6048,
        "predicted_household_prob": 0.4881,
        "predicted_logistic_prob": 0.5004,
        "predicted_facility_prob": 0.5004
      },
      {
        "group_keys": {
          "wealth_clean": "Middle",
          "education_clean": "Secondary"
        },
        "sample_size_n": 85316,
        "pct_national_sample": 0.1178,
        "suppressed": false,
        "observed_household_rate": 0.2493,
        "observed_logistic_rate": 0.2981,
        "observed_facility_rate": 0.4499,
        "observed_any_barrier_rate": 0.5805,
        "predicted_household_prob": 0.4653,
        "predicted_logistic_prob": 0.475,
        "predicted_facility_prob": 0.4887
      },
      {
        "group_keys": {
          "wealth_clean": "Poorer",
          "education_clean": "Higher"
        },
        "sample_size_n": 9252,
        "pct_national_sample": 0.0128,
        "suppressed": false,
        "observed_household_rate": 0.2583,
        "observed_logistic_rate": 0.3379,
        "observed_facility_rate": 0.473,
        "observed_any_barrier_rate": 0.6151,
        "predicted_household_prob": 0.4884,
        "predicted_logistic_prob": 0.5225,
        "predicted_facility_prob": 0.5155
      },
      {
        "group_keys": {
          "wealth_clean": "Poorer",
          "education_clean": "No Education"
        },
        "sample_size_n": 45457,
        "pct_national_sample": 0.0628,
        "suppressed": false,
        "observed_household_rate": 0.3429,
        "observed_logistic_rate": 0.4033,
        "observed_facility_rate": 0.5159,
        "observed_any_barrier_rate": 0.6762,
        "predicted_household_prob": 0.5787,
        "predicted_logistic_prob": 0.5905,
        "predicted_facility_prob": 0.5553
      },
      {
        "group_keys": {
          "wealth_clean": "Poorer",
          "education_clean": "Primary"
        },
        "sample_size_n": 23312,
        "pct_national_sample": 0.0322,
        "suppressed": false,
        "observed_household_rate": 0.3376,
        "observed_logistic_rate": 0.3863,
        "observed_facility_rate": 0.5133,
        "observed_any_barrier_rate": 0.6758,
        "predicted_household_prob": 0.5709,
        "predicted_logistic_prob": 0.5728,
        "predicted_facility_prob": 0.5513
      },
      {
        "group_keys": {
          "wealth_clean": "Poorer",
          "education_clean": "Secondary"
        },
        "sample_size_n": 82319,
        "pct_national_sample": 0.1137,
        "suppressed": false,
        "observed_household_rate": 0.3228,
        "observed_logistic_rate": 0.3715,
        "observed_facility_rate": 0.5061,
        "observed_any_barrier_rate": 0.6607,
        "predicted_household_prob": 0.5551,
        "predicted_logistic_prob": 0.5574,
        "predicted_facility_prob": 0.5452
      },
      {
        "group_keys": {
          "wealth_clean": "Poorest",
          "education_clean": "Higher"
        },
        "sample_size_n": 3230,
        "pct_national_sample": 0.0045,
        "suppressed": false,
        "observed_household_rate": 0.3331,
        "observed_logistic_rate": 0.4006,
        "observed_facility_rate": 0.5245,
        "observed_any_barrier_rate": 0.692,
        "predicted_household_prob": 0.5815,
        "predicted_logistic_prob": 0.6033,
        "predicted_facility_prob": 0.5858
      },
      {
        "group_keys": {
          "wealth_clean": "Poorest",
          "education_clean": "No Education"
        },
        "sample_size_n": 65131,
        "pct_national_sample": 0.0899,
        "suppressed": false,
        "observed_household_rate": 0.4336,
        "observed_logistic_rate": 0.4946,
        "observed_facility_rate": 0.5986,
        "observed_any_barrier_rate": 0.7644,
        "predicted_household_prob": 0.6684,
        "predicted_logistic_prob": 0.6752,
        "predicted_facility_prob": 0.6356
      },
      {
        "group_keys": {
          "wealth_clean": "Poorest",
          "education_clean": "Primary"
        },
        "sample_size_n": 24031,
        "pct_national_sample": 0.0332,
        "suppressed": false,
        "observed_household_rate": 0.4453,
        "observed_logistic_rate": 0.4881,
        "observed_facility_rate": 0.591,
        "observed_any_barrier_rate": 0.7659,
        "predicted_household_prob": 0.6765,
        "predicted_logistic_prob": 0.6683,
        "predicted_facility_prob": 0.6268
      },
      {
        "group_keys": {
          "wealth_clean": "Poorest",
          "education_clean": "Secondary"
        },
        "sample_size_n": 57452,
        "pct_national_sample": 0.0793,
        "suppressed": false,
        "observed_household_rate": 0.4084,
        "observed_logistic_rate": 0.4581,
        "observed_facility_rate": 0.581,
        "observed_any_barrier_rate": 0.7464,
        "predicted_household_prob": 0.6446,
        "predicted_logistic_prob": 0.643,
        "predicted_facility_prob": 0.618
      },
      {
        "group_keys": {
          "wealth_clean": "Richer",
          "education_clean": "Higher"
        },
        "sample_size_n": 26905,
        "pct_national_sample": 0.0372,
        "suppressed": false,
        "observed_household_rate": 0.1534,
        "observed_logistic_rate": 0.1959,
        "observed_facility_rate": 0.3687,
        "observed_any_barrier_rate": 0.4642,
        "predicted_household_prob": 0.3214,
        "predicted_logistic_prob": 0.3448,
        "predicted_facility_prob": 0.4082
      },
      {
        "group_keys": {
          "wealth_clean": "Richer",
          "education_clean": "No Education"
        },
        "sample_size_n": 18235,
        "pct_national_sample": 0.0252,
        "suppressed": false,
        "observed_household_rate": 0.2417,
        "observed_logistic_rate": 0.2819,
        "observed_facility_rate": 0.4337,
        "observed_any_barrier_rate": 0.5612,
        "predicted_household_prob": 0.4531,
        "predicted_logistic_prob": 0.4526,
        "predicted_facility_prob": 0.4696
      },
      {
        "group_keys": {
          "wealth_clean": "Richer",
          "education_clean": "Primary"
        },
        "sample_size_n": 12867,
        "pct_national_sample": 0.0178,
        "suppressed": false,
        "observed_household_rate": 0.2161,
        "observed_logistic_rate": 0.2546,
        "observed_facility_rate": 0.4211,
        "observed_any_barrier_rate": 0.5393,
        "predicted_household_prob": 0.4171,
        "predicted_logistic_prob": 0.4195,
        "predicted_facility_prob": 0.4574
      },
      {
        "group_keys": {
          "wealth_clean": "Richer",
          "education_clean": "Secondary"
        },
        "sample_size_n": 81600,
        "pct_national_sample": 0.1127,
        "suppressed": false,
        "observed_household_rate": 0.1913,
        "observed_logistic_rate": 0.2282,
        "observed_facility_rate": 0.3998,
        "observed_any_barrier_rate": 0.5072,
        "predicted_household_prob": 0.3829,
        "predicted_logistic_prob": 0.3856,
        "predicted_facility_prob": 0.4375
      },
      {
        "group_keys": {
          "wealth_clean": "Richest",
          "education_clean": "Higher"
        },
        "sample_size_n": 45636,
        "pct_national_sample": 0.063,
        "suppressed": false,
        "observed_household_rate": 0.0989,
        "observed_logistic_rate": 0.1102,
        "observed_facility_rate": 0.2876,
        "observed_any_barrier_rate": 0.3509,
        "predicted_household_prob": 0.2216,
        "predicted_logistic_prob": 0.2079,
        "predicted_facility_prob": 0.3192
      },
      {
        "group_keys": {
          "wealth_clean": "Richest",
          "education_clean": "No Education"
        },
        "sample_size_n": 7486,
        "pct_national_sample": 0.0103,
        "suppressed": false,
        "observed_household_rate": 0.1734,
        "observed_logistic_rate": 0.2096,
        "observed_facility_rate": 0.377,
        "observed_any_barrier_rate": 0.4816,
        "predicted_household_prob": 0.3496,
        "predicted_logistic_prob": 0.3568,
        "predicted_facility_prob": 0.4127
      },
      {
        "group_keys": {
          "wealth_clean": "Richest",
          "education_clean": "Primary"
        },
        "sample_size_n": 6372,
        "pct_national_sample": 0.0088,
        "suppressed": false,
        "observed_household_rate": 0.1653,
        "observed_logistic_rate": 0.1901,
        "observed_facility_rate": 0.3726,
        "observed_any_barrier_rate": 0.4713,
        "predicted_household_prob": 0.3362,
        "predicted_logistic_prob": 0.3301,
        "predicted_facility_prob": 0.4098
      },
      {
        "group_keys": {
          "wealth_clean": "Richest",
          "education_clean": "Secondary"
        },
        "sample_size_n": 63325,
        "pct_national_sample": 0.0875,
        "suppressed": false,
        "observed_household_rate": 0.1348,
        "observed_logistic_rate": 0.1551,
        "observed_facility_rate": 0.3282,
        "observed_any_barrier_rate": 0.4095,
        "predicted_household_prob": 0.2905,
        "predicted_logistic_prob": 0.2807,
        "predicted_facility_prob": 0.3644
      }
    ]
  },
  "empowermentSummary": {
    "metadata": {
      "title": "Household Empowerment & Autonomy Barrier Analysis",
      "section_reference": "Section 11.2 & Section 6 Item 5",
      "empowerment_indicators": [
        "v170 (Bank Account)",
        "v743f (Medical Autonomy)",
        "v169a (Mobile Phone)"
      ]
    },
    "by_empowerment_level": [
      {
        "empowerment_level": "Low Empowerment (0 items)",
        "sample_size_n": 624570,
        "pct_women": 0.8625,
        "observed_household_rate": 0.2734,
        "observed_logistic_rate": 0.318,
        "observed_facility_rate": 0.461,
        "observed_any_barrier_rate": 0.5932
      },
      {
        "empowerment_level": "Moderate Empowerment (1-2 items)",
        "sample_size_n": 69412,
        "pct_women": 0.0959,
        "observed_household_rate": 0.2818,
        "observed_logistic_rate": 0.324,
        "observed_facility_rate": 0.4725,
        "observed_any_barrier_rate": 0.6059
      },
      {
        "empowerment_level": "High Empowerment (3 items)",
        "sample_size_n": 30133,
        "pct_women": 0.0416,
        "observed_household_rate": 0.2091,
        "observed_logistic_rate": 0.2577,
        "observed_facility_rate": 0.4133,
        "observed_any_barrier_rate": 0.5267
      }
    ],
    "detailed_combinations": [
      {
        "has_bank_account": 0,
        "decides_own_health": 0,
        "has_mobile_phone": 0,
        "empowerment_score": 0,
        "sample_size_n": 624570,
        "pct_women": 0.8625,
        "observed_household_rate": 0.2734,
        "observed_logistic_rate": 0.318,
        "observed_facility_rate": 0.461,
        "observed_any_barrier_rate": 0.5932
      },
      {
        "has_bank_account": 0,
        "decides_own_health": 0,
        "has_mobile_phone": 1,
        "empowerment_score": 1,
        "sample_size_n": 3707,
        "pct_women": 0.0051,
        "observed_household_rate": 0.2959,
        "observed_logistic_rate": 0.3275,
        "observed_facility_rate": 0.4589,
        "observed_any_barrier_rate": 0.587
      },
      {
        "has_bank_account": 0,
        "decides_own_health": 1,
        "has_mobile_phone": 0,
        "empowerment_score": 1,
        "sample_size_n": 6419,
        "pct_women": 0.0089,
        "observed_household_rate": 0.3499,
        "observed_logistic_rate": 0.386,
        "observed_facility_rate": 0.5213,
        "observed_any_barrier_rate": 0.6693
      },
      {
        "has_bank_account": 0,
        "decides_own_health": 1,
        "has_mobile_phone": 1,
        "empowerment_score": 2,
        "sample_size_n": 4030,
        "pct_women": 0.0056,
        "observed_household_rate": 0.2658,
        "observed_logistic_rate": 0.3112,
        "observed_facility_rate": 0.4424,
        "observed_any_barrier_rate": 0.5784
      },
      {
        "has_bank_account": 1,
        "decides_own_health": 0,
        "has_mobile_phone": 0,
        "empowerment_score": 1,
        "sample_size_n": 15906,
        "pct_women": 0.022,
        "observed_household_rate": 0.3078,
        "observed_logistic_rate": 0.3413,
        "observed_facility_rate": 0.4901,
        "observed_any_barrier_rate": 0.6287
      },
      {
        "has_bank_account": 1,
        "decides_own_health": 0,
        "has_mobile_phone": 1,
        "empowerment_score": 2,
        "sample_size_n": 21387,
        "pct_women": 0.0295,
        "observed_household_rate": 0.2378,
        "observed_logistic_rate": 0.2776,
        "observed_facility_rate": 0.4282,
        "observed_any_barrier_rate": 0.5462
      },
      {
        "has_bank_account": 1,
        "decides_own_health": 1,
        "has_mobile_phone": 0,
        "empowerment_score": 2,
        "sample_size_n": 17963,
        "pct_women": 0.0248,
        "observed_household_rate": 0.2876,
        "observed_logistic_rate": 0.3439,
        "observed_facility_rate": 0.5018,
        "observed_any_barrier_rate": 0.6442
      },
      {
        "has_bank_account": 1,
        "decides_own_health": 1,
        "has_mobile_phone": 1,
        "empowerment_score": 3,
        "sample_size_n": 30133,
        "pct_women": 0.0416,
        "observed_household_rate": 0.2091,
        "observed_logistic_rate": 0.2577,
        "observed_facility_rate": 0.4133,
        "observed_any_barrier_rate": 0.5267
      }
    ]
  },
  "multipleBarrierSummary": {
    "metadata": {
      "title": "Multiple Overlapping Barriers Analysis (0-3 Barrier Count)",
      "section_reference": "Section 11.2 & Section 6 Item 7",
      "formula": "barrier_count = target_household + target_logistic + target_facility"
    },
    "overall": {
      "total_women": 724115,
      "mean_barrier_count": 1.0477,
      "pct_facing_2plus_barriers": 0.3155,
      "distribution": [
        {
          "barrier_count": 0,
          "label": "0 Barriers",
          "sample_size_n": 295720,
          "pct_women": 0.4084
        },
        {
          "barrier_count": 1,
          "label": "1 Barrier",
          "sample_size_n": 199943,
          "pct_women": 0.2761
        },
        {
          "barrier_count": 2,
          "label": "2 Barriers",
          "sample_size_n": 126647,
          "pct_women": 0.1749
        },
        {
          "barrier_count": 3,
          "label": "3 Barriers",
          "sample_size_n": 101805,
          "pct_women": 0.1406
        }
      ]
    },
    "by_wealth_tier": [
      {
        "wealth_tier": "Poorest",
        "sample_size_n": 149844,
        "pct_national_sample": 0.2069,
        "mean_barrier_count": 1.4902,
        "pct_facing_2plus_barriers": 0.4907,
        "distribution": {
          "count_0_pct": 0.2438,
          "count_1_pct": 0.2655,
          "count_2_pct": 0.2474,
          "count_3_pct": 0.2433
        }
      },
      {
        "wealth_tier": "Poorer",
        "sample_size_n": 160340,
        "pct_national_sample": 0.2214,
        "mean_barrier_count": 1.2157,
        "pct_facing_2plus_barriers": 0.3808,
        "distribution": {
          "count_0_pct": 0.3353,
          "count_1_pct": 0.2839,
          "count_2_pct": 0.2105,
          "count_3_pct": 0.1702
        }
      },
      {
        "wealth_tier": "Middle",
        "sample_size_n": 151505,
        "pct_national_sample": 0.2092,
        "mean_barrier_count": 1.0111,
        "pct_facing_2plus_barriers": 0.2993,
        "distribution": {
          "count_0_pct": 0.4131,
          "count_1_pct": 0.2876,
          "count_2_pct": 0.1744,
          "count_3_pct": 0.1249
        }
      },
      {
        "wealth_tier": "Richer",
        "sample_size_n": 139607,
        "pct_national_sample": 0.1928,
        "mean_barrier_count": 0.8245,
        "pct_facing_2plus_barriers": 0.2253,
        "distribution": {
          "count_0_pct": 0.4911,
          "count_1_pct": 0.2836,
          "count_2_pct": 0.1349,
          "count_3_pct": 0.0903
        }
      },
      {
        "wealth_tier": "Richest",
        "sample_size_n": 122819,
        "pct_national_sample": 0.1696,
        "mean_barrier_count": 0.5873,
        "pct_facing_2plus_barriers": 0.139,
        "distribution": {
          "count_0_pct": 0.6047,
          "count_1_pct": 0.2563,
          "count_2_pct": 0.086,
          "count_3_pct": 0.053
        }
      }
    ],
    "by_residence": [
      {
        "residence": "Rural",
        "sample_size_n": 544580,
        "pct_national_sample": 0.7521,
        "mean_barrier_count": 1.1544,
        "pct_facing_2plus_barriers": 0.3579,
        "distribution": {
          "count_0_pct": 0.3651,
          "count_1_pct": 0.277,
          "count_2_pct": 0.1964,
          "count_3_pct": 0.1615
        }
      },
      {
        "residence": "Urban",
        "sample_size_n": 179535,
        "pct_national_sample": 0.2479,
        "mean_barrier_count": 0.7241,
        "pct_facing_2plus_barriers": 0.1868,
        "distribution": {
          "count_0_pct": 0.5397,
          "count_1_pct": 0.2735,
          "count_2_pct": 0.1097,
          "count_3_pct": 0.0771
        }
      }
    ]
  },
  "nationalOverview": {
    "metadata": {
      "title": "National Healthcare Access Barrier Overview",
      "sample_size_N": 724115,
      "rail_a_label": "Base Paper Reference / Observed NFHS-5 Statistic",
      "rail_b_label": "BarrierLens ML Prediction (Stage 1 / Stage 2 OOF)",
      "methodology_note": "Base paper uses 108,785 ever-married women subset with 8 items; BarrierLens uses full 724,115 sample with 6 items (v467f, v467i absent). Values are broadly comparable, not identical."
    },
    "kpis": {
      "total_women": 724115,
      "observed_any_barrier_rate": 0.5916,
      "observed_household_rate": 0.2716,
      "observed_logistic_rate": 0.3161,
      "observed_facility_rate": 0.4601,
      "base_paper_any_barrier_rate": 0.84,
      "base_paper_household_rate": 0.246,
      "base_paper_logistic_rate": 0.505,
      "base_paper_facility_rate": 0.553,
      "predicted_household_prob": 0.4788,
      "predicted_logistic_prob": 0.483,
      "predicted_facility_prob": 0.4978,
      "predicted_composite_score": 0.4865
    },
    "barrier_ranking": [
      {
        "barrier_type": "Facility-level Barrier",
        "observed_rate": 0.4601,
        "predicted_prob": 0.4978,
        "base_paper_rate": 0.553,
        "rank": 1,
        "level": "Highest"
      },
      {
        "barrier_type": "Logistic Barrier",
        "observed_rate": 0.3161,
        "predicted_prob": 0.483,
        "base_paper_rate": 0.505,
        "rank": 2,
        "level": "Moderate"
      },
      {
        "barrier_type": "Household Barrier",
        "observed_rate": 0.2716,
        "predicted_prob": 0.4788,
        "base_paper_rate": 0.246,
        "rank": 3,
        "level": "Lowest"
      }
    ],
    "comparison_chart_data": [
      {
        "barrier_type": "Facility",
        "observed": 0.4601,
        "predicted": 0.4978,
        "base_paper": 0.553
      },
      {
        "barrier_type": "Logistic",
        "observed": 0.3161,
        "predicted": 0.483,
        "base_paper": 0.505
      },
      {
        "barrier_type": "Household",
        "observed": 0.2716,
        "predicted": 0.4788,
        "base_paper": 0.246
      }
    ]
  },
  "outcomeImpactSummary": {
    "metadata": {
      "title": "Healthcare Utilization Impact (Stage 2 Outcome Modelling)",
      "primary_target": "target_unmet_fp (Confirmed Unmet Family Planning Need)",
      "secondary_target": "target_anc_gap (Antenatal Care Gap — Documented Extension)"
    },
    "target_unmet_fp": {
      "analytic_sample_n": 466859,
      "positive_cases_n": 49672,
      "positive_rate": 0.1064,
      "logistic_regression": {
        "accuracy": 0.6124,
        "roc_auc": 0.6591,
        "precision": 0.1652,
        "recall": 0.6015,
        "f1_score": 0.2592,
        "baseline_socioeconomic_auc": 0.6574,
        "full_with_barriers_auc": 0.6591,
        "barrier_uplift_auc": 0.0017
      },
      "random_forest": {
        "accuracy": 0.5849,
        "roc_auc": 0.5849,
        "barrier_uplift_auc": 0.0017
      },
      "top_predictor": {
        "feature": "household_barrier_prob",
        "odds_ratio": 1.15,
        "interpretation": "Higher predicted household barrier odds are associated with increased risk of unmet family planning need."
      }
    },
    "target_anc_gap": {
      "status": "Documented Extension (Requires m14)",
      "analytic_sample_n": 163018,
      "positive_rate": 0.378,
      "logistic_regression": {
        "roc_auc": 0.6356,
        "barrier_uplift_auc": 0.002
      },
      "top_predictor": {
        "feature": "household_barrier_prob",
        "odds_ratio": 1.31,
        "interpretation": "Higher predicted household barrier odds increase the likelihood of missing required antenatal care visits."
      }
    },
    "institutional_delivery_note": "Institutional delivery is not currently present in raw NFHS-5 extract columns; documented as a planned future extension."
  },
  "regressionSummary": {
    "metadata": {
      "title": "Stage 1 Logistic Regression Odds Ratios & Coefficients",
      "section_reference": "Section 11.2 & Section 6 Item 6 (Honesty Flag Respected)",
      "honesty_flag_note": "Report actual computed LR coefficients and odds ratios directly. Do not adjust figures to force typical expected narratives."
    },
    "targets": {
      "household": {
        "target": "target_household",
        "intercept": -1.0688,
        "num_features": 56,
        "top_risk_factors": [
          {
            "feature": "v190_poorest",
            "coefficient": 0.2346,
            "odds_ratio": 1.2643,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 1
          },
          {
            "feature": "v106_no education",
            "coefficient": 0.1787,
            "odds_ratio": 1.1957,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 2
          },
          {
            "feature": "v106_secondary",
            "coefficient": 0.1427,
            "odds_ratio": 1.1534,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 3
          },
          {
            "feature": "v106_primary",
            "coefficient": 0.1326,
            "odds_ratio": 1.1418,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 4
          },
          {
            "feature": "v190_poorer",
            "coefficient": 0.1123,
            "odds_ratio": 1.1189,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 5
          },
          {
            "feature": "v013_45-49",
            "coefficient": 0.0883,
            "odds_ratio": 1.0924,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 6
          },
          {
            "feature": "v159_not at all",
            "coefficient": 0.0729,
            "odds_ratio": 1.0756,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 7
          },
          {
            "feature": "v131_no caste / tribe",
            "coefficient": 0.07,
            "odds_ratio": 1.0726,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 8
          },
          {
            "feature": "v157_not at all",
            "coefficient": 0.0609,
            "odds_ratio": 1.0628,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 9
          },
          {
            "feature": "v013_40-44",
            "coefficient": 0.0603,
            "odds_ratio": 1.0622,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 10
          }
        ],
        "top_protective_factors": [
          {
            "feature": "v190_richest",
            "coefficient": -0.2532,
            "odds_ratio": 0.7763,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 56
          },
          {
            "feature": "v012",
            "coefficient": -0.1444,
            "odds_ratio": 0.8655,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 55
          },
          {
            "feature": "v190_richer",
            "coefficient": -0.1113,
            "odds_ratio": 0.8947,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 54
          },
          {
            "feature": "v158_not at all",
            "coefficient": -0.0913,
            "odds_ratio": 0.9128,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 53
          },
          {
            "feature": "v130_hindu",
            "coefficient": -0.0878,
            "odds_ratio": 0.9159,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 52
          },
          {
            "feature": "v743f_respondent and husband/partner",
            "coefficient": -0.0842,
            "odds_ratio": 0.9192,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 51
          },
          {
            "feature": "v743f_missing",
            "coefficient": -0.0674,
            "odds_ratio": 0.9348,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 50
          },
          {
            "feature": "v501_married",
            "coefficient": -0.0474,
            "odds_ratio": 0.9537,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 49
          },
          {
            "feature": "media_exposure_index",
            "coefficient": -0.0422,
            "odds_ratio": 0.9587,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 48
          },
          {
            "feature": "v130_christian",
            "coefficient": -0.0382,
            "odds_ratio": 0.9626,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 47
          }
        ],
        "all_features": [
          {
            "feature": "v190_poorest",
            "coefficient": 0.2346,
            "odds_ratio": 1.2643,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 1
          },
          {
            "feature": "v106_no education",
            "coefficient": 0.1787,
            "odds_ratio": 1.1957,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 2
          },
          {
            "feature": "v106_secondary",
            "coefficient": 0.1427,
            "odds_ratio": 1.1534,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 3
          },
          {
            "feature": "v106_primary",
            "coefficient": 0.1326,
            "odds_ratio": 1.1418,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 4
          },
          {
            "feature": "v190_poorer",
            "coefficient": 0.1123,
            "odds_ratio": 1.1189,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 5
          },
          {
            "feature": "v013_45-49",
            "coefficient": 0.0883,
            "odds_ratio": 1.0924,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 6
          },
          {
            "feature": "v159_not at all",
            "coefficient": 0.0729,
            "odds_ratio": 1.0756,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 7
          },
          {
            "feature": "v131_no caste / tribe",
            "coefficient": 0.07,
            "odds_ratio": 1.0726,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 8
          },
          {
            "feature": "v157_not at all",
            "coefficient": 0.0609,
            "odds_ratio": 1.0628,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 9
          },
          {
            "feature": "v013_40-44",
            "coefficient": 0.0603,
            "odds_ratio": 1.0622,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 10
          },
          {
            "feature": "v013_35-39",
            "coefficient": 0.0568,
            "odds_ratio": 1.0584,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 11
          },
          {
            "feature": "v131_tribe",
            "coefficient": 0.0517,
            "odds_ratio": 1.053,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 12
          },
          {
            "feature": "v013_30-34",
            "coefficient": 0.0455,
            "odds_ratio": 1.0466,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 13
          },
          {
            "feature": "v013_25-29",
            "coefficient": 0.0421,
            "odds_ratio": 1.043,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 14
          },
          {
            "feature": "v501_widowed",
            "coefficient": 0.0299,
            "odds_ratio": 1.0303,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 15
          },
          {
            "feature": "v013_20-24",
            "coefficient": 0.0295,
            "odds_ratio": 1.03,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 16
          },
          {
            "feature": "v170_no",
            "coefficient": 0.0269,
            "odds_ratio": 1.0273,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 17
          },
          {
            "feature": "v159_less than once a week",
            "coefficient": 0.0218,
            "odds_ratio": 1.0221,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 18
          },
          {
            "feature": "v501_no longer living together/separated",
            "coefficient": 0.0184,
            "odds_ratio": 1.0186,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 19
          },
          {
            "feature": "v157_less than once a week",
            "coefficient": 0.0112,
            "odds_ratio": 1.0112,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 20
          },
          {
            "feature": "v169a_no",
            "coefficient": 0.0092,
            "odds_ratio": 1.0092,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 21
          },
          {
            "feature": "v717_sales",
            "coefficient": 0.0065,
            "odds_ratio": 1.0065,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 22
          },
          {
            "feature": "v717_don't know",
            "coefficient": 0.0058,
            "odds_ratio": 1.0058,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 23
          },
          {
            "feature": "v130_jewish",
            "coefficient": 0.0043,
            "odds_ratio": 1.0044,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 24
          },
          {
            "feature": "v717_skilled and unskilled manual",
            "coefficient": 0.0037,
            "odds_ratio": 1.0037,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 25
          },
          {
            "feature": "v717_clerical",
            "coefficient": 0.0027,
            "odds_ratio": 1.0027,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 26
          },
          {
            "feature": "v130_no religion",
            "coefficient": 0.0013,
            "odds_ratio": 1.0013,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 27
          },
          {
            "feature": "v717_services / household and domestic",
            "coefficient": 0.0004,
            "odds_ratio": 1.0004,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 28
          },
          {
            "feature": "v717_other",
            "coefficient": -0.0005,
            "odds_ratio": 0.9995,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 29
          },
          {
            "feature": "v717_missing",
            "coefficient": -0.0007,
            "odds_ratio": 0.9993,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 30
          },
          {
            "feature": "v130_parsi / zoroastrian",
            "coefficient": -0.0016,
            "odds_ratio": 0.9984,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 31
          },
          {
            "feature": "v130_sikh",
            "coefficient": -0.0044,
            "odds_ratio": 0.9956,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 32
          },
          {
            "feature": "v131_don't know",
            "coefficient": -0.0046,
            "odds_ratio": 0.9954,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 33
          },
          {
            "feature": "v743f_respondent alone",
            "coefficient": -0.0047,
            "odds_ratio": 0.9953,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 34
          },
          {
            "feature": "v743f_husband/partner has no earnings",
            "coefficient": -0.0061,
            "odds_ratio": 0.9939,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 35
          },
          {
            "feature": "v169a_yes",
            "coefficient": -0.0075,
            "odds_ratio": 0.9925,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 36
          },
          {
            "feature": "v717_professional / technical / managerial",
            "coefficient": -0.0079,
            "odds_ratio": 0.9921,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 37
          },
          {
            "feature": "v130_other",
            "coefficient": -0.01,
            "odds_ratio": 0.9901,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 38
          },
          {
            "feature": "v717_not working",
            "coefficient": -0.0099,
            "odds_ratio": 0.9901,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 39
          },
          {
            "feature": "v481_yes",
            "coefficient": -0.0101,
            "odds_ratio": 0.99,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 40
          },
          {
            "feature": "v743f_other",
            "coefficient": -0.0112,
            "odds_ratio": 0.9889,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 41
          },
          {
            "feature": "v170_yes",
            "coefficient": -0.014,
            "odds_ratio": 0.9861,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 42
          },
          {
            "feature": "v130_jain",
            "coefficient": -0.0235,
            "odds_ratio": 0.9768,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 43
          },
          {
            "feature": "v130_muslim",
            "coefficient": -0.0322,
            "odds_ratio": 0.9684,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 44
          },
          {
            "feature": "v501_never in union  [includes: married gauna not performed]",
            "coefficient": -0.0339,
            "odds_ratio": 0.9667,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 45
          },
          {
            "feature": "v158_less than once a week",
            "coefficient": -0.0365,
            "odds_ratio": 0.9642,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 46
          },
          {
            "feature": "v130_christian",
            "coefficient": -0.0382,
            "odds_ratio": 0.9626,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 47
          },
          {
            "feature": "media_exposure_index",
            "coefficient": -0.0422,
            "odds_ratio": 0.9587,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 48
          },
          {
            "feature": "v501_married",
            "coefficient": -0.0474,
            "odds_ratio": 0.9537,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 49
          },
          {
            "feature": "v743f_missing",
            "coefficient": -0.0674,
            "odds_ratio": 0.9348,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 50
          },
          {
            "feature": "v743f_respondent and husband/partner",
            "coefficient": -0.0842,
            "odds_ratio": 0.9192,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 51
          },
          {
            "feature": "v130_hindu",
            "coefficient": -0.0878,
            "odds_ratio": 0.9159,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 52
          },
          {
            "feature": "v158_not at all",
            "coefficient": -0.0913,
            "odds_ratio": 0.9128,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 53
          },
          {
            "feature": "v190_richer",
            "coefficient": -0.1113,
            "odds_ratio": 0.8947,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 54
          },
          {
            "feature": "v012",
            "coefficient": -0.1444,
            "odds_ratio": 0.8655,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 55
          },
          {
            "feature": "v190_richest",
            "coefficient": -0.2532,
            "odds_ratio": 0.7763,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 56
          }
        ]
      },
      "logistic": {
        "target": "target_logistic",
        "intercept": -0.8404,
        "num_features": 56,
        "top_risk_factors": [
          {
            "feature": "v190_poorest",
            "coefficient": 0.218,
            "odds_ratio": 1.2436,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 1
          },
          {
            "feature": "v106_no education",
            "coefficient": 0.1502,
            "odds_ratio": 1.162,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 2
          },
          {
            "feature": "v106_secondary",
            "coefficient": 0.1085,
            "odds_ratio": 1.1146,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 3
          },
          {
            "feature": "v190_poorer",
            "coefficient": 0.1023,
            "odds_ratio": 1.1077,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 4
          },
          {
            "feature": "v106_primary",
            "coefficient": 0.0956,
            "odds_ratio": 1.1003,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 5
          },
          {
            "feature": "v131_tribe",
            "coefficient": 0.0854,
            "odds_ratio": 1.0891,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 6
          },
          {
            "feature": "v157_not at all",
            "coefficient": 0.0799,
            "odds_ratio": 1.0832,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 7
          },
          {
            "feature": "v159_not at all",
            "coefficient": 0.053,
            "odds_ratio": 1.0545,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 8
          },
          {
            "feature": "v501_never in union  [includes: married gauna not performed]",
            "coefficient": 0.0352,
            "odds_ratio": 1.0358,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 9
          },
          {
            "feature": "v131_no caste / tribe",
            "coefficient": 0.0338,
            "odds_ratio": 1.0344,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 10
          }
        ],
        "top_protective_factors": [
          {
            "feature": "v190_richest",
            "coefficient": -0.2987,
            "odds_ratio": 0.7418,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 56
          },
          {
            "feature": "v130_hindu",
            "coefficient": -0.1264,
            "odds_ratio": 0.8812,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 55
          },
          {
            "feature": "v190_richer",
            "coefficient": -0.1222,
            "odds_ratio": 0.885,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 54
          },
          {
            "feature": "v130_muslim",
            "coefficient": -0.1004,
            "odds_ratio": 0.9045,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 53
          },
          {
            "feature": "v158_not at all",
            "coefficient": -0.0775,
            "odds_ratio": 0.9255,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 52
          },
          {
            "feature": "v130_christian",
            "coefficient": -0.0764,
            "odds_ratio": 0.9264,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 51
          },
          {
            "feature": "v743f_respondent and husband/partner",
            "coefficient": -0.0612,
            "odds_ratio": 0.9406,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 50
          },
          {
            "feature": "v717_not working",
            "coefficient": -0.0524,
            "odds_ratio": 0.949,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 49
          },
          {
            "feature": "media_exposure_index",
            "coefficient": -0.0522,
            "odds_ratio": 0.9491,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 48
          },
          {
            "feature": "v743f_missing",
            "coefficient": -0.0478,
            "odds_ratio": 0.9533,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 47
          }
        ],
        "all_features": [
          {
            "feature": "v190_poorest",
            "coefficient": 0.218,
            "odds_ratio": 1.2436,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 1
          },
          {
            "feature": "v106_no education",
            "coefficient": 0.1502,
            "odds_ratio": 1.162,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 2
          },
          {
            "feature": "v106_secondary",
            "coefficient": 0.1085,
            "odds_ratio": 1.1146,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 3
          },
          {
            "feature": "v190_poorer",
            "coefficient": 0.1023,
            "odds_ratio": 1.1077,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 4
          },
          {
            "feature": "v106_primary",
            "coefficient": 0.0956,
            "odds_ratio": 1.1003,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 5
          },
          {
            "feature": "v131_tribe",
            "coefficient": 0.0854,
            "odds_ratio": 1.0891,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 6
          },
          {
            "feature": "v157_not at all",
            "coefficient": 0.0799,
            "odds_ratio": 1.0832,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 7
          },
          {
            "feature": "v159_not at all",
            "coefficient": 0.053,
            "odds_ratio": 1.0545,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 8
          },
          {
            "feature": "v501_never in union  [includes: married gauna not performed]",
            "coefficient": 0.0352,
            "odds_ratio": 1.0358,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 9
          },
          {
            "feature": "v131_no caste / tribe",
            "coefficient": 0.0338,
            "odds_ratio": 1.0344,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 10
          },
          {
            "feature": "v170_no",
            "coefficient": 0.0268,
            "odds_ratio": 1.0272,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 11
          },
          {
            "feature": "v157_less than once a week",
            "coefficient": 0.0251,
            "odds_ratio": 1.0254,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 12
          },
          {
            "feature": "v013_20-24",
            "coefficient": 0.0176,
            "odds_ratio": 1.0177,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 13
          },
          {
            "feature": "v013_25-29",
            "coefficient": 0.0149,
            "odds_ratio": 1.015,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 14
          },
          {
            "feature": "v501_widowed",
            "coefficient": 0.0134,
            "odds_ratio": 1.0135,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 15
          },
          {
            "feature": "v159_less than once a week",
            "coefficient": 0.0134,
            "odds_ratio": 1.0135,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 16
          },
          {
            "feature": "v130_no religion",
            "coefficient": 0.0125,
            "odds_ratio": 1.0126,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 17
          },
          {
            "feature": "v169a_yes",
            "coefficient": 0.0112,
            "odds_ratio": 1.0113,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 18
          },
          {
            "feature": "v501_married",
            "coefficient": 0.0104,
            "odds_ratio": 1.0105,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 19
          },
          {
            "feature": "v013_30-34",
            "coefficient": 0.0093,
            "odds_ratio": 1.0093,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 20
          },
          {
            "feature": "v169a_no",
            "coefficient": 0.0083,
            "odds_ratio": 1.0084,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 21
          },
          {
            "feature": "v013_35-39",
            "coefficient": 0.0061,
            "odds_ratio": 1.0061,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 22
          },
          {
            "feature": "v481_yes",
            "coefficient": 0.0038,
            "odds_ratio": 1.0038,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 23
          },
          {
            "feature": "v170_yes",
            "coefficient": 0.0014,
            "odds_ratio": 1.0014,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 24
          },
          {
            "feature": "v501_no longer living together/separated",
            "coefficient": 0,
            "odds_ratio": 1,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 25
          },
          {
            "feature": "v130_jewish",
            "coefficient": -0.0006,
            "odds_ratio": 0.9994,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 26
          },
          {
            "feature": "v131_don't know",
            "coefficient": -0.001,
            "odds_ratio": 0.999,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 27
          },
          {
            "feature": "v717_don't know",
            "coefficient": -0.001,
            "odds_ratio": 0.999,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 28
          },
          {
            "feature": "v013_45-49",
            "coefficient": -0.0017,
            "odds_ratio": 0.9983,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 29
          },
          {
            "feature": "v130_parsi / zoroastrian",
            "coefficient": -0.0024,
            "odds_ratio": 0.9976,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 30
          },
          {
            "feature": "v717_other",
            "coefficient": -0.0039,
            "odds_ratio": 0.9961,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 31
          },
          {
            "feature": "v013_40-44",
            "coefficient": -0.0047,
            "odds_ratio": 0.9953,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 32
          },
          {
            "feature": "v717_clerical",
            "coefficient": -0.0047,
            "odds_ratio": 0.9953,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 33
          },
          {
            "feature": "v130_sikh",
            "coefficient": -0.0049,
            "odds_ratio": 0.9952,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 34
          },
          {
            "feature": "v743f_husband/partner has no earnings",
            "coefficient": -0.0049,
            "odds_ratio": 0.9951,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 35
          },
          {
            "feature": "v743f_respondent alone",
            "coefficient": -0.0061,
            "odds_ratio": 0.9939,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 36
          },
          {
            "feature": "v717_services / household and domestic",
            "coefficient": -0.0062,
            "odds_ratio": 0.9938,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 37
          },
          {
            "feature": "v717_sales",
            "coefficient": -0.0068,
            "odds_ratio": 0.9932,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 38
          },
          {
            "feature": "v012",
            "coefficient": -0.009,
            "odds_ratio": 0.9911,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 39
          },
          {
            "feature": "v743f_other",
            "coefficient": -0.0115,
            "odds_ratio": 0.9886,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 40
          },
          {
            "feature": "v717_professional / technical / managerial",
            "coefficient": -0.0133,
            "odds_ratio": 0.9868,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 41
          },
          {
            "feature": "v717_missing",
            "coefficient": -0.0145,
            "odds_ratio": 0.9856,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 42
          },
          {
            "feature": "v717_skilled and unskilled manual",
            "coefficient": -0.0148,
            "odds_ratio": 0.9853,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 43
          },
          {
            "feature": "v130_other",
            "coefficient": -0.0172,
            "odds_ratio": 0.983,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 44
          },
          {
            "feature": "v130_jain",
            "coefficient": -0.023,
            "odds_ratio": 0.9773,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 45
          },
          {
            "feature": "v158_less than once a week",
            "coefficient": -0.0263,
            "odds_ratio": 0.9741,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 46
          },
          {
            "feature": "v743f_missing",
            "coefficient": -0.0478,
            "odds_ratio": 0.9533,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 47
          },
          {
            "feature": "media_exposure_index",
            "coefficient": -0.0522,
            "odds_ratio": 0.9491,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 48
          },
          {
            "feature": "v717_not working",
            "coefficient": -0.0524,
            "odds_ratio": 0.949,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 49
          },
          {
            "feature": "v743f_respondent and husband/partner",
            "coefficient": -0.0612,
            "odds_ratio": 0.9406,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 50
          },
          {
            "feature": "v130_christian",
            "coefficient": -0.0764,
            "odds_ratio": 0.9264,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 51
          },
          {
            "feature": "v158_not at all",
            "coefficient": -0.0775,
            "odds_ratio": 0.9255,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 52
          },
          {
            "feature": "v130_muslim",
            "coefficient": -0.1004,
            "odds_ratio": 0.9045,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 53
          },
          {
            "feature": "v190_richer",
            "coefficient": -0.1222,
            "odds_ratio": 0.885,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 54
          },
          {
            "feature": "v130_hindu",
            "coefficient": -0.1264,
            "odds_ratio": 0.8812,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 55
          },
          {
            "feature": "v190_richest",
            "coefficient": -0.2987,
            "odds_ratio": 0.7418,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 56
          }
        ]
      },
      "facility": {
        "target": "target_facility",
        "intercept": -0.1683,
        "num_features": 56,
        "top_risk_factors": [
          {
            "feature": "v190_poorest",
            "coefficient": 0.1812,
            "odds_ratio": 1.1987,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 1
          },
          {
            "feature": "v501_never in union  [includes: married gauna not performed]",
            "coefficient": 0.1379,
            "odds_ratio": 1.1479,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 2
          },
          {
            "feature": "v501_married",
            "coefficient": 0.1202,
            "odds_ratio": 1.1277,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 3
          },
          {
            "feature": "v106_no education",
            "coefficient": 0.1094,
            "odds_ratio": 1.1156,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 4
          },
          {
            "feature": "v131_tribe",
            "coefficient": 0.079,
            "odds_ratio": 1.0822,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 5
          },
          {
            "feature": "v106_secondary",
            "coefficient": 0.0748,
            "odds_ratio": 1.0777,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 6
          },
          {
            "feature": "v190_poorer",
            "coefficient": 0.0743,
            "odds_ratio": 1.0772,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 7
          },
          {
            "feature": "v106_primary",
            "coefficient": 0.0736,
            "odds_ratio": 1.0763,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 8
          },
          {
            "feature": "v130_hindu",
            "coefficient": 0.0554,
            "odds_ratio": 1.057,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 9
          },
          {
            "feature": "v157_not at all",
            "coefficient": 0.0499,
            "odds_ratio": 1.0511,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 10
          }
        ],
        "top_protective_factors": [
          {
            "feature": "v190_richest",
            "coefficient": -0.1512,
            "odds_ratio": 0.8597,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 56
          },
          {
            "feature": "v130_sikh",
            "coefficient": -0.0774,
            "odds_ratio": 0.9255,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 55
          },
          {
            "feature": "v190_richer",
            "coefficient": -0.0586,
            "odds_ratio": 0.9431,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 54
          },
          {
            "feature": "v012",
            "coefficient": -0.0457,
            "odds_ratio": 0.9553,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 53
          },
          {
            "feature": "v130_christian",
            "coefficient": -0.0454,
            "odds_ratio": 0.9556,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 52
          },
          {
            "feature": "media_exposure_index",
            "coefficient": -0.0392,
            "odds_ratio": 0.9616,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 51
          },
          {
            "feature": "v130_parsi / zoroastrian",
            "coefficient": -0.0107,
            "odds_ratio": 0.9894,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 50
          },
          {
            "feature": "v717_professional / technical / managerial",
            "coefficient": -0.0101,
            "odds_ratio": 0.9899,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 49
          },
          {
            "feature": "v159_less than once a week",
            "coefficient": -0.0085,
            "odds_ratio": 0.9916,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 48
          },
          {
            "feature": "v717_don't know",
            "coefficient": -0.0079,
            "odds_ratio": 0.9921,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 47
          }
        ],
        "all_features": [
          {
            "feature": "v190_poorest",
            "coefficient": 0.1812,
            "odds_ratio": 1.1987,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 1
          },
          {
            "feature": "v501_never in union  [includes: married gauna not performed]",
            "coefficient": 0.1379,
            "odds_ratio": 1.1479,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 2
          },
          {
            "feature": "v501_married",
            "coefficient": 0.1202,
            "odds_ratio": 1.1277,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 3
          },
          {
            "feature": "v106_no education",
            "coefficient": 0.1094,
            "odds_ratio": 1.1156,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 4
          },
          {
            "feature": "v131_tribe",
            "coefficient": 0.079,
            "odds_ratio": 1.0822,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 5
          },
          {
            "feature": "v106_secondary",
            "coefficient": 0.0748,
            "odds_ratio": 1.0777,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 6
          },
          {
            "feature": "v190_poorer",
            "coefficient": 0.0743,
            "odds_ratio": 1.0772,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 7
          },
          {
            "feature": "v106_primary",
            "coefficient": 0.0736,
            "odds_ratio": 1.0763,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 8
          },
          {
            "feature": "v130_hindu",
            "coefficient": 0.0554,
            "odds_ratio": 1.057,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 9
          },
          {
            "feature": "v157_not at all",
            "coefficient": 0.0499,
            "odds_ratio": 1.0511,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 10
          },
          {
            "feature": "v131_no caste / tribe",
            "coefficient": 0.0491,
            "odds_ratio": 1.0503,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 11
          },
          {
            "feature": "v501_widowed",
            "coefficient": 0.0391,
            "odds_ratio": 1.0399,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 12
          },
          {
            "feature": "v481_yes",
            "coefficient": 0.0325,
            "odds_ratio": 1.033,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 13
          },
          {
            "feature": "v130_muslim",
            "coefficient": 0.0322,
            "odds_ratio": 1.0327,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 14
          },
          {
            "feature": "v157_less than once a week",
            "coefficient": 0.024,
            "odds_ratio": 1.0243,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 15
          },
          {
            "feature": "v013_20-24",
            "coefficient": 0.0219,
            "odds_ratio": 1.0222,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 16
          },
          {
            "feature": "v158_not at all",
            "coefficient": 0.0148,
            "odds_ratio": 1.0149,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 17
          },
          {
            "feature": "v013_25-29",
            "coefficient": 0.0124,
            "odds_ratio": 1.0125,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 18
          },
          {
            "feature": "v013_30-34",
            "coefficient": 0.0099,
            "odds_ratio": 1.0099,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 19
          },
          {
            "feature": "v501_no longer living together/separated",
            "coefficient": 0.0092,
            "odds_ratio": 1.0092,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 20
          },
          {
            "feature": "v169a_no",
            "coefficient": 0.0076,
            "odds_ratio": 1.0076,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 21
          },
          {
            "feature": "v013_35-39",
            "coefficient": 0.0073,
            "odds_ratio": 1.0074,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 22
          },
          {
            "feature": "v013_45-49",
            "coefficient": 0.0063,
            "odds_ratio": 1.0064,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 23
          },
          {
            "feature": "v131_don't know",
            "coefficient": 0.0064,
            "odds_ratio": 1.0064,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 24
          },
          {
            "feature": "v130_jain",
            "coefficient": 0.0031,
            "odds_ratio": 1.0031,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 25
          },
          {
            "feature": "v170_no",
            "coefficient": 0.0031,
            "odds_ratio": 1.0031,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 26
          },
          {
            "feature": "v170_yes",
            "coefficient": 0.0027,
            "odds_ratio": 1.0027,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 27
          },
          {
            "feature": "v013_40-44",
            "coefficient": 0.0015,
            "odds_ratio": 1.0015,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 28
          },
          {
            "feature": "v130_no religion",
            "coefficient": 0.0009,
            "odds_ratio": 1.0009,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 29
          },
          {
            "feature": "v743f_other",
            "coefficient": 0.0009,
            "odds_ratio": 1.0009,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 30
          },
          {
            "feature": "v130_other",
            "coefficient": 0.0005,
            "odds_ratio": 1.0005,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 31
          },
          {
            "feature": "v743f_missing",
            "coefficient": 0.0001,
            "odds_ratio": 1.0001,
            "effect_type": "Risk Factor (OR > 1)",
            "rank": 32
          },
          {
            "feature": "v130_jewish",
            "coefficient": -0.0008,
            "odds_ratio": 0.9992,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 33
          },
          {
            "feature": "v717_other",
            "coefficient": -0.0015,
            "odds_ratio": 0.9985,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 34
          },
          {
            "feature": "v158_less than once a week",
            "coefficient": -0.0015,
            "odds_ratio": 0.9985,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 35
          },
          {
            "feature": "v169a_yes",
            "coefficient": -0.0018,
            "odds_ratio": 0.9982,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 36
          },
          {
            "feature": "v743f_husband/partner has no earnings",
            "coefficient": -0.0023,
            "odds_ratio": 0.9978,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 37
          },
          {
            "feature": "v717_clerical",
            "coefficient": -0.003,
            "odds_ratio": 0.997,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 38
          },
          {
            "feature": "v717_services / household and domestic",
            "coefficient": -0.0037,
            "odds_ratio": 0.9963,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 39
          },
          {
            "feature": "v717_missing",
            "coefficient": -0.004,
            "odds_ratio": 0.9961,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 40
          },
          {
            "feature": "v717_skilled and unskilled manual",
            "coefficient": -0.0042,
            "odds_ratio": 0.9958,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 41
          },
          {
            "feature": "v743f_respondent alone",
            "coefficient": -0.005,
            "odds_ratio": 0.995,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 42
          },
          {
            "feature": "v159_not at all",
            "coefficient": -0.0059,
            "odds_ratio": 0.9941,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 43
          },
          {
            "feature": "v743f_respondent and husband/partner",
            "coefficient": -0.0063,
            "odds_ratio": 0.9938,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 44
          },
          {
            "feature": "v717_sales",
            "coefficient": -0.007,
            "odds_ratio": 0.993,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 45
          },
          {
            "feature": "v717_not working",
            "coefficient": -0.0076,
            "odds_ratio": 0.9924,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 46
          },
          {
            "feature": "v717_don't know",
            "coefficient": -0.0079,
            "odds_ratio": 0.9921,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 47
          },
          {
            "feature": "v159_less than once a week",
            "coefficient": -0.0085,
            "odds_ratio": 0.9916,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 48
          },
          {
            "feature": "v717_professional / technical / managerial",
            "coefficient": -0.0101,
            "odds_ratio": 0.9899,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 49
          },
          {
            "feature": "v130_parsi / zoroastrian",
            "coefficient": -0.0107,
            "odds_ratio": 0.9894,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 50
          },
          {
            "feature": "media_exposure_index",
            "coefficient": -0.0392,
            "odds_ratio": 0.9616,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 51
          },
          {
            "feature": "v130_christian",
            "coefficient": -0.0454,
            "odds_ratio": 0.9556,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 52
          },
          {
            "feature": "v012",
            "coefficient": -0.0457,
            "odds_ratio": 0.9553,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 53
          },
          {
            "feature": "v190_richer",
            "coefficient": -0.0586,
            "odds_ratio": 0.9431,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 54
          },
          {
            "feature": "v130_sikh",
            "coefficient": -0.0774,
            "odds_ratio": 0.9255,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 55
          },
          {
            "feature": "v190_richest",
            "coefficient": -0.1512,
            "odds_ratio": 0.8597,
            "effect_type": "Protective Factor (OR < 1)",
            "rank": 56
          }
        ]
      }
    }
  },
  "ruralUrbanSummary": {
    "metadata": {
      "title": "Rural vs Urban Healthcare Access Barrier Comparison",
      "section_reference": "Section 11.2 & Section 6 Item 4",
      "scope_exclusion_note": "Explicitly excludes waiting-time and service-quality metrics because they are not supported by available NFHS-5 v467 columns in India recode."
    },
    "groups": [
      {
        "residence": "Rural",
        "sample_size_n": 544580,
        "pct_national_sample": 0.7521,
        "observed_household_rate": 0.2995,
        "observed_logistic_rate": 0.363,
        "observed_facility_rate": 0.4918,
        "observed_any_barrier_rate": 0.6349,
        "predicted_household_prob": 0.5157,
        "predicted_logistic_prob": 0.5225,
        "predicted_facility_prob": 0.523,
        "dominant_barrier": "Facility"
      },
      {
        "residence": "Urban",
        "sample_size_n": 179535,
        "pct_national_sample": 0.2479,
        "observed_household_rate": 0.1868,
        "observed_logistic_rate": 0.1736,
        "observed_facility_rate": 0.3637,
        "observed_any_barrier_rate": 0.4603,
        "predicted_household_prob": 0.367,
        "predicted_logistic_prob": 0.3631,
        "predicted_facility_prob": 0.4214,
        "dominant_barrier": "Facility"
      }
    ]
  },
  "stateSummary": {
    "metadata": {
      "title": "State-Level Healthcare Access Barrier Summary",
      "total_states_uts": 36,
      "national_total_women": 724115
    },
    "states": [
      {
        "state_name": "Andaman & Nicobar Islands",
        "sample_size_n": 2397,
        "pct_national_sample": 0.0033,
        "observed_household_rate": 0.035,
        "observed_logistic_rate": 0.1126,
        "observed_facility_rate": 0.6404,
        "observed_any_barrier_rate": 0.6575,
        "predicted_household_prob": 0.3778,
        "predicted_logistic_prob": 0.4264,
        "predicted_facility_prob": 0.5126,
        "predicted_composite_score": 0.4389,
        "dominant_barrier": "Facility"
      },
      {
        "state_name": "Andhra Pradesh",
        "sample_size_n": 10975,
        "pct_national_sample": 0.0152,
        "observed_household_rate": 0.2613,
        "observed_logistic_rate": 0.3126,
        "observed_facility_rate": 0.3605,
        "observed_any_barrier_rate": 0.5462,
        "predicted_household_prob": 0.4311,
        "predicted_logistic_prob": 0.4478,
        "predicted_facility_prob": 0.4797,
        "predicted_composite_score": 0.4529,
        "dominant_barrier": "Facility"
      },
      {
        "state_name": "Arunachal Pradesh",
        "sample_size_n": 19765,
        "pct_national_sample": 0.0273,
        "observed_household_rate": 0.4406,
        "observed_logistic_rate": 0.548,
        "observed_facility_rate": 0.6056,
        "observed_any_barrier_rate": 0.759,
        "predicted_household_prob": 0.5668,
        "predicted_logistic_prob": 0.5938,
        "predicted_facility_prob": 0.5492,
        "predicted_composite_score": 0.5699,
        "dominant_barrier": "Facility"
      },
      {
        "state_name": "Assam",
        "sample_size_n": 34979,
        "pct_national_sample": 0.0483,
        "observed_household_rate": 0.4044,
        "observed_logistic_rate": 0.3725,
        "observed_facility_rate": 0.5403,
        "observed_any_barrier_rate": 0.7033,
        "predicted_household_prob": 0.5786,
        "predicted_logistic_prob": 0.5609,
        "predicted_facility_prob": 0.5697,
        "predicted_composite_score": 0.5697,
        "dominant_barrier": "Facility"
      },
      {
        "state_name": "Bihar",
        "sample_size_n": 42483,
        "pct_national_sample": 0.0587,
        "observed_household_rate": 0.3438,
        "observed_logistic_rate": 0.3741,
        "observed_facility_rate": 0.5334,
        "observed_any_barrier_rate": 0.6638,
        "predicted_household_prob": 0.5523,
        "predicted_logistic_prob": 0.5496,
        "predicted_facility_prob": 0.5427,
        "predicted_composite_score": 0.5482,
        "dominant_barrier": "Facility"
      },
      {
        "state_name": "Chandigarh",
        "sample_size_n": 746,
        "pct_national_sample": 0.001,
        "observed_household_rate": 0.1287,
        "observed_logistic_rate": 0.1072,
        "observed_facility_rate": 0.1193,
        "observed_any_barrier_rate": 0.2225,
        "predicted_household_prob": 0.309,
        "predicted_logistic_prob": 0.304,
        "predicted_facility_prob": 0.3743,
        "predicted_composite_score": 0.3291,
        "dominant_barrier": "Household"
      },
      {
        "state_name": "Chhattisgarh",
        "sample_size_n": 28468,
        "pct_national_sample": 0.0393,
        "observed_household_rate": 0.3675,
        "observed_logistic_rate": 0.3928,
        "observed_facility_rate": 0.6539,
        "observed_any_barrier_rate": 0.7391,
        "predicted_household_prob": 0.5211,
        "predicted_logistic_prob": 0.5363,
        "predicted_facility_prob": 0.5603,
        "predicted_composite_score": 0.5393,
        "dominant_barrier": "Facility"
      },
      {
        "state_name": "Dadra & Nagar Haveli and Daman & Diu",
        "sample_size_n": 2713,
        "pct_national_sample": 0.0037,
        "observed_household_rate": 0.1548,
        "observed_logistic_rate": 0.3022,
        "observed_facility_rate": 0.3362,
        "observed_any_barrier_rate": 0.4276,
        "predicted_household_prob": 0.4119,
        "predicted_logistic_prob": 0.4306,
        "predicted_facility_prob": 0.4841,
        "predicted_composite_score": 0.4422,
        "dominant_barrier": "Facility"
      },
      {
        "state_name": "Delhi",
        "sample_size_n": 11159,
        "pct_national_sample": 0.0154,
        "observed_household_rate": 0.0953,
        "observed_logistic_rate": 0.1175,
        "observed_facility_rate": 0.2817,
        "observed_any_barrier_rate": 0.3525,
        "predicted_household_prob": 0.3236,
        "predicted_logistic_prob": 0.3134,
        "predicted_facility_prob": 0.3927,
        "predicted_composite_score": 0.3432,
        "dominant_barrier": "Facility"
      },
      {
        "state_name": "Goa",
        "sample_size_n": 2030,
        "pct_national_sample": 0.0028,
        "observed_household_rate": 0.0404,
        "observed_logistic_rate": 0.0808,
        "observed_facility_rate": 0.3887,
        "observed_any_barrier_rate": 0.4202,
        "predicted_household_prob": 0.2649,
        "predicted_logistic_prob": 0.2681,
        "predicted_facility_prob": 0.3577,
        "predicted_composite_score": 0.2969,
        "dominant_barrier": "Facility"
      },
      {
        "state_name": "Gujarat",
        "sample_size_n": 33343,
        "pct_national_sample": 0.046,
        "observed_household_rate": 0.209,
        "observed_logistic_rate": 0.3293,
        "observed_facility_rate": 0.4719,
        "observed_any_barrier_rate": 0.5629,
        "predicted_household_prob": 0.4498,
        "predicted_logistic_prob": 0.4559,
        "predicted_facility_prob": 0.4903,
        "predicted_composite_score": 0.4653,
        "dominant_barrier": "Facility"
      },
      {
        "state_name": "Haryana",
        "sample_size_n": 21909,
        "pct_national_sample": 0.0303,
        "observed_household_rate": 0.1684,
        "observed_logistic_rate": 0.2247,
        "observed_facility_rate": 0.4474,
        "observed_any_barrier_rate": 0.5233,
        "predicted_household_prob": 0.373,
        "predicted_logistic_prob": 0.3697,
        "predicted_facility_prob": 0.426,
        "predicted_composite_score": 0.3896,
        "dominant_barrier": "Facility"
      },
      {
        "state_name": "Himachal Pradesh",
        "sample_size_n": 10368,
        "pct_national_sample": 0.0143,
        "observed_household_rate": 0.0807,
        "observed_logistic_rate": 0.2481,
        "observed_facility_rate": 0.3174,
        "observed_any_barrier_rate": 0.4499,
        "predicted_household_prob": 0.3979,
        "predicted_logistic_prob": 0.4111,
        "predicted_facility_prob": 0.4511,
        "predicted_composite_score": 0.42,
        "dominant_barrier": "Facility"
      },
      {
        "state_name": "Jammu & Kashmir",
        "sample_size_n": 23037,
        "pct_national_sample": 0.0318,
        "observed_household_rate": 0.2864,
        "observed_logistic_rate": 0.4379,
        "observed_facility_rate": 0.517,
        "observed_any_barrier_rate": 0.6663,
        "predicted_household_prob": 0.483,
        "predicted_logistic_prob": 0.4912,
        "predicted_facility_prob": 0.494,
        "predicted_composite_score": 0.4894,
        "dominant_barrier": "Facility"
      },
      {
        "state_name": "Jharkhand",
        "sample_size_n": 26495,
        "pct_national_sample": 0.0366,
        "observed_household_rate": 0.3721,
        "observed_logistic_rate": 0.4294,
        "observed_facility_rate": 0.5921,
        "observed_any_barrier_rate": 0.73,
        "predicted_household_prob": 0.5561,
        "predicted_logistic_prob": 0.5605,
        "predicted_facility_prob": 0.5592,
        "predicted_composite_score": 0.5586,
        "dominant_barrier": "Facility"
      },
      {
        "state_name": "Karnataka",
        "sample_size_n": 30455,
        "pct_national_sample": 0.0421,
        "observed_household_rate": 0.2437,
        "observed_logistic_rate": 0.2829,
        "observed_facility_rate": 0.4132,
        "observed_any_barrier_rate": 0.5538,
        "predicted_household_prob": 0.4451,
        "predicted_logistic_prob": 0.4462,
        "predicted_facility_prob": 0.4753,
        "predicted_composite_score": 0.4555,
        "dominant_barrier": "Facility"
      },
      {
        "state_name": "Kerala",
        "sample_size_n": 10969,
        "pct_national_sample": 0.0151,
        "observed_household_rate": 0.0341,
        "observed_logistic_rate": 0.0405,
        "observed_facility_rate": 0.0144,
        "observed_any_barrier_rate": 0.0758,
        "predicted_household_prob": 0.3206,
        "predicted_logistic_prob": 0.3196,
        "predicted_facility_prob": 0.3728,
        "predicted_composite_score": 0.3377,
        "dominant_barrier": "Logistic"
      },
      {
        "state_name": "Ladakh",
        "sample_size_n": 2355,
        "pct_national_sample": 0.0033,
        "observed_household_rate": 0.2786,
        "observed_logistic_rate": 0.4246,
        "observed_facility_rate": 0.4539,
        "observed_any_barrier_rate": 0.6246,
        "predicted_household_prob": 0.5127,
        "predicted_logistic_prob": 0.575,
        "predicted_facility_prob": 0.5205,
        "predicted_composite_score": 0.5361,
        "dominant_barrier": "Facility"
      },
      {
        "state_name": "Lakshadweep",
        "sample_size_n": 1234,
        "pct_national_sample": 0.0017,
        "observed_household_rate": 0.0211,
        "observed_logistic_rate": 0.0292,
        "observed_facility_rate": 0.0235,
        "observed_any_barrier_rate": 0.0519,
        "predicted_household_prob": 0.33,
        "predicted_logistic_prob": 0.3191,
        "predicted_facility_prob": 0.3586,
        "predicted_composite_score": 0.3359,
        "dominant_barrier": "Logistic"
      },
      {
        "state_name": "Madhya Pradesh",
        "sample_size_n": 48410,
        "pct_national_sample": 0.0669,
        "observed_household_rate": 0.2543,
        "observed_logistic_rate": 0.3343,
        "observed_facility_rate": 0.5351,
        "observed_any_barrier_rate": 0.6541,
        "predicted_household_prob": 0.5093,
        "predicted_logistic_prob": 0.5151,
        "predicted_facility_prob": 0.5295,
        "predicted_composite_score": 0.518,
        "dominant_barrier": "Facility"
      },
      {
        "state_name": "Maharashtra",
        "sample_size_n": 33755,
        "pct_national_sample": 0.0466,
        "observed_household_rate": 0.1905,
        "observed_logistic_rate": 0.2349,
        "observed_facility_rate": 0.3953,
        "observed_any_barrier_rate": 0.498,
        "predicted_household_prob": 0.4412,
        "predicted_logistic_prob": 0.4441,
        "predicted_facility_prob": 0.4749,
        "predicted_composite_score": 0.4534,
        "dominant_barrier": "Facility"
      },
      {
        "state_name": "Manipur",
        "sample_size_n": 8042,
        "pct_national_sample": 0.0111,
        "observed_household_rate": 0.2254,
        "observed_logistic_rate": 0.2002,
        "observed_facility_rate": 0.1036,
        "observed_any_barrier_rate": 0.3456,
        "predicted_household_prob": 0.5171,
        "predicted_logistic_prob": 0.5171,
        "predicted_facility_prob": 0.4694,
        "predicted_composite_score": 0.5012,
        "dominant_barrier": "Household"
      },
      {
        "state_name": "Meghalaya",
        "sample_size_n": 13089,
        "pct_national_sample": 0.0181,
        "observed_household_rate": 0.4061,
        "observed_logistic_rate": 0.407,
        "observed_facility_rate": 0.4337,
        "observed_any_barrier_rate": 0.6124,
        "predicted_household_prob": 0.5789,
        "predicted_logistic_prob": 0.5726,
        "predicted_facility_prob": 0.5038,
        "predicted_composite_score": 0.5518,
        "dominant_barrier": "Facility"
      },
      {
        "state_name": "Mizoram",
        "sample_size_n": 7279,
        "pct_national_sample": 0.0101,
        "observed_household_rate": 0.0445,
        "observed_logistic_rate": 0.0617,
        "observed_facility_rate": 0.0168,
        "observed_any_barrier_rate": 0.0903,
        "predicted_household_prob": 0.3735,
        "predicted_logistic_prob": 0.3674,
        "predicted_facility_prob": 0.3515,
        "predicted_composite_score": 0.3642,
        "dominant_barrier": "Logistic"
      },
      {
        "state_name": "Nagaland",
        "sample_size_n": 9694,
        "pct_national_sample": 0.0134,
        "observed_household_rate": 0.371,
        "observed_logistic_rate": 0.4533,
        "observed_facility_rate": 0.7219,
        "observed_any_barrier_rate": 0.8258,
        "predicted_household_prob": 0.5611,
        "predicted_logistic_prob": 0.5854,
        "predicted_facility_prob": 0.5385,
        "predicted_composite_score": 0.5616,
        "dominant_barrier": "Facility"
      },
      {
        "state_name": "Odisha",
        "sample_size_n": 27971,
        "pct_national_sample": 0.0386,
        "observed_household_rate": 0.3399,
        "observed_logistic_rate": 0.4035,
        "observed_facility_rate": 0.7925,
        "observed_any_barrier_rate": 0.861,
        "predicted_household_prob": 0.5204,
        "predicted_logistic_prob": 0.5322,
        "predicted_facility_prob": 0.5477,
        "predicted_composite_score": 0.5334,
        "dominant_barrier": "Facility"
      },
      {
        "state_name": "Puducherry",
        "sample_size_n": 3669,
        "pct_national_sample": 0.0051,
        "observed_household_rate": 0.1464,
        "observed_logistic_rate": 0.118,
        "observed_facility_rate": 0.1829,
        "observed_any_barrier_rate": 0.3001,
        "predicted_household_prob": 0.3259,
        "predicted_logistic_prob": 0.3244,
        "predicted_facility_prob": 0.396,
        "predicted_composite_score": 0.3488,
        "dominant_barrier": "Facility"
      },
      {
        "state_name": "Punjab",
        "sample_size_n": 21771,
        "pct_national_sample": 0.0301,
        "observed_household_rate": 0.197,
        "observed_logistic_rate": 0.2391,
        "observed_facility_rate": 0.2016,
        "observed_any_barrier_rate": 0.3688,
        "predicted_household_prob": 0.3693,
        "predicted_logistic_prob": 0.3801,
        "predicted_facility_prob": 0.3243,
        "predicted_composite_score": 0.3579,
        "dominant_barrier": "Logistic"
      },
      {
        "state_name": "Rajasthan",
        "sample_size_n": 42990,
        "pct_national_sample": 0.0594,
        "observed_household_rate": 0.2113,
        "observed_logistic_rate": 0.2756,
        "observed_facility_rate": 0.4926,
        "observed_any_barrier_rate": 0.5956,
        "predicted_household_prob": 0.4578,
        "predicted_logistic_prob": 0.4711,
        "predicted_facility_prob": 0.5118,
        "predicted_composite_score": 0.4802,
        "dominant_barrier": "Facility"
      },
      {
        "state_name": "Sikkim",
        "sample_size_n": 3271,
        "pct_national_sample": 0.0045,
        "observed_household_rate": 0.3421,
        "observed_logistic_rate": 0.4537,
        "observed_facility_rate": 0.6133,
        "observed_any_barrier_rate": 0.7805,
        "predicted_household_prob": 0.4697,
        "predicted_logistic_prob": 0.4879,
        "predicted_facility_prob": 0.4802,
        "predicted_composite_score": 0.4793,
        "dominant_barrier": "Facility"
      },
      {
        "state_name": "Tamil Nadu",
        "sample_size_n": 25650,
        "pct_national_sample": 0.0354,
        "observed_household_rate": 0.1961,
        "observed_logistic_rate": 0.2391,
        "observed_facility_rate": 0.2623,
        "observed_any_barrier_rate": 0.4427,
        "predicted_household_prob": 0.3994,
        "predicted_logistic_prob": 0.412,
        "predicted_facility_prob": 0.4503,
        "predicted_composite_score": 0.4206,
        "dominant_barrier": "Facility"
      },
      {
        "state_name": "Telangana",
        "sample_size_n": 27518,
        "pct_national_sample": 0.038,
        "observed_household_rate": 0.2834,
        "observed_logistic_rate": 0.3937,
        "observed_facility_rate": 0.4411,
        "observed_any_barrier_rate": 0.6065,
        "predicted_household_prob": 0.4344,
        "predicted_logistic_prob": 0.4507,
        "predicted_facility_prob": 0.4845,
        "predicted_composite_score": 0.4565,
        "dominant_barrier": "Facility"
      },
      {
        "state_name": "Tripura",
        "sample_size_n": 7314,
        "pct_national_sample": 0.0101,
        "observed_household_rate": 0.4694,
        "observed_logistic_rate": 0.3186,
        "observed_facility_rate": 0.4746,
        "observed_any_barrier_rate": 0.6749,
        "predicted_household_prob": 0.5567,
        "predicted_logistic_prob": 0.5581,
        "predicted_facility_prob": 0.5619,
        "predicted_composite_score": 0.5589,
        "dominant_barrier": "Facility"
      },
      {
        "state_name": "Uttar Pradesh",
        "sample_size_n": 93124,
        "pct_national_sample": 0.1286,
        "observed_household_rate": 0.2648,
        "observed_logistic_rate": 0.264,
        "observed_facility_rate": 0.3977,
        "observed_any_barrier_rate": 0.5492,
        "predicted_household_prob": 0.4952,
        "predicted_logistic_prob": 0.4891,
        "predicted_facility_prob": 0.5011,
        "predicted_composite_score": 0.4952,
        "dominant_barrier": "Facility"
      },
      {
        "state_name": "Uttarakhand",
        "sample_size_n": 13280,
        "pct_national_sample": 0.0183,
        "observed_household_rate": 0.1364,
        "observed_logistic_rate": 0.3444,
        "observed_facility_rate": 0.5228,
        "observed_any_barrier_rate": 0.6264,
        "predicted_household_prob": 0.4284,
        "predicted_logistic_prob": 0.4402,
        "predicted_facility_prob": 0.4792,
        "predicted_composite_score": 0.4493,
        "dominant_barrier": "Facility"
      },
      {
        "state_name": "West Bengal",
        "sample_size_n": 21408,
        "pct_national_sample": 0.0296,
        "observed_household_rate": 0.4964,
        "observed_logistic_rate": 0.3374,
        "observed_facility_rate": 0.5004,
        "observed_any_barrier_rate": 0.715,
        "predicted_household_prob": 0.5368,
        "predicted_logistic_prob": 0.525,
        "predicted_facility_prob": 0.5357,
        "predicted_composite_score": 0.5325,
        "dominant_barrier": "Facility"
      }
    ]
  },
  "validationReport": {
    "validation_passed": true,
    "total_files": 9,
    "passed_files": 9,
    "failed_files": 0,
    "details": {
      "national_overview.json": {
        "status": "PASS",
        "errors": []
      },
      "state_summary.json": {
        "status": "PASS",
        "errors": []
      },
      "demographic_summary.json": {
        "status": "PASS",
        "errors": []
      },
      "cluster_summary.json": {
        "status": "PASS",
        "errors": []
      },
      "outcome_impact_summary.json": {
        "status": "PASS",
        "errors": []
      },
      "rural_urban_summary.json": {
        "status": "PASS",
        "errors": []
      },
      "empowerment_summary.json": {
        "status": "PASS",
        "errors": []
      },
      "multiple_barrier_summary.json": {
        "status": "PASS",
        "errors": []
      },
      "regression_summary.json": {
        "status": "PASS",
        "errors": []
      }
    }
  }
};

  /**
   * In-memory cache for loaded JSON files.
   */
  const _dataCache = {};

  /**
   * Resolve environment-appropriate file path or URL.
   * Auto-adjusts relative path if executing inside dashboard subpages or root context.
   */
  function resolveFilePath(sourceKey, basePath = '') {
    const config = CHATBOT_DATA_SOURCES[sourceKey];
    if (!config) {
      throw new Error(`Unknown data source key: "${sourceKey}"`);
    }
    let relPath = config.file;
    if (basePath) {
      if (!basePath.endsWith('/')) basePath += '/';
      relPath = basePath + relPath.replace(/^dashboard\//, '');
    } else if (typeof window !== 'undefined' && window.location && window.location.pathname) {
      const pathname = window.location.pathname;
      if (pathname.indexOf('/pages/') !== -1) {
        relPath = '../assets/data/' + relPath.replace(/^dashboard\/assets\/data\//, '');
      } else {
        relPath = relPath.replace(/^dashboard\//, '');
      }
    }
    return relPath;
  }

  /**
   * Load a single data source asynchronously.
   * Handles browser fetch with candidate path iteration, Node.js fs loading, and embedded fallbacks.
   */
  async function loadDataSource(sourceKey, basePath = '') {
    if (_dataCache[sourceKey]) {
      return _dataCache[sourceKey];
    }

    const pathOrUrl = resolveFilePath(sourceKey, basePath);

    // Node.js environment detection
    if (typeof window === 'undefined' && typeof require !== 'undefined') {
      try {
        const fs = require('fs');
        const path = require('path');
        const filename = path.basename(pathOrUrl);
        const candidatePaths = [
          pathOrUrl,
          path.resolve(process.cwd(), pathOrUrl),
          path.resolve(process.cwd(), 'dashboard/assets/data', filename),
          path.resolve(process.cwd(), 'assets/data', filename),
          path.resolve(__dirname, '../data', filename),
          path.resolve(__dirname, '../../assets/data', filename)
        ];

        for (const p of candidatePaths) {
          try {
            if (fs.existsSync(p)) {
              const fileContent = fs.readFileSync(p, 'utf8');
              const data = JSON.parse(fileContent);
              _dataCache[sourceKey] = data;
              return data;
            }
          } catch (e) {}
        }
      } catch (err) {
        console.warn(`[BarrierLensData] Warning: Node fs attempt failed for "${sourceKey}": ${err.message}`);
      }

      if (EMBEDDED_DATA_FALLBACKS[sourceKey]) {
        _dataCache[sourceKey] = EMBEDDED_DATA_FALLBACKS[sourceKey];
        return EMBEDDED_DATA_FALLBACKS[sourceKey];
      }
      return null;
    }

    // Browser environment: try candidate URLs
    const filename = pathOrUrl.split('/').pop();
    const candidateUrls = [
      pathOrUrl,
      `assets/data/${filename}`,
      `./assets/data/${filename}`,
      `../assets/data/${filename}`,
      `dashboard/assets/data/${filename}`,
      `/assets/data/${filename}`,
      `/dashboard/assets/data/${filename}`
    ];
    const uniqueUrls = [...new Set(candidateUrls)];

    for (const url of uniqueUrls) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          _dataCache[sourceKey] = data;
          return data;
        }
      } catch (err) {
        // Continue trying candidates
      }
    }

    // Ultimate fallback to embedded data
    if (EMBEDDED_DATA_FALLBACKS[sourceKey]) {
      _dataCache[sourceKey] = EMBEDDED_DATA_FALLBACKS[sourceKey];
      return EMBEDDED_DATA_FALLBACKS[sourceKey];
    }

    console.warn(`[BarrierLensData] Warning: Failed to fetch "${sourceKey}" and no embedded fallback available.`);
    return null;
  }

  /**
   * Preload all registered data sources into memory cache.
   */
  async function preloadChatbotData(basePath = '') {
    const keys = Object.keys(CHATBOT_DATA_SOURCES);
    const results = await Promise.allSettled(
      keys.map(key => loadDataSource(key, basePath))
    );
    const loaded = {};
    keys.forEach((key, idx) => {
      if (results[idx].status === 'fulfilled' && results[idx].value) {
        loaded[key] = results[idx].value;
      } else {
        loaded[key] = _dataCache[key] || EMBEDDED_DATA_FALLBACKS[key] || null;
        if (loaded[key]) _dataCache[key] = loaded[key];
      }
    });
    return loaded;
  }

  /**
   * Set cache directly (useful for testing or custom injection).
   */
  function setDataSource(sourceKey, data) {
    _dataCache[sourceKey] = data;
  }

  /**
   * Clear in-memory cache.
   */
  function clearCache() {
    Object.keys(_dataCache).forEach(k => delete _dataCache[k]);
  }

  /**
   * Multilingual Keyword Dictionaries for Language-Aware Entity & Intent Support.
   */
  const MULTILINGUAL_DICTIONARY = {
    en: {
      household: ["household", "family", "permission", "alone", "distance"],
      logistic: ["logistic", "transport", "money", "cost", "financial", "escort"],
      facility: ["facility", "provider", "doctor", "female provider", "medicine"],
      rural: ["rural", "village"],
      urban: ["urban", "city", "town"],
      compare: ["compare", "versus", "vs", "difference", "higher", "lower", "between"]
    },
    kn: {
      states: {
        "ಕರ್ನಾಟಕ": "Karnataka",
        "ಕೇರಳ": "Kerala",
        "ತಮಿಳುನಾಡು": "Tamil Nadu",
        "ಮಹಾರಾಷ್ಟ್ರ": "Maharashtra"
      },
      household: ["ಮನೆ", "ಕುಟುಂಬ", "ಅನುಮತಿ", "ಒಂಟಿಯಾಗಿ"],
      logistic: ["ಸಾರಿಗೆ", "ಹಣ", "ವೆಚ್ಚ", "ದೂರ"],
      facility: ["ಆಸ್ಪತ್ರೆ", "ವೈದ್ಯರು", "ಸೌಲಭ್ಯ", "ಔಷಧ"],
      rural: ["ಗ್ರಾಮೀಣ", "ಹಳ್ಳಿ"],
      urban: ["ನಗರ", "ಪಟ್ಟಣ"],
      compare: ["ಹೋಲಿಕೆ", "ವ್ಯತ್ಯಾಸ", "ಹೋಲಿಸಿ", "ನಡುವೆ", "ಹೋಲಿಸು"]
    },
    hi: {
      states: {
        "ಕರ್ನಾಟಕ": "Karnataka",
        "केरल": "Kerala",
        "तमिलनाडु": "Tamil Nadu",
        "महाराष्ट्र": "Maharashtra",
        "उत्तर प्रदेश": "Uttar Pradesh"
      },
      household: ["घरेलू", "परिवार", "अनुमति", "अकेले"],
      logistic: ["परिवहन", "पैसा", "लागत", "दूरी", "वित्तीय"],
      facility: ["अस्पताल", "डॉक्टर", "सुविधा", "दवा"],
      rural: ["ग्रामीण", "गांव"],
      urban: ["शहरी", "शहर"],
      compare: ["तुलना", "अंतर", "बनाम", "बीच"]
    }
  };

  return {
    CHATBOT_DATA_SOURCES,
    loadDataSource,
    preloadChatbotData,
    setDataSource,
    clearCache,
    MULTILINGUAL_DICTIONARY
  };
}));
