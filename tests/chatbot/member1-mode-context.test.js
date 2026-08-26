/**
 * BARRIERLENS — MEMBER 1: MODE CONTEXT & INTENT VERIFICATION SUITE
 * Tests all requirements from Member 1 specification:
 * - Mode 1: Identify My Barrier (Guided questionnaire + ML Prediction context)
 * - Mode 2: Explore Barriers (5 canonical barrier selection menu)
 * - Shared Active Barrier Context (activeBarrier, barrierSource, sessionId, conversationHistory)
 * - Context Persistence across follow-up queries
 * - Non-destructive Barrier & Language Switching
 * - Solutions pipeline flagging
 * - Input/Output contracts for Member 2 (Evidence) and Member 3 (Solutions)
 */

const assert = require('assert');
const SessionStore = require('../../dashboard/assets/js/session-store.js');
const BarrierSelector = require('../../dashboard/assets/js/barrier-selector.js');
const IntentRouter = require('../../dashboard/assets/js/intent-router.js');
const ContextManager = require('../../dashboard/assets/js/context-manager.js');
const ModeRouter = require('../../dashboard/assets/js/mode-router.js');
const QuestionSchema = require('../../dashboard/assets/js/guided-question-schema.js');

let passCount = 0;
let failCount = 0;

function check(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passCount++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failCount++;
  }
}

