/**
 * BARRIERLENS — MEMBER 1: SESSION STORE & CONTEXT MANAGER
 * Maintains in-memory persistent session state across conversation turns,
 * including active barrier, barrier source (user_selection / ml_prediction), active language,
 * active mode (identify / explore), latest ML prediction, guided answers, and conversation history.
 * Dual environment support: Browser (window.BarrierLensSessionStore) & Node.js (module.exports).
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.BarrierLensSessionStore = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // In-memory store for session states
  const sessions = new Map();

  /**
   * Generate a unique default session ID if none is provided.
   */
  function generateSessionId() {
    return 'session-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8);
  }

  /**
   * Create a fresh default session object.
   */
  function createDefaultSession(id) {
    const sessionId = id || generateSessionId();
    return {
      sessionId: sessionId,
      activeBarrier: null,
      barrierSource: null,
      activeLanguage: "English",
      activeMode: null,
      conversationHistory: [],
      latestPrediction: null,
      currentIntent: null,
      lastIntent: null,
      lastEntities: null,
      guidedAnswers: {},
      guidedQuestionIndex: 0
    };
  }

  /**
   * Get an existing session by ID or create a new one.
   */
  function getSession(sessionId) {
    if (!sessionId || typeof sessionId !== 'string') {
      const newId = generateSessionId();
      const newSession = createDefaultSession(newId);
      sessions.set(newId, newSession);
      return newSession;
    }

    if (!sessions.has(sessionId)) {
      const newSession = createDefaultSession(sessionId);
      sessions.set(sessionId, newSession);
      return newSession;
    }

    return sessions.get(sessionId);
  }

  /**
   * Update session state properties while preserving conversation history.
   */
  function updateSession(sessionId, updates = {}) {
    const session = getSession(sessionId);

    if (updates.activeBarrier !== undefined) {
      session.activeBarrier = updates.activeBarrier;
    }
    if (updates.barrierSource !== undefined) {
      session.barrierSource = updates.barrierSource;
    }
    if (updates.activeLanguage !== undefined) {
      session.activeLanguage = updates.activeLanguage;
    }
    if (updates.activeMode !== undefined) {
      session.activeMode = updates.activeMode;
    }
    if (updates.latestPrediction !== undefined) {
      session.latestPrediction = updates.latestPrediction;
    }
    if (updates.currentIntent !== undefined) {
      session.currentIntent = updates.currentIntent;
      session.lastIntent = updates.currentIntent;
    } else if (updates.lastIntent !== undefined) {
      session.lastIntent = updates.lastIntent;
      session.currentIntent = updates.lastIntent;
    }
    if (updates.lastEntities !== undefined) {
      session.lastEntities = updates.lastEntities;
    }
    if (updates.guidedAnswers !== undefined) {
      session.guidedAnswers = Object.assign({}, session.guidedAnswers, updates.guidedAnswers);
    }
    if (updates.guidedQuestionIndex !== undefined) {
      session.guidedQuestionIndex = updates.guidedQuestionIndex;
    }

    return session;
  }

  /**
   * Store ML-predicted barrier in the shared session context.
   */
  function setMLPrediction(sessionId, predictionResult) {
    const session = getSession(sessionId);
    if (!predictionResult) return session;

    const primaryBarrier = predictionResult.primaryBarrier || predictionResult.barrier || "logistic";

    session.latestPrediction = { ...predictionResult };
    session.activeBarrier = primaryBarrier;
    session.barrierSource = "ml_prediction";
    session.activeMode = "identify";

    return session;
  }

  /**
   * Set user-selected active barrier in the shared session context.
   */
  function setActiveBarrier(sessionId, barrier, source = "user_selection") {
    const session = getSession(sessionId);
    session.activeBarrier = barrier;
    session.barrierSource = source;
    return session;
  }

  /**
   * Set active conversation mode.
   */
  function setMode(sessionId, mode) {
    const session = getSession(sessionId);
    session.activeMode = mode;
    return session;
  }

  /**
   * Append a conversation turn to session history.
   */
  function addTurnToHistory(sessionId, turnData) {
    const session = getSession(sessionId);
    const turn = {
      turnId: session.conversationHistory.length + 1,
      timestamp: new Date().toISOString(),
      userText: turnData.userText || "",
      intent: turnData.intent || session.currentIntent || "unknown",
      activeBarrier: session.activeBarrier,
      barrierSource: session.barrierSource,
      activeLanguage: session.activeLanguage,
      activeMode: session.activeMode,
      entities: turnData.entities || session.lastEntities || null,
      requiresSolutions: !!turnData.requiresSolutions,
      requiresMLPrediction: !!turnData.requiresMLPrediction,
      requiresEvidence: turnData.requiresEvidence !== undefined ? !!turnData.requiresEvidence : true
    };

    session.conversationHistory.push(turn);
    return session;
  }

  /**
   * Reset active barrier without clearing conversation history.
   */
  function resetBarrier(sessionId) {
    const session = getSession(sessionId);
    session.activeBarrier = null;
    session.barrierSource = null;
    return session;
  }

  /**
   * Clear a specific session.
   */
  function clearSession(sessionId) {
    if (sessionId && sessions.has(sessionId)) {
      sessions.delete(sessionId);
      return true;
    }
    return false;
  }

  /**
   * Clear all sessions.
   */
  function clearAllSessions() {
    sessions.clear();
  }

  return {
    generateSessionId,
    createDefaultSession,
    getSession,
    updateSession,
    setMLPrediction,
    setActiveBarrier,
    setMode,
    addTurnToHistory,
    resetBarrier,
    clearSession,
    clearAllSessions
  };
}));
