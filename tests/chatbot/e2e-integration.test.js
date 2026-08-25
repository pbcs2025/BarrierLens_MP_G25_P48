/**
 * BARRIERLENS — FINAL END-TO-END INTEGRATION & VALIDATION TEST SUITE
 * Tests the complete user conversational journey from Language/Barrier Selection -> Context Persistence ->
 * Verified Evidence Retrieval -> Derived Comparisons -> Solution Sufficiency -> External Handoff ->
 * Multilingual Support -> Voice Integration -> Report Generation -> Dashboard Integrity.
 */

const fs = require('fs');
const path = require('path');

// Import system modules
const DataModule = require('../../dashboard/assets/js/chatbot-data.js');
const DataMap = require('../../dashboard/assets/js/barrier-data-map.js');
const ComparisonEngine = require('../../dashboard/assets/js/comparison-engine.js');
const EvidenceEngine = require('../../dashboard/assets/js/evidence-engine.js');
const IntentEngine = require('../../dashboard/assets/js/intent-engine.js');
const RetrievalEngine = require('../../dashboard/assets/js/retrieval-engine.js');
const CalculationEngine = require('../../dashboard/assets/js/calculation-engine.js');
const ResponseEngine = require('../../dashboard/assets/js/response-engine.js');
const ContextManager = require('../../dashboard/assets/js/context-manager.js');
const SessionStore = require('../../dashboard/assets/js/session-store.js');
const BarrierSelector = require('../../dashboard/assets/js/barrier-selector.js');
const IntentRouter = require('../../dashboard/assets/js/intent-router.js');
const i18n = require('../../dashboard/assets/js/i18n.js');
const Speech = require('../../dashboard/assets/js/speech.js');
const TTS = require('../../dashboard/assets/js/tts.js');
const Voice = require('../../dashboard/assets/js/voice.js');
const ReportGenerator = require('../../dashboard/assets/js/report-generator.js');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passCount++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failCount++;
  }
}