function runMember1ModeSuite() {
  console.log("=========================================================================");
  console.log("BARRIERLENS MEMBER 1 — MODE ROUTER & SHARED CONTEXT TEST SUITE");
  console.log("=========================================================================\n");

  SessionStore.clearAllSessions();

  // =========================================================================
  // TEST CASE 1: MANUAL SELECTION (MODE 2)
  // =========================================================================
  console.log("=== TEST CASE 1: MANUAL SELECTION (MODE 2) ===");
  const sess1 = "sess-manual-101";

  // Step 1: User says "Explore Barriers"
  const step1 = ContextManager.processUserQuery("I want to explore barriers", "English", null, sess1);
  check(step1.intent === "explore_barrier", "User intent detected as 'explore_barrier'");
  check(step1.activeMode === "explore", "Active mode set to 'explore'");
  check(step1.requiresEvidence === false, "Entry mode query does not trigger immediate evidence lookup");
  check(step1.requiresMLPrediction === false, "Mode 2 does not require ML prediction");

  // Step 2: User selects "Logistic Barrier"
  const step2 = ContextManager.processUserQuery("Logistic Barrier", "English", null, sess1);
  check(step2.activeBarrier === "logistic", "activeBarrier stored as 'logistic'");
  check(step2.barrierSource === "user_selection", "barrierSource stored as 'user_selection'");
  check(step2.barrierContext.barrier === "Logistic Barrier", "barrierContext.barrier is 'Logistic Barrier'");
  check(step2.barrierContext.key === "logistic", "barrierContext.key is 'logistic'");

  // Step 3: User asks follow-up: "Which states are most affected?"
  const step3 = ContextManager.processUserQuery("Which states are most affected?", "English", null, sess1);
  check(step3.activeBarrier === "logistic", "activeBarrier persists as 'logistic' on follow-up");
  check(step3.barrierSource === "user_selection", "barrierSource persists as 'user_selection'");
  check(step3.intent === "ask_state_analysis", "Intent classified as 'ask_state_analysis'");
  check(step3.requiresEvidence === true, "Follow-up requires evidence retrieval");
  check(step3.conversationHistory.length === 3, "Conversation history correctly contains 3 turns");

  // =========================================================================
  // TEST CASE 2: CONTEXT PERSISTENCE
  // =========================================================================
  console.log("\n=== TEST CASE 2: CONTEXT PERSISTENCE ===");
  const sess2 = "sess-persist-202";

  // Preset context with activeBarrier = "facility"
  ContextManager.processUserQuery("Facility Barrier", "English", null, sess2);

  // Follow-up question: "Compare rural and urban areas."
  const persistRes1 = ContextManager.processUserQuery("Compare rural and urban areas.", "English", null, sess2);
  check(persistRes1.activeBarrier === "facility", "Active barrier remains 'facility' during rural/urban comparison");
  check(persistRes1.intent === "ask_comparison", "Intent classified as 'ask_comparison'");
  check(persistRes1.entities.residence === "rural_urban", "Extracted 'rural_urban' residence entity");
  check(persistRes1.barrierContext.barrier === "Facility Barrier", "barrierContext remains associated with Facility Barrier");

  // Another follow-up: "What are the statistics?"
  const persistRes2 = ContextManager.processUserQuery("What are the statistics?", "English", null, sess2);
  check(persistRes2.activeBarrier === "facility", "Active barrier remains 'facility' during statistics query");
  check(persistRes2.intent === "ask_statistics", "Intent classified as 'ask_statistics'");

  // =========================================================================
  // TEST CASE 3: ML PREDICTION CONTEXT (MODE 1)
  // =========================================================================
  console.log("\n=== TEST CASE 3: ML PREDICTION CONTEXT (MODE 1) ===");
  const sess3 = "sess-ml-303";

  // Step 1: User chooses "Help me identify my barrier"
  const mlStep1 = ContextManager.processUserQuery("Help me identify my barrier", "English", null, sess3);
  check(mlStep1.intent === "identify_barrier", "Intent classified as 'identify_barrier'");
  check(mlStep1.requiresMLPrediction === true, "requiresMLPrediction is true");
  check(mlStep1.activeMode === "identify", "activeMode set to 'identify'");

  // Step 2: ML Prediction Adapter completes and returns prediction
  const mockMLPrediction = {
    householdProbability: 0.85,
    logisticProbability: 0.20,
    facilityProbability: 0.15,
    primaryBarrier: "household"
  };

  const adapterHandoff = ContextManager.handleMLPredictionResult(sess3, mockMLPrediction);
  check(adapterHandoff.activeBarrier === "household", "handleMLPredictionResult sets activeBarrier = 'household'");
  check(adapterHandoff.barrierSource === "ml_prediction", "handleMLPredictionResult sets barrierSource = 'ml_prediction'");
  check(adapterHandoff.latestPrediction.primaryBarrier === "household", "latestPrediction stored in session context");

  // Step 3: User immediately asks follow-up: "Why am I facing this?"
  const mlStep3 = ContextManager.processUserQuery("Why am I facing this?", "English", null, sess3);
  check(mlStep3.activeBarrier === "household", "Active barrier automatically maintained as 'household' without re-asking");
  check(mlStep3.barrierSource === "ml_prediction", "barrierSource preserved as 'ml_prediction'");
  check(mlStep3.intent === "ask_explanation", "Intent classified as 'ask_explanation'");
  check(mlStep3.latestPrediction.householdProbability === 0.85, "latestPrediction remains accessible in context");

  // =========================================================================
  // TEST CASE 4: BARRIER SWITCHING
  // =========================================================================
  console.log("\n=== TEST CASE 4: BARRIER SWITCHING ===");
  const sess4 = "sess-switch-404";

  // Initial: household
  ContextManager.processUserQuery("Household Barrier", "English", null, sess4);
  const s4Before = SessionStore.getSession(sess4);
  check(s4Before.activeBarrier === "household", "Initial barrier set to 'household'");

  // User switches: "Tell me about logistic barriers"
  const switchRes = ContextManager.processUserQuery("Tell me about logistic barriers", "English", null, sess4);
  check(switchRes.activeBarrier === "logistic", "activeBarrier successfully updated to 'logistic'");
  check(switchRes.barrierSource === "user_selection", "barrierSource updated to 'user_selection'");
  check(switchRes.isBarrierChange === true, "isBarrierChange flag is true");
  check(switchRes.conversationHistory.length === 2, "Conversation history preserved across barrier switch");
  check(switchRes.conversationHistory[0].activeBarrier === "household", "Turn 1 in history retains previous barrier scope");

  // Another switch: "Show me facility barriers instead"
  const switchRes2 = ContextManager.processUserQuery("Show me facility barriers instead", "English", null, sess4);
  check(switchRes2.activeBarrier === "facility", "activeBarrier updated to 'facility'");
  check(switchRes2.isBarrierChange === true, "isBarrierChange flag is true for second switch");
  check(switchRes2.conversationHistory.length === 3, "Conversation history contains 3 turns");

  // =========================================================================
  // TEST CASE 5: SOLUTION REQUEST
  // =========================================================================
  console.log("\n=== TEST CASE 5: SOLUTION REQUEST ===");
  const sess5 = "sess-solution-505";

  // Set active barrier to facility
  ContextManager.processUserQuery("Facility Barrier", "English", null, sess5);

  // User asks: "What can be done?"
  const solRes = ContextManager.processUserQuery("What can be done?", "English", null, sess5);
  check(solRes.intent === "ask_solution", "Intent detected as 'ask_solution'");
  check(solRes.activeBarrier === "facility", "activeBarrier remains 'facility'");
  check(solRes.requiresSolutions === true, "requiresSolutions flag is true to trigger Solutions pipeline");
  check(solRes.requiresEvidence === true, "requiresEvidence flag is true");

  // Other solution phrasing variations
  const solPhraings = [
    "How can this problem be solved?",
    "What are the solutions?",
    "How can we improve this?",
    "What should be done?"
  ];
  solPhraings.forEach(phrase => {
    const r = ContextManager.processUserQuery(phrase, "English", null, sess5);
    check(r.requiresSolutions === true, `Phrase "${phrase}" flags requiresSolutions === true`);
  });

  // =========================================================================
  // TEST CASE 6: ALL 5 CANONICAL BARRIERS SELECTION
  // =========================================================================
  console.log("\n=== TEST CASE 6: ALL 5 CANONICAL BARRIERS SELECTION ===");
  const testBarriers = [
    { text: "Household Barrier", key: "household", name: "Household Barrier" },
    { text: "Logistic Barrier", key: "logistic", name: "Logistic Barrier" },
    { text: "Facility Barrier", key: "facility", name: "Facility Barrier" },
    { text: "Multiple Barriers", key: "multiple", name: "Multiple Barriers" },
    { text: "All Barriers", key: "all", name: "All Barriers" }
  ];

  testBarriers.forEach(tb => {
    const res = ContextManager.processUserQuery(tb.text, "English", null, `sess-${tb.key}`);
    check(res.activeBarrier === tb.key, `Barrier "${tb.text}" correctly mapped to canonical key "${tb.key}"`);
    check(res.barrierContext.barrier === tb.name, `barrierContext.barrier matches "${tb.name}"`);
  });

  // =========================================================================
  // TEST CASE 7: GUIDED QUESTIONS SCHEMA VALIDATION (MODE 1)
  // =========================================================================
  console.log("\n=== TEST CASE 7: GUIDED QUESTIONS SCHEMA (MODE 1) ===");
  const questionsEn = QuestionSchema.getQuestionList("en");
  check(questionsEn.length >= 10, `Guided question list contains ${questionsEn.length} validated ML feature questions`);

  const qAge = QuestionSchema.getQuestion("v012", "en");
  check(qAge && qAge.type === "number" && qAge.min === 15 && qAge.max === 49, "Age question (v012) correctly configured");

  const qEdu = QuestionSchema.getQuestion("v106", "en");
  check(qEdu && qEdu.type === "select" && qEdu.options.length === 4, "Education question (v106) has 4 categorical options");

  const defaultAnswers = QuestionSchema.getDefaultAnswers();
  check(defaultAnswers.v012 === 28, "Default age is 28");
  check(defaultAnswers.v106 === "secondary", "Default education is secondary");

  const validationResult = QuestionSchema.validateAnswers({ v012: "32", v106: "higher", v190: "middle" });
  check(validationResult.isValid === true, "Answers validation passes for valid inputs");
  check(validationResult.answers.v012 === 32, "Numeric answer properly parsed");

  // =========================================================================
  // TEST CASE 8: TRILINGUAL WELCOME & MODE ROUTER
  // =========================================================================
  console.log("\n=== TEST CASE 8: TRILINGUAL WELCOME & MODE ROUTER ===");
  const welcomeEn = ModeRouter.getWelcomeMessage("en");
  check(welcomeEn.options.length === 2, "Welcome payload provides 2 entry mode options (en)");

  const welcomeKn = ModeRouter.getWelcomeMessage("kn");
  check(welcomeKn.language === "kn" && welcomeKn.options[0].label.includes("ಗುರುತಿಸಿ"), "Welcome payload rendered in Kannada");

  const welcomeHi = ModeRouter.getWelcomeMessage("hi");
  check(welcomeHi.language === "hi" && welcomeHi.options[0].label.includes("पहचानें"), "Welcome payload rendered in Hindi");

  console.log("\n=========================================================================");
  console.log(`MEMBER 1 TEST SUITE SUMMARY: ${passCount} PASSED, ${failCount} FAILED out of ${passCount + failCount} tests.`);
  console.log("=========================================================================");

  if (failCount > 0) {
    process.exit(1);
  }
}

runMember1ModeSuite();
