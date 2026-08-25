/**
 * BARRIERLENS — MEMBER 2: EVIDENCE & STATISTICS ENGINE TEST SUITE
 * Verifies all Member 2 test cases across 5 barriers, state/demographic/rural-urban retrieval,
 * provenance metadata, derived calculation tagging, solution-sufficiency handoff, and zero-fabrication safety.
 */

const fs = require('fs');
const path = require('path');

// Import modules
const DataModule = require('../../dashboard/assets/js/chatbot-data.js');
const DataMap = require('../../dashboard/assets/js/barrier-data-map.js');
const ComparisonEngine = require('../../dashboard/assets/js/comparison-engine.js');
const EvidenceEngine = require('../../dashboard/assets/js/evidence-engine.js');

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

async function runMember2Tests() {
  console.log("=========================================================================");
  console.log("BARRIERLENS MEMBER 2 — EVIDENCE & STATISTICS ENGINE TEST SUITE");
  console.log("=========================================================================\n");

  // Preload data
  const dataRegistry = await DataModule.preloadChatbotData();

  console.log("=== PART 1: FIVE BARRIER EVIDENCE RETRIEVAL TESTS ===");

  // Test 1 — Household
  console.log("\n--- Test 1: Household Barrier Evidence ---");
  const householdRes = EvidenceEngine.getBarrierEvidence("household", { query: "Tell me about household barrier" }, dataRegistry);
  assert(householdRes.status === "verified", "Household evidence status is verified");
  assert(householdRes.barrier === "household", "Barrier key identified as household");
  assert(householdRes.explanation.includes("Household barriers reflect socio-cultural constraints"), "Explanation grounded in household domain");
  assert(householdRes.metrics.some(m => m.label.includes("Household Barrier Rate")), "Metrics contain household barrier rate");

  // Test 2 — Logistic
  console.log("\n--- Test 2: Logistic Barrier Evidence ---");
  const logisticRes = EvidenceEngine.getBarrierEvidence("logistic", { query: "What is logistic barrier rate?" }, dataRegistry);
  assert(logisticRes.status === "verified", "Logistic evidence status is verified");
  assert(logisticRes.barrier === "logistic", "Barrier key identified as logistic");
  assert(logisticRes.metrics.some(m => m.label.includes("Logistic Barrier Rate")), "Metrics contain logistic barrier rate");

  // Test 3 — Facility
  console.log("\n--- Test 3: Facility Barrier Evidence ---");
  const facilityRes = EvidenceEngine.getBarrierEvidence("facility", { query: "Facility barrier statistics" }, dataRegistry);
  assert(facilityRes.status === "verified", "Facility evidence status is verified");
  assert(facilityRes.barrier === "facility", "Barrier key identified as facility");
  assert(facilityRes.metrics.some(m => m.label.includes("Facility Barrier Rate")), "Metrics contain facility barrier rate");

  // Test 4 — Multiple
  console.log("\n--- Test 4: Multiple Barrier Evidence ---");
  const multipleRes = EvidenceEngine.getBarrierEvidence("multiple", { query: "How common are multiple barriers?" }, dataRegistry);
  assert(multipleRes.status === "verified", "Multiple barrier evidence status is verified");
  assert(multipleRes.barrier === "multiple", "Barrier key identified as multiple");
  assert(multipleRes.metrics.some(m => m.label.includes("Mean Barrier Count")), "Metrics contain mean barrier count");

  // Test 5 — All
  console.log("\n--- Test 5: All Barriers Evidence ---");
  const allRes = EvidenceEngine.getBarrierEvidence("all", { query: "Show overall healthcare barriers" }, dataRegistry);
  assert(allRes.status === "verified", "All barriers evidence status is verified");
  assert(allRes.barrier === "all", "Barrier key identified as all");
  assert(allRes.metrics.some(m => m.label.includes("Any Barrier Rate")), "Metrics contain observed any barrier rate");

  console.log("\n=== PART 2: STATE & DEMOGRAPHIC EVIDENCE RETRIEVAL TESTS ===");

  // Test 6 — State (Karnataka)
  console.log("\n--- Test 6: State Evidence (Karnataka) ---");
  const stateStats = EvidenceEngine.getAffectedStates("all", dataRegistry);
  assert(stateStats.status === "verified", "State stats status is verified");
  assert(stateStats.mostAffected.length === 5, "Top 5 most affected states retrieved");
  assert(stateStats.leastAffected.length === 3, "Lowest 3 affected states retrieved");

  // Test 7 — State Comparison (Karnataka vs Kerala)
  console.log("\n--- Test 7: State Comparison (Karnataka vs Kerala) ---");
  const stateComp = ComparisonEngine.compareStates("Karnataka", "Kerala", "all", dataRegistry);
  assert(stateComp.status === "verified", "State comparison status is verified");
  assert(stateComp.entityA === "Karnataka" && stateComp.entityB === "Kerala", "Correct state entities");
  assert(stateComp.primaryCalculation.result === 47.8, "Exact percentage point difference calculated: 47.80");
  assert(stateComp.primaryCalculation.resultUnit === "percentage points", "Result unit is percentage points");
  assert(stateComp.primaryCalculation.derived === true, "Calculation tagged derived: true");

  // Test 8 — Rural / Urban Comparison
  console.log("\n--- Test 8: Rural vs Urban Comparison ---");
  const ruComp = ComparisonEngine.compareRuralUrban("all", dataRegistry);
  assert(ruComp.status === "verified", "Rural/Urban comparison status is verified");
  assert(ruComp.primaryCalculation.operands[0].value === 63.49, "Rural Any Barrier Rate is 63.49%");
  assert(ruComp.primaryCalculation.operands[1].value === 46.03, "Urban Any Barrier Rate is 46.03%");
  assert(ruComp.primaryCalculation.result === 17.46, "Exact Rural vs Urban gap calculated: 17.46 percentage points");
  assert(ruComp.scopeExclusionNote.includes("waiting-time"), "Contains scope exclusion note regarding waiting times");

  // Test 9 — Demographic Evidence
  console.log("\n--- Test 9: Demographic Breakdown Evidence ---");
  const demoRes = EvidenceEngine.getAffectedGroups("all", dataRegistry);
  assert(demoRes.status === "verified", "Demographic evidence status is verified");
  assert(demoRes.affectedGroups.length > 0, "Retrieved wealth tier demographic groups");

  console.log("\n=== PART 3: PROVENANCE, CALCULATIONS & SOLUTION SUFFICIENCY TESTS ===");

  // Test 10 — Provenance Verification
  console.log("\n--- Test 10: Provenance Fields Check ---");
  const provMetric = householdRes.metrics[0];
  assert(provMetric.source !== undefined && provMetric.source !== null, "Provenance has source file");
  assert(provMetric.sourceKey !== undefined, "Provenance has sourceKey");
  assert(provMetric.path !== undefined, "Provenance has dataPath");
  assert(provMetric.label !== undefined, "Provenance has label");
  assert(provMetric.value !== undefined, "Provenance has value");
  assert(provMetric.unit !== undefined, "Provenance has unit");

  // Test 11 — Derived Calculation Tagging
  console.log("\n--- Test 11: Derived Calculation Tagging ---");
  assert(stateComp.primaryCalculation.derived === true, "State comparison tagged derived: true");
  assert(ruComp.primaryCalculation.derived === true, "Rural/Urban comparison tagged derived: true");

  // Test 12 — Unsupported Query Fallback
  console.log("\n--- Test 12: Unsupported Query (Waiting Time) ---");
  const unsuppRes = EvidenceEngine.getBarrierEvidence("all", { text: "What is the average hospital waiting time?" }, dataRegistry);
  assert(unsuppRes.status === "unavailable", "Out-of-scope waiting time returns unavailable");
  assert(unsuppRes.reason.includes("not available"), "Reason cleanly states data unavailability");

  // Test 13 — Missing Data Fallback
  console.log("\n--- Test 13: Missing Entity Fallback ---");
  const missingStateRes = ComparisonEngine.compareStates("Atlantis", "Kerala", "all", dataRegistry);
  assert(missingStateRes.status === "unavailable", "Non-existent state Atlantis returns unavailable without estimation");

  // Test 14 — Solution Sufficiency Check
  console.log("\n--- Test 14: Solution Sufficiency Handoff ---");
  const solSupported = EvidenceEngine.checkBarrierLensSolutionEvidence("household", { query: "What can be done about household barriers?" }, dataRegistry);
  assert(solSupported.solutionEvidence.barrierLensSupported === true, "BarrierLens supported interventions detected for household barrier");
  assert(solSupported.externalResearchRequired === false, "External research not required when dataset contains interventions");

  const solExternal = EvidenceEngine.checkBarrierLensSolutionEvidence("household", { text: "Tell me surgical clinical trial protocols" }, dataRegistry);
  assert(solExternal.solutionEvidence.barrierLensSupported === false, "External clinical protocol query sets barrierLensSupported to false");
  assert(solExternal.externalResearchRequired === true, "External research required flagged for Member 3");

  // Test 15 — Zero Fabricated Data Assertion
  console.log("\n--- Test 15: Zero Fabricated Data Assertion ---");
  const natOverviewData = dataRegistry.nationalOverview;
  const exactNationalFacilityRate = (natOverviewData.kpis.observed_facility_rate * 100).toFixed(2);
  const retrievedFacilityRate = facilityRes.metrics.find(m => m.label.includes("Observed Facility Barrier Rate")).value;
  assert(retrievedFacilityRate === exactNationalFacilityRate, `Retrieved value (${retrievedFacilityRate}%) strictly matches raw JSON (${exactNationalFacilityRate}%)`);

  console.log("\n=== PART 4: INTERACTION & METRIC TRACING AUDIT ===");

  // Tracing 10 metrics back to raw JSON files
  console.log("\n--- Tracing 10 Metrics to Raw JSON Sources ---");
  
  // Metric 1: National Facility Barrier Rate
  assert(facilityRes.metrics[0].path === "kpis.observed_facility_rate" && facilityRes.metrics[0].value === "46.01", "Metric 1: National Facility Rate traced to national_overview.json kpis.observed_facility_rate (46.01%)");
  
  // Metric 2: National Logistic Barrier Rate
  assert(logisticRes.metrics[0].path === "kpis.observed_logistic_rate" && logisticRes.metrics[0].value === "31.61", "Metric 2: National Logistic Rate traced to national_overview.json kpis.observed_logistic_rate (31.61%)");

  // Metric 3: National Household Barrier Rate
  assert(householdRes.metrics[0].path === "kpis.observed_household_rate" && householdRes.metrics[0].value === "27.16", "Metric 3: National Household Rate traced to national_overview.json kpis.observed_household_rate (27.16%)");

  // Metric 4: National Any Barrier Rate
  assert(allRes.metrics[0].path === "kpis.observed_any_barrier_rate" && allRes.metrics[0].value === "59.16", "Metric 4: National Any Barrier Rate traced to national_overview.json kpis.observed_any_barrier_rate (59.16%)");

  // Metric 5: Mean Barrier Count
  assert(multipleRes.metrics[0].path === "overall.mean_barrier_count" && multipleRes.metrics[0].value === "1.0477", "Metric 5: Mean Barrier Count traced to multiple_barrier_summary.json overall.mean_barrier_count (1.0477)");

  // Metric 6: Pct Facing 2+ Barriers
  assert(multipleRes.metrics[1].path === "overall.pct_facing_2plus_barriers" && multipleRes.metrics[1].value === "31.55", "Metric 6: Pct 2+ Barriers traced to multiple_barrier_summary.json overall.pct_facing_2plus_barriers (31.55%)");

  // Metric 7: Rural Any Barrier Rate
  assert(ruComp.primaryCalculation.operands[0].value === 63.49, "Metric 7: Rural Rate traced to rural_urban_summary.json groups[0].observed_any_barrier_rate (63.49%)");

  // Metric 8: Urban Any Barrier Rate
  assert(ruComp.primaryCalculation.operands[1].value === 46.03, "Metric 8: Urban Rate traced to rural_urban_summary.json groups[1].observed_any_barrier_rate (46.03%)");

  // Metric 9: Karnataka Any Barrier Rate
  const karStateObj = dataRegistry.stateSummary.states.find(s => s.state_name === "Karnataka");
  assert((karStateObj.observed_any_barrier_rate * 100).toFixed(2) === "55.38", "Metric 9: Karnataka Any Barrier Rate traced to state_summary.json states[19].observed_any_barrier_rate (55.38%)");

  // Metric 10: Kerala Any Barrier Rate
  const kerStateObj = dataRegistry.stateSummary.states.find(s => s.state_name === "Kerala");
  assert((kerStateObj.observed_any_barrier_rate * 100).toFixed(2) === "7.58", "Metric 10: Kerala Any Barrier Rate traced to state_summary.json states[20].observed_any_barrier_rate (7.58%)");

  // Member 1, Member 3, Member 4 Handoff Interface Assertions
  console.log("\n--- Member 1, Member 3 & Member 4 Handoff Contract Assertions ---");
  
  // Member 1 Handoff
  const m1HandoffPayload = EvidenceEngine.getBarrierEvidence("logistic", { text: "What is the logistic barrier rate in Karnataka?", stateA: "Karnataka" }, dataRegistry);
  assert(m1HandoffPayload.status === "verified" && m1HandoffPayload.barrier === "logistic", "Member 1 handoff payload accepts barrier context and query text");

  // Member 3 Handoff
  const m3Handoff = EvidenceEngine.checkBarrierLensSolutionEvidence("facility", { text: "How to overcome facility barriers?" }, dataRegistry);
  assert(typeof m3Handoff.externalResearchRequired === "boolean" && m3Handoff.solutionEvidence !== undefined, "Member 3 handoff provides explicit externalResearchRequired boolean flag");

  // Member 4 Handoff
  assert(Array.isArray(m1HandoffPayload.metrics) && Array.isArray(m1HandoffPayload.affectedStates) && m1HandoffPayload.provenance !== undefined, "Member 4 handoff provides array metrics, affectedStates, and provenance for report generator");

  console.log("\n=========================================================================");
  console.log(`FINAL MEMBER 2 TEST SUMMARY: ${passCount} PASSED, ${failCount} FAILED out of ${passCount + failCount} assertions.`);
  console.log("=========================================================================\n");

  if (failCount > 0) {
    process.exit(1);
  }
}

runMember2Tests();
