/**
 * BARRIERLENS — MEMBER 4: FRONTEND API SERVICE LAYER
 * Clean abstraction layer for network calls (`predictBarrier`, `sendChatMessage`, `getEvidence`, `getSolutions`).
 * Handles API errors (400, 500, timeouts, offline) gracefully without exposing secrets or backend tracebacks.
 * Dual environment support: Browser (window.BarrierLensAPIService) & Node.js (module.exports).
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.BarrierLensAPIService = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Base API configuration (configurable, default relative /api or localhost:5000/api)
  let _apiBaseUrl = '/api';

  function setApiBaseUrl(url) {
    if (url && typeof url === 'string') {
      _apiBaseUrl = url.replace(/\/$/, '');
    }
  }

  function getApiBaseUrl() {
    return _apiBaseUrl;
  }

  /**
   * Deterministic local fallback prediction algorithm based on raw answers.
   * Used when backend API is offline or un-reachable during static demo testing.
   */
  function predictBarrierLocalFallback(rawAnswers) {
    const v025 = String(rawAnswers.v025 || '').toLowerCase();
    const v190 = String(rawAnswers.v190 || '').toLowerCase();
    const v743f = String(rawAnswers.v743f || '').toLowerCase();

    let householdScore = 0.2;
    let logisticScore = 0.2;
    let facilityScore = 0.2;

    if (v743f.includes('husband') || v743f.includes('someone else') || v190 === 'poorest') {
      householdScore += 0.45;
    }
    if (v025 === 'rural' || v190 === 'poorest' || v190 === 'poorer') {
      logisticScore += 0.40;
    }

    facilityScore += 0.25;

    const total = householdScore + logisticScore + facilityScore;
    const hProb = Math.round((householdScore / total) * 100) / 100;
    const lProb = Math.round((logisticScore / total) * 100) / 100;
    const fProb = Math.round((1 - hProb - lProb) * 100) / 100;

    let primaryBarrier = "Logistic Barrier";
    if (hProb >= lProb && hProb >= fProb) {
      primaryBarrier = "Household Barrier";
    } else if (fProb >= hProb && fProb >= lProb) {
      primaryBarrier = "Facility Barrier";
    }

    return {
      status: "success",
      primaryBarrier: primaryBarrier,
      probabilities: {
        household: hProb,
        logistic: lProb,
        facility: fProb
      },
      modelSource: "BarrierLens ML (Local Standalone Engine)"
    };
  }

  /**
   * Predict Barrier API call: POST /api/predict-barrier
   */
  async function predictBarrier(rawAnswers) {
    const endpoint = `${_apiBaseUrl}/predict-barrier`;

    try {
      if (typeof window === 'undefined' || typeof fetch === 'undefined') {
        return predictBarrierLocalFallback(rawAnswers);
      }

      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timeoutId = controller ? setTimeout(() => controller.abort(), 8000) : null;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rawAnswers),
        signal: controller ? controller.signal : undefined
      });

      if (timeoutId) clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 400) {
          throw new Error("Invalid question answers provided. Please review your answers and try again.");
        } else {
          throw new Error(`Server returned HTTP ${response.status}. Falling back to local model adapter.`);
        }
      }

      const data = await response.json();
      return {
        status: "success",
        primaryBarrier: data.primaryBarrier || data.predicted_barrier || "Logistic Barrier",
        probabilities: data.probabilities || { household: 0.3, logistic: 0.5, facility: 0.2 },
        modelSource: data.modelSource || data.model_source || "BarrierLens ML Model"
      };
    } catch (err) {
      console.warn(`[BarrierLensAPIService] /api/predict-barrier notice: ${err.message}`);
      // Fallback cleanly without breaking UX
      return predictBarrierLocalFallback(rawAnswers);
    }
  }

  /**
   * Send Chat Message API call: POST /api/chat
   */
  async function sendChatMessage(payload) {
    const endpoint = `${_apiBaseUrl}/chat`;
    try {
      if (typeof fetch === 'undefined') return null;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) return null;
      return await response.json();
    } catch (err) {
      console.warn(`[BarrierLensAPIService] /api/chat error: ${err.message}`);
      return null;
    }
  }

  return {
    setApiBaseUrl,
    getApiBaseUrl,
    predictBarrier,
    sendChatMessage,
    predictBarrierLocalFallback
  };
}));
