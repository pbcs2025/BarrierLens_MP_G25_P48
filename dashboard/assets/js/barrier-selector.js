/**
 * BARRIERLENS — MEMBER 1: BARRIER SELECTOR
 * Handles barrier normalization, alias mapping (English/Kannada/Hindi),
 * selection detection, and barrierContext object generation for the 5 canonical barriers.
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.BarrierLensBarrierSelector = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Exactly 5 supported barriers
  const CANONICAL_BARRIERS = [
    "Household Barrier",
    "Logistic Barrier",
    "Facility Barrier",
    "Multiple Barriers",
    "All Barriers"
  ];

  const BARRIER_ALIASES = {
    // Household Barrier
    "household barrier": "Household Barrier",
    "household": "Household Barrier",
    "house": "Household Barrier",
    "family": "Household Barrier",
    "permission": "Household Barrier",
    "alone": "Household Barrier",
    "ಮನೆ": "Household Barrier",
    "ಕುಟುಂಬ": "Household Barrier",
    "ಅನುಮತಿ": "Household Barrier",
    "घरेलू": "Household Barrier",
    "परिवार": "Household Barrier",

    // Logistic Barrier
    "logistic barrier": "Logistic Barrier",
    "logistic": "Logistic Barrier",
    "logistics": "Logistic Barrier",
    "transport": "Logistic Barrier",
    "distance": "Logistic Barrier",
    "cost": "Logistic Barrier",
    "escort": "Logistic Barrier",
    "money": "Logistic Barrier",
    "ಸಾರಿಗೆ": "Logistic Barrier",
    "ಹಣ": "Logistic Barrier",
    "ವೆಚ್ಚ": "Logistic Barrier",
    "परिवहन": "Logistic Barrier",
    "लागत": "Logistic Barrier",

    // Facility Barrier
    "facility barrier": "Facility Barrier",
    "facility": "Facility Barrier",
    "facilities": "Facility Barrier",
    "doctor": "Facility Barrier",
    "provider": "Facility Barrier",
    "hospital": "Facility Barrier",
    "medicine": "Facility Barrier",
    "treatment": "Facility Barrier",
    "ಆಸ್ಪತ್ರೆ": "Facility Barrier",
    "ವೈದ್ಯರು": "Facility Barrier",
    "ಸೌಲಭ್ಯ": "Facility Barrier",
    "अस्पताल": "Facility Barrier",
    "डॉक्टर": "Facility Barrier",
    "सुविधा": "Facility Barrier",

    // Multiple Barriers
    "multiple barriers": "Multiple Barriers",
    "multiple barrier": "Multiple Barriers",
    "multiple": "Multiple Barriers",
    "overlapping": "Multiple Barriers",
    "two or more": "Multiple Barriers",
    "2+": "Multiple Barriers",
    "ಬಹಳಷ್ಟು": "Multiple Barriers",
    "ಅನೇಕ": "Multiple Barriers",
    "अनेक": "Multiple Barriers",
    "कई": "Multiple Barriers",

    // All Barriers
    "all barriers": "All Barriers",
    "all barrier": "All Barriers",
    "all": "All Barriers",
    "overall": "All Barriers",
    "composite": "All Barriers",
    "at least one": "All Barriers",
    "any barrier": "All Barriers",
    "ಎಲ್ಲಾ": "All Barriers",
    "ಎಲ್ಲ": "All Barriers",
    "सभी": "All Barriers"
  };

  /**
   * Get array of all 5 canonical barrier names.
   */
  function getSupportedBarriers() {
    return [...CANONICAL_BARRIERS];
  }

  /**
   * Normalize an input string or selection name to a canonical barrier name.
   */
  function normalizeBarrierName(input) {
    if (!input || typeof input !== 'string') return null;
    const trimmed = input.trim();

    // Direct match check (case-insensitive)
    for (const canonical of CANONICAL_BARRIERS) {
      if (canonical.toLowerCase() === trimmed.toLowerCase()) {
        return canonical;
      }
    }

    // Alias lookup
    const lower = trimmed.toLowerCase();
    if (BARRIER_ALIASES[lower]) {
      return BARRIER_ALIASES[lower];
    }

    // Partial substring matching
    if (/\bhousehold\b/i.test(trimmed)) return "Household Barrier";
    if (/\blogistic\b/i.test(trimmed)) return "Logistic Barrier";
    if (/\bfacility\b/i.test(trimmed)) return "Facility Barrier";
    if (/\bmultiple\b/i.test(trimmed)) return "Multiple Barriers";
    if (/\ball barriers\b|\ball\b/i.test(trimmed)) return "All Barriers";

    return null;
  }

  /**
   * Detect explicit or implicit barrier reference in user text.
   */
  function detectBarrierFromText(text) {
    if (!text || typeof text !== 'string') return null;
    return normalizeBarrierName(text);
  }

  /**
   * Generate the structured barrierContext object.
   */
  function createBarrierContext(barrierName) {
    const canonical = normalizeBarrierName(barrierName) || "All Barriers";
    return {
      barrier: canonical,
      scope: "active"
    };
  }

  /**
   * Check if text is purely selecting or switching a barrier.
   */
  function isBarrierSelectionText(text) {
    if (!text || typeof text !== 'string') return false;
    const norm = normalizeBarrierName(text);
    if (norm) return true;

    return /\b(change|switch|select|show|set|choose)\b.*\b(barrier|household|logistic|facility|multiple|all)\b/i.test(text);
  }

  return {
    CANONICAL_BARRIERS,
    getSupportedBarriers,
    normalizeBarrierName,
    detectBarrierFromText,
    createBarrierContext,
    isBarrierSelectionText
  };
}));
