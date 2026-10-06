/**
 * BARRIERLENS — LOGIN / LANDING PAGE CONTROLLER
 * ---------------------------------------------------------------------------
 * Handles: floating-label behaviour (CSS), show/hide password, demo access,
 * the staged "Signing in -> Access Granted" transition and the redirect into
 * the EXISTING BarrierLens Dashboard Home. No dashboard logic is touched here.
 */

(function () {
  "use strict";

  var Auth = window.BarrierLensAuth;

  var form = document.getElementById("login-form");
  var usernameInput = document.getElementById("bl-username");
  var passwordInput = document.getElementById("bl-password");
  var rememberInput = document.getElementById("bl-remember");
  var toggleBtn = document.getElementById("bl-toggle-password");
  var signInBtn = document.getElementById("bl-signin");
  var demoBtn = document.getElementById("bl-demo-login");
  var errorBox = document.getElementById("login-error");
  var card = document.getElementById("login-card");
  var overlay = document.getElementById("bl-transition");
  var overlayStatus = document.getElementById("bl-transition-status");
  var liveRegion = document.getElementById("bl-live-status");

  if (!form || !Auth) return;

  var reduceMotion = window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : { matches: false };

  function reduced() {
    return !!reduceMotion.matches;
  }

  /* ---------------------------------------------------------------- */
  /* Destination after login                                           */
  /* ---------------------------------------------------------------- */

  function getNextTarget() {
    var params = new URLSearchParams(window.location.search);
    var next = params.get("next");
    if (next && next.indexOf("login.html") === -1) {
      return next.charAt(0) === "/" ? next : Auth.homeHref();
    }
    return Auth.homeHref();
  }

  /* ---------------------------------------------------------------- */
  /* Small helpers                                                     */
  /* ---------------------------------------------------------------- */

  function announce(message) {
    if (liveRegion) liveRegion.textContent = message;
  }

  function showError(message) {
    if (!errorBox) return;
    errorBox.textContent = message;
    errorBox.hidden = false;
    announce(message);
    if (card) {
      card.animate(
        [
          { transform: "translateX(0)" },
          { transform: "translateX(-6px)" },
          { transform: "translateX(6px)" },
          { transform: "translateX(0)" }
        ],
        { duration: 260, easing: "ease-out" }
      );
    }
  }

  function clearError() {
    if (!errorBox) return;
    errorBox.hidden = true;
    errorBox.textContent = "";
  }

  function setBusy(isBusy) {
    if (!signInBtn) return;
    signInBtn.classList.toggle("is-busy", isBusy);
    signInBtn.disabled = isBusy;
    var label = signInBtn.querySelector(".bl-btn-label");
    if (label) label.textContent = isBusy ? "SIGNING IN…" : "SIGN IN";
    if (demoBtn) demoBtn.disabled = isBusy;
  }

  /* ---------------------------------------------------------------- */
  /* Show / hide password                                              */
  /* ---------------------------------------------------------------- */

  if (toggleBtn && passwordInput) {
    toggleBtn.addEventListener("click", function () {
      var reveal = passwordInput.type === "password";
      passwordInput.type = reveal ? "text" : "password";
      toggleBtn.setAttribute("aria-pressed", reveal ? "true" : "false");
      toggleBtn.setAttribute("aria-label", reveal ? "Hide password" : "Show password");
      passwordInput.focus();
    });
  }

  /* ---------------------------------------------------------------- */
  /* Sign-in transition: Signing in -> Access Granted -> Dashboard     */
  /* ---------------------------------------------------------------- */

  function runTransition(destination) {
    var fast = reduced();

    if (!overlay) {
      window.location.replace(destination);
      return;
    }

    overlay.classList.add("is-active");
    overlayStatus.textContent = "Signing in…";
    announce("Signing in. Verifying research credentials.");

    if (fast) {
      overlayStatus.textContent = "Access Granted";
      overlay.classList.add("is-granted");
      window.setTimeout(function () { window.location.replace(destination); }, 220);
      return;
    }

    window.setTimeout(function () {
      overlayStatus.textContent = "Access Granted";
      overlay.classList.add("is-granted");
      announce("Access granted. Opening the BarrierLens dashboard.");
    }, 620);

    window.setTimeout(function () {
      if (card) {
        card.animate(
          [
            { opacity: 1, transform: "scale(1)" },
            { opacity: 0, transform: "scale(0.96)" }
          ],
          { duration: 320, easing: "cubic-bezier(0.4,0,0.2,1)", fill: "forwards" }
        );
      }
    }, 560);

    window.setTimeout(function () {
      window.location.replace(destination);
    }, 1080);
  }

  /* ---------------------------------------------------------------- */
  /* Authentication attempt                                            */
  /* ---------------------------------------------------------------- */

  function attemptLogin(username, password) {
    clearError();

    if (!username || !password) {
      showError("Please enter both your email/username and password.");
      (username ? passwordInput : usernameInput).focus();
      return;
    }

    setBusy(true);
    announce("Signing in.");

    Auth.login(username, password, rememberInput && rememberInput.checked)
      .then(function (result) {
        if (!result || !result.ok) {
          setBusy(false);
          showError((result && result.error) || "Unable to sign in. Please try again.");
          passwordInput.select();
          return;
        }
        runTransition(getNextTarget());
      })
      .catch(function () {
        setBusy(false);
        showError("Unexpected error while signing in. Please try again.");
      });
  }

  /* ---------------------------------------------------------------- */
  /* Events                                                            */
  /* ---------------------------------------------------------------- */

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    attemptLogin(usernameInput.value.trim(), passwordInput.value);
  });

  if (demoBtn) {
    demoBtn.addEventListener("click", function () {
      usernameInput.value = "research@barrierlens.in";
      passwordInput.value = "BarrierLens@2025";
      clearError();
      attemptLogin(usernameInput.value, passwordInput.value);
    });
  }

  [usernameInput, passwordInput].forEach(function (input) {
    if (!input) return;
    input.addEventListener("input", clearError);
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Enter" && document.activeElement && document.activeElement.tagName === "INPUT") {
      if (form.requestSubmit) form.requestSubmit();
    }
  });

  /* ---------------------------------------------------------------- */
  /* Already signed in? Go straight to the dashboard.                  */
  /* The server is authoritative when it answers, otherwise the local   */
  /* marker is used (static hosting / file://).                         */
  /* ---------------------------------------------------------------- */

  if (Auth.isAuthenticated()) {
    Auth.verifyServerSession().then(function (serverConfirmed) {
      if (serverConfirmed === false) {
        Auth.clearSession();
        showError("Your previous session has expired. Please sign in again.");
        return;
      }
      window.location.replace(getNextTarget());
    }, function () {
      window.location.replace(getNextTarget());
    });
  }
})();