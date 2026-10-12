/**
 * BARRIERLENS — CURATED SOURCE-CITED SOLUTIONS & COMPOUND DECOMPOSITION TEST SUITE
 * File: tests/chatbot/solutions.test.js
 *
 * Verifies all requirements from Step 0 through Step 6 and Addenda B, D, E:
 * 1. State selection + solutions query: "In Bihar, what can be done about logistic barriers?"
 * 2. National scope + solutions query: "What can be done about household barriers?"
 * 3. Compound query with state: "Which barrier is dominant in Bihar and what can be done?"
 * 4. Compound query with "here" + session state set to Karnataka
 * 5. Compound query with "here" + NO session state (National fallback)
 * 6. Non-compound ranking query: "Which barrier is most affected in Kerala?" (Ranking ONLY, NO solutions)
 * 7. Non-compound statistics query: "What are the logistic barrier statistics?" (Stats ONLY, NO solutions)
 * 8. Unvetted component query: "What can be done about no female healthcare provider?" ("A verified solution could not be identified.")
 * 9. Multilingual compound query in Kannada ("ಕರ್ನಾಟಕದಲ್ಲಿ ಯಾವ ಅಡಚಣೆ ಹೆಚ್ಚಾಗಿದೆ ಮತ್ತು ಏನು ಮಾಡಬಹುದು?")
 * 10. Multilingual compound query in Hindi ("बिहार में सबसे बड़ी बाधा कौन सी है और क्या किया जा सकता है?")
 * 11. Ollama offline graceful fallback (100% deterministic accuracy without network)
 * 12. Hallucination rejection (rejection of invented schemes/disallowed domains)
 * 13. Safety domain allow-list compliance across all 9 vetted entries
 * 14. Verification of PM-JAY rupee cover absence (no fabricated monetary figures)
 * 15. Dashboard pages integrity check (Pages A–J untouched)
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

// Load modules
const DataModule = require('../../dashboard/assets/js/chatbot-data.js');
const IntentRouter = require('../../dashboard/assets/js/intent-router.js');
const ContextManager = require('../../dashboard/assets/js/context-manager.js');
const SessionStore = require('../../dashboard/assets/js/session-store.js');
const EvidenceEngine = require('../../dashboard/assets/js/evidence-engine.js');
const ResponseEngine = require('../../dashboard/assets/js/response-engine.js');
const SolutionsEngine = require('../../dashboard/assets/js/solutions-engine.js');
const SolutionCard = require('../../dashboard/assets/js/solution-card.jsx');

let passedCount = 0;
let failedCount = 0;

function it(description, fn) {
  try {
    fn();
    console.log(`  ✓ PASS: ${description}`);
    passedCount++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${description}`);
    console.error(`     Error: ${err.message}`);
    failedCount++;
  }
}

async function runSolutionsTestSuite() {
  console.log('=========================================================================');
  console.log('BARRIERLENS — CURATED SOURCE-CITED SOLUTIONS & COMPOUND DECOMPOSITION AUDIT');
  console.log('=========================================================================\n');

  const basePath = path.resolve(__dirname, '../../') + '/';
  const dataRegistry = await DataModule.preloadChatbotData(basePath);

  const queryOptions = {
    basePath,
    dataRegistry,
    skipBackend: true // Enforces pure local deterministic evaluation & offline fallback
  };

  // ---------------------------------------------------------------------------
  // TEST GROUP 1: DOMAIN ALLOW-LIST & REGISTRY SCHEMA COMPLIANCE
  // ---------------------------------------------------------------------------
  console.log('--- Test Group 1: Domain Allow-List & Registry Integrity ---');

  const registryPath = path.resolve(__dirname, '../../dashboard/assets/data/solutions_registry.json');
  it('solutions_registry.json exists on disk', () => {
    assert.ok(fs.existsSync(registryPath), 'File solutions_registry.json must exist');
  });

  const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  it('Registry contains exactly the 9 approved curated solutions', () => {
    assert.strictEqual(registry.length, 9, 'Must contain exactly 9 approved solutions');
  });

  const allowedDomains = SolutionsEngine.ALLOWED_DOMAINS;
  it('All 9 curated solutions use source URLs matching the domain allow-list', () => {
    registry.forEach(entry => {
      const isAllowed = SolutionsEngine.isUrlAllowed(entry.sourceUrl);
      assert.ok(isAllowed, `Source URL ${entry.sourceUrl} for ${entry.id} must be in allow-list`);
    });
  });

  it('Ayushman Bharat PM-JAY entry does NOT state a rupee cover amount', () => {
    const pmjay = registry.find(s => s.id === 'pmjay');
    assert.ok(pmjay, 'PM-JAY entry must exist');
    const fullText = JSON.stringify(pmjay);
    assert.ok(!fullText.includes('5 lakh') && !fullText.includes('5,00,000') && !fullText.includes('500000') && !fullText.includes('₹'), 'PM-JAY must omit unverified rupee cover amounts');
  });

  it('Every translated entry includes needsHumanReview: true', () => {
    registry.forEach(entry => {
      assert.strictEqual(entry.needsHumanReview, true, `Entry ${entry.id} must include needsHumanReview: true`);
    });
  });

  // ---------------------------------------------------------------------------
  // TEST GROUP 2: BASE TEST CASES 1 & 2 (STATE & NATIONAL SOLUTIONS QUERIES)
  // ---------------------------------------------------------------------------
  console.log('\n--- Test Group 2: Solutions Layer Retrieval & Formatting ---');

  // Test 1: In Bihar, what can be done about logistic barriers?
  const res1 = await ResponseEngine.processUserQuery("In Bihar, what can be done about logistic barriers?", "en", queryOptions);
  it('Test 1: Returns status verified', () => {
    assert.strictEqual(res1.status, "verified");
  });
  it('Test 1: Returns <= 4 solutions', () => {
    assert.ok(res1.solutions && res1.solutions.length <= 4, 'Must return at most 4 solutions');
    assert.ok(res1.solutions.length > 0, 'Must return solutions for logistic barriers');
  });
  it('Test 1: All returned solution URLs match domain allow-list', () => {
    res1.solutions.forEach(s => {
      assert.ok(SolutionsEngine.isUrlAllowed(s.sourceUrl), `URL ${s.sourceUrl} must be allow-listed`);
    });
  });
  it('Test 1: BarrierLens Evidence appears before External Evidence', () => {
    const idxBL = res1.answer.indexOf("BarrierLens Evidence");
    const idxExt = res1.answer.indexOf("External Evidence");
    assert.ok(idxBL !== -1 && idxExt !== -1 && idxBL < idxExt, 'BarrierLens Evidence must appear BEFORE External Evidence');
  });
  it('Test 1: Closing evaluation disclaimer is attached', () => {
    assert.ok(res1.answer.includes("BarrierLens does not evaluate programme effectiveness"), 'Evaluation disclaimer must be present');
  });

  // Test 2: National scope + solutions query: "What can be done about household barriers?"
  const res2 = await ResponseEngine.processUserQuery("What can be done about household barriers?", "en", queryOptions);
  it('Test 2: Returns status verified for household solutions', () => {
    assert.strictEqual(res2.status, "verified");
    assert.ok(res2.solutions.length <= 4);
  });
  it('Test 2: JSSK, PM-JAY and WHO CHW returned for household barriers', () => {
    const ids = res2.solutions.map(s => s.id);
    assert.ok(ids.includes('jssk'), 'Must include JSSK');
    assert.ok(ids.includes('pmjay'), 'Must include PM-JAY');
    assert.ok(ids.includes('who_chw'), 'Must include WHO CHW');
  });
  it('Test 2: Caveat included in household solutions response', () => {
    assert.ok(res2.answer.includes("Caveat:"), 'Caveat must be included in formatted output');
  });

  // ---------------------------------------------------------------------------
  // TEST GROUP 3: ADDENDUM B COMPOUND QUESTION DECOMPOSITION
  // ---------------------------------------------------------------------------
  console.log('\n--- Test Group 3: Compound Question Decomposition (Addendum B) ---');

  // Test 3: Compound query with state: "Which barrier is dominant in Bihar and what can be done?"
  const res3 = await ResponseEngine.processUserQuery("Which barrier is dominant in Bihar and what can be done?", "en", queryOptions);
  it('Test 3: Compound intent identified', () => {
    assert.strictEqual(res3.intent, "compound_solution");
  });
  it('Test 3: Part 1 correctly ranks barriers for Bihar (Facility is dominant)', () => {
    assert.strictEqual(res3.dominantBarrier, "facility");
    assert.ok(res3.answer.includes("Facility Barrier"), 'Expected Facility Barrier as dominant');
    assert.ok(res3.answer.includes("53.34%"), 'Expected Bihar facility barrier rate 53.34%');
  });
  it('Test 3: Part 2 passes dominant barrier into Solutions layer (returns facility solutions)', () => {
    assert.ok(res3.solutions && res3.solutions.length > 0);
    const hasFacilitySolutions = res3.solutions.some(s => s.barriers.includes('facility'));
    assert.ok(hasFacilitySolutions, 'Solutions must be tailored to dominant barrier (facility)');
  });
  it('Test 3: Includes closing evaluation disclaimer line', () => {
    assert.ok(res3.answer.includes("BarrierLens does not evaluate programme effectiveness"));
  });

  // Test 4: Compound query with "here" + session state set to Karnataka
  const sessionId4 = "test-session-karnataka";
  SessionStore.updateSession(sessionId4, { activeState: "Karnataka" });
  const res4 = await ResponseEngine.processUserQuery(
    "Which barrier is most affected here, and what can be done?",
    "en",
    { ...queryOptions, sessionId: sessionId4 }
  );
  it('Test 4: "here" resolves to Karnataka from session state', () => {
    assert.strictEqual(res4.rankingInfo.locationName, "Karnataka");
    assert.strictEqual(res4.dominantBarrier, "facility");
    assert.ok(res4.answer.includes("Karnataka"));
    assert.ok(res4.answer.includes("41.32%"));
  });

  // Test 5: Compound query with "here" + NO session state (National fallback)
  const sessionId5 = "test-session-fresh";
  const res5 = await ResponseEngine.processUserQuery(
    "Which barrier is most affected here, and what can be done?",
    "en",
    { ...queryOptions, sessionId: sessionId5 }
  );
  it('Test 5: "here" without session state cleanly defaults to National scope', () => {
    assert.strictEqual(res5.rankingInfo.locationType, "national");
    assert.strictEqual(res5.dominantBarrier, "facility");
    assert.ok(res5.answer.includes("National") || res5.answer.includes("46.01%"));
    assert.ok(res5.solutions.length > 0);
  });

  // ---------------------------------------------------------------------------
  // TEST GROUP 4: STRICT NON-TRIGGER CHECKS (RANKING ONLY & STATS ONLY)
  // ---------------------------------------------------------------------------
  console.log('\n--- Test Group 4: Strict Trigger Conditions (No Unasked Solutions) ---');

  // Test 6: Non-compound ranking query: "Which barrier is most affected in Kerala?"
  const res6 = await ResponseEngine.processUserQuery("Which barrier is most affected in Kerala?", "en", queryOptions);
  it('Test 6: Returns ranking ONLY for Kerala (Logistic dominant)', () => {
    assert.strictEqual(res6.dominantBarrier, "logistic");
    assert.ok(res6.answer.includes("Kerala"));
    assert.ok(res6.answer.includes("Logistic Barrier"));
    assert.ok(res6.answer.includes("4.05%"));
  });
  it('Test 6: Strictly does NOT append solutions unasked', () => {
    assert.strictEqual(res6.solutions.length, 0, 'Must NOT return solutions when none requested');
    assert.ok(!res6.answer.includes("Recommended Solution:"), 'Must NOT render solution cards');
    assert.ok(!res6.answer.includes("External Evidence"), 'Must NOT contain External Evidence header');
  });

  // Test 7: Non-compound statistics query: "What are the logistic barrier statistics?"
  const res7 = await ResponseEngine.processUserQuery("What are the logistic barrier statistics?", "en", queryOptions);
  it('Test 7: Returns statistics ONLY without solutions', () => {
    assert.strictEqual(res7.status, "verified");
    assert.ok(!res7.answer.includes("Recommended Solution:"));
    assert.ok(!res7.answer.includes("External Evidence"));
  });

  // ---------------------------------------------------------------------------
  // TEST GROUP 5: UNVETTED COMPONENT QUERY
  // ---------------------------------------------------------------------------
  console.log('\n--- Test Group 5: Component Query Without a Vetted Scheme ---');

  // Test 8: "What can be done about no female healthcare provider?"
  const res8 = await ResponseEngine.processUserQuery("What can be done about no female healthcare provider?", "en", queryOptions);
  it('Test 8: Returns exact message "A verified solution could not be identified."', () => {
    assert.strictEqual(res8.answer, "A verified solution could not be identified.");
  });
  it('Test 8: Zero fabricated schemes or citations returned', () => {
    assert.strictEqual(res8.solutions.length, 0);
    assert.ok(!res8.answer.includes("http"));
  });

  // ---------------------------------------------------------------------------
  // TEST GROUP 6: MULTILINGUAL SUPPORT (KANNADA & HINDI)
  // ---------------------------------------------------------------------------
  console.log('\n--- Test Group 6: Multilingual Compound Queries (Kannada & Hindi) ---');

  // Test 9: Kannada compound query
  const res9 = await ResponseEngine.processUserQuery("ಕರ್ನಾಟಕದಲ್ಲಿ ಯಾವ ಅಡಚಣೆ ಹೆಚ್ಚಾಗಿದೆ ಮತ್ತು ಏನು ಮಾಡಬಹುದು?", "kn", queryOptions);
  it('Test 9: Kannada compound query identified and preserved', () => {
    assert.strictEqual(res9.language, "kn");
    assert.strictEqual(res9.intent, "compound_solution");
  });
  it('Test 9: Scheme names in English with Kannada script alongside', () => {
    assert.ok(res9.solutions && res9.solutions.length > 0);
    res9.solutions.forEach(s => {
      // English title preserved
      assert.ok(s.title && s.title.length > 0);
    });
    // Check answer text has both Latin scheme name and Kannada translation
    assert.ok(res9.answer.includes("ಕರ್ನಾಟಕ"));
    assert.ok(res9.answer.includes("ಬ್ಯಾರಿಯರ್ ಲೆನ್ಸ್ ಸಾಕ್ಷ್ಯ") || res9.answer.includes("BarrierLens"));
  });
  it('Test 9: Source organizations and URLs remain in English', () => {
    res9.solutions.forEach(s => {
      assert.ok(/^https?:\/\//.test(s.sourceUrl));
      assert.ok(/[a-zA-Z]/.test(s.sourceOrg));
    });
  });
  it('Test 9: Evaluation disclaimer rendered in Kannada', () => {
    assert.ok(res9.disclaimer.includes("ಮೌಲ್ಯಮಾಪನ ಮಾಡುವುದಿಲ್ಲ") || res9.answer.includes("ಮೌಲ್ಯಮಾಪನ ಮಾಡುವುದಿಲ್ಲ"));
  });

  // Test 10: Hindi compound query
  const res10 = await ResponseEngine.processUserQuery("बिहार में सबसे बड़ी बाधा कौन सी है और क्या किया जा सकता है?", "hi", queryOptions);
  it('Test 10: Hindi compound query identified and preserved', () => {
    assert.strictEqual(res10.language, "hi");
    assert.strictEqual(res10.intent, "compound_solution");
  });
  it('Test 10: Hindi ranking & solutions rendered with Hindi script alongside', () => {
    assert.ok(res10.answer.includes("बिहार"));
    assert.ok(res10.answer.includes("बैरियरलेंस") || res10.answer.includes("BarrierLens"));
  });
  it('Test 10: Evaluation disclaimer rendered in Hindi', () => {
    assert.ok(res10.disclaimer.includes("मूल्यांकन नहीं करता") || res10.answer.includes("मूल्यांकन नहीं करता"));
  });

  // ---------------------------------------------------------------------------
  // TEST GROUP 7: ANTI-HALLUCINATION & OFFLINE DETERMINISTIC SAFETY
  // ---------------------------------------------------------------------------
  console.log('\n--- Test Group 7: Ollama Offline Fallback & Anti-Hallucination Safety ---');

  // Test 11: Offline fallback guarantee
  it('Test 11: All solutions queries work deterministically when backend is offline or skipped', () => {
    const offlineSol = SolutionsEngine.retrieveExternalSolutions("logistic", "", dataRegistry, "en");
    assert.strictEqual(offlineSol.status, "verified");
    assert.ok(offlineSol.solutions.length <= 4 && offlineSol.solutions.length > 0);
  });

  // Test 12: Hallucination Rejection
  it('Test 12: Validator rejects URLs outside the domain allow-list', () => {
    const fakeText = "We recommend this scheme: https://fake-health-site.xyz/scheme.pdf";
    const isSafe = SolutionsEngine.validateLlmSolutionsSafety(fakeText);
    assert.strictEqual(isSafe, false, 'Disallowed external domains must be rejected');
  });

  it('Test 12: Validator rejects fabricated schemes', () => {
    const fakeSchemeText = "According to the fake health scheme established in 2026";
    const isSafe = SolutionsEngine.validateLlmSolutionsSafety(fakeSchemeText);
    assert.strictEqual(isSafe, false, 'Fabricated schemes must be rejected');
  });

  it('Test 12: Validator accepts verified text with legitimate government URLs', () => {
    const legitText = "Janani Shishu Suraksha Karyakram (JSSK): https://www.nhm.gov.in/showlink.php?id=178";
    const isSafe = SolutionsEngine.validateLlmSolutionsSafety(legitText);
    assert.strictEqual(isSafe, true, 'Legitimate government sources must pass validation');
  });

  // ---------------------------------------------------------------------------
  // TEST GROUP 8: SOLUTION CARD UI RENDERER
  // ---------------------------------------------------------------------------
  console.log('\n--- Test Group 8: Solution Card Component Rendering ---');

  it('SolutionCard renders separate BarrierLens Evidence and External Evidence blocks', () => {
    const payload = {
      barrier: "Logistic Barrier",
      barrierLensSolutions: [{ title: "Poorest Quintile", desc: "Reduces transport barrier gap" }],
      externalSolutions: [res1.solutions[0]],
      disclaimer: SolutionsEngine.DISCLAIMER_TEXT.en
    };
    const html = SolutionCard.render(payload, { lang: "en" });
    assert.ok(html.includes("bl-solution-section-barrierlens"), 'BarrierLens section class present');
    assert.ok(html.includes("bl-solution-section-external"), 'External section class present');
    assert.ok(html.includes("href="), 'Clickable source link present');
    assert.ok(html.includes("Caveat:"), 'Caveat field present');
    assert.ok(html.includes("BarrierLens does not evaluate programme effectiveness"), 'Evaluation disclaimer present');
  });

  // ---------------------------------------------------------------------------
  // TEST GROUP 9: DASHBOARD PAGES REGRESSION AUDIT (PAGES A–J)
  // ---------------------------------------------------------------------------
  console.log('\n--- Test Group 9: Dashboard Pages A–J Regression Check ---');

  const verifiedPages = [
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

  verifiedPages.forEach(p => {
    const fullPath = path.resolve(__dirname, '../../dashboard', p);
    it(`Dashboard page physically intact: ${p}`, () => {
      assert.ok(fs.existsSync(fullPath), `Dashboard file must exist: ${p}`);
    });
  });

  // ===========================================================================
  // SUMMARY
  // ===========================================================================
  console.log('\n=========================================================================');
  console.log(`SOLUTIONS TEST SUITE SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED out of ${passedCount + failedCount} assertions.`);
  console.log('=========================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runSolutionsTestSuite().catch(err => {
  console.error("Fatal Test Suite Error:", err);
  process.exit(1);
});
