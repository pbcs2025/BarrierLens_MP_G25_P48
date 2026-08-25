/**
 * BARRIERLENS — MEMBER 1: BARRIER SELECTION, NLU & CONTEXT VERIFICATION SUITE
 * Comprehensive automated verification testing barrier selection, context persistence,
 * barrier/language switching, intent detection (10 intents), entity extraction, solutions flag,
 * and contract compatibility.
 */

const assert = require('assert');
const SessionStore = require('../../dashboard/assets/js/session-store.js');
const BarrierSelector = require('../../dashboard/assets/js/barrier-selector.js');
const IntentRouter = require('../../dashboard/assets/js/intent-router.js');
const ContextManager = require('../../dashboard/assets/js/context-manager.js');

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

function runMember1Suite() {
  console.log("=========================================================================");
  console.log("BARRIERLENS MEMBER 1 — STATEFUL QUERY ENGINE TEST SUITE");
  console.log("=========================================================================\n");

  SessionStore.clearAllSessions();

  // --- PART 1: BARRIER SELECTION (ALL 5 BARRIERS) ---
  console.log("=== PART 1: BARRIER SELECTION TESTS ===");

  const canonicalBarriers = [
    "Household Barrier",
    "Logistic Barrier",
    "Facility Barrier",
    "Multiple Barriers",
    "All Barriers"
  ];

  canonicalBarriers.forEach(barrierName => {
    const session = SessionStore.getSession("test-select-" + barrierName.replace(/\s+/g, ''));
    const res = ContextManager.processUserQuery(barrierName, "English", null, session.sessionId);
    check(res.activeBarrier === barrierName, `Selected barrier "${barrierName}" stored correctly`);
    check(res.barrierContext.barrier === barrierName, `barrierContext.barrier matches "${barrierName}"`);
    check(res.barrierContext.scope === "active", `barrierContext.scope is "active"`);
  });

  // --- PART 2: CONTEXT PERSISTENCE (FOLLOW-UP QUESTIONS) ---
  console.log("\n=== PART 2: CONTEXT PERSISTENCE TESTS ===");
  const sess2Id = "session-followup-123";

  // Step 1: User selects Logistic Barrier
  const step1 = ContextManager.processUserQuery("Logistic Barrier", "English", null, sess2Id);
  check(step1.activeBarrier === "Logistic Barrier", "Step 1: Barrier set to Logistic Barrier");

  // Step 2: Follow-up question without naming barrier
  const step2 = ContextManager.processUserQuery("Which states are most affected?", "English", null, sess2Id);
  check(step2.activeBarrier === "Logistic Barrier", "Step 2: Active barrier persisted as Logistic Barrier without re-ask");
  check(step2.intent === "affected_groups", "Step 2: Intent correctly detected as affected_groups");
  check(step2.conversationHistory.length === 2, "Step 2: Conversation history contains 2 turns");

  // Step 3: Second follow-up
  const step3 = ContextManager.processUserQuery("What are the statistics?", "English", null, sess2Id);
  check(step3.activeBarrier === "Logistic Barrier", "Step 3: Active barrier persisted as Logistic Barrier");
  check(step3.intent === "statistics", "Step 3: Intent correctly detected as statistics");
  check(step3.conversationHistory.length === 3, "Step 3: Conversation history contains 3 turns");

  // --- PART 3: BARRIER SWITCHING (NON-DESTRUCTIVE HISTORY) ---
  console.log("\n=== PART 3: BARRIER SWITCHING TESTS ===");
  const sess3Id = "session-barrier-switch-456";

  // Household -> Facility -> Logistic
  const bw1 = ContextManager.processUserQuery("Household Barrier", "English", null, sess3Id);
  check(bw1.activeBarrier === "Household Barrier", "Initial barrier set to Household Barrier");

  const bw2 = ContextManager.processUserQuery("Change barrier to Facility Barrier.", "English", null, sess3Id);
  check(bw2.activeBarrier === "Facility Barrier", "Switched barrier to Facility Barrier");
  check(bw2.isBarrierChange === true, "isBarrierChange flag is true");
  check(bw2.conversationHistory.length === 2, "Prior conversation history preserved (2 turns)");

  const bw3 = ContextManager.processUserQuery("Switch to Logistic Barrier.", "English", null, sess3Id);
  check(bw3.activeBarrier === "Logistic Barrier", "Switched barrier to Logistic Barrier");
  check(bw3.isBarrierChange === true, "isBarrierChange flag is true");
  check(bw3.conversationHistory.length === 3, "Prior conversation history preserved (3 turns)");
  check(bw3.conversationHistory[0].activeBarrier === "Household Barrier", "Turn 1 history preserves original barrier scope");

  // --- PART 4: LANGUAGE SWITCHING (NON-DESTRUCTIVE HISTORY & BARRIER) ---
  console.log("\n=== PART 4: LANGUAGE SWITCHING TESTS ===");
  const sess4Id = "session-lang-switch-789";

  const lw1 = ContextManager.processUserQuery("Facility Barrier", "English", null, sess4Id);
  check(lw1.activeLanguage === "English" && lw1.activeBarrier === "Facility Barrier", "Initial: English, Facility Barrier");

  const lw2 = ContextManager.processUserQuery("Switch to Kannada.", "English", null, sess4Id);
  check(lw2.activeLanguage === "Kannada", "Language switched to Kannada");
  check(lw2.activeBarrier === "Facility Barrier", "Barrier remains Facility Barrier after language switch");
  check(lw2.isLanguageChange === true, "isLanguageChange flag is true");
  check(lw2.conversationHistory.length === 2, "History preserved across language switch");

  const lw3 = ContextManager.processUserQuery("Respond in Hindi.", "Kannada", null, sess4Id);
  check(lw3.activeLanguage === "Hindi", "Language switched to Hindi");
  check(lw3.activeBarrier === "Facility Barrier", "Barrier remains Facility Barrier after language switch to Hindi");
  check(lw3.conversationHistory.length === 3, "History preserved across second language switch");

  // --- PART 5: INTENT DETECTION TESTS (ALL 10 INTENTS) ---
  console.log("\n=== PART 5: INTENT DETECTION COVERAGE TESTS ===");
  const sess5Id = "session-intents-test";

  const intentMapTests = [
    { query: "Household Barrier", expected: "select_barrier" },
    { query: "What is this barrier?", expected: "explain" },
    { query: "What are the statistics?", expected: "statistics" },
    { query: "Compare rural and urban.", expected: "compare" },
    { query: "Which states are most affected?", expected: "affected_groups" },
    { query: "What can be done?", expected: "solutions" },
    { query: "What are the limitations?", expected: "limitations" },
    { query: "Change barrier to Facility Barrier.", expected: "change_barrier" },
    { query: "Switch to Kannada.", expected: "change_language" }
  ];

  intentMapTests.forEach(item => {
    const res = ContextManager.processUserQuery(item.query, "English", null, sess5Id);
    check(res.intent === item.expected, `Query "${item.query}" detected as intent "${item.expected}" (got "${res.intent}")`);
  });

  // --- PART 6: ENTITY EXTRACTION TESTS ---
  console.log("\n=== PART 6: ENTITY EXTRACTION TESTS ===");
  const sess6Id = "session-entity-test";

  const e1 = ContextManager.processUserQuery("Which states are most affected in Karnataka?", "English", null, sess6Id);
  check(e1.entities.state === "Karnataka", "Extracted single state Karnataka");

  const e2 = ContextManager.processUserQuery("Compare rural and urban.", "English", null, sess6Id);
  check(e2.entities.residence === "rural_urban", "Extracted rural_urban residence");
  check(Array.isArray(e2.entities.comparisonTarget) && e2.entities.comparisonTarget.includes("rural"), "Extracted comparison target [rural, urban]");

  const e3 = ContextManager.processUserQuery("What is the impact on poorest women?", "English", null, sess6Id);
  check(e3.entities.group === "Poorest", "Extracted demographic group Poorest");
  check(e3.entities.gender === "female", "Extracted female gender entity");

  // --- PART 7: SOLUTIONS DETECTION TESTS ---
  console.log("\n=== PART 7: SOLUTIONS DETECTION TESTS ===");
  const sess7Id = "session-solutions-test";

  const solutionQueries = [
    "What can be done?",
    "How can this problem be solved?",
    "What are the solutions?",
    "How can we improve this?",
    "What should be done?"
  ];

  solutionQueries.forEach(q => {
    const res = ContextManager.processUserQuery(q, "English", null, sess7Id);
    check(res.requiresSolutions === true, `Solutions query "${q}" set requiresSolutions === true`);
  });

  const nonSolutionRes = ContextManager.processUserQuery("What is the percentage rate in UP?", "English", null, sess7Id);
  check(nonSolutionRes.requiresSolutions === false, "Non-solution query set requiresSolutions === false");

  // --- PART 8: CONTRACT COMPATIBILITY TESTS ---
  console.log("\n=== PART 8: CONTRACT COMPATIBILITY TESTS ===");

  // Positional signature: processUserQuery(text, language, barrierContext, sessionId)
  const posRes = ContextManager.processUserQuery("Tell me about facility barrier", "English", { barrier: "Facility Barrier" }, "session-pos-123");
  check(posRes.sessionId === "session-pos-123", "Positional contract returned correct sessionId");
  check(posRes.activeBarrier === "Facility Barrier", "Positional contract set correct activeBarrier");

  // Object signature: processUserQuery({ text, language, barrierContext, sessionId })
  const objRes = ContextManager.processUserQuery({
    text: "Compare rural and urban",
    language: "Kannada",
    barrierContext: { barrier: "Logistic Barrier" },
    sessionId: "session-obj-456"
  });
  check(objRes.sessionId === "session-obj-456", "Object contract returned correct sessionId");
  check(objRes.activeBarrier === "Logistic Barrier", "Object contract set correct activeBarrier");
  check(objRes.activeLanguage === "Kannada", "Object contract set correct activeLanguage");
  check(objRes.intent === "compare", "Object contract detected correct intent");

  console.log("\n=========================================================================");
  console.log(`FINAL SUMMARY: ${passCount} PASSED, ${failCount} FAILED out of ${passCount + failCount} tests.`);
  console.log("=========================================================================");

  if (failCount > 0) {
    process.exit(1);
  }
}

runMember1Suite();
