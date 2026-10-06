/**
 * BARRIERLENS — DEMO AUTHENTICATION LAYER
 * ---------------------------------------------------------------------------
 * This is a LOCAL, DEMONSTRATION-ONLY authentication helper written for a
 * college major-project demo. It is NOT production-level security:
 *   - credentials are stored in plain text in this file,
 *   - the browser-side session marker can be edited from the console,
 *   - there is no rate limiting, lockout, hashing or server-side validation
 *     unless the project web server (server.js) is running.
 * It only exists so the platform can demonstrate a login-first flow.
 *
 * Storage keys
 *   bl_auth_session  ->  JSON session marker (localStorage when "remember me"
 *                       is checked, otherwise sessionStorage)
 */

(function (global) {
  "use strict";

  var STORAGE_KEY = "bl_auth_session";

  /**
   * Demo accounts. Plain-text on purpose (see header note).
   * Add or edit freely for demonstration purposes.
   */
  var DEMO_USERS = [
    { username: "research@barrierlens.in", password: "BarrierLens@2025", name: "Research Team", role: "Research Lead" },
    { username: "demo",                    password: "demo1234",        name: "Demo Researcher", role: "Demo Mode" },
    { username: "1ga23cs114",              password: "BarrierLens@2025", name: "Parvati Hiregoudra", role: "Team Member" },
    { username: "1ga23cs125",              password: "BarrierLens@2025", name: "Prathibha B C",  role: "Team Member" },
    { username: "1ga23cs130",              password: "BarrierLens@2025", name: "Rabiya Bushra M", role: "Team Member" },
    { username: "1ga23cs153",              password: "BarrierLens@2025", name: "Sharmila S",     role: "Team Member" }
  ];

  /* ------------------------------------------------------------------ */
  /* Storage helpers (all wrapped: private mode / file:// must not break) */
  /* ------------------------------------------------------------------ */

  function getStore(useLocal) {
    try {
      var store = useLocal ? global.localStorage : global.sessionStorage;
      var probe = "__bl_probe__";
      store.setItem(probe, "1");
      store.removeItem(probe);
      return store;
    } catch (err) {
      return null;
    }
  }

  function readSession() {
    var stores = [getStore(true), getStore(false)];
    for (var i = 0; i < stores.length; i++) {
      if (!stores[i]) continue;
      try {
        var raw = stores[i].getItem(STORAGE_KEY);
        if (raw) {
          var parsed = JSON.parse(raw);
          if (parsed && parsed.authenticated && parsed.user) return parsed;
        }
      } catch (err) { /* ignore malformed marker */ }
    }
    return null;
  }

  function writeSession(session, remember) {
    var store = getStore(!!remember);
    if (!store) store = getStore(true);
    if (!store) return false;
    try {
      var other = store === getStore(true) ? getStore(false) : getStore(true);
      if (other) other.removeItem(STORAGE_KEY);
      store.setItem(STORAGE_KEY, JSON.stringify(session));
      return true;
    } catch (err) {
      return false;
    }
  }

  function clearSession() {
    [getStore(true), getStore(false)].forEach(function (store) {
      if (!store) return;
      try { store.removeItem(STORAGE_KEY); } catch (err) { /* ignore */ }
    });
  }

  /* ------------------------------------------------------------------ */
  /* Credential helpers                                                   */
  /* ------------------------------------------------------------------ */

  function findLocalUser(username, password) {
    if (!username || !password) return null;
    var needle = String(username).trim().toLowerCase();
    for (var i = 0; i < DEMO_USERS.length; i++) {
      var u = DEMO_USERS[i];
      if (u.username.toLowerCase() === needle && u.password === password) {
        return { name: u.name, role: u.role, username: u.username };
      }
    }
    return null;
  }

  /**
   * Try the project web server first (server.js keeps an HttpOnly cookie so the
   * dashboard pages stay protected when served over http://localhost:3000).
   * Falls back to the local demo check when no such endpoint exists.
   */
  function login(username, password, remember) {
    var attempts = [];
    if (typeof global.fetch === "function") {
      attempts.push(
        global.fetch("/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ username: username, password: password, remember: !!remember })
        }).then(function (res) {
          return res.json().then(function (body) {
            return { server: true, ok: res.ok, body: body || {} };
          }).catch(function () {
            return { server: true, ok: false, body: {} };
          });
        }).catch(function () {
          return { server: true, ok: false, body: {}, unreachable: true };
        })
      );
    }

    return Promise.all(attempts).then(function (results) {
      var serverResult = results.length ? results[0] : null;
      var user = null;

      if (serverResult && serverResult.ok && serverResult.body && serverResult.body.authenticated) {
        user = serverResult.body.user || { name: (serverResult.body.username || username), role: "Researcher" };
      } else {
        user = findLocalUser(username, password);
      }

      if (!user) {
        return {
          ok: false,
          error: "Invalid credentials. Use the demo account shown below the sign-in button."
        };
      }

      var session = {
        authenticated: true,
        mode: (serverResult && serverResult.ok) ? "server" : "local",
        user: user,
        issuedAt: Date.now()
      };
      writeSession(session, remember);

      return { ok: true, user: user, mode: session.mode };
    });
  }

  /**
   * Ask the web server whether a session really exists.
   * Resolves true / false when the server answered, null when it is unreachable
   * (static file hosting, file://) and the local marker is the only source.
   */
  function verifyServerSession() {
    if (typeof global.fetch !== "function") return Promise.resolve(null);
    return global.fetch("/auth/session", { credentials: "same-origin" })
      .then(function (res) {
        return res.json().then(function (body) {
          return !!(body && body.authenticated);
        });
      })
      .catch(function () {
        return null;
      });
  }

  function logout() {
    var done = function () { clearSession(); };
    if (typeof global.fetch === "function") {
      return global.fetch("/auth/logout", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" }
      }).catch(function () { /* offline demo mode */ }).then(done, done);
    }
    done();
    return Promise.resolve();
  }

  /* ------------------------------------------------------------------ */
  /* Path helpers                                                         */
  /* ------------------------------------------------------------------ */

  function isPagesDir() {
    return String(global.location.pathname).replace(/\\/g, "/").indexOf("/pages/") !== -1;
  }

  function loginHref() {
    return isPagesDir() ? "../login.html" : "login.html";
  }

  function homeHref() {
    return isPagesDir() ? "../index.html" : "index.html";
  }

  global.BarrierLensAuth = {
    STORAGE_KEY: STORAGE_KEY,
    DEMO_USERS: DEMO_USERS,
    login: login,
    logout: logout,
    verifyServerSession: verifyServerSession,
    isAuthenticated: function () { return readSession() !== null; },
    getSession: readSession,
    getUser: function () { var s = readSession(); return s ? s.user : null; },
    clearSession: clearSession,
    loginHref: loginHref,
    homeHref: homeHref,
    isPagesDir: isPagesDir
  };
})(window);