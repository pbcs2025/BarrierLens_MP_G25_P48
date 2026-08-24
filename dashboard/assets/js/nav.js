// Shared Navigation Component for BarrierLens Dashboard (Member 4 Shell)
document.addEventListener("DOMContentLoaded", function () {
  const pages = [
    { name: "National Overview", code: "A", path: "national_overview.html" },
    { name: "Base Paper Comparison", code: "B", path: "base_paper_comparison.html" },
    { name: "State-wise Barrier Analysis", code: "C", path: "state_analysis.html" },
    { name: "Demographic & Socioeconomic", code: "D", path: "demographic_analysis.html" },
    { name: "Rural–Urban Comparison", code: "E", path: "rural_urban.html" },
    { name: "Household Empowerment", code: "F", path: "empowerment.html" },
    { name: "Multiple Barrier Analysis", code: "G", path: "multiple_barrier.html" },
    { name: "Risk Archetypes", code: "H", path: "risk_archetypes.html" },
    { name: "Healthcare Utilization Impact", code: "I", path: "outcome_impact.html" },
    { name: "Explainability & Regression", code: "J", path: "explainability.html" }
  ];

  const pathname = window.location.pathname.replace(/\\/g, "/");
  const inPagesDir = pathname.includes("/pages/");
  const currentFile = pathname.split("/").pop() || "index.html";

  function pageHref(pageFile) {
    return inPagesDir ? pageFile : "pages/" + pageFile;
  }

  const homeHref = inPagesDir ? "../index.html" : "index.html";

  const navHtml = `
    <header class="header-nav">
      <div class="brand-container">
        <a href="${homeHref}" class="brand-title">BarrierLens P48</a>
        <span class="brand-badge">NFHS-5</span>
      </div>
      <button class="nav-toggle-btn" id="nav-toggle-btn" aria-label="Toggle navigation menu">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
      </button>
      <nav id="nav-menu" class="nav-menu">
        <ul class="nav-links">
          ${pages
            .map(
              (p) =>
                `<li>
                  <a href="${pageHref(p.path)}" class="nav-link ${
                  currentFile === p.path ? "active" : ""
                }">
                    <span class="nav-code">${p.code}</span>
                    <span class="nav-text">${p.name}</span>
                  </a>
                </li>`
            )
            .join("")}
        </ul>
      </nav>
    </header>
  `;

  const headerElem = document.getElementById("main-nav-container");
  if (headerElem) {
    headerElem.innerHTML = navHtml;
  } else {
    document.body.insertAdjacentHTML("afterbegin", navHtml);
  }

  // Mobile menu toggle logic
  const toggleBtn = document.getElementById("nav-toggle-btn");
  const navMenu = document.getElementById("nav-menu");
  if (toggleBtn && navMenu) {
    toggleBtn.addEventListener("click", function () {
      navMenu.classList.toggle("mobile-open");
    });
  }

  // Add Member 1 & Member 3 Chatbot Layer
  const chatbotScripts = [
    'assets/js/chatbot-data.js',
    'assets/js/intent-engine.js',
    'assets/js/retrieval-engine.js',
    'assets/js/calculation-engine.js',
    'assets/js/evidence-engine.js',
    'assets/js/response-engine.js',
    'assets/js/i18n.js',
    'assets/js/speech.js',
    'assets/js/tts.js',
    'assets/js/voice.js',
    'assets/js/chatbot-ui.js'
  ];

  if (!window.BarrierLensChatbotUI) {
    chatbotScripts.forEach(function (src) {
      const fullSrc = inPagesDir ? '../' + src : src;
      const scriptName = src.split('/').pop();
      if (!document.querySelector('script[src*="' + scriptName + '"]')) {
        const tag = document.createElement('script');
        tag.src = fullSrc;
        tag.async = false;
        document.head.appendChild(tag);
      }
    });
  }
});

