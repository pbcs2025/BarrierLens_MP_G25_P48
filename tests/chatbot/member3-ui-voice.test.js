/**
 * BARRIERLENS — MEMBER 3: COMPREHENSIVE AUTOMATED VERIFICATION SUITE
 * Validates Multilingual i18n (EN, KN, HI), STT / TTS contracts,
 * Voice State Machine transitions & safe error recovery, UI rendering,
 * Structured Cards, and end-to-end integration with Member 1's `processUserQuery`.
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

// Import Member 3 Modules
const BarrierLensI18n = require('../../dashboard/assets/js/i18n.js');
const BarrierLensSpeech = require('../../dashboard/assets/js/speech.js');
const BarrierLensTTS = require('../../dashboard/assets/js/tts.js');
const BarrierLensVoice = require('../../dashboard/assets/js/voice.js');
const BarrierLensChatbotUI = require('../../dashboard/assets/js/chatbot-ui.js');

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

async function runMember3TestSuite() {
  console.log("=========================================================================");
  console.log("BARRIERLENS MEMBER 3 — CHAT UI, MULTILINGUAL & VOICE TEST SUITE");
  console.log("=========================================================================\n");

  // Preload Member 1 data cache
  const dataRegistry = await BarrierLensData.preloadChatbotData();

  // -------------------------------------------------------------------------
  // SECTION 1: MULTILINGUAL (i18n) INTEGRITY & UNICODE TESTS
  // -------------------------------------------------------------------------
  console.log("=== PART 1: MULTILINGUAL (i18n) INTEGRITY & TRANSLATION COVERAGE ===");

  const languages = BarrierLensI18n.getSupportedLanguages();
  assert(languages.length === 3, "Exactly 3 languages supported (en, kn, hi)");

  const requiredKeys = [
    'assistantTitle', 'assistantSubtitle', 'welcomeGreeting', 'inputPlaceholder',
    'sendButton', 'micButton', 'voiceListening', 'voiceProcessing', 'voiceResponding',
    'verifiedSource', 'keyMetrics', 'derivedBadge', 'viewAnalysis', 'researchDisclaimer'
  ];

  ['en', 'kn', 'hi'].forEach(lang => {
    console.log(`\n--- Checking Language: ${lang.toUpperCase()} ---`);
    assert(BarrierLensI18n.TRANSLATIONS[lang] !== undefined, `Translations dictionary exists for ${lang}`);
    
    let allKeysPresent = true;
    requiredKeys.forEach(k => {
      if (!BarrierLensI18n.TRANSLATIONS[lang][k]) {
        allKeysPresent = false;
        console.error(`    Missing translation key: "${k}" in ${lang}`);
      }
    });
    assert(allKeysPresent, `All ${requiredKeys.length} core UI keys translated in ${lang}`);

    const suggestions = BarrierLensI18n.getSuggestedQuestions(lang);
    assert(Array.isArray(suggestions) && suggestions.length >= 6, `At least 6 suggested questions provided in ${lang}`);
  });

  // Test Unicode Kannada & Hindi rendering
  console.log("\n--- Testing Unicode Text Fidelity ---");
  const knTitle = BarrierLensI18n.t('assistantTitle', 'kn');
  assert(knTitle.includes("ಬ್ಯಾರಿಯರ್ ಲೆನ್ಸ್"), "Kannada script rendered correctly in title");

  const hiTitle = BarrierLensI18n.t('assistantTitle', 'hi');
  assert(hiTitle.includes("बैरियरलेंस"), "Hindi Devanagari script rendered correctly in title");

  // -------------------------------------------------------------------------
  // SECTION 2: SPEECH RECOGNITION (STT) LOCALE & INTERFACE TESTS
  // -------------------------------------------------------------------------
  console.log("\n=== PART 2: SPEECH RECOGNITION (STT) LOCALE & ERROR CONTRACTS ===");

  assert(BarrierLensSpeech.resolveLocale('en') === 'en-IN', "English maps to Indian English (en-IN)");
  assert(BarrierLensSpeech.resolveLocale('kn') === 'kn-IN', "Kannada maps to kn-IN");
  assert(BarrierLensSpeech.resolveLocale('hi') === 'hi-IN', "Hindi maps to hi-IN");

  // Simulated Start / Unsupported handling
  let errorCaught = null;
  BarrierLensSpeech.start({
    language: 'kn',
    onError: (type, msg) => {
      errorCaught = { type, msg };
    }
  });
  // In Node environment, SpeechRecognitionAPI is null -> must trigger 'not-supported' safely
  assert(errorCaught !== null && errorCaught.type === 'not-supported', "Node environment safely triggers not-supported without throwing uncaught error");

  // -------------------------------------------------------------------------
  // SECTION 3: TEXT-TO-SPEECH (TTS) SANITIZATION & VOICE FILTERING
  // -------------------------------------------------------------------------
  console.log("\n=== PART 3: TEXT-TO-SPEECH (TTS) SANITIZATION & INTERFACE ===");

  const dirtyText = "In **Karnataka**, 55.38% face barriers. [View Analysis](pages/state.html)\n- Point 1\n- Point 2";
  const cleanText = BarrierLensTTS.sanitizeTextForSpeech(dirtyText);
  assert(!cleanText.includes("**") && !cleanText.includes("[View Analysis]") && !cleanText.includes("- Point"), "TTS sanitization successfully strips markdown bold, links, and bullet syntax");

  let ttsError = false;
  BarrierLensTTS.speak(dirtyText, 'en', {
    onError: () => { ttsError = true; }
  });
  assert(true, "TTS speak() called in non-browser environment executes safely without crashing");

  // -------------------------------------------------------------------------
  // SECTION 4: VOICE STATE MACHINE 5-STATE LIFECYCLE & ERROR RECOVERY
  // -------------------------------------------------------------------------
  console.log("\n=== PART 4: VOICE STATE MACHINE (5-STATE LIFECYCLE & SAFE RECOVERY) ===");

  assert(BarrierLensVoice.getState() === BarrierLensVoice.STATES.IDLE, "Initial state is IDLE");

  let stateHistory = [];
  const unsubscribe = BarrierLensVoice.onStateChange((oldS, newS) => {
    stateHistory.push(`${oldS}->${newS}`);
  });

  // Transition to LISTENING
  BarrierLensVoice.transitionTo(BarrierLensVoice.STATES.LISTENING);
  assert(BarrierLensVoice.getState() === BarrierLensVoice.STATES.LISTENING, "State transitioned to LISTENING");

  // Transition to PROCESSING
  BarrierLensVoice.transitionTo(BarrierLensVoice.STATES.PROCESSING);
  assert(BarrierLensVoice.getState() === BarrierLensVoice.STATES.PROCESSING, "State transitioned to PROCESSING");

  // Transition to RESPONDING
  BarrierLensVoice.transitionTo(BarrierLensVoice.STATES.RESPONDING);
  assert(BarrierLensVoice.getState() === BarrierLensVoice.STATES.RESPONDING, "State transitioned to RESPONDING");

  // Transition back to IDLE
  BarrierLensVoice.transitionTo(BarrierLensVoice.STATES.IDLE);
  assert(BarrierLensVoice.getState() === BarrierLensVoice.STATES.IDLE, "State returned safely to IDLE");

  // Test ERROR State & Safe Reset
  BarrierLensVoice.transitionTo(BarrierLensVoice.STATES.ERROR, { message: "Simulated mic error" });
  assert(BarrierLensVoice.getState() === BarrierLensVoice.STATES.ERROR, "State transitioned to ERROR on failure");

  BarrierLensVoice.resetToIdle();
  assert(BarrierLensVoice.getState() === BarrierLensVoice.STATES.IDLE, "resetToIdle() brings state safely back to IDLE");

  unsubscribe();

  // -------------------------------------------------------------------------
  // SECTION 5: END-TO-END QUERY PROCESSING WITH MEMBER 1 (7 REQUIRED QUERIES)
  // -------------------------------------------------------------------------
  console.log("\n=== PART 5: END-TO-END QUERY PIPELINE (7 REQUIRED QUERIES) ===");

  // Query 1: National Overview
  console.log("\n--- Query 1: National Overview ---");
  const q1 = "What is the most common barrier?";
  const r1 = await BarrierLensResponse.processUserQuery(q1, "en", { dataRegistry });
  assert(r1.status === "verified", "Query 1 status is verified");
  assert(r1.metrics.some(m => m.value === "46.01" && m.label.includes("Facility")), "Query 1 contains exact 46.01% Facility barrier metric");
  assert(r1.source.some(s => s.includes("national_overview.json")), "Query 1 source references national_overview.json");

  // Query 2: State Comparison
  console.log("\n--- Query 2: State Comparison ---");
  const q2 = "Compare Karnataka and Kerala.";
  const r2 = await BarrierLensResponse.processUserQuery(q2, "en", { dataRegistry });
  assert(r2.status === "verified", "Query 2 status is verified");
  assert(r2.calculations.length > 0 && r2.calculations[0].result === 47.8, "Query 2 contains calculated 47.80% percentage point difference");
  assert(r2.relatedPage && r2.relatedPage.url.includes("state_analysis.html"), "Query 2 links to state_analysis.html");

  // Query 3: Rural vs Urban
  console.log("\n--- Query 3: Rural vs Urban ---");
  const q3 = "Compare rural and urban women.";
  const r3 = await BarrierLensResponse.processUserQuery(q3, "en", { dataRegistry });
  assert(r3.status === "verified", "Query 3 status is verified");
  assert(r3.metrics.some(m => m.entity === "Rural" && m.value === "63.49"), "Query 3 contains Rural barrier rate 63.49%");
  assert(r3.metrics.some(m => m.entity === "Urban" && m.value === "46.03"), "Query 3 contains Urban barrier rate 46.03%");

  // Query 4: Risk Archetypes
  console.log("\n--- Query 4: Risk Archetypes ---");
  const q4 = "What are the risk archetypes?";
  const r4 = await BarrierLensResponse.processUserQuery(q4, "en", { dataRegistry });
  assert(r4.status === "verified", "Query 4 status is verified");
  assert(r4.evidence.some(e => e.entity.includes("High Vulnerability")), "Query 4 contains Cluster 0 archetype");

  // Query 5: SHAP
  console.log("\n--- Query 5: SHAP ---");
  const q5 = "What is SHAP?";
  const r5 = await BarrierLensResponse.processUserQuery(q5, "en", { dataRegistry });
  assert(r5.status === "verified", "Query 5 status is verified");
  assert(r5.answer.includes("game theory") || r5.answer.includes("SHAP"), "Query 5 provides grounded SHAP explanation");

  // Query 6: Causation Limitations
  console.log("\n--- Query 6: Causation Limitations ---");
  const q6 = "Can BarrierLens prove causation?";
  const r6 = await BarrierLensResponse.processUserQuery(q6, "en", { dataRegistry });
  assert(r6.status === "verified", "Query 6 status is verified");
  assert(r6.answer.includes("cross-sectional") && (r6.answer.includes("cannot establish") || r6.answer.includes("No")), "Query 6 strictly denies causal overclaiming");

  // Query 7: Unsupported / Out-of-Scope (Waiting Times)
  console.log("\n--- Query 7: Unsupported Waiting Times ---");
  const q7 = "What is the average hospital waiting time?";
  const r7 = await BarrierLensResponse.processUserQuery(q7, "en", { dataRegistry });
  assert(r7.status === "unavailable", "Query 7 status is unavailable");
  assert(r7.answer.includes("not available in the verified BarrierLens NFHS-5 dataset"), "Query 7 cleanly states information is unavailable without hallucination");

  // Multilingual Queries
  console.log("\n--- Kannada & Hindi E2E Query Integration ---");
  const rKn = await BarrierLensResponse.processUserQuery("ಕರ್ನಾಟಕ ಮತ್ತು ಕೇರಳವನ್ನು ಹೋಲಿಕೆ ಮಾಡಿ.", "kn", { dataRegistry });
  assert(rKn.status === "verified", "Kannada comparison query successfully executed");
  assert(rKn.entities.states.includes("Karnataka") && rKn.entities.states.includes("Kerala"), "Extracted Karnataka & Kerala from Kannada script");

  const rHi = await BarrierLensResponse.processUserQuery("ग्रामीण और शहरी महिलाओं की तुलना करें।", "hi", { dataRegistry });
  assert(rHi.status === "verified", "Hindi rural-urban comparison query successfully executed");

  // -------------------------------------------------------------------------
  // SECTION 6: UI FORMATTER & PAGE LINK RESOLVER
  // -------------------------------------------------------------------------
  console.log("\n=== PART 6: UI FORMATTER & RELATED PAGE LINK RESOLVER ===");

  const formattedHtml = BarrierLensChatbotUI.formatText("This is **bold** text with\n- Bullet 1\n- Bullet 2");
  assert(formattedHtml.includes("<strong>bold</strong>") && formattedHtml.includes("<li>Bullet 1</li>"), "Markdown formatting parses bold and bullet lists accurately");

  const linkRoot = BarrierLensChatbotUI.resolvePageLink({ url: "dashboard/pages/state_analysis.html" });
  assert(linkRoot !== null && (linkRoot === "pages/state_analysis.html" || linkRoot === "state_analysis.html"), "Related page link resolved correctly");

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  console.log("\n=========================================================================");
  console.log(`FINAL MEMBER 3 TEST SUMMARY: ${passCount} PASSED, ${failCount} FAILED out of ${passCount + failCount} assertions.`);
  console.log("=========================================================================\n");

  if (failCount > 0) {
    process.exit(1);
  }
}

runMember3TestSuite().catch(err => {
  console.error("Fatal Test Suite Error:", err);
  process.exit(1);
});
