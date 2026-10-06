/**
 * BARRIERLENS — MULTILINGUAL SUGGESTED QUESTIONS TEST SUITE
 * Verifies that all 7 suggested research questions return valid, non-empty,
 * correctly localized answers when queried in English, Kannada, and Hindi.
 */

const ResponseEngine = require('../../dashboard/assets/js/response-engine.js');
const IntentEngine = require('../../dashboard/assets/js/intent-engine.js');
const ContextManager = require('../../dashboard/assets/js/context-manager.js');
const I18n = require('../../dashboard/assets/js/i18n.js');

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
console.log('BARRIERLENS — MULTILINGUAL SUGGESTED QUESTIONS VERIFICATION SUITE');
console.log('=========================================================================\n');

async function runMultilingualQuestionsTest() {
  const suggestedQuestions = I18n.SUGGESTED_QUESTIONS;

  const languages = ['en', 'kn', 'hi'];

  for (const lang of languages) {
    console.log(`=== TESTING SUGGESTED QUESTIONS FOR LANGUAGE: "${lang.toUpperCase()}" ===`);
    const questions = suggestedQuestions[lang];
    assert(questions && questions.length === 7, `Exactly 7 suggested questions defined for "${lang}"`);

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const res = await ResponseEngine.processUserQuery(q.text, lang, { skipBackend: true });

      assert(res && res.answer && res.answer.length > 15, `Q${i + 1} (${q.topic}): "${q.text}" produced non-empty answer`);
      assert(res.status !== undefined, `Q${i + 1}: response contains status field`);

      if (i < 6) {
        // Q1-Q6 MUST NOT report "dataset not loaded" technical failures
        assert(!res.answer.includes("not loaded") && !res.answer.includes("is not loaded"), `Q${i + 1} (${lang}): answer does NOT contain 'dataset not loaded' error`);
        assert(res.status === "verified", `Q${i + 1} (${lang}): response status is verified`);
      } else {
        // Q7 is out-of-scope hospital waiting time query
        assert(res.status === "unavailable", `Q7 (${lang}): out-of-scope question returned status='unavailable'`);
        assert(res.answer.includes("not available") || res.answer.includes("ಲಭ್ಯವಿಲ್ಲ") || res.answer.includes("उपलब्ध नहीं"), `Q7 (${lang}): correctly returned out-of-scope unavailable message`);
      }

      // Specific content assertions for key questions
      if (i === 0) {
        // Q1: National Overview
        assert(res.answer.includes("59.16") || res.answer.includes("46.01") || res.answer.includes("59.16%") || res.answer.includes("46.01%"), `Q1 (${lang}): answer contains national barrier statistics (59.16% or 46.01%)`);
      } else if (i === 1) {
        // Q2: State Comparison (Karnataka vs Kerala)
        const hasKarnataka = res.answer.includes("Karnataka") || res.answer.includes("ಕರ್ನಾಟಕ") || res.answer.includes("कर्नाटक");
        const hasKerala = res.answer.includes("Kerala") || res.answer.includes("ಕೇರಳ") || res.answer.includes("केरल");
        assert(hasKarnataka && hasKerala, `Q2 (${lang}): answer contains comparison data for both Karnataka and Kerala`);
      } else if (i === 2) {
        // Q3: Rural vs Urban
        const hasRural = res.answer.includes("Rural") || res.answer.includes("ಗ್ರಾಮೀಣ") || res.answer.includes("ग्रामीण");
        const hasUrban = res.answer.includes("Urban") || res.answer.includes("ನಗರ") || res.answer.includes("शहरी");
        assert(hasRural && hasUrban, `Q3 (${lang}): answer contains comparative data for both Rural and Urban areas`);
      } else if (i === 3) {
        // Q4: Risk Archetypes
        const hasArchetype = res.answer.includes("Vulnerability") || res.answer.includes("Archetype") || res.answer.includes("ಅಪಾಯ") || res.answer.includes("जोखिम") || res.answer.includes("ಕ್ಲಸ್ಟರ್") || res.answer.includes("क्लस्टर");
        assert(hasArchetype, `Q4 (${lang}): answer contains cluster archetype content`);
      }

      if (lang === 'kn') {
        assert(/[\u0C80-\u0CFF]/.test(res.answer), `Q${i + 1}: answer contains Kannada script characters`);
      } else if (lang === 'hi') {
        assert(/[\u0900-\u097F]/.test(res.answer), `Q${i + 1}: answer contains Devanagari Hindi script characters`);
      } else {
        assert(/[a-zA-Z]/.test(res.answer), `Q${i + 1}: answer contains English script characters`);
      }
    }
    console.log('');
  }

  console.log('=========================================================================');
  console.log(`SUGGESTED QUESTIONS TEST SUMMARY: ${passCount} PASSED, ${failCount} FAILED out of ${passCount + failCount} assertions.`);
  console.log('=========================================================================');

  if (failCount > 0) {
    process.exit(1);
  }
}

runMultilingualQuestionsTest();
