(function () {
  "use strict";
  var Auth = window.BarrierLensAuth;

  var loginForm = document.getElementById("login-form");
  var registerForm = document.getElementById("register-form");

  var usernameInput = document.getElementById("bl-username");
  var passwordInput = document.getElementById("bl-password");
  var rememberInput = document.getElementById("bl-remember");
  var toggleBtn = document.getElementById("bl-toggle-password");
  var signInBtn = document.getElementById("bl-signin");
  var demoBtn = document.getElementById("bl-demo-login");
  var loginErrorBox = document.getElementById("login-error");

  var regNameInput = document.getElementById("bl-reg-name");
  var regUsernameInput = document.getElementById("bl-reg-username");
  var regRoleSelect = document.getElementById("bl-reg-role");
  var regPasswordInput = document.getElementById("bl-reg-password");
  var regConfirmInput = document.getElementById("bl-reg-confirm");
  var signUpBtn = document.getElementById("bl-signup");
  var registerErrorBox = document.getElementById("register-error");

  var tabLoginBtn = document.getElementById("tab-login-btn");
  var tabRegisterBtn = document.getElementById("tab-register-btn");

  var cardTitle = document.getElementById("card-title");
  var cardSub = document.getElementById("card-sub");

  var card = document.getElementById("login-card");
  var overlay = document.getElementById("bl-transition");
  var overlayStatus = document.getElementById("bl-transition-status");
  var liveRegion = document.getElementById("bl-live-status");

  if (!loginForm || !Auth) return;

  var reduceMotion = window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : { matches: false };

  function reduced() {
    return !!reduceMotion.matches;
  }

  function getNextTarget() {
    var params = new URLSearchParams(window.location.search);
    var next = params.get("next");
    if (next && next.indexOf("login.html") === -1) {
      return next.charAt(0) === "/" ? next : Auth.homeHref();
    }
    return Auth.homeHref();
  }

  function announce(message) {
    if (liveRegion) liveRegion.textContent = message;
  }

  function showError(box, message) {
    if (!box) return;
    box.textContent = message;
    box.hidden = false;
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

  function clearErrors() {
    if (loginErrorBox) { loginErrorBox.hidden = true; loginErrorBox.textContent = ""; }
    if (registerErrorBox) { registerErrorBox.hidden = true; registerErrorBox.textContent = ""; }
  }

  function setBusy(btn, isBusy, busyText, idleText) {
    if (!btn) return;
    btn.classList.toggle("is-busy", isBusy);
    btn.disabled = isBusy;
    var label = btn.querySelector(".bl-btn-label");
    if (label) label.textContent = isBusy ? busyText : idleText;
    if (demoBtn) demoBtn.disabled = isBusy;
  }

  /* ---------------------------------------------------------------- */
  /* Tab Switching (Sign In vs Register)                               */
  /* ---------------------------------------------------------------- */

  function switchTab(mode) {
    clearErrors();
    if (mode === "register") {
      tabLoginBtn.classList.remove("active");
      tabLoginBtn.setAttribute("aria-selected", "false");
      tabRegisterBtn.classList.add("active");
      tabRegisterBtn.setAttribute("aria-selected", "true");

      loginForm.style.display = "none";
      registerForm.style.display = "block";

      if (cardTitle) cardTitle.textContent = "Create Research Account";
      if (cardSub) cardSub.textContent = "Register for BarrierLens access intelligence";

      if (regNameInput) regNameInput.focus();
    } else {
      tabRegisterBtn.classList.remove("active");
      tabRegisterBtn.setAttribute("aria-selected", "false");
      tabLoginBtn.classList.add("active");
      tabLoginBtn.setAttribute("aria-selected", "true");

      registerForm.style.display = "none";
      loginForm.style.display = "block";

      if (cardTitle) cardTitle.textContent = "Welcome to BarrierLens";
      if (cardSub) cardSub.textContent = "Enter the research intelligence dashboard";

      if (usernameInput) usernameInput.focus();
    }
  }

  if (tabLoginBtn && tabRegisterBtn) {
    tabLoginBtn.addEventListener("click", function () { switchTab("login"); });
    tabRegisterBtn.addEventListener("click", function () { switchTab("register"); });
  }

  /* ---------------------------------------------------------------- */
  /* Show / Hide Password                                              */
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
  /* Sign-in / Registration Transition                                 */
  /* ---------------------------------------------------------------- */

  function runTransition(destination, statusMessage) {
    var fast = reduced();

    if (!overlay) {
      window.location.replace(destination);
      return;
    }

    overlay.classList.add("is-active");
    overlayStatus.textContent = statusMessage || "Signing in…";
    announce(statusMessage || "Signing in. Verifying research credentials.");

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
  /* Authentication & Registration Attempts                           */
  /* ---------------------------------------------------------------- */

  function attemptLogin(username, password) {
    clearErrors();

    if (!username || !password) {
      showError(loginErrorBox, "Please enter both your email/username and password.");
      (username ? passwordInput : usernameInput).focus();
      return;
    }

    setBusy(signInBtn, true, "SIGNING IN…", "SIGN IN");
    announce("Signing in.");

    Auth.login(username, password, rememberInput && rememberInput.checked)
      .then(function (result) {
        if (!result || !result.ok) {
          setBusy(signInBtn, false, "SIGNING IN…", "SIGN IN");
          showError(loginErrorBox, (result && result.error) || "Unable to sign in. Please try again.");
          passwordInput.select();
          return;
        }
        runTransition(getNextTarget(), "Signing in…");
      })
      .catch(function () {
        setBusy(signInBtn, false, "SIGNING IN…", "SIGN IN");
        showError(loginErrorBox, "Unexpected error while signing in. Please try again.");
      });
  }

  function attemptRegister(name, username, role, password, confirmPassword) {
    clearErrors();

    if (!name) {
      showError(registerErrorBox, "Please enter your full name.");
      if (regNameInput) regNameInput.focus();
      return;
    }
    if (!username) {
      showError(registerErrorBox, "Please enter your email or username.");
      if (regUsernameInput) regUsernameInput.focus();
      return;
    }
    if (!password || password.length < 6) {
      showError(registerErrorBox, "Password must be at least 6 characters long.");
      if (regPasswordInput) regPasswordInput.focus();
      return;
    }
    if (password !== confirmPassword) {
      showError(registerErrorBox, "Passwords do not match. Please try again.");
      if (regConfirmInput) regConfirmInput.focus();
      return;
    }

    setBusy(signUpBtn, true, "CREATING ACCOUNT…", "CREATE ACCOUNT");
    announce("Creating account.");

    Auth.register(name, username, password, role)
      .then(function (result) {
        if (!result || !result.ok) {
          setBusy(signUpBtn, false, "CREATING ACCOUNT…", "CREATE ACCOUNT");
          showError(registerErrorBox, (result && result.error) || "Registration failed. Please try again.");
          return;
        }
        runTransition(getNextTarget(), "Account Created…");
      })
      .catch(function () {
        setBusy(signUpBtn, false, "CREATING ACCOUNT…", "CREATE ACCOUNT");
        showError(registerErrorBox, "Unexpected error during registration. Please try again.");
      });
  }

  /* ---------------------------------------------------------------- */
  /* Event Listeners                                                   */
  /* ---------------------------------------------------------------- */

  loginForm.addEventListener("submit", function (event) {
    event.preventDefault();
    attemptLogin(usernameInput.value.trim(), passwordInput.value);
  });

  if (registerForm) {
    registerForm.addEventListener("submit", function (event) {
      event.preventDefault();
      attemptRegister(
        regNameInput ? regNameInput.value.trim() : "",
        regUsernameInput ? regUsernameInput.value.trim() : "",
        regRoleSelect ? regRoleSelect.value : "Research Lead",
        regPasswordInput ? regPasswordInput.value : "",
        regConfirmInput ? regConfirmInput.value : ""
      );
    });
  }

  if (demoBtn) {
    demoBtn.addEventListener("click", function () {
      switchTab("login");
      usernameInput.value = "research@barrierlens.in";
      passwordInput.value = "BarrierLens@2025";
      clearErrors();
      attemptLogin(usernameInput.value, passwordInput.value);
    });
  }

  [usernameInput, passwordInput, regNameInput, regUsernameInput, regPasswordInput, regConfirmInput].forEach(function (input) {
    if (!input) return;
    input.addEventListener("input", clearErrors);
  });

  /* ---------------------------------------------------------------- */
  /* Auto-redirect if session active                                   */
  /* ---------------------------------------------------------------- */

  if (Auth.isAuthenticated()) {
    Auth.verifyServerSession().then(function (serverConfirmed) {
      if (serverConfirmed === false) {
        Auth.clearSession();
        showError(loginErrorBox, "Your previous session has expired. Please sign in again.");
        return;
      }
      window.location.replace(getNextTarget());
    }, function () {
      window.location.replace(getNextTarget());
    });
  }
})();