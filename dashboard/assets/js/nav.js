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
      <nav>
        <ul class="nav-links">
          ${pages
            .map(
              (p) =>
                `<li><a href="${pageHref(p.path)}" class="nav-link ${
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
