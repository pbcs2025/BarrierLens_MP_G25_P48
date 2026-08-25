/**
 * BARRIERLENS — MEMBER 1: SESSION STORE & CONTEXT MANAGER
 * Maintains in-memory persistent session state across conversation turns,
 * including active barrier, active language, conversation history, and NLU metadata.
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
      activeLanguage: "English",
      conversationHistory: [],
      lastIntent: null,
      lastEntities: null
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
    if (updates.activeLanguage !== undefined) {
      session.activeLanguage = updates.activeLanguage;
    }
    if (updates.lastIntent !== undefined) {
      session.lastIntent = updates.lastIntent;
    }
    if (updates.lastEntities !== undefined) {
      session.lastEntities = updates.lastEntities;
    }

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
      intent: turnData.intent || "unknown",
      activeBarrier: session.activeBarrier,
      activeLanguage: session.activeLanguage,
      entities: turnData.entities || null,
      requiresSolutions: !!turnData.requiresSolutions
    };

    session.conversationHistory.push(turn);
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
    addTurnToHistory,
    clearSession,
    clearAllSessions
  };
}));
