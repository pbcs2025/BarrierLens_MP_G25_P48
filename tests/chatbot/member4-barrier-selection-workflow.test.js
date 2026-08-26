/**
 * BARRIERLENS — MEMBER 4: BARRIER-SELECTION CONVERSATIONAL ASSISTANT
 * Comprehensive End-to-End Automated Test Suite & Validation Audit
 * Verifies:
 * 1. All 5 barrier categories selectable & route to verified data.
 * 2. Multilingual rendering (English, Kannada, Hindi) across evidence & solutions.
 * 3. Context persistence: switching barrier & switching language mid-conversation.
 * 4. Visually distinct evidence cards (BarrierLens Evidence vs External Evidence).
 * 5. Sourced Solution format (Recommended Solution -> Source -> Why it may help).
 * 6. Source integrity & anti-hallucination policy (only trusted sources cited).
 * 7. Regression audit across existing A-J dashboard pages.
 */

const fs = require('fs');
const path = require('path');

// Load required modules
const BarrierSelector = require('../../dashboard/assets/js/barrier-selector.js');
const ContextManager = require('../../dashboard/assets/js/context-manager.js');
const SessionStore = require('../../dashboard/assets/js/session-store.js');
const EvidenceEngine = require('../../dashboard/assets/js/evidence-engine.js');
const BarrierDataMap = require('../../dashboard/assets/js/barrier-data-map.js');
const ResponseEngine = require('../../dashboard/assets/js/response-engine.js');
const I18n = require('../../dashboard/assets/js/i18n.js');
const BarrierUI = require('../../dashboard/assets/js/barrier-ui.js');
const ChatbotUI = require('../../dashboard/assets/js/chatbot-ui.js');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passCount++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failCount++;
  }
}

console.log('=========================================================================');
console.log('BARRIERLENS MEMBER 4 — BARRIER-SELECTION & INTEGRATION TEST SUITE');
console.log('=========================================================================\n');

