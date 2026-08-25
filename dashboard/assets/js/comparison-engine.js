/**
 * BARRIERLENS — MEMBER 2: COMPARISON ENGINE
 * Deterministic calculation and comparative analysis engine operating ONLY on verified BarrierLens datasets.
 * Computes percentage-point differences and tags every output explicitly with `derived: true`.
 * Enforces non-causal research-safe terminology.
 * Dual environment support: Browser (UMD) & Node.js (CommonJS).
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.BarrierLensComparisonEngine = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function getDataMapModule() {
    if (typeof window !== 'undefined' && window.BarrierLensDataMap) return window.BarrierLensDataMap;
    if (typeof require !== 'undefined') return require('./barrier-data-map.js');
    return null;
  }

  /**
   * Core percentage point difference calculation function.
   */
  function buildPercentagePointDifference(valA, valB, labelA, labelB, metricName = "Rate") {
    const numA = parseFloat(valA);
    const numB = parseFloat(valB);

    if (isNaN(numA) || isNaN(numB)) {
      return null;
    }

    const diff = parseFloat((numA - numB).toFixed(2));
    const absDiff = Math.abs(diff);
    const higherEntity = diff >= 0 ? labelA : labelB;
    const lowerEntity = diff >= 0 ? labelB : labelA;

    return {
      calculationType: "percentage_point_difference",
      label: `${metricName} Difference (${labelA} vs ${labelB})`,
      metricName: metricName,
      operands: [
        { entity: labelA, value: numA, unit: "%" },
        { entity: labelB, value: numB, unit: "%" }
      ],
      result: absDiff,
      rawDifference: diff,
      resultUnit: "percentage points",
      derived: true,
      interpretation: `${higherEntity} has a ${absDiff.toFixed(2)} percentage-point higher ${metricName.toLowerCase()} than ${lowerEntity}.`
    };
  }

  /**
   * Compare two Indian states/UTs for a specified barrier category.
   */
  function compareStates(stateA, stateB, barrierInput = "all", dataRegistry = {}) {
    const DataMap = getDataMapModule();
    const barrierDef = DataMap ? DataMap.getBarrierDefinition(barrierInput) : { stateField: "observed_any_barrier_rate", label: "All Barriers" };
    const fieldName = barrierDef.stateField || "observed_any_barrier_rate";

    const stateData = dataRegistry.stateSummary;
    if (!stateData || !Array.isArray(stateData.states)) {
      return { status: "unavailable", reason: "State summary dataset is not loaded in dataRegistry." };
    }

    const sAObj = stateData.states.find(s => s.state_name.toLowerCase() === stateA.toLowerCase());
    const sBObj = stateData.states.find(s => s.state_name.toLowerCase() === stateB.toLowerCase());

    if (!sAObj) {
      return { status: "unavailable", reason: `State "${stateA}" was not found in verified BarrierLens dataset.` };
    }
    if (!sBObj) {
      return { status: "unavailable", reason: `State "${stateB}" was not found in verified BarrierLens dataset.` };
    }

    const valA = (sAObj[fieldName] * 100).toFixed(2);
    const valB = (sBObj[fieldName] * 100).toFixed(2);

    const calc = buildPercentagePointDifference(valA, valB, sAObj.state_name, sBObj.state_name, `${barrierDef.label} Rate`);

    // Additional domain-level comparisons
    const domainCalcs = [];
    const fieldsToCompare = [
      { field: "observed_any_barrier_rate", label: "Observed Any Barrier Rate" },
      { field: "observed_facility_rate", label: "Facility Barrier Rate" },
      { field: "observed_logistic_rate", label: "Logistic Barrier Rate" },
      { field: "observed_household_rate", label: "Household Barrier Rate" }
    ];

    fieldsToCompare.forEach(item => {
      if (sAObj[item.field] !== undefined && sBObj[item.field] !== undefined) {
        const v1 = (sAObj[item.field] * 100).toFixed(2);
        const v2 = (sBObj[item.field] * 100).toFixed(2);
        const c = buildPercentagePointDifference(v1, v2, sAObj.state_name, sBObj.state_name, item.label);
        if (c) domainCalcs.push(c);
      }
    });

    return {
      status: "verified",
      comparisonType: "STATE_COMPARISON",
      barrier: barrierDef.key,
      barrierLabel: barrierDef.label,
      entityA: sAObj.state_name,
      entityB: sBObj.state_name,
      primaryCalculation: calc,
      calculations: domainCalcs,
      operands: calc ? calc.operands : [],
      result: calc ? calc.result : null,
      derived: true
    };
  }

  /**
   * Compare Rural vs Urban residence groups for a specified barrier category.
   */
  function compareRuralUrban(barrierInput = "all", dataRegistry = {}) {
    const DataMap = getDataMapModule();
    const barrierDef = DataMap ? DataMap.getBarrierDefinition(barrierInput) : { ruralUrbanField: "observed_any_barrier_rate", label: "All Barriers" };
    const fieldName = barrierDef.ruralUrbanField || "observed_any_barrier_rate";

    const ruData = dataRegistry.ruralUrbanSummary;
    if (!ruData || !Array.isArray(ruData.groups)) {
      return { status: "unavailable", reason: "Rural-urban summary dataset is not loaded in dataRegistry." };
    }

    const rural = ruData.groups.find(g => g.residence === "Rural");
    const urban = ruData.groups.find(g => g.residence === "Urban");

    if (!rural || !urban) {
      return { status: "unavailable", reason: "Rural/Urban groups not found in verified dataset." };
    }

    const valRural = (rural[fieldName] * 100).toFixed(2);
    const valUrban = (urban[fieldName] * 100).toFixed(2);

    const calc = buildPercentagePointDifference(valRural, valUrban, "Rural", "Urban", `${barrierDef.label} Rate`);

    const domainCalcs = [];
    const fieldsToCompare = [
      { field: "observed_any_barrier_rate", label: "Any Barrier Rate" },
      { field: "observed_facility_rate", label: "Facility Barrier Rate" },
      { field: "observed_logistic_rate", label: "Logistic Barrier Rate" },
      { field: "observed_household_rate", label: "Household Barrier Rate" }
    ];

    fieldsToCompare.forEach(item => {
      if (rural[item.field] !== undefined && urban[item.field] !== undefined) {
        const vR = (rural[item.field] * 100).toFixed(2);
        const vU = (urban[item.field] * 100).toFixed(2);
        const c = buildPercentagePointDifference(vR, vU, "Rural", "Urban", item.label);
        if (c) domainCalcs.push(c);
      }
    });

    return {
      status: "verified",
      comparisonType: "RURAL_URBAN_COMPARISON",
      barrier: barrierDef.key,
      barrierLabel: barrierDef.label,
      entityA: "Rural",
      entityB: "Urban",
      primaryCalculation: calc,
      calculations: domainCalcs,
      scopeExclusionNote: ruData.metadata ? ruData.metadata.scope_exclusion_note : "Hospital waiting-time and service-quality metrics are explicitly excluded as they are absent from NFHS-5 recode columns.",
      derived: true
    };
  }

  /**
   * Compare two barrier categories (e.g. Facility vs Household) nationally or for a state.
   */
  function compareBarriers(barrierAInput, barrierBInput, scopeEntity = "national", dataRegistry = {}) {
    const DataMap = getDataMapModule();
    const bADef = DataMap ? DataMap.getBarrierDefinition(barrierAInput) : null;
    const bBDef = DataMap ? DataMap.getBarrierDefinition(barrierBInput) : null;

    if (!bADef || !bBDef) {
      return { status: "unavailable", reason: "One or both specified barrier categories are invalid." };
    }

    let valA = null;
    let valB = null;

    if (scopeEntity.toLowerCase() === "national") {
      const nat = dataRegistry.nationalOverview;
      if (!nat || !nat.kpis) {
        return { status: "unavailable", reason: "National overview dataset is not loaded." };
      }
      const fieldA = bADef.statisticFields && bADef.statisticFields.nationalObserved ? bADef.statisticFields.nationalObserved.path.split('.')[1] : null;
      const fieldB = bBDef.statisticFields && bBDef.statisticFields.nationalObserved ? bBDef.statisticFields.nationalObserved.path.split('.')[1] : null;

      if (fieldA && nat.kpis[fieldA] !== undefined) valA = (nat.kpis[fieldA] * 100).toFixed(2);
      if (fieldB && nat.kpis[fieldB] !== undefined) valB = (nat.kpis[fieldB] * 100).toFixed(2);
    } else {
      const stateData = dataRegistry.stateSummary;
      if (stateData && Array.isArray(stateData.states)) {
        const stateObj = stateData.states.find(s => s.state_name.toLowerCase() === scopeEntity.toLowerCase());
        if (stateObj) {
          const fA = bADef.stateField;
          const fB = bBDef.stateField;
          if (fA && stateObj[fA] !== undefined) valA = (stateObj[fA] * 100).toFixed(2);
          if (fB && stateObj[fB] !== undefined) valB = (stateObj[fB] * 100).toFixed(2);
        }
      }
    }

    if (valA === null || valB === null) {
      return { status: "unavailable", reason: `Could not retrieve metric values for ${bADef.label} or ${bBDef.label}.` };
    }

    const calc = buildPercentagePointDifference(valA, valB, bADef.label, bBDef.label, "National Barrier Rate");

    return {
      status: "verified",
      comparisonType: "BARRIER_VS_BARRIER_COMPARISON",
      entityA: bADef.label,
      entityB: bBDef.label,
      scope: scopeEntity,
      primaryCalculation: calc,
      calculations: calc ? [calc] : [],
      derived: true
    };
  }

  /**
   * Compare two demographic groups (e.g., Poorest vs Richest, No education vs Higher).
   */
  function compareDemographics(dimensionInput, groupA, groupB, barrierInput = "all", dataRegistry = {}) {
    const demoData = dataRegistry.demographicSummary;
    if (!demoData) {
      return { status: "unavailable", reason: "Demographic summary dataset is not loaded." };
    }

    const DataMap = getDataMapModule();
    const barrierDef = DataMap ? DataMap.getBarrierDefinition(barrierInput) : { demographicField: "observed_any_barrier_rate", label: "All Barriers" };
    const fieldName = barrierDef.demographicField || "observed_any_barrier_rate";

    let targetArray = null;
    let keyName = "";

    const dim = (dimensionInput || "").toLowerCase();
    if (dim === "wealth" || ["poorest", "poorer", "middle", "richer", "richest"].includes(groupA.toLowerCase())) {
      targetArray = demoData.by_wealth;
      keyName = "wealth_clean";
    } else if (dim === "education" || ["no education", "primary", "secondary", "higher"].includes(groupA.toLowerCase())) {
      targetArray = demoData.by_education;
      keyName = "education_clean";
    } else if (dim === "age") {
      targetArray = demoData.by_age;
      keyName = "age_clean";
    }

    if (!targetArray) {
      return { status: "unavailable", reason: `Demographic dimension "${dimensionInput}" is not supported.` };
    }

    const rowA = targetArray.find(r => {
      const val = r.group_keys[keyName] || r.group_keys[Object.keys(r.group_keys)[0]];
      return val.toLowerCase() === groupA.toLowerCase();
    });

    const rowB = targetArray.find(r => {
      const val = r.group_keys[keyName] || r.group_keys[Object.keys(r.group_keys)[0]];
      return val.toLowerCase() === groupB.toLowerCase();
    });

    if (!rowA || !rowB) {
      return { status: "unavailable", reason: `One or both demographic groups ("${groupA}", "${groupB}") were not found.` };
    }

    if (rowA.suppressed || rowB.suppressed) {
      return { status: "unavailable", reason: "Demographic cell is suppressed due to small sample size (N < 30)." };
    }

    const valA = (rowA[fieldName] * 100).toFixed(2);
    const valB = (rowB[fieldName] * 100).toFixed(2);

    const calc = buildPercentagePointDifference(valA, valB, groupA, groupB, `${barrierDef.label} Rate`);

    return {
      status: "verified",
      comparisonType: "DEMOGRAPHIC_COMPARISON",
      dimension: dim,
      entityA: groupA,
      entityB: groupB,
      primaryCalculation: calc,
      calculations: calc ? [calc] : [],
      derived: true
    };
  }

  return {
    buildPercentagePointDifference,
    compareStates,
    compareRuralUrban,
    compareBarriers,
    compareDemographics
  };
}));
