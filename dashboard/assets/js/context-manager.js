/**
 * BARRIERLENS — MEMBER 1: CONTEXT MANAGER & STATEFUL QUERY ENGINE
 * Orchestrates session store, barrier selector, and intent router to produce
 * a structured, stateful query object for Member 2 (data retrieval), Member 3 (solutions), and Member 4 (UI).
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.BarrierLensContextManager = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Import internal Member 1 dependencies (Browser vs Node UMD resolution)
  function getSessionStore(options = {}) {
    if (options.SessionStoreModule) return options.SessionStoreModule;
    if (typeof window !== 'undefined' && window.BarrierLensSessionStore) return window.BarrierLensSessionStore;
    if (typeof require !== 'undefined') return require('./session-store.js');
    return null;
  }

  function getBarrierSelector(options = {}) {
    if (options.BarrierSelectorModule) return options.BarrierSelectorModule;
    if (typeof window !== 'undefined' && window.BarrierLensBarrierSelector) return window.BarrierLensBarrierSelector;
    if (typeof require !== 'undefined') return require('./barrier-selector.js');
    return null;
  }

  function getIntentRouter(options = {}) {
    if (options.IntentRouterModule) return options.IntentRouterModule;
    if (typeof window !== 'undefined' && window.BarrierLensIntentRouter) return window.BarrierLensIntentRouter;
    if (typeof require !== 'undefined') return require('./intent-router.js');
    return null;
  }

  /**
   * Primary Stateful Query Engine Contract: `processUserQuery`
   * Supports positional contract: processUserQuery(text, language, barrierContext, sessionId)
   * Supports object contract: processUserQuery({ text, language, barrierContext, sessionId })
   */
  function processUserQuery(textOrObj, languageArg, barrierContextArg, sessionIdArg, options = {}) {
    const SessionStore = getSessionStore(options);
    const BarrierSelector = getBarrierSelector(options);
    const IntentRouter = getIntentRouter(options);

    let text = "";
    let language = "English";
    let barrierContextInput = null;
    let sessionIdInput = null;

    // Support object signature or positional arguments
    if (textOrObj && typeof textOrObj === 'object' && !Array.isArray(textOrObj)) {
      text = textOrObj.text || "";
      language = textOrObj.language || languageArg || "English";
      barrierContextInput = textOrObj.barrierContext || barrierContextArg || null;
      sessionIdInput = textOrObj.sessionId || sessionIdArg || null;
    } else {
      text = typeof textOrObj === 'string' ? textOrObj : "";
      language = languageArg || "English";
      barrierContextInput = barrierContextArg || null;
      sessionIdInput = sessionIdArg || null;
    }

    // 1. Retrieve or initialize persistent session
    const session = SessionStore.getSession(sessionIdInput);
    let activeBarrier = session.activeBarrier;
    let activeLanguage = session.activeLanguage || IntentRouter.normalizeLanguage(language);

    let isBarrierChange = false;
    let isLanguageChange = false;

    // 2. Handle explicit barrierContext passed directly
    if (barrierContextInput) {
      const bName = typeof barrierContextInput === 'object' 
        ? (barrierContextInput.barrier || barrierContextInput.barrierContext || barrierContextInput.activeBarrier) 
        : barrierContextInput;
      const normalizedB = BarrierSelector.normalizeBarrierName(bName);
      if (normalizedB) {
        if (activeBarrier && activeBarrier !== normalizedB) {
          isBarrierChange = true;
        }
        activeBarrier = normalizedB;
        SessionStore.updateSession(session.sessionId, { activeBarrier: activeBarrier });
      }
    }

    // 3. Handle explicit language passed directly
    if (language && typeof language === 'string') {
      const normLang = IntentRouter.normalizeLanguage(language);
      if (normLang !== activeLanguage) {
        isLanguageChange = true;
        activeLanguage = normLang;
        SessionStore.updateSession(session.sessionId, { activeLanguage: activeLanguage });
      }
    }

    // 4. Check text for language change requests
    const detectedLangChange = IntentRouter.detectLanguageChange(text);
    if (detectedLangChange) {
      const normLang = IntentRouter.normalizeLanguage(detectedLangChange);
      if (normLang !== activeLanguage) {
        isLanguageChange = true;
        activeLanguage = normLang;
        SessionStore.updateSession(session.sessionId, { activeLanguage: activeLanguage });
      }
    }

    // 5. Check text for barrier selection or barrier change requests
    const detectedBarrier = BarrierSelector.detectBarrierFromText(text);
    if (detectedBarrier) {
      if (activeBarrier && activeBarrier !== detectedBarrier) {
        isBarrierChange = true;
      }
      activeBarrier = detectedBarrier;
      SessionStore.updateSession(session.sessionId, { activeBarrier: activeBarrier });
    }

    // 6. Default active barrier if none set yet
    if (!activeBarrier) {
      activeBarrier = "All Barriers";
      SessionStore.updateSession(session.sessionId, { activeBarrier: activeBarrier });
    }

    // 7. Extract entities & detect intent
    const entities = IntentRouter.extractEntities(text);
    let intent = IntentRouter.detectIntent(text, entities, BarrierSelector);

    // Override intent if explicit barrier/language switch detected
    if (isBarrierChange && BarrierSelector.isBarrierSelectionText(text)) {
      intent = "change_barrier";
    } else if (detectedLangChange) {
      intent = "change_language";
    } else if (!session.lastIntent && BarrierSelector.isBarrierSelectionText(text)) {
      intent = "select_barrier";
    }

    // 8. Detect solutions requirement
    const requiresSolutions = IntentRouter.isSolutionsQuery(text) || intent === "solutions";

    // 9. Generate barrierContext object
    const barrierContextObj = BarrierSelector.createBarrierContext(activeBarrier);

    // 10. Persist session updates and conversation history
    SessionStore.updateSession(session.sessionId, {
      activeBarrier: activeBarrier,
      activeLanguage: activeLanguage,
      lastIntent: intent,
      lastEntities: entities
    });

    SessionStore.addTurnToHistory(session.sessionId, {
      userText: text,
      intent: intent,
      entities: entities,
      requiresSolutions: requiresSolutions
    });

    // 11. Construct predictable structured output object
    return {
      sessionId: session.sessionId,
      activeBarrier: activeBarrier,
      activeLanguage: activeLanguage,
      intent: intent,
      entities: {
        state: entities.state,
        group: entities.group,
        comparisonTarget: entities.comparisonTarget,
        residence: entities.residence,
        gender: entities.gender,
        ageGroup: entities.ageGroup
      },
      barrierContext: barrierContextObj,
      isBarrierChange: isBarrierChange,
      isLanguageChange: isLanguageChange,
      requiresSolutions: requiresSolutions,
      conversationHistory: session.conversationHistory
    };
  }

  return {
    processUserQuery
  };
}));
