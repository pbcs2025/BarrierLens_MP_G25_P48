/**
 * BARRIERLENS — MEMBER 2: BARRIER DATA MAP CONFIGURATION
 * Authoritative mapping between the 5 conversational barrier categories and verified BarrierLens JSON sources.
 * Dual environment support: Browser (UMD) & Node.js (CommonJS).
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.BarrierLensDataMap = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /**
   * 5 Conversational Barrier Mapping Registry
   */
  const BARRIER_MAP = {
    household: {
      key: "household",
      label: "Household Barrier",
      aliases: [
        "household barrier", "household", "house", "family", "permission", "alone", "distance",
        "ಮನೆ", "ಕುಟುಂಬ", "ಅನುಮತಿ", "ಘರೇಲೂ", "परिवार"
      ],
      sources: [
        "nationalOverview", "stateSummary", "demographicSummary", "ruralUrbanSummary",
        "regressionSummary", "basePaperReference", "empowermentSummary"
      ],
      explanation: "Household barriers reflect socio-cultural constraints within the family unit, including needing permission to seek medical treatment, reluctance or inability to travel alone, or lack of intra-household decision autonomy.",
      statisticFields: {
        nationalObserved: {
          sourceKey: "nationalOverview",
          file: "dashboard/assets/data/national_overview.json",
          path: "kpis.observed_household_rate",
          label: "National Observed Household Barrier Rate",
          unit: "%",
          multiplier: 100,
          rank: 3
        },
        nationalPredicted: {
          sourceKey: "nationalOverview",
          file: "dashboard/assets/data/national_overview.json",
          path: "kpis.predicted_household_prob",
          label: "National Predicted Household Barrier Probability",
          unit: "%",
          multiplier: 100
        },
        basePaperRate: {
          sourceKey: "nationalOverview",
          file: "dashboard/assets/data/national_overview.json",
          path: "kpis.base_paper_household_rate",
          label: "Base Paper Reference Household Barrier Rate",
          unit: "%",
          multiplier: 100
        }
      },
      stateField: "observed_household_rate",
      predictedStateField: "predicted_household_prob",
      demographicField: "observed_household_rate",
      ruralUrbanField: "observed_household_rate",
      supportedComparisonTypes: ["state_vs_state", "rural_vs_urban", "barrier_vs_barrier", "demographic"],
      supportedInterventions: [
        {
          title: "Intra-Household Empowerment & Autonomy",
          sourceKey: "empowermentSummary",
          sourceFile: "dashboard/assets/data/empowerment_summary.json",
          path: "by_empowerment_level",
          detail: "Strengthening women's decision-making autonomy regarding healthcare, major household purchases, and family visits reduces household barrier exposure."
        },
        {
          title: "Mass Media & Gender Awareness",
          sourceKey: "basePaperReference",
          sourceFile: "dashboard/assets/data/base_paper_reference.json",
          path: "protective_factors[1]",
          detail: "Regular mass media exposure and mobile phone access are documented protective factors (AOR < 1) associated with lower household barrier prevalence."
        }
      ],
      provenanceMetadata: {
        dataGrounding: "NFHS-5 (2019-2021) Recode Column v467b (getting permission to go)",
        sampleSizeN: 724115
      }
    },

    logistic: {
      key: "logistic",
      label: "Logistic Barrier",
      aliases: [
        "logistic barrier", "logistic", "logistics", "transport", "distance", "cost", "escort",
        "financial", "money", "ಸಾರಿಗೆ", "ಹಣ", "ವೆಚ್ಚ", "परिवहन", "लागत"
      ],
      sources: [
        "nationalOverview", "stateSummary", "demographicSummary", "ruralUrbanSummary",
        "regressionSummary", "basePaperReference"
      ],
      explanation: "Logistic barriers involve physical and financial access constraints, including distance to health facilities, lack of transportation, needing an escort to travel, and financial costs of seeking care.",
      statisticFields: {
        nationalObserved: {
          sourceKey: "nationalOverview",
          file: "dashboard/assets/data/national_overview.json",
          path: "kpis.observed_logistic_rate",
          label: "National Observed Logistic Barrier Rate",
          unit: "%",
          multiplier: 100,
          rank: 2
        },
        nationalPredicted: {
          sourceKey: "nationalOverview",
          file: "dashboard/assets/data/national_overview.json",
          path: "kpis.predicted_logistic_prob",
          label: "National Predicted Logistic Barrier Probability",
          unit: "%",
          multiplier: 100
        },
        basePaperRate: {
          sourceKey: "nationalOverview",
          file: "dashboard/assets/data/national_overview.json",
          path: "kpis.base_paper_logistic_rate",
          label: "Base Paper Reference Logistic Barrier Rate",
          unit: "%",
          multiplier: 100
        }
      },
      stateField: "observed_logistic_rate",
      predictedStateField: "predicted_logistic_prob",
      demographicField: "observed_logistic_rate",
      ruralUrbanField: "observed_logistic_rate",
      supportedComparisonTypes: ["state_vs_state", "rural_vs_urban", "barrier_vs_barrier", "demographic"],
      supportedInterventions: [
        {
          title: "Financial Inclusion & Asset Ownership",
          sourceKey: "basePaperReference",
          sourceFile: "dashboard/assets/data/base_paper_reference.json",
          path: "protective_factors[3]",
          detail: "Individual bank account ownership and financial inclusion are associated with reduced logistic access constraints (AOR < 1)."
        },
        {
          title: "Rural Transport & Escort Support",
          sourceKey: "ruralUrbanSummary",
          sourceFile: "dashboard/assets/data/rural_urban_summary.json",
          path: "groups[0]",
          detail: "Targeted ambulance and emergency transport infrastructure in rural areas directly addresses distance and escort barriers."
        }
      ],
      provenanceMetadata: {
        dataGrounding: "NFHS-5 (2019-2021) Recode Columns v467c (getting money), v467d (distance to facility), v467e (not wanting to go alone)",
        sampleSizeN: 724115
      }
    },

    facility: {
      key: "facility",
      label: "Facility Barrier",
      aliases: [
        "facility barrier", "facility", "facilities", "doctor", "provider", "hospital", "medicine",
        "treatment", "female provider", "ಆಸ್ಪತ್ರೆ", "ವೈದ್ಯರು", "ಸೌಲಭ್ಯ", "अस्पताल", "डॉक्टर", "सुविधा"
      ],
      sources: [
        "nationalOverview", "stateSummary", "demographicSummary", "ruralUrbanSummary",
        "regressionSummary", "basePaperReference"
      ],
      explanation: "Facility barriers pertain to healthcare system availability and provider quality, including lack of female health providers, provider absenteeism, or unavailability of essential medicines.",
      statisticFields: {
        nationalObserved: {
          sourceKey: "nationalOverview",
          file: "dashboard/assets/data/national_overview.json",
          path: "kpis.observed_facility_rate",
          label: "National Observed Facility Barrier Rate",
          unit: "%",
          multiplier: 100,
          rank: 1
        },
        nationalPredicted: {
          sourceKey: "nationalOverview",
          file: "dashboard/assets/data/national_overview.json",
          path: "kpis.predicted_facility_prob",
          label: "National Predicted Facility Barrier Probability",
          unit: "%",
          multiplier: 100
        },
        basePaperRate: {
          sourceKey: "nationalOverview",
          file: "dashboard/assets/data/national_overview.json",
          path: "kpis.base_paper_facility_rate",
          label: "Base Paper Reference Facility Barrier Rate",
          unit: "%",
          multiplier: 100
        }
      },
      stateField: "observed_facility_rate",
      predictedStateField: "predicted_facility_prob",
      demographicField: "observed_facility_rate",
      ruralUrbanField: "observed_facility_rate",
      supportedComparisonTypes: ["state_vs_state", "rural_vs_urban", "barrier_vs_barrier", "demographic"],
      supportedInterventions: [
        {
          title: "Female Healthcare Provider Staffing",
          sourceKey: "basePaperReference",
          sourceFile: "dashboard/assets/data/base_paper_reference.json",
          path: "national_prevalence.facility_barrier",
          detail: "Strengthening female provider availability at public primary health centers directly mitigates the largest single barrier component (46.01%)."
        }
      ],
      provenanceMetadata: {
        dataGrounding: "NFHS-5 (2019-2021) Recode Columns v467g (no female provider), v467h (no provider/medicine)",
        sampleSizeN: 724115
      }
    },

    multiple: {
      key: "multiple",
      label: "Multiple Barriers",
      aliases: [
        "multiple barriers", "multiple barrier", "multiple", "overlapping", "two or more", "2+",
        "ಬಹಳಷ್ಟು", "ಅನೇಕ", "अनेक", "कई"
      ],
      sources: [
        "multipleBarrierSummary", "demographicSummary"
      ],
      explanation: "Multiple barriers capture overlapping vulnerability where an individual woman experiences 2 or 3 simultaneous barrier domains (household + logistic + facility).",
      statisticFields: {
        meanBarrierCount: {
          sourceKey: "multipleBarrierSummary",
          file: "dashboard/assets/data/multiple_barrier_summary.json",
          path: "overall.mean_barrier_count",
          label: "National Mean Barrier Count",
          unit: "count",
          multiplier: 1
        },
        pctFacing2Plus: {
          sourceKey: "multipleBarrierSummary",
          file: "dashboard/assets/data/multiple_barrier_summary.json",
          path: "overall.pct_facing_2plus_barriers",
          label: "Women Facing 2+ Overlapping Barriers",
          unit: "%",
          multiplier: 100
        }
      },
      stateField: null,
      demographicField: null,
      ruralUrbanField: null,
      supportedComparisonTypes: ["wealth_tier_comparison", "residence_comparison"],
      supportedInterventions: [
        {
          title: "Integrated Multi-Sectoral Convergence",
          sourceKey: "multipleBarrierSummary",
          sourceFile: "dashboard/assets/data/multiple_barrier_summary.json",
          path: "by_wealth_tier[0]",
          detail: "Bundling financial relief, rural transport, and female provider deployment in vulnerable communities where 49.07% of poorest women experience 2+ overlapping barriers."
        }
      ],
      provenanceMetadata: {
        dataGrounding: "Calculated additive barrier count (0 to 3) from NFHS-5 recode indicators",
        sampleSizeN: 724115
      }
    },

    all: {
      key: "all",
      label: "All Barriers",
      aliases: [
        "all barriers", "all barrier", "all", "overall", "composite", "at least one", "any barrier",
        "ಎಲ್ಲಾ", "ಎಲ್ಲ", "सभी"
      ],
      sources: [
        "nationalOverview", "stateSummary", "demographicSummary", "ruralUrbanSummary",
        "multipleBarrierSummary", "clusterSummary"
      ],
      explanation: "All Barriers provides a broad analytical package combining Household, Logistic, and Facility domains, along with national overall any-barrier rate (59.16%).",
      statisticFields: {
        nationalAnyBarrier: {
          sourceKey: "nationalOverview",
          file: "dashboard/assets/data/national_overview.json",
          path: "kpis.observed_any_barrier_rate",
          label: "National Observed Any Barrier Rate",
          unit: "%",
          multiplier: 100
        },
        predictedComposite: {
          sourceKey: "nationalOverview",
          file: "dashboard/assets/data/national_overview.json",
          path: "kpis.predicted_composite_score",
          label: "National Predicted Composite Score",
          unit: "score",
          multiplier: 1
        }
      },
      stateField: "observed_any_barrier_rate",
      demographicField: "observed_any_barrier_rate",
      ruralUrbanField: "observed_any_barrier_rate",
      supportedComparisonTypes: ["state_vs_state", "rural_vs_urban", "barrier_vs_barrier", "demographic"],
      supportedInterventions: [
        {
          title: "Comprehensive BarrierLens Policy Package",
          sourceKey: "basePaperReference",
          sourceFile: "dashboard/assets/data/base_paper_reference.json",
          path: "protective_factors",
          detail: "Multi-pronged strategy combining secondary education, female empowerment, mobile access, and public facility strengthening."
        }
      ],
      provenanceMetadata: {
        dataGrounding: "Combined NFHS-5 6-item standardized healthcare access barrier scope",
        sampleSizeN: 724115
      }
    }
  };

  /**
   * Normalize input key or barrier label to canonical key (household, logistic, facility, multiple, all).
   */
  function normalizeBarrierKey(input) {
    if (!input || typeof input !== 'string') return "all";
    const lower = input.trim().toLowerCase();

    if (BARRIER_MAP[lower]) return lower;

    for (const [key, def] of Object.entries(BARRIER_MAP)) {
      if (def.label.toLowerCase() === lower) return key;
      if (def.aliases.some(alias => alias.toLowerCase() === lower || lower.includes(alias.toLowerCase()))) {
        return key;
      }
    }

    if (/\bhousehold\b/i.test(lower)) return "household";
    if (/\blogistic\b/i.test(lower)) return "logistic";
    if (/\bfacility\b/i.test(lower)) return "facility";
    if (/\bmultiple\b/i.test(lower)) return "multiple";
    if (/\ball\b/i.test(lower)) return "all";

    return "all";
  }

  /**
   * Get complete definition object for a barrier.
   */
  function getBarrierDefinition(barrierKeyOrLabel) {
    const key = normalizeBarrierKey(barrierKeyOrLabel);
    return BARRIER_MAP[key] || BARRIER_MAP.all;
  }

  /**
   * Get dictionary of all 5 barrier definitions.
   */
  function getAllBarrierDefinitions() {
    return { ...BARRIER_MAP };
  }

  /**
   * Get supported solutions/interventions for a barrier.
   */
  function getInterventionsForBarrier(barrierKeyOrLabel) {
    const def = getBarrierDefinition(barrierKeyOrLabel);
    return def ? def.supportedInterventions || [] : [];
  }

  return {
    BARRIER_MAP,
    normalizeBarrierKey,
    getBarrierDefinition,
    getAllBarrierDefinitions,
    getInterventionsForBarrier
  };
}));