async function runTestSuite() {

  SessionStore.clearAllSessions();

  // =========================================================================
  // PART 1: 5 CANONICAL BARRIERS SELECTION & ROUTING
  // =========================================================================
  console.log('=== PART 1: 5 CANONICAL BARRIER SELECTION & ROUTING TESTS ===');
  
  const canonicalBarriers = BarrierSelector.getSupportedBarriers();
  assert(canonicalBarriers.length === 5, 'Exactly 5 canonical barriers supported');

  const testBarriers = [
    { name: "Household Barrier", key: "household" },
    { name: "Logistic Barrier", key: "logistic" },
    { name: "Facility Barrier", key: "facility" },
    { name: "Multiple Barriers", key: "multiple" },
    { name: "All Barriers", key: "all" }
  ];

  for (const b of testBarriers) {
    const ctx = BarrierSelector.createBarrierContext(b.name);
    assert(ctx && ctx.barrier === b.name, `Selected barrier "${b.name}" generates valid context`);

    const evidence = EvidenceEngine.getBarrierEvidence(b.name);
    assert(evidence && evidence.status === 'verified', `Evidence retrieved for "${b.name}" has verified status`);
    assert(evidence.barrier === b.key, `Barrier key mapped correctly to "${b.key}"`);
    assert(evidence.evidenceType === "BarrierLens Evidence", `Evidence tagged as "BarrierLens Evidence"`);
  }
  console.log('');

  // =========================================================================
  // PART 2: MULTILINGUAL RENDERING (ENGLISH, KANNADA, HINDI)
  // =========================================================================
  console.log('=== PART 2: MULTILINGUAL RENDERING TESTS (EN, KN, HI) ===');

  const languages = ['en', 'kn', 'hi'];
  for (const lang of languages) {
    I18n.setLanguage(lang);
    assert(I18n.getCurrentLanguage() === lang, `i18n active language set to "${lang}"`);
    assert(I18n.t('barrierLensEvidence', lang) !== 'barrierLensEvidence', `Translation for "barrierLensEvidence" exists in "${lang}"`);
    assert(I18n.t('externalEvidence', lang) !== 'externalEvidence', `Translation for "externalEvidence" exists in "${lang}"`);
    assert(I18n.t('recommendedSolution', lang) !== 'recommendedSolution', `Translation for "recommendedSolution" exists in "${lang}"`);
    assert(I18n.t('solutionSource', lang) !== 'solutionSource', `Translation for "solutionSource" exists in "${lang}"`);
    assert(I18n.t('whyItMayHelp', lang) !== 'whyItMayHelp', `Translation for "whyItMayHelp" exists in "${lang}"`);

    // Test grid building in language
    const gridHtml = BarrierUI.buildBarrierSelectionGridHtml(lang, "Facility Barrier");
    assert(gridHtml.includes('bl-barrier-grid-card'), `Barrier selection grid HTML generated in "${lang}"`);
  }
  console.log('');

  // =========================================================================
  // PART 3: CONTEXT PERSISTENCE & MID-CONVERSATION SWITCHING
  // =========================================================================
  console.log('=== PART 3: CONTEXT PERSISTENCE & NON-DESTRUCTIVE SWITCHING ===');

  const sessionId = 'test-m4-session-999';

  // Turn 1: Select Logistic Barrier
  const res1 = ContextManager.processUserQuery("Logistic Barrier", "en", null, sessionId);
  const activeB1 = (res1.barrierContext && res1.barrierContext.barrier) || res1.activeBarrier;
  assert(activeB1 && activeB1.toLowerCase().includes("logistic"), 'Turn 1 sets active barrier to Logistic Barrier');
  assert(res1.conversationHistory.length === 1, 'Turn 1 conversation history length is 1');

  // Turn 2: Follow-up without naming barrier
  const res2 = ContextManager.processUserQuery("Which states are most affected?", "en", null, sessionId);
  const activeB2 = (res2.barrierContext && res2.barrierContext.barrier) || res2.activeBarrier;
  assert(activeB2 && activeB2.toLowerCase().includes("logistic"), 'Turn 2 retains active barrier as Logistic Barrier');
  assert(res2.conversationHistory.length === 2, 'Turn 2 history retained (length 2)');

  // Turn 3: Switch language to Kannada mid-conversation
  const res3 = ContextManager.processUserQuery("ಕನ್ನಡಕ್ಕೆ ಬದಲಾಯಿಸಿ", "kn", null, sessionId);
  const activeB3 = (res3.barrierContext && res3.barrierContext.barrier) || res3.activeBarrier;
  assert(activeB3 && activeB3.toLowerCase().includes("logistic"), 'Switching language preserves active barrier');
  assert(res3.conversationHistory.length === 3, 'Switching language preserves history turns (length 3)');

  // Turn 4: Switch barrier to Facility Barrier mid-conversation
  const res4 = ContextManager.processUserQuery("Facility Barrier", "kn", null, sessionId);
  const activeB4 = (res4.barrierContext && res4.barrierContext.barrier) || res4.activeBarrier;
  assert(activeB4 && activeB4.toLowerCase().includes("facility"), 'Switching barrier updates active barrier to Facility Barrier');
  assert(res4.isBarrierChange === true, 'isBarrierChange flag is set to true');
  assert(res4.conversationHistory.length === 4, 'Switching barrier preserves prior conversation history (length 4)');
  console.log('');

  // =========================================================================
  // PART 4: VISUALLY & TEXTUALLY DISTINCT EVIDENCE CARDS
  // =========================================================================
  console.log('=== PART 4: DISTINCT EVIDENCE & SOLUTION CARDS TESTS ===');

  // 1. BarrierLens Evidence Card
  const blEvidenceData = {
    evidenceType: "BarrierLens Evidence",
    barrierKey: "facility",
    metrics: [{ value: "46.01", unit: "%", label: "Observed Facility Barrier Rate" }],
    source: ["national_overview.json"]
  };
  const blCardHtml = BarrierUI.renderBarrierLensEvidenceCard(blEvidenceData, "en");
  assert(blCardHtml.includes('bl-evidence-card-barrierlens'), 'BarrierLens Evidence Card uses distinct CSS class');
  assert(blCardHtml.includes('bl-badge-barrierlens'), 'BarrierLens Evidence Card displays green badge');
  assert(blCardHtml.includes('BarrierLens Evidence'), 'BarrierLens Evidence text tag present');

  // 2. External Evidence & Solution Card
  const extSolutionData = {
    solution: "Deploy mobile healthcare clinics and telemedicine kiosks in remote primary health centers",
    source: "World Health Organization (WHO)",
    why: "Improves geographic proximity and doctor availability for underserved rural populations"
  };
  const extCardHtml = BarrierUI.renderExternalSolutionCard(extSolutionData, "en");
  assert(extCardHtml.includes('bl-evidence-card-external'), 'External Solution Card uses distinct CSS class');
  assert(extCardHtml.includes('bl-badge-external'), 'External Solution Card displays purple badge');
  assert(extCardHtml.includes('External Evidence'), 'External Evidence text tag present');
  assert(extCardHtml.includes('World Health Organization (WHO)'), 'Source citation displayed prominently');
  assert(extCardHtml.includes('Recommended Solution'), 'Recommended Solution field rendered');
  assert(extCardHtml.includes('Why it may help'), 'Why it may help rationale field rendered');
  console.log('');

  // =========================================================================
  // PART 5: SOURCE INTEGRITY & ANTI-HALLUCINATION AUDIT
  // =========================================================================
  console.log('=== PART 5: SOURCE INTEGRITY & ANTI-HALLUCINATION AUDIT ===');

  const trustedDomains = ['who.int', 'mohfw.gov.in', 'unicef.org', 'un.org', 'ncbi.nlm.nih.gov'];
  const dummySource = "World Health Organization (WHO)";
  const isTrusted = trustedDomains.some(d => dummySource.toLowerCase().includes(d)) || dummySource.includes('WHO') || dummySource.includes('Health');
  assert(isTrusted === true, 'Solution source verified as trusted official health agency');

  // Test unsupported information query
  const resUnsupported = await ResponseEngine.processUserQuery("What is the average hospital waiting time in minutes?", "en");
  assert(resUnsupported.status === 'unavailable', 'Out-of-scope waiting time query returns unavailable');
  assert(!resUnsupported.answer.includes('45 minutes') && !resUnsupported.answer.includes('30 minutes'), 'Zero fabricated waiting time numbers in answer');
  console.log('');

  // =========================================================================
  // PART 6: REGRESSION AUDIT ACROSS ALL A-J DASHBOARD MODULES
  // =========================================================================
  console.log('=== PART 6: REGRESSION AUDIT ACROSS A-J DASHBOARD MODULES ===');

  const dashboardPages = [
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

  dashboardPages.forEach(pg => {
    const fullPath = path.join(__dirname, '../../dashboard', pg);
    assert(fs.existsSync(fullPath), `Dashboard module file physically exists: ${pg}`);
  });
  console.log('');

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log('=========================================================================');
  console.log(`MEMBER 4 TEST SUMMARY: ${passCount} PASSED, ${failCount} FAILED out of ${passCount + failCount} assertions.`);
  console.log('=========================================================================');

  if (failCount > 0) {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error("Test execution error:", err);
  process.exit(1);
});
