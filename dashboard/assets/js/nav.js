// Shared Navigation & Search Shell for BarrierLens Dashboard (Member 4 Shell)
document.addEventListener("DOMContentLoaded", function () {
  const pages = [
    { name: "National Overview", code: "A", category: "National Analytics", path: "national_overview.html", desc: "Prevalence, domain rankings, and observed vs predicted model alignment across 724k women." },
    { name: "Base Paper Comparison", code: "B", category: "Published Benchmarks", path: "base_paper_comparison.html", desc: "Side-by-side comparison with Pradhan & De (2025) BMC Health benchmark research." },
    { name: "State-wise Barrier Analysis", code: "C", category: "State Disparities", path: "state_analysis.html", desc: "Geographical inequality across 36 Indian States and UTs with interactive rankings." },
    { name: "Demographic & Socioeconomic", code: "D", category: "Socioeconomic Breakdown", path: "demographic_analysis.html", desc: "Wealth quintiles, education levels, age cohorts, caste, and occupational groups." },
    { name: "Rural–Urban Comparison", code: "E", category: "Residence Disparities", path: "rural_urban.html", desc: "Comparative analysis of healthcare access constraints between rural (75.2%) and urban (24.8%)." },
    { name: "Household Empowerment", code: "F", category: "Autonomy & Empowerment", path: "empowerment.html", desc: "Women's financial autonomy, medical decision-making agency, and technology access." },
    { name: "Multiple Barrier Analysis", code: "G", category: "Multi-Barrier Analytics", path: "multiple_barrier.html", desc: "Compounded disadvantage across 0, 1, 2, or 3 concurrent healthcare barrier domains." },
    { name: "Risk Archetypes (k = 2)", code: "H", category: "Risk Segmentation", path: "risk_archetypes.html", desc: "K-Means risk segmentation: Cluster 0 (High Vulnerability) vs Cluster 1 (Digital Included)." },
    { name: "Healthcare Utilization Impact", code: "I", category: "Impact Evaluation", path: "outcome_impact.html", desc: "Predictive evaluation of barrier impact on Unmet Family Planning Need and ANC Gap." },
    { name: "Explainability & SHAP", code: "J", category: "Model Interpretability", path: "explainability.html", desc: "Logistic Regression odds ratios, feature rankings, and SHAP explainability plots." }
  ];

  const pathname = window.location.pathname.replace(/\\/g, "/");
  const inPagesDir = pathname.includes("/pages/");
  const currentFile = pathname.split("/").pop() || "index.html";

  function pageHref(pageFile) {
    return inPagesDir ? pageFile : "pages/" + pageFile;
  }

  const homeHref = inPagesDir ? "../index.html" : "index.html";

  // Build Top Navigation HTML
  const navHtml = `
    <header class="header-nav" id="header-nav">
      <div class="brand-container">
        <a href="${homeHref}" class="brand-title">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2.2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          <span>BarrierLens P48</span>
        </a>
        <span class="brand-badge">NFHS-5</span>
      </div>

      <div class="nav-controls">
        <button class="nav-search-btn" id="global-search-trigger" aria-label="Search research modules">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <span>Search Modules...</span>
          <kbd style="font-size:0.7rem; background:rgba(255,255,255,0.15); padding:1px 4px; border-radius:3px;">/</kbd>
        </button>

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
      </div>
    </header>

    <!-- Global Command Search Modal -->
    <div class="modal-backdrop" id="search-modal">
      <div class="modal-card">
        <div class="modal-header">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" class="modal-search-input" id="modal-search-input" placeholder="Search modules, datasets, SHAP plots, states... (ESC to close)" />
        </div>
        <div class="modal-body" id="modal-search-results">
          ${pages
            .map(
              (p) => `
            <a href="${pageHref(p.path)}" class="modal-item">
              <div>
                <div style="font-weight:700; color:#0f172a; font-size:0.9rem;">
                  <span class="nav-code" style="background:#2563eb; color:#ffffff;">PAGE ${p.code}</span> ${p.name}
                </div>
                <div style="font-size:0.775rem; color:#64748b; margin-top:2px;">${p.desc}</div>
              </div>
              <span style="font-size:0.75rem; font-weight:700; color:#2563eb;">Explore &rarr;</span>
            </a>
          `
            )
            .join("")}
        </div>
      </div>
    </div>
  `;

  // Inject Navigation Header
  const headerElem = document.getElementById("main-nav-container");
  if (headerElem) {
    headerElem.innerHTML = navHtml;
  } else {
    document.body.insertAdjacentHTML("afterbegin", navHtml);
  }

  // Inject Breadcrumbs if inside a subpage
  if (inPagesDir) {
    const currentPageObj = pages.find((p) => p.path === currentFile);
    if (currentPageObj) {
      const pageHeader = document.querySelector(".page-header");
      if (pageHeader) {
        const breadcrumbHtml = `
          <div class="breadcrumb-bar">
            <a href="${homeHref}" class="breadcrumb-link">Dashboard Portal</a>
            <span class="breadcrumb-separator">&rsaquo;</span>
            <span>Module ${currentPageObj.code}</span>
            <span class="breadcrumb-separator">&rsaquo;</span>
            <span style="color:var(--text-main); font-weight:600;">${currentPageObj.name}</span>
          </div>
        `;
        pageHeader.insertAdjacentHTML("afterbegin", breadcrumbHtml);
      }
    }
  }

  // Mobile Menu Listener
  const toggleBtn = document.getElementById("nav-toggle-btn");
  const navMenu = document.getElementById("nav-menu");
  if (toggleBtn && navMenu) {
    toggleBtn.addEventListener("click", function () {
      navMenu.classList.toggle("mobile-open");
    });
  }

  // Global Search Modal Listeners
  const searchTrigger = document.getElementById("global-search-trigger");
  const searchModal = document.getElementById("search-modal");
  const searchInput = document.getElementById("modal-search-input");
  const searchResults = document.getElementById("modal-search-results");

  function openSearchModal() {
    if (searchModal) {
      searchModal.classList.add("active");
      if (searchInput) searchInput.focus();
    }
  }

  function closeSearchModal() {
    if (searchModal) {
      searchModal.classList.remove("active");
    }
  }

  if (searchTrigger) {
    searchTrigger.addEventListener("click", openSearchModal);
  }

  if (searchModal) {
    searchModal.addEventListener("click", function (e) {
      if (e.target === searchModal) closeSearchModal();
    });
  }

  // Keybindings (Keyboard Shortcut '/' to search, 'Esc' to close)
  document.addEventListener("keydown", function (e) {
    if (e.key === "/" && document.activeElement.tagName !== "INPUT" && document.activeElement.tagName !== "TEXTAREA") {
      e.preventDefault();
      openSearchModal();
    } else if (e.key === "Escape") {
      closeSearchModal();
    }
  });

  // Modal Search Filter Handler
  if (searchInput && searchResults) {
    searchInput.addEventListener("input", function () {
      const q = this.value.toLowerCase().trim();
      const filtered = pages.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.code.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.desc.toLowerCase().includes(q)
      );

      if (filtered.length === 0) {
        searchResults.innerHTML = `<div style="padding:20px; text-align:center; color:#64748b; font-size:0.875rem;">No matching research modules found.</div>`;
      } else {
        searchResults.innerHTML = filtered
          .map(
            (p) => `
          <a href="${pageHref(p.path)}" class="modal-item">
            <div>
              <div style="font-weight:700; color:#0f172a; font-size:0.9rem;">
                <span class="nav-code" style="background:#2563eb; color:#ffffff;">PAGE ${p.code}</span> ${p.name}
              </div>
              <div style="font-size:0.775rem; color:#64748b; margin-top:2px;">${p.desc}</div>
            </div>
            <span style="font-size:0.75rem; font-weight:700; color:#2563eb;">Explore &rarr;</span>
          </a>
        `
          )
          .join("");
      }
    });
  }

  // Load Assistant Scripts dynamically if missing
  const chatbotScripts = [
    'assets/js/barrier-selector.js',
    'assets/js/context-manager.js',
    'assets/js/session-store.js',
    'assets/js/intent-router.js',
    'assets/js/mode-router.js',
    'assets/js/guided-question-schema.js',
    'assets/js/barrier-data-map.js',
    'assets/js/evidence-engine.js',
    'assets/js/comparison-engine.js',
    'assets/js/chatbot-data.js',
    'assets/js/intent-engine.js',
    'assets/js/retrieval-engine.js',
    'assets/js/calculation-engine.js',
    'assets/js/response-engine.js',
    'assets/js/i18n.js',
    'assets/js/speech.js',
    'assets/js/tts.js',
    'assets/js/voice.js',
    'assets/js/report-template.js',
    'assets/js/report-generator.js',
    'assets/js/api-service.js',
    'assets/js/barrier-ui.js',
    'assets/js/language-selector.js',
    'assets/js/choose-mode-screen.jsx',
    'assets/js/guided-input-ui.jsx',
    'assets/js/evidence-card.jsx',
    'assets/js/solution-card.jsx',
    'assets/js/chatbot-ui.js'
  ];

  if (!document.querySelector('link[href*="report.css"]')) {
    const reportCss = document.createElement('link');
    reportCss.rel = 'stylesheet';
    reportCss.href = inPagesDir ? '../assets/css/report.css' : 'assets/css/report.css';
    document.head.appendChild(reportCss);
  }

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
