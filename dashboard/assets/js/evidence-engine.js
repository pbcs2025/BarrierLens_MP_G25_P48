/**
 * BARRIERLENS — MEMBER 1: EVIDENCE ENGINE
 * Constructs structured, audit-ready evidence objects from retrieval and calculation outputs.
 * Provides complete provenance metadata for Member 2 (Claude backend) and Member 4 (Report Generator).
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.BarrierLensEvidence = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /**
   * Build structured Evidence Object.
   */
  function buildEvidencePayload(intentResult, entities, retrieval, calculations) {
    if (!retrieval || retrieval.status === "unavailable") {
      return {
        status: "unavailable",
        intent: intentResult ? intentResult.intent : "UNSUPPORTED",
        entities: entities || {},
        evidence: [],
        calculations: [],
        methodologyNote: "BarrierLens analysis uses full 724,115 sample of Indian women from NFHS-5 recode data.",
        limitationNote: retrieval ? retrieval.reason : "The requested metric is unavailable in verified BarrierLens datasets.",
        provenance: {
          sourceType: "verified_barrierlens_json",
          verified: false
        }
      };
    }

    const rawEvidenceItems = retrieval.evidence || [];
    const derivedCalculations = calculations || [];

    const methodologyNote = retrieval.methodologyNote ||
      "Base paper uses 108,785 ever-married women subset with 8 items; BarrierLens uses full 724,115 sample with 6 items (v467f, v467i absent). Values are broadly comparable, not identical.";

    const limitationNote = retrieval.limitationSummary || retrieval.scopeExclusionNote ||
      "BarrierLens uses cross-sectional NFHS-5 survey data. Observed associations and predicted probabilities reflect statistical model outputs and do not establish individual causation or clinical diagnosis.";

    return {
      status: "verified",
      intent: intentResult.intent,
      confidence: intentResult.confidence,
      entities: entities,
      evidence: rawEvidenceItems.map(item => ({
        source: item.sourceFile,
        sourceKey: item.sourceKey,
        path: item.dataPath,
        label: item.label,
        value: item.value,
        unit: item.unit,
        entity: item.entity || null
      })),
      calculations: derivedCalculations,
      summary: retrieval.summary || retrieval.title || null,
      methodologyNote: methodologyNote,
      limitationNote: limitationNote,
      provenance: {
        sourceType: "verified_barrierlens_json",
        verified: true,
        dataSourcesUsed: Array.from(new Set(rawEvidenceItems.map(i => i.sourceFile)))
      }
    };
  }

  return {
    buildEvidencePayload
  };
}));
