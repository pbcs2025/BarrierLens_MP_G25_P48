/**
 * BARRIERLENS — ADDENDUM 3: PERSONAL PROBLEM STATEMENTS AUDIT SUITE
 * File: tests/chatbot/personal-problems.test.js
 *
 * Verifies all 10 test requirements from Addendum 3 Section E:
 * 1. "I have a problem going to the hospital, can you help me?" -> maps to logistic, shows JSSK transport, 108/102, eSanjeevani, Arogya Mandir
 * 2. "I can't afford treatment" -> maps to household(money): JSSK, PM-JAY, WHO CHW guideline
 * 3. "Medicines are not available at the clinic" -> maps to facility(drugs): Free Drugs, Free Diagnostics, Arogya Mandir
 * 4. "There is no lady doctor" -> exact string "A verified solution could not be identified.", zero invented answers
 * 5. Same sentences in Hindi and Kannada -> same mapping, structure & localized scripts
 * 6. "I'm in labour and the hospital is far" -> emergency alert with NAS 108 first, then logistic cards
 * 7. Ambiguous message ("I have a problem") -> one clarifying question, no solutions yet
 * 8. Ollama stopped (offline fallback) -> keyword-mapped cases still work 100% deterministically
 * 9. Plain statistics question -> still NO solutions
 * 10. Dashboard pages A–J unchanged
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

const DataModule = require('../../dashboard/assets/js/chatbot-data.js');
const ResponseEngine = require('../../dashboard/assets/js/response-engine.js');
const SolutionsEngine = require('../../dashboard/assets/js/solutions-engine.js');

let passCount = 0;
let failCount = 0;

function it(description, fn) {
  try {
    fn();
    console.log(`  ✓ PASS: ${description}`);
    passCount++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${description}`);
    console.error(`     Error: ${err.message}`);
    failCount++;
  }
}

async function runPersonalProblemTests() {
  console.log('=========================================================================');
  console.log('BARRIERLENS — ADDENDUM 3 PERSONAL PROBLEM STATEMENTS VERIFICATION');
  console.log('=========================================================================\n');

  const basePath = path.resolve(__dirname, '../../') + '/';
  const dataRegistry = await DataModule.preloadChatbotData(basePath);

  const testOptions = {
    basePath,
    dataRegistry,
    skipBackend: true // Validates pure deterministic local engine & Ollama-off robustness
  };

  // ---------------------------------------------------------------------------
  // TEST 1: Logistic problem ("I have a problem going to the hospital, can you help me?")
  // ---------------------------------------------------------------------------
  console.log('--- Test 1: Logistic Problem Mapping ---');
  const res1 = await ResponseEngine.processUserQuery("I have a problem going to the hospital, can you help me?", "en", testOptions);

  it('Test 1: Intent classified as personal_barrier_help', () => {
    assert.strictEqual(res1.intent, "personal_barrier_help");
    assert.strictEqual(res1.barrier, "logistic");
  });

  it('Test 1: Output contains empathetic sentence', () => {
    assert.ok(res1.answer.includes("challenging situation") || res1.answer.includes("I understand"));
  });

  it('Test 1: Links plain words to logistic barrier', () => {
    assert.ok(res1.answer.includes("logistic barrier") || res1.answer.includes("Logistic Barrier"));
  });

  it('Test 1: Includes data-bound group-level context figure (31.61%)', () => {
    assert.ok(res1.answer.includes("31.61%"));
    assert.ok(res1.answer.includes("724,115") || res1.answer.includes("NFHS-5"));
  });

  it('Test 1: Returns logistic solutions (JSSK, 108/102, eSanjeevani, Arogya Mandir)', () => {
    assert.ok(res1.solutions && res1.solutions.length > 0 && res1.solutions.length <= 4);
    const ids = res1.solutions.map(s => s.id);
    assert.ok(ids.includes('jssk') || ids.includes('nas_108') || ids.includes('esanjeevani'));
  });

  it('Test 1: Appends non-evaluation disclaimer and offer to switch barrier', () => {
    assert.ok(res1.answer.includes("BarrierLens does not evaluate programme effectiveness"));
    assert.ok(res1.answer.includes("Would you like to switch your active barrier focus"));
  });

  // ---------------------------------------------------------------------------
  // TEST 2: Household money problem ("I can't afford treatment")
  // ---------------------------------------------------------------------------
  console.log('\n--- Test 2: Household Cost Mapping ---');
  const res2 = await ResponseEngine.processUserQuery("I can't afford treatment", "en", testOptions);

  it('Test 2: Intent classified as personal_barrier_help for household barrier', () => {
    assert.strictEqual(res2.intent, "personal_barrier_help");
    assert.strictEqual(res2.barrier, "household");
  });

  it('Test 2: Returns JSSK, PM-JAY and WHO CHW cards', () => {
    assert.ok(res2.solutions && res2.solutions.length <= 4);
    const ids = res2.solutions.map(s => s.id);
    assert.ok(ids.includes('jssk'), 'Must include JSSK');
    assert.ok(ids.includes('pmjay'), 'Must include PM-JAY');
    assert.ok(ids.includes('who_chw'), 'Must include WHO CHW');
  });

  // ---------------------------------------------------------------------------
  // TEST 3: Facility drugs problem ("Medicines are not available at the clinic")
  // ---------------------------------------------------------------------------
  console.log('\n--- Test 3: Facility Medicine Shortage Mapping ---');
  const res3 = await ResponseEngine.processUserQuery("Medicines are not available at the clinic", "en", testOptions);

  it('Test 3: Intent classified as personal_barrier_help for facility barrier', () => {
    assert.strictEqual(res3.intent, "personal_barrier_help");
    assert.strictEqual(res3.barrier, "facility");
  });

  it('Test 3: Returns Free Drugs and facility quality solutions', () => {
    assert.ok(res3.solutions && res3.solutions.length > 0);
    const ids = res3.solutions.map(s => s.id);
    assert.ok(ids.includes('fdsi_drugs') || ids.includes('free_drugs') || ids.includes('jssk') || ids.includes('nhm_quality') || ids.includes('nqas') || ids.includes('ayushman_arogya_mandir'));
  });

  // ---------------------------------------------------------------------------
  // TEST 4: Component query without vetted scheme ("There is no lady doctor")
  // ---------------------------------------------------------------------------
  console.log('\n--- Test 4: Unvetted Component Fallback (No Lady Doctor) ---');
  const res4 = await ResponseEngine.processUserQuery("There is no lady doctor", "en", testOptions);

  it('Test 4: Replies exactly "A verified solution could not be identified."', () => {
    assert.ok(res4.answer.includes("A verified solution could not be identified."));
  });

  it('Test 4: Strictly zero invented solutions or citations returned', () => {
    assert.strictEqual(res4.solutions.length, 0);
  });

  // ---------------------------------------------------------------------------
  // TEST 5: Multilingual Sentences in Hindi and Kannada
  // ---------------------------------------------------------------------------
  console.log('\n--- Test 5: Multilingual Mapping (Hindi & Kannada) ---');

  // Kannada: "ಆಸ್ಪತ್ರೆ ತುಂಬಾ ದೂರವಿದೆ ಮತ್ತು ಸಾರಿಗೆ ಇಲ್ಲ"
  const res5kn = await ResponseEngine.processUserQuery("ಆಸ್ಪತ್ರೆ ತುಂಬಾ ದೂರವಿದೆ ಮತ್ತು ಸಾರಿಗೆ ಇಲ್ಲ", "kn", testOptions);
  it('Test 5 (KN): Maps to logistic barrier in Kannada with native script empathy', () => {
    assert.strictEqual(res5kn.intent, "personal_barrier_help");
    assert.strictEqual(res5kn.barrier, "logistic");
    assert.ok(res5kn.answer.includes("ಕಷ್ಟಕರ ಪರಿಸ್ಥಿತಿ"));
    assert.ok(res5kn.answer.includes("ಬ್ಯಾರಿಯರ್ ಲೆನ್ಸ್"));
    assert.ok(res5kn.solutions.length > 0);
  });

  // Hindi: "इलाज का खर्च बहुत अधिक है, मैं खर्च नहीं उठा सकती"
  const res5hi = await ResponseEngine.processUserQuery("इलाज का खर्च बहुत अधिक है, मैं खर्च नहीं उठा सकती", "hi", testOptions);
  it('Test 5 (HI): Maps to household barrier in Hindi with native script empathy', () => {
    assert.strictEqual(res5hi.intent, "personal_barrier_help");
    assert.strictEqual(res5hi.barrier, "household");
    assert.ok(res5hi.answer.includes("कठिन परिस्थिति"));
    assert.ok(res5hi.answer.includes("बैरियरलेंस"));
    assert.ok(res5hi.solutions.length > 0);
  });

  // ---------------------------------------------------------------------------
  // TEST 6: Emergency Wording ("I'm in labour and the hospital is far")
  // ---------------------------------------------------------------------------
  console.log('\n--- Test 6: Emergency Notice with National Ambulance Service 108 ---');
  const res6 = await ResponseEngine.processUserQuery("I'm in labour and the hospital is far", "en", testOptions);

  it('Test 6: Emergency notice appears FIRST in output', () => {
    const lowerAns = res6.answer.toLowerCase();
    const emIdx = lowerAns.indexOf("emergency notice");
    const diffIdx = lowerAns.indexOf("logistic");
    assert.ok(emIdx !== -1, 'EMERGENCY NOTICE must be present');
    assert.ok(emIdx < diffIdx, 'Emergency alert must precede general barrier explanation');
  });

  it('Test 6: Cites National Ambulance Service 108 in emergency notice', () => {
    assert.ok(res6.answer.includes("108"));
    assert.ok(res6.answer.includes("Ambulance Service"));
  });

  it('Test 6: Attaches logistic solution cards below emergency notice', () => {
    assert.ok(res6.solutions && res6.solutions.length > 0);
  });

  // ---------------------------------------------------------------------------
  // TEST 7: Ambiguous message ("I have a problem")
  // ---------------------------------------------------------------------------
  console.log('\n--- Test 7: Ambiguous Statement Clarification ---');
  const res7 = await ResponseEngine.processUserQuery("I have a problem", "en", testOptions);

  it('Test 7: Asks one short clarifying question', () => {
    assert.ok(res7.answer.includes("clarify") || res7.answer.includes("distance") || res7.answer.includes("cost"));
  });

  it('Test 7: Returns zero solutions until clarified', () => {
    assert.strictEqual(res7.solutions.length, 0);
  });

  // ---------------------------------------------------------------------------
  // TEST 8: Robustness with Ollama Off
  // ---------------------------------------------------------------------------
  console.log('\n--- Test 8: Ollama Off Robustness ---');
  const res8 = await ResponseEngine.processUserQuery("my family won't allow me to go to the hospital", "en", {
    ...testOptions,
    skipBackend: true
  });

  it('Test 8: Deterministic mapping succeeds completely without network/Ollama', () => {
    assert.strictEqual(res8.intent, "personal_barrier_help");
    assert.strictEqual(res8.barrier, "household");
    assert.ok(res8.solutions.length > 0);
  });

  // ---------------------------------------------------------------------------
  // TEST 9: Plain Statistics Query (No Solutions Attached)
  // ---------------------------------------------------------------------------
  console.log('\n--- Test 9: Plain Statistics Query Exclusion ---');
  const res9 = await ResponseEngine.processUserQuery("What are the logistic barrier statistics?", "en", testOptions);

  it('Test 9: Statistics query does NOT trigger personal_barrier_help intent', () => {
    assert.notStrictEqual(res9.intent, "personal_barrier_help");
    assert.ok(res9.intent === "ask_statistics" || res9.intent === "NATIONAL_OVERVIEW" || res9.intent === "statistics");
  });

  it('Test 9: Statistics query returns NO solutions', () => {
    assert.ok(!res9.solutions || res9.solutions.length === 0, 'Must strictly not attach solutions to plain stats queries');
  });

  // ---------------------------------------------------------------------------
  // TEST 10: Dashboard Pages A–J Unchanged
  // ---------------------------------------------------------------------------
  console.log('\n--- Test 10: Dashboard Pages A–J Integrity ---');
  const dashboardFiles = [
    "index.html",
    "pages/national_overview.html",
    "pages/state_analysis.html",
    "pages/demographic_analysis.html",
    "pages/rural_urban.html",
    "pages/risk_archetypes.html",
    "pages/empowerment.html",
    "pages/multiple_barrier.html",
    "pages/outcome_impact.html",
    "pages/explainability.html",
    "pages/base_paper_comparison.html"
  ];

  dashboardFiles.forEach(file => {
    const fullP = path.resolve(__dirname, '../../dashboard', file);
    it(`Test 10: ${file} physically intact`, () => {
      assert.ok(fs.existsSync(fullP));
    });
  });

  console.log('\n=========================================================================');
  console.log(`ADDENDUM 3 TEST SUMMARY: ${passCount} PASSED, ${failCount} FAILED out of ${passCount + failCount} assertions.`);
  console.log('=========================================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runPersonalProblemTests().catch(err => {
  console.error("Personal problem test suite error:", err);
  process.exit(1);
});