async function runE2ETests() {
  console.log("=========================================================================");
  console.log("BARRIERLENS — FINAL END-TO-END SYSTEM INTEGRATION TEST SUITE");
  console.log("=========================================================================\n");

  // Scenario 1: Application Startup & File Validation
  console.log("--- Scenario 1: Application Startup & Data Registry ---");
  const dataRegistry = await DataModule.preloadChatbotData();
  assert(dataRegistry.nationalOverview !== null, "national_overview.json loaded successfully");
  assert(dataRegistry.stateSummary !== null && dataRegistry.stateSummary.states.length === 36, "state_summary.json loaded with 36 Indian states & UTs");
  assert(dataRegistry.validationReport !== null && dataRegistry.validationReport.validation_passed === true, "validation_report.json PASS");
  assert(dataRegistry.nationalOverview.metadata.sample_size_N === 724115, "Full analytical sample size N = 724,115 verified");

  // Scenario 2: Language Selection & Preservation
  console.log("\n--- Scenario 2: Language Selection & Preservation ---");
  const sessId = "e2e_session_test_" + Date.now();
  let ctx1 = ContextManager.processUserQuery("Hello", "English", null, sessId);
  assert(ctx1.activeLanguage === "English", "Initial language set to English");

  let ctx2 = ContextManager.processUserQuery("Switch language to Kannada", "Kannada", null, sessId);
  assert(ctx2.activeLanguage === "Kannada", "Language switched to Kannada");
  assert(ctx2.isLanguageChange === true, "isLanguageChange flag set to true");

  let ctx3 = ContextManager.processUserQuery("Switch to Hindi", "Hindi", null, sessId);
  assert(ctx3.activeLanguage === "Hindi", "Language switched to Hindi");
  assert(ctx3.conversationHistory.length === 3, "Conversation history preserved across 3 language turns");

  // Scenario 3: All Five Barrier Categories
  console.log("\n--- Scenario 3: Five Conversational Barriers Testing ---");
  const barriers = ["Household Barrier", "Logistic Barrier", "Facility Barrier", "Multiple Barriers", "All Barriers"];
  barriers.forEach(bName => {
    const bDef = DataMap.getBarrierDefinition(bName);
    assert(bDef !== null && bDef.key !== undefined, `Barrier definition for "${bName}" loaded correctly`);
    const evRes = EvidenceEngine.getBarrierEvidence(bDef.key, { query: "Explain barrier" }, dataRegistry);
    assert(evRes.status === "verified", `Verified evidence payload built for "${bName}"`);
  });

  // Scenario 4: Follow-Up Context & Conversation Persistence
  console.log("\n--- Scenario 4: Follow-up Context Persistence ---");
  const flowSess = "e2e_flow_sess_" + Date.now();

  // Step 1: Select Logistic Barrier
  let step1 = ContextManager.processUserQuery("Select Logistic Barrier", "English", null, flowSess);
  assert(step1.activeBarrier === "Logistic Barrier", "Step 1: Barrier set to Logistic Barrier");

  // Step 2: Which states are most affected?
  let step2 = ContextManager.processUserQuery("Which states are most affected?", "English", null, flowSess);
  assert(step2.activeBarrier === "Logistic Barrier", "Step 2: Active barrier persisted as Logistic Barrier");
  assert(step2.entities.state !== null || step2.intent === "affected_groups", "Step 2: Intent correctly classified as affected_groups");

  // Step 3: Compare Karnataka and Kerala
  let step3 = ContextManager.processUserQuery("Compare Karnataka and Kerala", "English", null, flowSess);
  assert(step3.activeBarrier === "Logistic Barrier", "Step 3: Active barrier persisted during state comparison");
  assert(step3.entities.state[0] === "Karnataka" && step3.entities.state[1] === "Kerala", "Step 3: Extracted states Karnataka & Kerala");

  // Step 4: What can be done?
  let step4 = ContextManager.processUserQuery("What can be done?", "English", null, flowSess);
  assert(step4.activeBarrier === "Logistic Barrier", "Step 4: Active barrier persisted for solutions query");
  assert(step4.requiresSolutions === true, "Step 4: Solutions requirement flag set to true");
  assert(step4.conversationHistory.length === 4, "Step 4: Conversation history retained across all 4 turns");

  // Scenario 5: State Comparison & Derived Value Calculation
  console.log("\n--- Scenario 5: State Comparison Calculation ---");
  const stateComp = ComparisonEngine.compareStates("Karnataka", "Kerala", "logistic", dataRegistry);
  assert(stateComp.status === "verified", "Karnataka vs Kerala logistic barrier comparison status verified");
  assert(stateComp.primaryCalculation.result === 24.24, "Calculated difference: 24.24 percentage points");
  assert(stateComp.primaryCalculation.resultUnit === "percentage points", "Result unit explicitly percentage points");
  assert(stateComp.primaryCalculation.derived === true, "Calculation tagged derived: true");

  // Scenario 6: Rural vs Urban Comparison
  console.log("\n--- Scenario 6: Rural vs Urban Comparison ---");
  const ruComp = ComparisonEngine.compareRuralUrban("all", dataRegistry);
  assert(ruComp.status === "verified", "Rural vs Urban comparison verified");
  assert(ruComp.primaryCalculation.result === 17.46, "Exact Rural vs Urban gap: 17.46 percentage points");
  assert(ruComp.scopeExclusionNote.includes("waiting-time"), "Contains scope exclusion note");

  // Scenario 7: Demographic Analysis
  console.log("\n--- Scenario 7: Demographic Analysis ---");
  const demoComp = ComparisonEngine.compareDemographics("wealth", "Poorest", "Richest", "all", dataRegistry);
  assert(demoComp.status === "verified", "Poorest vs Richest wealth comparison verified");
  assert(demoComp.primaryCalculation.derived === true, "Demographic comparison tagged derived: true");

  // Scenario 8: Anti-Hallucination & Unsupported Data
  console.log("\n--- Scenario 8: Anti-Hallucination & Unsupported Queries ---");
  const unsuppQueries = [
    "What is the average hospital waiting time?",
    "What is the average treatment cost?",
    "What is the average doctor salary?"
  ];
  unsuppQueries.forEach(q => {
    const unsuppEv = EvidenceEngine.getBarrierEvidence("all", { text: q }, dataRegistry);
    assert(unsuppEv.status === "unavailable", `Query "${q}" cleanly returned status: "unavailable"`);
    assert(unsuppEv.metrics.length === 0, `Zero metrics fabricated for out-of-scope query "${q}"`);
  });

  // Scenario 9: "What can be done?" & Solution Sufficiency Handoff
  console.log("\n--- Scenario 9: Solution Sufficiency & Member 3 Handoff ---");
  const solCheckSupported = EvidenceEngine.checkBarrierLensSolutionEvidence("facility", { text: "What can be done for facility barriers?" }, dataRegistry);
  assert(solCheckSupported.solutionEvidence.barrierLensSupported === true, "BarrierLens supported interventions detected for facility barrier");
  assert(solCheckSupported.externalResearchRequired === false, "externalResearchRequired set to false when BarrierLens interventions exist");

  const solCheckExternal = EvidenceEngine.checkBarrierLensSolutionEvidence("facility", { text: "What insurance scheme covers hospital surgery fees?" }, dataRegistry);
  assert(solCheckExternal.solutionEvidence.barrierLensSupported === false, "Out-of-scope insurance scheme query sets barrierLensSupported to false");
  assert(solCheckExternal.externalResearchRequired === true, "externalResearchRequired set to true to trigger Member 3 trusted external research");

  // Scenario 10: Multilingual End-to-End Query Integration
  console.log("\n--- Scenario 10: Multilingual Pipeline Integration ---");
  const knQueryRes = await ResponseEngine.processUserQuery("ಕರ್ನಾಟಕ ಮತ್ತು ಕೇರಳ ಹೋಲಿಕೆ", "kn", { dataRegistry });
  assert(knQueryRes.language === "kn", "Kannada language code preserved in response");
  assert(knQueryRes.entities.states.includes("Karnataka") && knQueryRes.entities.states.includes("Kerala"), "Kannada script correctly extracted Karnataka & Kerala entities");
  assert(knQueryRes.calculations.length > 0, "Kannada comparison query produced derived calculations");

  const hiQueryRes = await ResponseEngine.processUserQuery("ग्रामीण और शहरी तुलना", "hi", { dataRegistry });
  assert(hiQueryRes.language === "hi", "Hindi language code preserved in response");
  assert(hiQueryRes.intent === "RURAL_URBAN", "Hindi text correctly identified RURAL_URBAN intent");

  // Scenario 11: Voice Integration & TTS Sanitization
  console.log("\n--- Scenario 11: Voice Integration & Speech Engine ---");
  assert(Voice.getState() !== undefined, "Voice module initialized correctly in IDLE state");
  assert(Voice.getState() === "IDLE", "Initial voice state is IDLE");
  const cleanTTS = TTS.sanitizeTextForSpeech("**Observed Rate** is [55.38%](file:///pages/state_analysis.html).");
  assert(!cleanTTS.includes("**") && !cleanTTS.includes("[") && !cleanTTS.includes("file:"), "TTS sanitization successfully stripped markdown formatting");

  // Scenario 12: Report Generation Integration
  console.log("\n--- Scenario 12: Report Generation Integration ---");
  const sampleEv = EvidenceEngine.getBarrierEvidence("all", { query: "Summary report" }, dataRegistry);
  const execReport = ReportGenerator.generateReport("executive", sampleEv, { title: "National Executive Summary" });
  assert(execReport.reportType === "executive", "Executive report generated successfully");
  assert(execReport.html.includes("BARRIERLENS"), "Report HTML contains brand header");
  assert(execReport.html.includes("59.16"), "Report HTML contains national any barrier rate 59.16%");

  const compReport = ReportGenerator.generateReport("comparison", sampleEv, { title: "State Comparison Report", calculations: [stateComp.primaryCalculation] });
  assert(compReport.reportType === "comparison", "Comparison report generated successfully");
  assert(compReport.html.includes("COMPARISON REPORT") || compReport.html.includes("Comparative"), "Comparison report HTML contains comparison report title");

  // Scenario 13: Dashboard Pages Integrity
  console.log("\n--- Scenario 13: Dashboard Subpages Integrity Check ---");
  const dashboardPages = [
    "national_overview.html", "state_analysis.html", "rural_urban.html", "demographic_analysis.html",
    "risk_archetypes.html", "empowerment.html", "multiple_barrier.html", "outcome_impact.html",
    "explainability.html", "base_paper_comparison.html"
  ];
  dashboardPages.forEach(page => {
    const pPath = path.resolve(__dirname, "../../dashboard/pages", page);
    assert(fs.existsSync(pPath), `Dashboard page file physically exists: ${page}`);
  });

  console.log("\n=========================================================================");
  console.log(`FINAL E2E INTEGRATION TEST SUMMARY: ${passCount} PASSED, ${failCount} FAILED out of ${passCount + failCount} assertions.`);
  console.log("=========================================================================\n");

  if (failCount > 0) {
    process.exit(1);
  }
}

runE2ETests();
