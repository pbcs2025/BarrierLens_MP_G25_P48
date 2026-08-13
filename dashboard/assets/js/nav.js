// Shared Navigation Component for BarrierLens Dashboard
document.addEventListener("DOMContentLoaded", function () {
  const pages = [
    { name: "National Overview", path: "national_overview.html", id: "page-a" },
    { name: "Base Paper Comparison", path: "base_paper_comparison.html", id: "page-b" },
    { name: "State Analysis", path: "state_analysis.html", id: "page-c" },
    { name: "Demographic Analysis", path: "demographic_analysis.html", id: "page-d" },
    { name: "Rural-Urban Comparison", path: "rural_urban.html", id: "page-e" },
    { name: "Empowerment", path: "empowerment.html", id: "page-f" },
    { name: "Multiple Barriers", path: "multiple_barrier.html", id: "page-g" },
    { name: "Risk Archetypes", path: "risk_archetypes.html", id: "page-h" },
    { name: "Utilization Impact", path: "outcome_impact.html", id: "page-i" },
    { name: "Explainability & Reg", path: "explainability.html", id: "page-j" },
  ];

  const currentFile = window.location.pathname.split("/").pop();

  const navHtml = `
    <header class="header-nav">
      <div class="brand-container">
        <a href="../index.html" class="brand-title">BarrierLens P48</a>
        <span class="brand-badge">NFHS-5</span>
      </div>
      <nav>
        <ul class="nav-links">
          ${pages
            .map(
              (p) =>
                `<li><a href="${p.path}" class="nav-link ${
                  currentFile === p.path ? "active" : ""
                }">${p.name}</a></li>`
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
});
