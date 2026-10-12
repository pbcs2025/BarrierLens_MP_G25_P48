/**
 * BARRIERLENS — SESSION PERSISTENCE & HISTORY RETENTION TEST SUITE
 * File: tests/chatbot/session-persistence.test.js
 *
 * Verifies:
 * 1. Session store persistence across simulated reloads (localStorage sync).
 * 2. Active session ID reuse without creating disconnected new sessions.
 * 3. Chatbot UI message history persistence and restoration.
 * 4. Context state persistence (active barrier, language, prediction).
 * 5. Explicit clearChat clearing behavior.
 * 6. Server-side session expiration removal and persistent storage.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

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

async function runSessionPersistenceTests() {
  console.log('=========================================================================');
  console.log('BARRIERLENS — SESSION PERSISTENCE & HISTORY RETENTION AUDIT');
  console.log('=========================================================================\n');

  // Setup mock browser localStorage environment
  const mockLocalStorageStore = {};
  global.window = {
    localStorage: {
      getItem: (key) => mockLocalStorageStore[key] || null,
      setItem: (key, val) => { mockLocalStorageStore[key] = String(val); },
      removeItem: (key) => { delete mockLocalStorageStore[key]; },
      clear: () => { Object.keys(mockLocalStorageStore).forEach(k => delete mockLocalStorageStore[k]); }
    }
  };

  // ---------------------------------------------------------------------------
  // TEST 1: Session Store Persistence across Simulated Reloads
  // ---------------------------------------------------------------------------
  console.log('--- Test 1: Session Store Persistence ---');
  delete require.cache[require.resolve('../../dashboard/assets/js/session-store.js')];
  let SessionStore = require('../../dashboard/assets/js/session-store.js');

  const s1 = SessionStore.getSession();
  const sessionId = s1.sessionId;
  SessionStore.setActiveBarrier(sessionId, "Logistic Barrier", "user_selection");
  SessionStore.updateSession(sessionId, { activeLanguage: "kn", activeState: "Karnataka" });
  SessionStore.addTurnToHistory(sessionId, {
    userText: "What are the logistic barriers in Karnataka?",
    intent: "ask_state_analysis"
  });

  it('Session 1 state saved to mock localStorage', () => {
    assert.ok(mockLocalStorageStore['bl_sessions_store_map'], 'Sessions map must be saved in localStorage');
    assert.strictEqual(mockLocalStorageStore['bl_active_session_id'], sessionId, 'Active session ID must match');
    const stored = JSON.parse(mockLocalStorageStore['bl_sessions_store_map']);
    assert.ok(stored[sessionId], 'Session data must exist in stored map');
    assert.strictEqual(stored[sessionId].activeBarrier, "Logistic Barrier");
    assert.strictEqual(stored[sessionId].activeLanguage, "kn");
    assert.strictEqual(stored[sessionId].conversationHistory.length, 1);
  });

  // Simulate Page Reload (re-require session-store.js with new Map instance)
  delete require.cache[require.resolve('../../dashboard/assets/js/session-store.js')];
  SessionStore = require('../../dashboard/assets/js/session-store.js');

  const reloadedSession = SessionStore.getSession(); // Should pick up active session from storage
  it('Simulated reload recovers the active session and history without creating a blank session', () => {
    assert.strictEqual(reloadedSession.sessionId, sessionId, 'Must restore same session ID');
    assert.strictEqual(reloadedSession.activeBarrier, "Logistic Barrier");
    assert.strictEqual(reloadedSession.activeLanguage, "kn");
    assert.strictEqual(reloadedSession.activeState, "Karnataka");
    assert.strictEqual(reloadedSession.conversationHistory.length, 1);
    assert.strictEqual(reloadedSession.conversationHistory[0].userText, "What are the logistic barriers in Karnataka?");
  });

  // ---------------------------------------------------------------------------
  // TEST 2: Chatbot UI History Persistence & Restoration
  // ---------------------------------------------------------------------------
  console.log('\n--- Test 2: Chatbot UI Message History Persistence ---');

  // Mock DOM minimal elements
  global.document = {
    readyState: 'complete',
    querySelector: () => null,
    querySelectorAll: () => [],
    getElementById: (id) => {
      return {
        id,
        value: '',
        style: {},
        innerHTML: '',
        textContent: '',
        classList: { add: () => {}, remove: () => {}, contains: () => false },
        setAttribute: () => {},
        getAttribute: () => null,
        addEventListener: () => {},
        insertAdjacentHTML: () => {},
        appendChild: () => {},
        querySelector: () => null,
        querySelectorAll: () => [],
        scrollTop: 0,
        scrollHeight: 100,
        focus: () => {}
      };
    },
    createElement: (tag) => ({
      tagName: tag,
      style: {},
      classList: { add: () => {}, remove: () => {} },
      appendChild: () => {},
      addEventListener: () => {}
    }),
    body: {
      insertAdjacentHTML: () => {}
    },
    head: {
      appendChild: () => {}
    },
    addEventListener: () => {}
  };

  delete require.cache[require.resolve('../../dashboard/assets/js/chatbot-ui.js')];
  const ChatbotUI = require('../../dashboard/assets/js/chatbot-ui.js');

  // Simulate user and bot messages
  ChatbotUI.renderUserMessage("i am facing facility level barrier what should i do");
  ChatbotUI.renderAssistantResponse({
    answer: "I understand this is a challenging situation... BarrierLens groups this as a Facility Barrier.",
    relatedPage: { label: "State Analysis", url: "pages/state_analysis.html" },
    disclaimer: "These solutions are external public health programmes."
  });

  it('Chatbot UI writes conversation turns to localStorage', () => {
    const rawHistory = mockLocalStorageStore['bl_chatbot_messages_history'];
    assert.ok(rawHistory, 'bl_chatbot_messages_history must be in localStorage');
    const history = JSON.parse(rawHistory);
    assert.strictEqual(history.length, 2, 'Must contain 2 turns (1 user, 1 bot)');
    assert.strictEqual(history[0].role, 'user');
    assert.strictEqual(history[0].text, 'i am facing facility level barrier what should i do');
    assert.strictEqual(history[1].role, 'assistant');
    assert.ok(history[1].text.includes('Facility Barrier'));
  });

  it('Chatbot UI writes context state to localStorage', () => {
    const rawState = mockLocalStorageStore['bl_chatbot_context_state'];
    assert.ok(rawState, 'bl_chatbot_context_state must be in localStorage');
    const state = JSON.parse(rawState);
    assert.ok(state.activeBarrier, 'Active barrier must be saved');
  });

  // ---------------------------------------------------------------------------
  // TEST 3: Clear Chat Resets Storage
  // ---------------------------------------------------------------------------
  console.log('\n--- Test 3: Clear Chat Operation ---');
  ChatbotUI.clearChat();
  it('clearChat removes messages history from localStorage', () => {
    assert.strictEqual(mockLocalStorageStore['bl_chatbot_messages_history'], undefined, 'History must be removed on explicit clearChat');
  });

  // ---------------------------------------------------------------------------
  // TEST 4: Server Session Expiration Removal
  // ---------------------------------------------------------------------------
  console.log('\n--- Test 4: Server Session Expiration Check ---');
  const serverPath = path.resolve(__dirname, '../../server.js');
  const serverCode = fs.readFileSync(serverPath, 'utf8');

  it('server.js SESSION_TTL_MS is set to permanent (10 years)', () => {
    assert.ok(serverCode.includes('10 * 365 * 24 * 60 * 60 * 1000') || serverCode.includes('315360000'), 'Session TTL must be permanent');
  });

  it('server.js does not drop sessions based on issuedAt expiration', () => {
    assert.ok(!serverCode.includes('Date.now() - session.issuedAt > SESSION_TTL_MS'), 'IssuedAt expiration drop must be removed');
  });

  it('server.js persists sessions to .server_sessions.json', () => {
    assert.ok(serverCode.includes('SESSIONS_PERSIST_FILE') && serverCode.includes('saveSessionsToFile'), 'server.js must persist sessions to file');
  });

  // ---------------------------------------------------------------------------
  // TEST 5: Auth & Login Page Expiration Removal
  // ---------------------------------------------------------------------------
  console.log('\n--- Test 5: Client Auth Expiration Removal ---');
  const loginPagePath = path.resolve(__dirname, '../../dashboard/assets/js/login-page.js');
  const loginCode = fs.readFileSync(loginPagePath, 'utf8');

  it('login-page.js does not clear authenticated sessions with "session has expired"', () => {
    assert.ok(!loginCode.includes('Your previous session has expired. Please sign in again.'), 'Expiration error prompt must be removed');
  });

  const authPath = path.resolve(__dirname, '../../dashboard/assets/js/auth.js');
  const authCode = fs.readFileSync(authPath, 'utf8');

  it('auth.js always writes session to localStorage', () => {
    assert.ok(authCode.includes('store.setItem(STORAGE_KEY, JSON.stringify(session))'), 'Must write session');
  });

  console.log('\n=========================================================================');
  console.log(`SESSION PERSISTENCE AUDIT SUMMARY: ${passCount} PASSED, ${failCount} FAILED out of ${passCount + failCount} assertions.`);
  console.log('=========================================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runSessionPersistenceTests().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
