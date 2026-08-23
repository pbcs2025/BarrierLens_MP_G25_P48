/**
 * BARRIERLENS — MEMBER 1: CALCULATION ENGINE
 * Deterministic derived calculation module.
 * Strictly computes derived values over verified metrics and explicitly tags every output with `derived: true`.
 * Differentiates percentage-point differences from percentage changes.
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.BarrierLensCalculation = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /**
   * Calculate percentage point difference between two percentage values.
   */
  function calculatePercentagePointDifference(valA, valB, labelA = "Value A", labelB = "Value B", metricName = "Metric") {
    const numA = parseFloat(valA);
    const numB = parseFloat(valB);

    if (isNaN(numA) || isNaN(numB)) {
      return null;
    }

    const diff = parseFloat((numA - numB).toFixed(2));
    const absDiff = Math.abs(diff);
    const higherEntity = diff > 0 ? labelA : labelB;
    const lowerEntity = diff > 0 ? labelB : labelA;

    return {
      calculationType: "percentage_point_difference",
      label: `${metricName} Difference (${labelA} vs ${labelB})`,
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
   * Derive calculations from retrieval payload.
   */
  function calculateDerivedValues(retrieval) {
    if (!retrieval || retrieval.status !== "verified") {
      return [];
    }

    const calculations = [];

    // Scenario 1: State Comparison
    if (retrieval.comparisonType === "STATE_COMPARISON" && retrieval.dataA && retrieval.dataB) {
      const nameA = retrieval.entityA;
      const nameB = retrieval.entityB;

      const evA = retrieval.dataA.evidence || [];
      const evB = retrieval.dataB.evidence || [];

      // Compare Any Barrier Rate
      const anyA = evA.find(e => e.label.includes("Any Barrier"));
      const anyB = evB.find(e => e.label.includes("Any Barrier"));
      if (anyA && anyB) {
        const calc = calculatePercentagePointDifference(anyA.value, anyB.value, nameA, nameB, "Observed Any Barrier Rate");
        if (calc) calculations.push(calc);
      }

      // Compare Facility Barrier Rate
      const facA = evA.find(e => e.label.includes("Facility"));
      const facB = evB.find(e => e.label.includes("Facility"));
      if (facA && facB) {
        const calc = calculatePercentagePointDifference(facA.value, facB.value, nameA, nameB, "Facility Barrier Rate");
        if (calc) calculations.push(calc);
      }

      // Compare Logistic Barrier Rate
      const logA = evA.find(e => e.label.includes("Logistic"));
      const logB = evB.find(e => e.label.includes("Logistic"));
      if (logA && logB) {
        const calc = calculatePercentagePointDifference(logA.value, logB.value, nameA, nameB, "Logistic Barrier Rate");
        if (calc) calculations.push(calc);
      }
    }

    // Scenario 2: Rural vs Urban Comparison
    if (retrieval.title && retrieval.title.includes("Rural vs Urban") && retrieval.rural && retrieval.urban) {
      const rAny = (retrieval.rural.observed_any_barrier_rate * 100).toFixed(2);
      const uAny = (retrieval.urban.observed_any_barrier_rate * 100).toFixed(2);
      const calcAny = calculatePercentagePointDifference(rAny, uAny, "Rural", "Urban", "Any Barrier Rate");
      if (calcAny) calculations.push(calcAny);

      const rFac = (retrieval.rural.observed_facility_rate * 100).toFixed(2);
      const uFac = (retrieval.urban.observed_facility_rate * 100).toFixed(2);
      const calcFac = calculatePercentagePointDifference(rFac, uFac, "Rural", "Urban", "Facility Barrier Rate");
      if (calcFac) calculations.push(calcFac);
    }

    return calculations;
  }

  return {
    calculatePercentagePointDifference,
    calculateDerivedValues
  };
}));
