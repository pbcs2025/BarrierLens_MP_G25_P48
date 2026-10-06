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

      if (i === 6) {
        console.log(`    DEBUG Q7 (${lang}): intent="${res.intent}", status="${res.status}", answer="${res.answer}"`);
      }
      assert(res && res.answer && res.answer.length > 15, `Q${i + 1} (${q.topic}): "${q.text}" produced non-empty answer`);
      assert(res.status !== undefined, `Q${i + 1}: response contains status field`);

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
