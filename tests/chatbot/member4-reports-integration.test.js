/**
 * BARRIERLENS — MEMBER 4: REPORTS, NAVIGATION & INTEGRATION VALIDATION SUITE
 * Comprehensive automated verification suite for report generation (Executive, Topic,
 * Comparison, Complete), PDF/HTML rendering, contextual "View Analysis" navigation,
 * data grounding, numerical accuracy, research safety, multilingual queries,
 * regression testing, security, and deployment readiness.
 */

const fs = require('fs');
const path = require('path');

// Import Member 1, 3, and 4 Modules
const BarrierLensData = require('../../dashboard/assets/js/chatbot-data.js');
const BarrierLensResponse = require('../../dashboard/assets/js/response-engine.js');
const BarrierLensI18n = require('../../dashboard/assets/js/i18n.js');
const BarrierLensReportTemplate = require('../../dashboard/assets/js/report-template.js');
const BarrierLensReportGenerator = require('../../dashboard/assets/js/report-generator.js');

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

async function runMember4ValidationSuite() {
  console.log("=========================================================================");
  console.log("BARRIERLENS MEMBER 4 — REPORTS, INTEGRATION & VALIDATION TEST SUITE");
  console.log("=========================================================================\n");

  // Preload data
  const dataRegistry = await BarrierLensData.preloadChatbotData();

  console.log("=== PART 1: REPORT TEMPLATE COMPONENT UNIT TESTS ===");
  
  const headerHtml = BarrierLensReportTemplate.createHeader("Test Title", "executive", new Date(), "What is the most common barrier?");
  assert(headerHtml.includes("BARRIERLENS"), "Header contains brand title BARRIERLENS");
  assert(headerHtml.includes("EXECUTIVE RESEARCH REPORT"), "Header contains report type badge");
  assert(headerHtml.includes("Test Title"), "Header contains report title");
  assert(headerHtml.includes("NFHS-5 Individual Recode (N = 724,115)"), "Header contains NFHS-5 sample metadata");

  const summaryHtml = BarrierLensReportTemplate.createExecutiveSummary("Summary content text.");
  assert(summaryHtml.includes("1. Executive Summary") && summaryHtml.includes("Summary content text."), "Executive summary renders section title and text");

  const metricsTableHtml = BarrierLensReportTemplate.createMetricsTable([
    { label: "Facility Barrier Rate", entity: "National", value: "46.01", unit: "%" }
  ]);
  assert(metricsTableHtml.includes("Facility Barrier Rate") && metricsTableHtml.includes("46.01 %"), "Metrics table renders indicator and value");

  const comparisonHtml = BarrierLensReportTemplate.createComparisonSection(
    [{ entity: "Karnataka", value: "55.38", unit: "%" }, { entity: "Kerala", value: "7.58", unit: "%" }],
    [{ result: 47.8, unit: "%", interpretation: "Karnataka is 47.80 percentage points higher than Kerala." }]
  );
  assert(comparisonHtml.includes("CALCULATED DIFFERENCE"), "Comparison section explicitly labels CALCULATED DIFFERENCE");
  assert(comparisonHtml.includes("47.8 %"), "Comparison section contains calculated result");

  const limitationsHtml = BarrierLensReportTemplate.createLimitationsBox();
  assert(limitationsHtml.includes("cross-sectional"), "Limitations box contains cross-sectional study constraints");

  const disclaimerHtml = BarrierLensReportTemplate.createDisclaimerBox();
  assert(disclaimerHtml.includes("RESEARCH DISCLAIMER"), "Disclaimer box contains research disclaimer header");


  console.log("\n=== PART 2: ALL 4 REPORT GENERATOR TYPES AUDIT ===");

  const queryRes = await BarrierLensResponse.processUserQuery("What is the situation in Karnataka?", "en", { dataRegistry });

  // 1. Executive Report
  const execReport = BarrierLensReportGenerator.generateExecutiveReport(queryRes);
  assert(execReport.reportType === "executive", "Executive report generated with type executive");
  assert(execReport.html.includes("Executive Research Overview"), "Executive report title present in HTML");
  assert(execReport.html.includes("Key Findings"), "Executive report contains Key Findings section");

  // 2. Topic Report
  const topicReport = BarrierLensReportGenerator.generateTopicReport(queryRes, "State Disparity");
  assert(topicReport.reportType === "topic", "Topic report generated with type topic");
  assert(topicReport.html.includes("Topic Research Report — State Disparity"), "Topic report title present in HTML");

  // 3. Comparison Report
  const compQueryRes = await BarrierLensResponse.processUserQuery("Compare Karnataka and Kerala.", "en", { dataRegistry });
  const compReport = BarrierLensReportGenerator.generateComparisonReport(compQueryRes);
  assert(compReport.reportType === "comparison", "Comparison report generated with type comparison");
  assert(compReport.html.includes("CALCULATED DIFFERENCE"), "Comparison report HTML explicitly highlights CALCULATED DIFFERENCE");
  assert(compReport.html.includes("47.8"), "Comparison report contains derived difference 47.8 percentage points");

  // 4. Complete Research Report
  const completeReport = BarrierLensReportGenerator.generateCompleteReport(queryRes);
  assert(completeReport.reportType === "complete", "Complete research report generated with type complete");
  assert(completeReport.html.includes("BarrierLens Complete Research Intelligence Report"), "Complete report header present");
  assert(completeReport.html.includes("724,115"), "Complete report contains full sample size 724,115");


  console.log("\n=== PART 3: DATA GROUNDING & NUMERICAL ACCURACY TESTS ===");

  const natRes = await BarrierLensResponse.processUserQuery("What is the most common barrier?", "en", { dataRegistry });
  const natExecReport = BarrierLensReportGenerator.generateReport("executive", natRes);
  assert(natExecReport.html.includes("46.01"), "National executive report contains exact facility rate 46.01%");
  assert(natExecReport.html.includes("NFHS-5"), "National report attributes NFHS-5 data source");
  assert(!natExecReport.html.includes("99.99%"), "Zero fabricated metrics in report");


  console.log("\n=== PART 4: UNSUPPORTED QUERY ANTI-HALLUCINATION TESTS ===");

  const unsupRes = await BarrierLensResponse.processUserQuery("What is the average hospital waiting time?", "en", { dataRegistry });
  assert(unsupRes.status === "unavailable", "Unsupported query status is unavailable");
  const unsupReport = BarrierLensReportGenerator.generateReport("executive", unsupRes);
  assert(unsupReport.html.includes("not available in the verified BarrierLens NFHS-5 dataset"), "Report cleanly specifies data unavailability");


  console.log("\n=== PART 5: RESEARCH SAFETY & NON-CAUSALITY BOUNDARY TESTS ===");

  const limitRes = await BarrierLensResponse.processUserQuery("Does poverty cause healthcare access barriers?", "en", { dataRegistry });
  const limitReport = BarrierLensReportGenerator.generateReport("executive", limitRes);
  assert(limitReport.html.includes("cross-sectional") || limitReport.html.includes("association"), "Report enforces cross-sectional non-causal language");
  assert(limitReport.html.includes("RESEARCH DISCLAIMER"), "Research safety disclaimer present");


  console.log("\n=== PART 6: MULTILINGUAL REPORT GENERATION TESTS ===");

  const knRes = await BarrierLensResponse.processUserQuery("ಕರ್ನಾಟಕ ಮತ್ತು ಕೇರಳ ಹೋಲಿಕೆ ಮಾಡಿ", "kn", { dataRegistry });
  const knReport = BarrierLensReportGenerator.generateComparisonReport(knRes);
  assert(knReport.reportType === "comparison", "Kannada query triggered comparison report");
  assert(knReport.html.includes("CALCULATED DIFFERENCE"), "Kannada comparison report contains calculated difference tag");

  const hiRes = await BarrierLensResponse.processUserQuery("कर्नाटक और केरल की तुलना करें", "hi", { dataRegistry });
  const hiReport = BarrierLensReportGenerator.generateReport("executive", hiRes);
  assert(hiReport.html.length > 500, "Hindi query report generated successfully");


  console.log("\n=== PART 7: VIEW ANALYSIS DASHBOARD NAVIGATION ROUTING TESTS ===");

  const pageMap = BarrierLensResponse.INTENT_PAGE_MAP;
  assert(pageMap.NATIONAL_OVERVIEW.relativeUrl === "pages/national_overview.html", "NATIONAL_OVERVIEW maps to pages/national_overview.html");
  assert(pageMap.STATE_ANALYSIS.relativeUrl === "pages/state_analysis.html", "STATE_ANALYSIS maps to pages/state_analysis.html");
  assert(pageMap.RURAL_URBAN.relativeUrl === "pages/rural_urban.html", "RURAL_URBAN maps to pages/rural_urban.html");
  assert(pageMap.DEMOGRAPHIC_ANALYSIS.relativeUrl === "pages/demographic_analysis.html", "DEMOGRAPHIC_ANALYSIS maps to pages/demographic_analysis.html");
  assert(pageMap.RISK_ARCHETYPE.relativeUrl === "pages/risk_archetypes.html", "RISK_ARCHETYPE maps to pages/risk_archetypes.html");
  assert(pageMap.EMPOWERMENT.relativeUrl === "pages/empowerment.html", "EMPOWERMENT maps to pages/empowerment.html");
  assert(pageMap.MULTIPLE_BARRIER.relativeUrl === "pages/multiple_barrier.html", "MULTIPLE_BARRIER maps to pages/multiple_barrier.html");
  assert(pageMap.OUTCOME_IMPACT.relativeUrl === "pages/outcome_impact.html", "OUTCOME_IMPACT maps to pages/outcome_impact.html");
  assert(pageMap.REGRESSION.relativeUrl === "pages/explainability.html", "REGRESSION maps to pages/explainability.html");
  assert(pageMap.SHAP.relativeUrl === "pages/explainability.html", "SHAP maps to pages/explainability.html");
  assert(pageMap.BASE_PAPER.relativeUrl === "pages/base_paper_comparison.html", "BASE_PAPER maps to pages/base_paper_comparison.html");

  // Verify all 10 HTML files physically exist on disk
  const pagesDir = path.join(__dirname, '../../dashboard/pages');
  const targetFiles = [
    'national_overview.html',
    'base_paper_comparison.html',
    'state_analysis.html',
    'demographic_analysis.html',
    'rural_urban.html',
    'empowerment.html',
    'multiple_barrier.html',
    'risk_archetypes.html',
    'outcome_impact.html',
    'explainability.html'
  ];

  targetFiles.forEach(file => {
    const fullPath = path.join(pagesDir, file);
    assert(fs.existsSync(fullPath), `Dashboard page file physically exists: ${file}`);
  });


  console.log("\n=== PART 8: SECURITY & DEPLOYMENT CHECK ===");

  const jsDir = path.join(__dirname, '../../dashboard/assets/js');
  const jsFiles = fs.readdirSync(jsDir).filter(f => f.endsWith('.js'));
  let secretsFound = false;

  jsFiles.forEach(file => {
    const content = fs.readFileSync(path.join(jsDir, file), 'utf8');
    if (content.includes("sk-proj-") || content.includes("AIzaSy") || content.includes("AWS_SECRET_ACCESS_KEY")) {
      secretsFound = true;
      console.error(`  ✗ SECRETS EXPOSED in ${file}`);
    }
  });

  assert(!secretsFound, "Zero API keys or secrets detected in frontend JS assets");


  console.log("\n=========================================================================");
  console.log(`FINAL MEMBER 4 TEST SUMMARY: ${passCount} PASSED, ${failCount} FAILED out of ${passCount + failCount} assertions.`);
  console.log("=========================================================================");

  if (failCount > 0) {
    process.exit(1);
  }
}

runMember4ValidationSuite().catch(err => {
  console.error("Member 4 Validation Suite Exception:", err);
  process.exit(1);
});
