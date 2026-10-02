/**
 * BARRIERLENS — GLOBAL APPLICATION SHELL, SIDEBAR & TOP HEADER
 * Injects modern collapsible sidebar, top navigation header, command search, theme toggle, and AI assistant hook.
 */

document.addEventListener("DOMContentLoaded", function () {
  const pathname = window.location.pathname.replace(/\\/g, "/");
  const inPagesDir = pathname.includes("/pages/");
  const currentFile = pathname.split("/").pop() || "index.html";

  function pageHref(file) {
    if (file === "index.html") {
      return inPagesDir ? "../index.html" : "index.html";
    }
    return inPagesDir ? file : "pages/" + file;
  }

  // Navigation Data Structure organized into logical intelligence modules
  const navSections = [
    {
      title: "Main Dashboard",
      items: [
        { name: "Dashboard Home", code: "H", path: "index.html", icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>', desc: "Executive KPIs, macro insights, animated statistics, and live filters." }
      ]
    },
    {
      title: "Healthcare Barriers",
      items: [
        { name: "National Overview", code: "A", path: "national_overview.html", icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" x2="22" y1="12" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>', desc: "National prevalence, domain rankings, and observed vs predicted model alignment." },
        { name: "Multiple Barriers", code: "G", path: "multiple_barrier.html", icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m16 6 4 14"/><path d="M12 6v14"/><path d="M8 8v12"/><path d="M4 4v16"/></svg>', desc: "Compounded disadvantage across 0, 1, 2, or 3 concurrent healthcare barriers." },
        { name: "Rural vs Urban", code: "E", path: "rural_urban.html", icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m8 3 4 8 5-5 5 15H2L8 3z"/></svg>', desc: "Residence disparity analysis between rural (75.2%) and urban (24.8%) populations." },
        { name: "State Analysis", code: "C", path: "state_analysis.html", icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>', desc: "Spatial inequality across 36 Indian States and UTs with interactive rankings." },
        { name: "Demographic Analysis", code: "D", path: "demographic_analysis.html", icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>', desc: "Gradients across wealth quintiles, education levels, age cohorts, and occupations." }
      ]
    },
    {
      title: "AI & Prediction",
      items: [
        { name: "AI Risk Assessment", code: "PRED", path: "risk_prediction.html", icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>', badge: "AI Live", desc: "Live ML prediction of Household, Logistic, and Facility healthcare risk using frozen XGBoost models." },
        { name: "Risk Archetypes", code: "H", path: "risk_archetypes.html", icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>', desc: "K-Means risk segmentation (k = 2): High Vulnerability (52.9%) vs Media Included (47.1%)." },
        { name: "Explainable AI & SHAP", code: "J", path: "explainability.html", icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>', desc: "SHAP beeswarm, waterfall, dependence plots, and Stage 1 logistic regression odds ratios." },
        { name: "Model Performance", code: "EVAL", path: "model_performance.html", icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>', desc: "Model comparisons, ROC curves, confusion matrices, and hold-out test statistics." }
      ]
    },
    {
      title: "Research & Impact",
      items: [
        { name: "Outcome Impact", code: "I", path: "outcome_impact.html", icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>', desc: "Stage 2 predictive impact on Unmet Family Planning Need and Antenatal Care Gap." },
        { name: "Household Empowerment", code: "F", path: "empowerment.html", icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>', desc: "Financial autonomy, medical decision-making agency, and digital access associations." },
        { name: "Base Paper Comparison", code: "B", path: "base_paper_comparison.html", icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>', desc: "Direct benchmark comparison with Pradhan & De (2025) BMC Health Services Research." }
      ]
    },
    {
      title: "Data & Explorer",
      items: [
        { name: "Data Explorer", code: "DATA", path: "data_explorer.html", icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/></svg>', desc: "Multi-dimensional searchable table over NFHS-5 subpopulation datasets with CSV export." }
      ]
    }
  ];

  // Flatten all items for search lookup
  const allNavItems = [];
  navSections.forEach(s => s.items.forEach(item => allNavItems.push(item)));

  // Current page object
  const activeItem = allNavItems.find(i => i.path === currentFile) || allNavItems[0];

  // Build Left Sidebar HTML
  const sidebarHtml = `
    <aside class="app-sidebar ${window.DashboardState && window.DashboardState.sidebarCollapsed ? 'collapsed' : ''}" id="app-sidebar">
      <div class="sidebar-header">
        <a href="${pageHref('index.html')}" class="sidebar-brand">
          <div class="brand-icon-wrapper">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <div class="brand-info">
            <div class="brand-name">
              BarrierLens
              <span class="brand-version">v2.0</span>
            </div>
            <div class="brand-tagline">Healthcare Access Intelligence</div>
          </div>
        </a>
        <button class="sidebar-collapse-btn" id="sidebar-toggle-btn" aria-label="Toggle sidebar collapse">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
      </div>

      <nav class="sidebar-nav">
        ${navSections.map(section => `
          <div class="nav-section">
            <div class="nav-section-title">${section.title}</div>
            ${section.items.map(item => `
              <a href="${pageHref(item.path)}" 
                 class="sidebar-nav-item ${currentFile === item.path ? 'active' : ''}" 
                 data-title="${item.name}"
                 title="${item.name}">
                <span class="nav-icon">${item.icon}</span>
                <span class="nav-label">${item.name}</span>
                ${item.badge ? `<span class="nav-item-badge">${item.badge}</span>` : ''}
              </a>
            `).join('')}
          </div>
        `).join('')}
      </nav>

      <div class="sidebar-footer">
        <div class="sidebar-footer-card">
          <div style="font-weight: 700; color: #f8fafc; font-size: 0.775rem;">NFHS-5 Individual Recode</div>
          <div style="font-size: 0.7rem; color: #94a3b8; margin-top: 2px;">N = 724,115 Indian Women</div>
          <div style="display: flex; gap: 4px; margin-top: 6px;">
            <span class="tag tag-overall" style="font-size: 0.65rem; padding: 1px 6px;">Stage 1 Ensembles</span>
            <span class="tag tag-facility" style="font-size: 0.65rem; padding: 1px 6px;">k = 2 Clusters</span>
          </div>
        </div>
      </div>
    </aside>
  `;

  // Build Top Header HTML
  const topHeaderHtml = `
    <header class="app-top-header">
      <div class="header-left">
        <button class="mobile-nav-toggle" id="mobile-nav-toggle" aria-label="Open mobile navigation">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
        <div class="header-breadcrumbs">
          <a href="${pageHref('index.html')}">BarrierLens</a>
          <span>/</span>
          <span style="font-weight: 700; color: var(--text-main);">${activeItem.name}</span>
        </div>
      </div>

      <div class="header-right">
        <button class="chart-btn" id="presentation-mode-btn" style="background: var(--bg-card); color: var(--text-main); border: 1px solid var(--border-color); font-weight: 700;" title="Launch Faculty Presentation Walkthrough">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
          <span>🎓 Presentation</span>
        </button>

        <button class="header-search-btn" id="global-search-trigger" aria-label="Search modules and data">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <span>Search Intelligence...</span>
          <kbd class="kbd-shortcut">/</kbd>
        </button>

        <div class="data-status-badge" title="Live NFHS-5 Survey Dataset Grounding">
          <span class="pulse-dot"></span>
          <span>724,115 Sample</span>
        </div>

        <button class="theme-toggle-btn" id="theme-toggle-btn" aria-label="Toggle Dark/Light Mode" title="Toggle Theme">
          <svg id="theme-icon-moon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
        </button>

        <button class="chart-btn" id="header-ask-ai-btn" style="background: var(--primary); color: #ffffff; border-color: var(--primary); font-weight: 700;">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          <span>Ask AI Assistant</span>
        </button>
      </div>
    </header>

    <!-- Global Presentation Floating Navigation Bar (Active when in presentation mode) -->
    <div id="presentation-dock" class="presentation-dock" style="display: none;">
      <div class="presentation-dock-left">
        <span class="tag tag-facility" style="font-weight: 800; font-size: 0.75rem;">🎓 FACULTY WALKTHROUGH</span>
        <span id="pres-step-indicator" style="font-weight: 700; font-size: 0.85rem; color: var(--text-main);">Step 1 of 8: National Overview</span>
      </div>
      <div class="presentation-dock-right">
        <button id="pres-prev-btn" class="chart-btn" style="padding: 6px 12px; font-size: 0.8rem;">&larr; Previous</button>
        <button id="pres-next-btn" class="chart-btn" style="padding: 6px 12px; font-size: 0.8rem; background: var(--primary); color: #ffffff; border-color: var(--primary);">Next Step &rarr;</button>
        <button id="pres-exit-btn" class="btn-reset-filters" style="padding: 6px 12px; font-size: 0.8rem;">Exit Presentation</button>
      </div>
    </div>

    <!-- Global Search Modal -->
    <div class="modal-backdrop" id="search-modal">
      <div class="modal-card">
        <div class="modal-header">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2.2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" class="modal-search-input" id="modal-search-input" placeholder="Search modules, SHAP, states, wealth quintiles, risk models... (ESC to close)" />
        </div>
        <div class="modal-body" id="modal-search-results">
          ${allNavItems.map(p => `
            <a href="${pageHref(p.path)}" class="modal-item">
              <div>
                <div style="font-weight: 700; color: var(--text-main); font-size: 0.9rem;">
                  <span class="tag tag-overall" style="font-size:0.65rem; margin-right:6px;">${p.code}</span>
                  ${p.name}
                </div>
                <div style="font-size: 0.775rem; color: var(--text-muted); margin-top: 2px;">${p.desc}</div>
              </div>
              <span style="font-size: 0.8rem; font-weight: 700; color: var(--primary);">Explore &rarr;</span>
            </a>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  // Inject or wrap document with app shell
  const existingContainer = document.querySelector(".container");
  if (existingContainer && !document.querySelector(".app-shell")) {
    const mainContentHtml = existingContainer.outerHTML;
    const fullShellHtml = `
      <div class="app-shell">
        ${sidebarHtml}
        <div class="app-main">
          ${topHeaderHtml}
          <main class="app-content">
            ${mainContentHtml}
          </main>
        </div>
      </div>
    `;
    document.body.innerHTML = fullShellHtml;
  }

  // Check and setup Presentation Mode Dock if active
  if (window.DashboardState) {
    const pStatus = window.DashboardState.getPresentationStatus();
    const dock = document.getElementById("presentation-dock");
    const indicator = document.getElementById("pres-step-indicator");
    const prevBtn = document.getElementById("pres-prev-btn");
    const nextBtn = document.getElementById("pres-next-btn");
    const exitBtn = document.getElementById("pres-exit-btn");
    const launchBtn = document.getElementById("presentation-mode-btn");

    if (pStatus.isActive && dock) {
      dock.style.display = "flex";
      if (indicator) {
        indicator.textContent = `Step ${pStatus.currentStep + 1} of ${pStatus.totalSteps}: ${pStatus.currentMeta.title}`;
      }
      if (prevBtn) {
        prevBtn.disabled = pStatus.currentStep === 0;
        prevBtn.onclick = () => window.DashboardState.prevPresentationStep();
      }
      if (nextBtn) {
        nextBtn.onclick = () => window.DashboardState.nextPresentationStep();
        if (pStatus.currentStep === pStatus.totalSteps - 1) {
          nextBtn.textContent = "Finish Walkthrough";
          nextBtn.onclick = () => window.DashboardState.exitPresentation();
        }
      }
      if (exitBtn) {
        exitBtn.onclick = () => window.DashboardState.exitPresentation();
      }
    }

    if (launchBtn) {
      launchBtn.addEventListener("click", () => {
        window.DashboardState.startPresentation(0);
      });
    }
  }

  // Bind Sidebar Collapse Button
  const sidebarToggleBtn = document.getElementById("sidebar-toggle-btn");
  const mobileToggleBtn = document.getElementById("mobile-nav-toggle");
  const sidebar = document.getElementById("app-sidebar");

  if (sidebarToggleBtn && window.DashboardState) {
    sidebarToggleBtn.addEventListener("click", function () {
      window.DashboardState.toggleSidebar();
    });
  }

  if (mobileToggleBtn && sidebar) {
    mobileToggleBtn.addEventListener("click", function () {
      sidebar.classList.toggle("mobile-open");
    });
  }

  // Theme Toggle Bindings
  const themeToggleBtn = document.getElementById("theme-toggle-btn");
  function updateThemeIcon() {
    if (!window.DashboardState) return;
    const currentTheme = window.DashboardState.getTheme();
    if (themeToggleBtn) {
      themeToggleBtn.innerHTML = currentTheme === 'dark'
        ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>'
        : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>';
    }
  }

  if (themeToggleBtn && window.DashboardState) {
    updateThemeIcon();
    themeToggleBtn.addEventListener("click", function () {
      window.DashboardState.toggleTheme();
      updateThemeIcon();
    });
  }

  // Global Command Search Listeners
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
    if (searchModal) searchModal.classList.remove("active");
  }

  if (searchTrigger) searchTrigger.addEventListener("click", openSearchModal);

  if (searchModal) {
    searchModal.addEventListener("click", function (e) {
      if (e.target === searchModal) closeSearchModal();
    });
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "/" && document.activeElement.tagName !== "INPUT" && document.activeElement.tagName !== "TEXTAREA") {
      e.preventDefault();
      openSearchModal();
    } else if (e.key === "Escape") {
      closeSearchModal();
    }
  });

  if (searchInput && searchResults) {
    searchInput.addEventListener("input", function () {
      const q = this.value.toLowerCase().trim();
      const filtered = allNavItems.filter(
        p => p.name.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)
      );

      if (filtered.length === 0) {
        searchResults.innerHTML = `<div style="padding: 24px; text-align: center; color: var(--text-muted); font-size: 0.875rem;">No matching intelligence modules found.</div>`;
      } else {
        searchResults.innerHTML = filtered.map(p => `
          <a href="${pageHref(p.path)}" class="modal-item">
            <div>
              <div style="font-weight: 700; color: var(--text-main); font-size: 0.9rem;">
                <span class="tag tag-overall" style="font-size:0.65rem; margin-right:6px;">${p.code}</span>
                ${p.name}
              </div>
              <div style="font-size: 0.775rem; color: var(--text-muted); margin-top: 2px;">${p.desc}</div>
            </div>
            <span style="font-size: 0.8rem; font-weight: 700; color: var(--primary);">Explore &rarr;</span>
          </a>
        `).join('');
      }
    });
  }

  // Header AI Assistant button trigger
  const headerAskAiBtn = document.getElementById("header-ask-ai-btn");
  if (headerAskAiBtn) {
    headerAskAiBtn.addEventListener("click", function () {
      const launcher = document.querySelector(".chat-launcher") || document.querySelector(".bl-chat-launcher") || document.getElementById("floating-ask-ai-btn");
      if (launcher) {
        launcher.click();
      } else if (window.BarrierLensChatbotUI && typeof window.BarrierLensChatbotUI.openChat === "function") {
        window.BarrierLensChatbotUI.openChat();
      }
    });
  }

  // Inject Chatbot Scripts dynamically if missing on sub-page
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

  if (!document.querySelector('link[href*="chatbot.css"]')) {
    const chatbotCss = document.createElement('link');
    chatbotCss.rel = 'stylesheet';
    chatbotCss.href = inPagesDir ? '../assets/css/chatbot.css' : 'assets/css/chatbot.css';
    document.head.appendChild(chatbotCss);
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
