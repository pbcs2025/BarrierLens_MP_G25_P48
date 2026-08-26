/**
 * BARRIERLENS — MEMBER 1: BARRIER SELECTION, NLU & CONTEXT VERIFICATION SUITE
 * Comprehensive automated verification testing barrier selection, context persistence,
 * barrier/language switching, intent detection (all Member 1 intents), entity extraction, solutions flag,
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
    { name: "Household Barrier", key: "household" },
    { name: "Logistic Barrier", key: "logistic" },
    { name: "Facility Barrier", key: "facility" },
    { name: "Multiple Barriers", key: "multiple" },
    { name: "All Barriers", key: "all" }
  ];

  canonicalBarriers.forEach(b => {
    const session = SessionStore.getSession("test-select-" + b.key);
    const res = ContextManager.processUserQuery(b.name, "English", null, session.sessionId);
    check(res.activeBarrier === b.key || res.activeBarrier === b.name, `Selected barrier "${b.name}" stored correctly as key "${b.key}"`);
    check(res.barrierContext.barrier === b.name, `barrierContext.barrier matches "${b.name}"`);
    check(res.barrierContext.key === b.key, `barrierContext.key matches "${b.key}"`);
    check(res.barrierContext.scope === "active", `barrierContext.scope is "active"`);
  });

  // --- PART 2: CONTEXT PERSISTENCE (FOLLOW-UP QUESTIONS) ---
  console.log("\n=== PART 2: CONTEXT PERSISTENCE TESTS ===");
  const sess2Id = "session-followup-123";

  // Step 1: User selects Logistic Barrier
  const step1 = ContextManager.processUserQuery("Logistic Barrier", "English", null, sess2Id);
  check(step1.activeBarrier === "logistic" || step1.activeBarrier === "Logistic Barrier", "Step 1: Barrier set to Logistic Barrier");

  // Step 2: Follow-up question without naming barrier
  const step2 = ContextManager.processUserQuery("Which states are most affected?", "English", null, sess2Id);
  check(step2.activeBarrier === "logistic" || step2.activeBarrier === "Logistic Barrier", "Step 2: Active barrier persisted as Logistic Barrier without re-ask");
  check(step2.intent === "ask_state_analysis" || step2.intent === "affected_groups", "Step 2: Intent correctly detected as ask_state_analysis / affected_groups");
  check(step2.conversationHistory.length === 2, "Step 2: Conversation history contains 2 turns");

  // Step 3: Second follow-up
  const step3 = ContextManager.processUserQuery("What are the statistics?", "English", null, sess2Id);
  check(step3.activeBarrier === "logistic" || step3.activeBarrier === "Logistic Barrier", "Step 3: Active barrier persisted as Logistic Barrier");
  check(step3.intent === "ask_statistics" || step3.intent === "statistics", "Step 3: Intent correctly detected as ask_statistics / statistics");
  check(step3.conversationHistory.length === 3, "Step 3: Conversation history contains 3 turns");

  // --- PART 3: BARRIER SWITCHING (NON-DESTRUCTIVE HISTORY) ---
  console.log("\n=== PART 3: BARRIER SWITCHING TESTS ===");
  const sess3Id = "session-barrier-switch-456";

  // Household -> Facility -> Logistic
  const bw1 = ContextManager.processUserQuery("Household Barrier", "English", null, sess3Id);
  check(bw1.activeBarrier === "household" || bw1.activeBarrier === "Household Barrier", "Initial barrier set to Household Barrier");

  const bw2 = ContextManager.processUserQuery("Change barrier to Facility Barrier.", "English", null, sess3Id);
  check(bw2.activeBarrier === "facility" || bw2.activeBarrier === "Facility Barrier", "Switched barrier to Facility Barrier");
  check(bw2.isBarrierChange === true, "isBarrierChange flag is true");
  check(bw2.conversationHistory.length === 2, "Prior conversation history preserved (2 turns)");

  const bw3 = ContextManager.processUserQuery("Switch to Logistic Barrier.", "English", null, sess3Id);
  check(bw3.activeBarrier === "logistic" || bw3.activeBarrier === "Logistic Barrier", "Switched barrier to Logistic Barrier");
  check(bw3.isBarrierChange === true, "isBarrierChange flag is true");
  check(bw3.conversationHistory.length === 3, "Prior conversation history preserved (3 turns)");
  check(bw3.conversationHistory[0].activeBarrier === "household" || bw3.conversationHistory[0].activeBarrier === "Household Barrier", "Turn 1 history preserves original barrier scope");

  // --- PART 4: LANGUAGE SWITCHING (NON-DESTRUCTIVE HISTORY & BARRIER) ---
  console.log("\n=== PART 4: LANGUAGE SWITCHING TESTS ===");
  const sess4Id = "session-lang-switch-789";

  const lw1 = ContextManager.processUserQuery("Facility Barrier", "English", null, sess4Id);
  check(lw1.activeLanguage === "English" && (lw1.activeBarrier === "facility" || lw1.activeBarrier === "Facility Barrier"), "Initial: English, Facility Barrier");

  const lw2 = ContextManager.processUserQuery("Switch to Kannada.", "English", null, sess4Id);
  check(lw2.activeLanguage === "Kannada", "Language switched to Kannada");
  check(lw2.activeBarrier === "facility" || lw2.activeBarrier === "Facility Barrier", "Barrier remains Facility Barrier after language switch");
  check(lw2.isLanguageChange === true, "isLanguageChange flag is true");
  check(lw2.conversationHistory.length === 2, "History preserved across language switch");

  const lw3 = ContextManager.processUserQuery("Respond in Hindi.", "Kannada", null, sess4Id);
  check(lw3.activeLanguage === "Hindi", "Language switched to Hindi");
  check(lw3.activeBarrier === "facility" || lw3.activeBarrier === "Facility Barrier", "Barrier remains Facility Barrier after language switch to Hindi");
  check(lw3.conversationHistory.length === 3, "History preserved across second language switch");

  // --- PART 5: INTENT DETECTION TESTS ---
  console.log("\n=== PART 5: INTENT DETECTION COVERAGE TESTS ===");
  const sess5Id = "session-intents-test";

  const intentMapTests = [
    { query: "Household Barrier", expected: ["select_household", "select_barrier"] },
    { query: "What is this barrier?", expected: ["ask_explanation", "explain"] },
    { query: "What are the statistics?", expected: ["ask_statistics", "statistics"] },
    { query: "Compare rural and urban.", expected: ["ask_comparison", "compare"] },
    { query: "Which states are most affected?", expected: ["ask_state_analysis", "affected_groups"] },
    { query: "What can be done?", expected: ["ask_solution", "solutions"] },
    { query: "What are the limitations?", expected: ["limitations"] },
    { query: "Change barrier to Facility Barrier.", expected: ["change_barrier"] },
    { query: "Switch to Kannada.", expected: ["change_language"] },
    { query: "Hello", expected: ["greeting"] },
    { query: "Help me identify my barrier", expected: ["identify_barrier"] },
    { query: "Explore barriers", expected: ["explore_barrier"] }
  ];

  intentMapTests.forEach(item => {
    const res = ContextManager.processUserQuery(item.query, "English", null, sess5Id);
    const matches = Array.isArray(item.expected) ? item.expected.includes(res.intent) : res.intent === item.expected;
    check(matches, `Query "${item.query}" detected as intent in [${item.expected.join(', ')}] (got "${res.intent}")`);
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
  check(posRes.activeBarrier === "facility" || posRes.activeBarrier === "Facility Barrier", "Positional contract set correct activeBarrier");

  // Object signature: processUserQuery({ text, language, barrierContext, sessionId })
  const objRes = ContextManager.processUserQuery({
    text: "Compare rural and urban",
    language: "Kannada",
    barrierContext: { barrier: "Logistic Barrier" },
    sessionId: "session-obj-456"
  });
  check(objRes.sessionId === "session-obj-456", "Object contract returned correct sessionId");
  check(objRes.activeBarrier === "logistic" || objRes.activeBarrier === "Logistic Barrier", "Object contract set correct activeBarrier");
  check(objRes.activeLanguage === "Kannada", "Object contract set correct activeLanguage");
  check(objRes.intent === "ask_comparison" || objRes.intent === "compare", "Object contract detected correct intent");

  console.log("\n=========================================================================");
  console.log(`FINAL SUMMARY: ${passCount} PASSED, ${failCount} FAILED out of ${passCount + failCount} tests.`);
  console.log("=========================================================================");

  if (failCount > 0) {
    process.exit(1);
  }
}

runMember1Suite();
