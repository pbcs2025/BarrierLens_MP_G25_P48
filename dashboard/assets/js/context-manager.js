/**
 * BARRIERLENS — MEMBER 1: CONTEXT MANAGER & STATEFUL QUERY ENGINE
 * Orchestrates session store, mode router, barrier selector, question schema, and intent router.
 * Produces a unified, stateful query object for Member 2 (data retrieval), Member 3 (solutions), and Member 4 (UI).
 * Dual environment support: Browser (window.BarrierLensContextManager) & Node.js (module.exports).
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

  // Lazy Module Resolvers (Browser vs Node UMD resolution)
  function getSessionStore(options = {}) {
    if (options.SessionStoreModule) return options.SessionStoreModule;
    if (typeof window !== 'undefined' && window.BarrierLensSessionStore) return window.BarrierLensSessionStore;
    if (typeof require !== 'undefined') {
      try { return require('./session-store.js'); } catch (e) {}
    }
    return null;
  }

  function getBarrierSelector(options = {}) {
    if (options.BarrierSelectorModule) return options.BarrierSelectorModule;
    if (typeof window !== 'undefined' && window.BarrierLensBarrierSelector) return window.BarrierLensBarrierSelector;
    if (typeof require !== 'undefined') {
      try { return require('./barrier-selector.js'); } catch (e) {}
    }
    return null;
  }

  function getIntentRouter(options = {}) {
    if (options.IntentRouterModule) return options.IntentRouterModule;
    if (typeof window !== 'undefined' && window.BarrierLensIntentRouter) return window.BarrierLensIntentRouter;
    if (typeof require !== 'undefined') {
      try { return require('./intent-router.js'); } catch (e) {}
    }
    return null;
  }

  function getModeRouter(options = {}) {
    if (options.ModeRouterModule) return options.ModeRouterModule;
    if (typeof window !== 'undefined' && window.BarrierLensModeRouter) return window.BarrierLensModeRouter;
    if (typeof require !== 'undefined') {
      try { return require('./mode-router.js'); } catch (e) {}
    }
    return null;
  }

  function getQuestionSchema(options = {}) {
    if (options.QuestionSchemaModule) return options.QuestionSchemaModule;
    if (typeof window !== 'undefined' && window.BarrierLensQuestionSchema) return window.BarrierLensQuestionSchema;
    if (typeof require !== 'undefined') {
      try { return require('./guided-question-schema.js'); } catch (e) {}
    }
    return null;
  }

  /**
   * Primary Stateful Query Engine Contract: `processUserQuery`
   * Supports positional contract: processUserQuery(text, language, barrierContext, sessionId, options)
   * Supports object contract: processUserQuery({ text, language, barrierContext, sessionId, ... }, options)
   */
  function processUserQuery(textOrObj, languageArg, barrierContextArg, sessionIdArg, options = {}) {
    const SessionStore = getSessionStore(options);
    const BarrierSelector = getBarrierSelector(options);
    const IntentRouter = getIntentRouter(options);
    const ModeRouter = getModeRouter(options);

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
    let activeBarrierKey = session.activeBarrier ? BarrierSelector.normalizeBarrierKey(session.activeBarrier) : null;
    let barrierSource = session.barrierSource || null;
    let activeLanguage = session.activeLanguage || IntentRouter.normalizeLanguage(language);
    let activeMode = session.activeMode || null;

    let isBarrierChange = false;
    let isLanguageChange = false;

    // 2. Handle explicit barrierContext passed directly
    if (barrierContextInput) {
      const bName = typeof barrierContextInput === 'object' 
        ? (barrierContextInput.barrier || barrierContextInput.barrierContext || barrierContextInput.activeBarrier || barrierContextInput.key) 
        : barrierContextInput;
      const normalizedKey = (BarrierSelector.normalizeBarrierKey && BarrierSelector.normalizeBarrierKey(bName)) || BarrierSelector.normalizeBarrierName(bName);
      if (normalizedKey) {
        if (activeBarrierKey && activeBarrierKey !== normalizedKey) {
          isBarrierChange = true;
        }
        activeBarrierKey = normalizedKey;
        barrierSource = barrierSource || "user_selection";
        SessionStore.updateSession(session.sessionId, {
          activeBarrier: activeBarrierKey,
          barrierSource: barrierSource
        });
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

    // 5. Extract entities
    const entities = IntentRouter.extractEntities(text);

    // 6. Detect Intent from user text
    let intent = IntentRouter.detectIntent(text, entities, BarrierSelector);

    // 7. Check for Mode Selections
    if (ModeRouter) {
      const detectedMode = ModeRouter.detectModeChoice(text);
      if (detectedMode) {
        activeMode = detectedMode;
        SessionStore.updateSession(session.sessionId, { activeMode: activeMode });
      }
    }

    // 8. Handle Intent-specific barrier and mode updates
    if (intent === "identify_barrier") {
      activeMode = "identify";
      SessionStore.updateSession(session.sessionId, { activeMode: "identify" });
    } else if (intent === "explore_barrier") {
      activeMode = "explore";
      SessionStore.updateSession(session.sessionId, { activeMode: "explore" });
    } else if (intent === "select_household" || (BarrierSelector.detectBarrierKeyFromText(text) === "household" && BarrierSelector.isBarrierSelectionText(text))) {
      const newKey = "household";
      if (activeBarrierKey && activeBarrierKey !== newKey) isBarrierChange = true;
      activeBarrierKey = newKey;
      barrierSource = "user_selection";
      activeMode = "explore";
      SessionStore.updateSession(session.sessionId, { activeBarrier: activeBarrierKey, barrierSource: barrierSource, activeMode: activeMode });
    } else if (intent === "select_logistic" || (BarrierSelector.detectBarrierKeyFromText(text) === "logistic" && BarrierSelector.isBarrierSelectionText(text))) {
      const newKey = "logistic";
      if (activeBarrierKey && activeBarrierKey !== newKey) isBarrierChange = true;
      activeBarrierKey = newKey;
      barrierSource = "user_selection";
      activeMode = "explore";
      SessionStore.updateSession(session.sessionId, { activeBarrier: activeBarrierKey, barrierSource: barrierSource, activeMode: activeMode });
    } else if (intent === "select_facility" || (BarrierSelector.detectBarrierKeyFromText(text) === "facility" && BarrierSelector.isBarrierSelectionText(text))) {
      const newKey = "facility";
      if (activeBarrierKey && activeBarrierKey !== newKey) isBarrierChange = true;
      activeBarrierKey = newKey;
      barrierSource = "user_selection";
      activeMode = "explore";
      SessionStore.updateSession(session.sessionId, { activeBarrier: activeBarrierKey, barrierSource: barrierSource, activeMode: activeMode });
    } else if (intent === "select_multiple" || (BarrierSelector.detectBarrierKeyFromText(text) === "multiple" && BarrierSelector.isBarrierSelectionText(text))) {
      const newKey = "multiple";
      if (activeBarrierKey && activeBarrierKey !== newKey) isBarrierChange = true;
      activeBarrierKey = newKey;
      barrierSource = "user_selection";
      activeMode = "explore";
      SessionStore.updateSession(session.sessionId, { activeBarrier: activeBarrierKey, barrierSource: barrierSource, activeMode: activeMode });
    } else if (intent === "select_all" || (BarrierSelector.detectBarrierKeyFromText(text) === "all" && BarrierSelector.isBarrierSelectionText(text))) {
      const newKey = "all";
      if (activeBarrierKey && activeBarrierKey !== newKey) isBarrierChange = true;
      activeBarrierKey = newKey;
      barrierSource = "user_selection";
      activeMode = "explore";
      SessionStore.updateSession(session.sessionId, { activeBarrier: activeBarrierKey, barrierSource: barrierSource, activeMode: activeMode });
    } else if (intent === "change_barrier") {
      const detectedKey = BarrierSelector.detectBarrierKeyFromText(text);
      if (detectedKey) {
        if (activeBarrierKey && activeBarrierKey !== detectedKey) isBarrierChange = true;
        activeBarrierKey = detectedKey;
        barrierSource = "user_selection";
        SessionStore.updateSession(session.sessionId, { activeBarrier: activeBarrierKey, barrierSource: barrierSource });
      }
    }

    // 9. If text explicitly mentions a barrier in a research question while keeping context
    const mentionedKey = BarrierSelector.detectBarrierKeyFromText(text);
    if (mentionedKey && !activeBarrierKey) {
      activeBarrierKey = mentionedKey;
      barrierSource = "user_selection";
      SessionStore.updateSession(session.sessionId, { activeBarrier: activeBarrierKey, barrierSource: barrierSource });
    }

    // 10. Determine execution flags
    const isGreetingIntent = intent === "greeting";
    const isModeEntryIntent = intent === "identify_barrier" || intent === "explore_barrier";
    const isLangChangeIntent = intent === "change_language";
    const isBarrierSelectIntent = intent.startsWith("select_") || intent === "change_barrier";

    const requiresSolutions = IntentRouter.isSolutionsQuery(text) || intent === "ask_solution" || intent === "solutions";
    const requiresMLPrediction = intent === "identify_barrier" || activeMode === "identify" && !activeBarrierKey;
    const requiresEvidence = !isGreetingIntent && !isModeEntryIntent && !isLangChangeIntent;

    // 11. Generate structured barrierContext object
    const canonicalDisplayName = activeBarrierKey ? BarrierSelector.KEY_TO_NAME[activeBarrierKey] || BarrierSelector.normalizeBarrierName(activeBarrierKey) : null;
    const barrierContextObj = activeBarrierKey ? {
      barrier: canonicalDisplayName,
      key: activeBarrierKey,
      scope: "active"
    } : null;

    // 12. Persist session updates and conversation history
    SessionStore.updateSession(session.sessionId, {
      activeBarrier: activeBarrierKey,
      barrierSource: barrierSource,
      activeLanguage: activeLanguage,
      activeMode: activeMode,
      currentIntent: intent,
      lastEntities: entities
    });

    SessionStore.addTurnToHistory(session.sessionId, {
      userText: text,
      intent: intent,
      entities: entities,
      activeBarrier: activeBarrierKey,
      barrierSource: barrierSource,
      requiresSolutions: requiresSolutions,
      requiresMLPrediction: requiresMLPrediction,
      requiresEvidence: requiresEvidence
    });

    // 13. Construct comprehensive predictable structured output
    return {
      sessionId: session.sessionId,
      activeBarrier: activeBarrierKey,
      barrierSource: barrierSource,
      activeLanguage: activeLanguage,
      activeMode: activeMode,
      intent: intent,
      currentIntent: intent,
      entities: {
        state: entities.state,
        states: entities.states || [],
        group: entities.group,
        groups: entities.groups || [],
        comparisonTarget: entities.comparisonTarget,
        residence: entities.residence,
        gender: entities.gender,
        ageGroup: entities.ageGroup
      },
      barrierContext: barrierContextObj,
      isBarrierChange: isBarrierChange,
      isLanguageChange: isLanguageChange,
      requiresEvidence: requiresEvidence,
      requiresMLPrediction: requiresMLPrediction,
      requiresSolutions: requiresSolutions,
      latestPrediction: session.latestPrediction || null,
      conversationHistory: session.conversationHistory
    };
  }

  /**
   * ML Prediction Adapter Integration Point:
   * Accepts predictions from existing BarrierLens ML models and updates shared context.
   */
  function handleMLPredictionResult(sessionId, predictionData, options = {}) {
    const SessionStore = getSessionStore(options);
    const BarrierSelector = getBarrierSelector(options);

    if (!predictionData) return null;

    const rawPrimary = predictionData.primaryBarrier || predictionData.barrier || "logistic";
    const canonicalKey = BarrierSelector.normalizeBarrierKey(rawPrimary);
    const canonicalName = BarrierSelector.normalizeBarrierName(rawPrimary);

    const updatedSession = SessionStore.setMLPrediction(sessionId, {
      ...predictionData,
      primaryBarrier: canonicalKey,
      primaryBarrierLabel: canonicalName
    });

    return {
      sessionId: updatedSession.sessionId,
      activeBarrier: canonicalKey,
      barrierSource: "ml_prediction",
      latestPrediction: updatedSession.latestPrediction,
      barrierContext: {
        barrier: canonicalName,
        key: canonicalKey,
        scope: "active"
      }
    };
  }

  /**
   * Manual Barrier Selection Integration Point:
   * Sets active barrier from user click or explicit selection.
   */
  function handleBarrierSelection(sessionId, barrierInput, source = "user_selection", options = {}) {
    const SessionStore = getSessionStore(options);
    const BarrierSelector = getBarrierSelector(options);

    const canonicalKey = BarrierSelector.normalizeBarrierKey(barrierInput);
    const canonicalName = BarrierSelector.normalizeBarrierName(barrierInput);

    const updatedSession = SessionStore.setActiveBarrier(sessionId, canonicalKey, source);
    SessionStore.setMode(sessionId, "explore");

    return {
      sessionId: updatedSession.sessionId,
      activeBarrier: canonicalKey,
      barrierSource: source,
      barrierContext: {
        barrier: canonicalName,
        key: canonicalKey,
        scope: "active"
      }
    };
  }

  /**
   * Get Welcome / Mode Selection Payload.
   */
  function getWelcomePayload(lang = "en", options = {}) {
    const ModeRouter = getModeRouter(options);
    return ModeRouter ? ModeRouter.getWelcomeMessage(lang) : null;
  }

  /**
   * Get Mode 2 Barrier Selection Options Payload.
   */
  function getBarrierMenuPayload(lang = "en", options = {}) {
    const BarrierSelector = getBarrierSelector(options);
    return BarrierSelector ? BarrierSelector.getBarrierMenuOptions(lang) : [];
  }

  /**
   * Get Mode 1 Guided Questions Payload.
   */
  function getGuidedQuestionsPayload(lang = "en", options = {}) {
    const QuestionSchema = getQuestionSchema(options);
    return QuestionSchema ? QuestionSchema.getQuestionList(lang) : [];
  }

  return {
    processUserQuery,
    handleMLPredictionResult,
    handleBarrierSelection,
    getWelcomePayload,
    getBarrierMenuPayload,
    getGuidedQuestionsPayload
  };
}));
