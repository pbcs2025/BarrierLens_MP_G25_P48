/**
 * BARRIERLENS — MEMBER 1: COMPREHENSIVE AUTOMATED VERIFICATION SUITE
 * Validates all 15 intents, entity extraction, data grounding, provenance tracking,
 * derived calculations, causality boundaries, out-of-scope anti-hallucination safety,
 * multilingual queries, error handling edge cases, and dashboard page recommendations.
 */

const fs = require('fs');
const path = require('path');

// Import Member 1 Modules
const BarrierLensData = require('../../dashboard/assets/js/chatbot-data.js');
const BarrierLensIntent = require('../../dashboard/assets/js/intent-engine.js');
const BarrierLensRetrieval = require('../../dashboard/assets/js/retrieval-engine.js');
const BarrierLensCalculation = require('../../dashboard/assets/js/calculation-engine.js');
const BarrierLensEvidence = require('../../dashboard/assets/js/evidence-engine.js');
const BarrierLensResponse = require('../../dashboard/assets/js/response-engine.js');

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

async function runComprehensiveTests() {
  console.log("=========================================================================");
  console.log("BARRIERLENS MEMBER 1 — HARDENED INTEGRATION-READINESS TEST SUITE");
  console.log("=========================================================================\n");

  // Preload data sources
  const dataRegistry = await BarrierLensData.preloadChatbotData();

  console.log("=== PART 1: ALL 15 INTENTS FULL COVERAGE TESTS ===");

  // Intent 1: NATIONAL_OVERVIEW
  console.log("\n--- Test 1.1: NATIONAL_OVERVIEW ---");
  const res1 = await BarrierLensResponse.processUserQuery("What is the most common barrier?", "en", { dataRegistry });
  assert(res1.status === "verified", "NATIONAL_OVERVIEW status is verified");
  assert(res1.intent === "NATIONAL_OVERVIEW", "Intent detected as NATIONAL_OVERVIEW");
  assert(res1.evidence.some(e => e.label.includes("Facility") && e.value === "46.01"), "Exact facility barrier rate 46.01% present");
  assert(res1.relatedPage && res1.relatedPage.url.includes("national_overview.html"), "Recommends national_overview.html");

  // Intent 2: STATE_ANALYSIS
  console.log("\n--- Test 1.2: STATE_ANALYSIS ---");
  const res2 = await BarrierLensResponse.processUserQuery("What is the situation in Karnataka?", "en", { dataRegistry });
  assert(res2.status === "verified", "STATE_ANALYSIS status is verified");
  assert(res2.intent === "STATE_ANALYSIS", "Intent detected as STATE_ANALYSIS");
  assert(res2.entities.states.includes("Karnataka"), "Extracted Karnataka entity");
  assert(res2.evidence.some(e => e.entity === "Karnataka" && e.value === "55.38"), "Exact Karnataka any barrier rate 55.38% present");
  assert(res2.relatedPage && res2.relatedPage.url.includes("state_analysis.html"), "Recommends state_analysis.html");

  // Intent 3: STATE_COMPARISON
  console.log("\n--- Test 1.3: STATE_COMPARISON ---");
  const res3 = await BarrierLensResponse.processUserQuery("Compare Karnataka and Kerala.", "en", { dataRegistry });
  assert(res3.status === "verified", "STATE_COMPARISON status is verified");
  assert(res3.intent === "STATE_COMPARISON", "Intent detected as STATE_COMPARISON");
  assert(res3.entities.states.length === 2, "Extracted 2 state entities");
  assert(res3.calculations.length > 0, "Percentage-point calculation generated");
  assert(res3.calculations[0].result === 47.8, "Exact difference calculation: 47.80 percentage points");
  assert(res3.calculations[0].derived === true, "Calculation tagged derived: true");

  // Intent 4: RURAL_URBAN
  console.log("\n--- Test 1.4: RURAL_URBAN ---");
  const res4 = await BarrierLensResponse.processUserQuery("Compare rural and urban women.", "en", { dataRegistry });
  assert(res4.status === "verified", "RURAL_URBAN status is verified");
  assert(res4.intent === "RURAL_URBAN", "Intent detected as RURAL_URBAN");
  assert(res4.evidence.some(e => e.entity === "Rural" && e.value === "63.49"), "Rural barrier rate 63.49%");
  assert(res4.evidence.some(e => e.entity === "Urban" && e.value === "46.03"), "Urban barrier rate 46.03%");

  // Intent 5: DEMOGRAPHIC_ANALYSIS
  console.log("\n--- Test 1.5: DEMOGRAPHIC_ANALYSIS ---");
  const res5 = await BarrierLensResponse.processUserQuery("How does education affect barriers?", "en", { dataRegistry });
  assert(res5.status === "verified", "DEMOGRAPHIC_ANALYSIS status is verified");
  assert(res5.intent === "DEMOGRAPHIC_ANALYSIS", "Intent detected as DEMOGRAPHIC_ANALYSIS");
  assert(res5.entities.dimensions.includes("education"), "Extracted education dimension");

  // Intent 6: MULTIPLE_BARRIER
  console.log("\n--- Test 1.6: MULTIPLE_BARRIER ---");
  const res6 = await BarrierLensResponse.processUserQuery("How common are multiple barriers?", "en", { dataRegistry });
  assert(res6.status === "verified", "MULTIPLE_BARRIER status is verified");
  assert(res6.intent === "MULTIPLE_BARRIER", "Intent detected as MULTIPLE_BARRIER");
  assert(res6.evidence.some(e => e.label.includes("Mean Barrier Count")), "National mean barrier count present");

  // Intent 7: RISK_ARCHETYPE
  console.log("\n--- Test 1.7: RISK_ARCHETYPE ---");
  const res7 = await BarrierLensResponse.processUserQuery("What are the risk archetypes?", "en", { dataRegistry });
  assert(res7.status === "verified", "RISK_ARCHETYPE status is verified");
  assert(res7.intent === "RISK_ARCHETYPE", "Intent detected as RISK_ARCHETYPE");
  assert(res7.evidence.some(e => e.entity.includes("High Vulnerability")), "Cluster 0 archetype retrieved");

  // Intent 8: EMPOWERMENT
  console.log("\n--- Test 1.8: EMPOWERMENT ---");
  const res8 = await BarrierLensResponse.processUserQuery("How does empowerment relate to healthcare access?", "en", { dataRegistry });
  assert(res8.status === "verified", "EMPOWERMENT status is verified");
  assert(res8.intent === "EMPOWERMENT", "Intent detected as EMPOWERMENT");
  assert(res8.evidence.length > 0, "Empowerment evidence present");

  // Intent 9: OUTCOME_IMPACT
  console.log("\n--- Test 1.9: OUTCOME_IMPACT ---");
  const res9 = await BarrierLensResponse.processUserQuery("What is the impact on unmet family planning?", "en", { dataRegistry });
  assert(res9.status === "verified", "OUTCOME_IMPACT status is verified");
  assert(res9.intent === "OUTCOME_IMPACT", "Intent detected as OUTCOME_IMPACT");
  assert(res9.evidence.some(e => e.label.includes("Unmet Family Planning")), "Unmet FP rate present");

  // Intent 10: REGRESSION
  console.log("\n--- Test 1.10: REGRESSION ---");
  const res10 = await BarrierLensResponse.processUserQuery("What predicts unmet need?", "en", { dataRegistry });
  assert(res10.status === "verified", "REGRESSION status is verified");
  assert(res10.intent === "REGRESSION", "Intent detected as REGRESSION");
  assert(res10.evidence.some(e => e.label.includes("Odds Ratio")), "Odds ratio evidence present");

  // Intent 11: SHAP
  console.log("\n--- Test 1.11: SHAP ---");
  const res11 = await BarrierLensResponse.processUserQuery("What is SHAP?", "en", { dataRegistry });
  assert(res11.status === "verified", "SHAP status is verified");
  assert(res11.intent === "SHAP", "Intent detected as SHAP");
  assert(res11.answer.includes("SHapley Additive exPlanations"), "SHAP concept explanation provided");

  // Intent 12: BASE_PAPER
  console.log("\n--- Test 1.12: BASE_PAPER ---");
  const res12 = await BarrierLensResponse.processUserQuery("What does the base paper say?", "en", { dataRegistry });
  assert(res12.status === "verified", "BASE_PAPER status is verified");
  assert(res12.intent === "BASE_PAPER", "Intent detected as BASE_PAPER");
  assert(res12.evidence.some(e => e.label.includes("Base Paper")), "Base paper reference rate 84.00% present");

  // Intent 13: METHODOLOGY
  console.log("\n--- Test 1.13: METHODOLOGY ---");
  const res13 = await BarrierLensResponse.processUserQuery("What dataset is used?", "en", { dataRegistry });
  assert(res13.status === "verified", "METHODOLOGY status is verified");
  assert(res13.intent === "METHODOLOGY", "Intent detected as METHODOLOGY");
  assert(res13.evidence.some(e => e.value === 724115), "Sample size 724,115 present");

  // Intent 14: LIMITATIONS
  console.log("\n--- Test 1.14: LIMITATIONS & CAUSALITY ---");
  const res14 = await BarrierLensResponse.processUserQuery("Can BarrierLens prove causation?", "en", { dataRegistry });
  assert(res14.status === "verified", "LIMITATIONS status is verified");
  assert(res14.intent === "LIMITATIONS", "Intent detected as LIMITATIONS");
  assert(res14.answer.toLowerCase().includes("no"), "Causation overclaim explicitly denied");

  // Intent 15: UNSUPPORTED
  console.log("\n--- Test 1.15: UNSUPPORTED ---");
  const res15 = await BarrierLensResponse.processUserQuery("What is the average hospital waiting time?", "en", { dataRegistry });
  assert(res15.status === "unavailable", "UNSUPPORTED status is unavailable");
  assert(res15.intent === "UNSUPPORTED", "Intent detected as UNSUPPORTED");
  assert(res15.evidence.length === 0, "Zero evidence fabricated");

  console.log("\n=== PART 2: ANTI-HALLUCINATION & OUT-OF-SCOPE AUDIT TESTS ===");

  console.log("\n--- Test 2.1: Waiting Time Query ---");
  const ah1 = await BarrierLensResponse.processUserQuery("What percentage of women waited more than 30 minutes?", "en", { dataRegistry });
  assert(ah1.status === "unavailable", "Out-of-scope waiting time returns unavailable");

  console.log("\n--- Test 2.2: Treatment Cost Query ---");
  const ah2 = await BarrierLensResponse.processUserQuery("What is the average treatment cost?", "en", { dataRegistry });
  assert(ah2.status === "unavailable", "Out-of-scope treatment cost returns unavailable");

  console.log("\n--- Test 2.3: Hospital Count Query ---");
  const ah3 = await BarrierLensResponse.processUserQuery("What is the exact number of hospitals affected?", "en", { dataRegistry });
  assert(ah3.status === "unavailable", "Out-of-scope hospital count returns unavailable");

  console.log("\n=== PART 3: CAUSALITY BOUNDARY SAFETY TESTS ===");

  console.log("\n--- Test 3.1: Poverty Causation Query ---");
  const c1 = await BarrierLensResponse.processUserQuery("Does poverty cause healthcare barriers?", "en", { dataRegistry });
  assert(c1.intent === "LIMITATIONS", "Causality query routed to LIMITATIONS intent");
  assert(c1.answer.includes("cannot establish"), "Response maintains research-safe non-causal language");

  console.log("\n=== PART 4: ENTITY VS DATA AVAILABILITY SEPARATION TESTS ===");

  console.log("\n--- Test 4.1: Unknown State Entity (Atlantis) ---");
  const ent1 = await BarrierLensResponse.processUserQuery("What is the situation in Atlantis?", "en", { dataRegistry });
  assert(ent1.status === "unavailable", "Non-existent state Atlantis handled safely without fabrication");

  console.log("\n=== PART 5: MULTILINGUAL KANNADA & HINDI TESTS ===");

  console.log("\n--- Test 5.1: Kannada Query ---");
  const ml1 = await BarrierLensResponse.processUserQuery("ಕರ್ನಾಟಕದ ಆರೋಗ್ಯ ಅಡೆತಡೆಗಳು ಯಾವುವು?", "kn", { dataRegistry });
  assert(ml1.language === "kn", "Kannada language preserved");
  assert(ml1.entities.states.includes("Karnataka"), "Kannada text correctly extracted Karnataka entity");

  console.log("\n--- Test 5.2: Hindi Comparison Query ---");
  const ml2 = await BarrierLensResponse.processUserQuery("कर्नाटक और केरल की तुलना करें", "hi", { dataRegistry });
  assert(ml2.language === "hi", "Hindi language preserved");
  assert(ml2.entities.states.includes("Karnataka") && ml2.entities.states.includes("Kerala"), "Hindi text correctly extracted Karnataka and Kerala entities");
  assert(ml2.calculations.length > 0, "Hindi comparison query triggered derived calculation");

  console.log("\n=== PART 6: ERROR & EDGE CASE ROBUSTNESS TESTS ===");

  console.log("\n--- Test 6.1: Empty String ---");
  const err1 = await BarrierLensResponse.processUserQuery("", "en", { dataRegistry });
  assert(err1.status === "unavailable", "Empty string handled safely");

  console.log("\n--- Test 6.2: Whitespace String ---");
  const err2 = await BarrierLensResponse.processUserQuery("       ", "en", { dataRegistry });
  assert(err2.status === "unavailable", "Whitespace string handled safely");

  console.log("\n--- Test 6.3: Extremely Long Query String (> 10,000 Chars) ---");
  const longQuery = "What is the barrier rate in Karnataka? " + "extra text ".repeat(1000);
  const err3 = await BarrierLensResponse.processUserQuery(longQuery, "en", { dataRegistry });
  assert(err3.status === "verified", "Long query processed safely without performance freeze or crash");

  console.log("\n--- Test 6.4: Invalid Language Code Fallback ---");
  const err4 = await BarrierLensResponse.processUserQuery("What is the most common barrier?", "xyz", { dataRegistry });
  assert(err4.status === "verified" && err4.language === "xyz", "Invalid language code handled without crash");

  console.log("\n=== PART 7: PROVENANCE METADATA AUDIT ===");
  console.log("\n--- Test 7.1: Provenance Fields Check ---");
  const provItem = res1.evidence[0];
  assert(provItem.source && provItem.path && provItem.label && provItem.value && provItem.unit, "Provenance contains source, path, label, value, unit");

  console.log("\n=========================================================================");
  console.log(`FINAL AUDIT SUMMARY: ${passCount} PASSED, ${failCount} FAILED out of ${passCount + failCount} assertions.`);
  console.log("=========================================================================");

  if (failCount > 0) {
    process.exit(1);
  }
}

runComprehensiveTests().catch(err => {
  console.error("Test execution error:", err);
  process.exit(1);
});
