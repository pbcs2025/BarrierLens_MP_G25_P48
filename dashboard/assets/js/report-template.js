/**
 * BARRIERLENS — MEMBER 4: REPORT TEMPLATE MODULE
 * Structural template components for formatting research reports.
 * Dual environment support: Browser (window.BarrierLensReportTemplate) & Node.js (module.exports).
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.BarrierLensReportTemplate = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /**
   * Escape HTML special characters safely
   */
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Formats ISO or Date object into clean human-readable date & time
   */
  function formatDate(dateInput) {
    const d = dateInput ? new Date(dateInput) : new Date();
    if (isNaN(d.getTime())) return new Date().toLocaleString();
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Create Header Component
   */
  function createHeader(reportTitle, reportType, generatedAt, queryText) {
    const dateStr = formatDate(generatedAt);
    const badgeMap = {
      executive: 'EXECUTIVE RESEARCH REPORT',
      topic: 'TOPIC RESEARCH REPORT',
      comparison: 'COMPARISON REPORT',
      complete: 'COMPLETE RESEARCH REPORT'
    };
    const typeLabel = badgeMap[reportType] || 'RESEARCH REPORT';

    return `
      <header class="blr-header">
        <div class="blr-brand-row">
          <div class="blr-brand-logo">
            <span class="blr-brand-title">BARRIERLENS</span>
            <span class="blr-brand-sub">Research Intelligence Assistant • Project P48</span>
          </div>
          <span class="blr-type-badge blr-badge-${escapeHtml(reportType)}">${escapeHtml(typeLabel)}</span>
        </div>
        <h1 class="blr-report-title">${escapeHtml(reportTitle)}</h1>
        <div class="blr-meta-bar">
          <span class="blr-meta-item"><strong>Generated:</strong> ${escapeHtml(dateStr)}</span>
          <span class="blr-meta-item"><strong>Dataset:</strong> NFHS-5 Individual Recode (N = 724,115)</span>
          ${queryText ? `<span class="blr-meta-item"><strong>Research Query:</strong> "${escapeHtml(queryText)}"</span>` : ''}
        </div>
      </header>
    `;
  }

  /**
   * Create Executive Summary Section
   */
  function createExecutiveSummary(summaryText) {
    if (!summaryText) return '';
    return `
      <section class="blr-section">
        <h2 class="blr-section-title">1. Executive Summary</h2>
        <div class="blr-summary-box">
          <p>${escapeHtml(summaryText)}</p>
        </div>
      </section>
    `;
  }

  /**
   * Create Key Findings Section
   */
  function createFindingsSection(findings, sectionNum = 2) {
    if (!findings || findings.length === 0) return '';
    const listItems = findings.map(f => `<li>${escapeHtml(f)}</li>`).join('');
    return `
      <section class="blr-section">
        <h2 class="blr-section-title">${sectionNum}. Key Findings</h2>
        <ul class="blr-findings-list">
          ${listItems}
        </ul>
      </section>
    `;
  }

  /**
   * Create Metrics Table Section
   */
  function createMetricsTable(metrics, sectionNum = 3, sectionTitle = "Verified Quantitative Metrics") {
    if (!metrics || metrics.length === 0) return '';
    
    const rows = metrics.map((m, idx) => `
      <tr>
        <td class="blr-td-num">${idx + 1}</td>
        <td><strong>${escapeHtml(m.label || m.name || 'Metric')}</strong></td>
        <td><span class="blr-entity-tag">${escapeHtml(m.entity || 'National')}</span></td>
        <td class="blr-td-value">${escapeHtml(m.value)}${m.unit ? ' ' + escapeHtml(m.unit) : ''}</td>
      </tr>
    `).join('');

    return `
      <section class="blr-section">
        <h2 class="blr-section-title">${sectionNum}. ${escapeHtml(sectionTitle)}</h2>
        <div class="blr-table-responsive">
          <table class="blr-table">
            <thead>
              <tr>
                <th style="width: 40px;">#</th>
                <th>Indicator / Metric Description</th>
                <th>Target Population / Scope</th>
                <th style="text-align: right;">Observed Rate / Value</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </div>
      </section>
    `;
  }

  /**
   * Create Comparison Section (with Explicitly Labeled Calculated Differences)
   */
  function createComparisonSection(comparisons, calculations, sectionNum = 4) {
    if ((!comparisons || comparisons.length === 0) && (!calculations || calculations.length === 0)) return '';

    let comparisonCards = '';
    if (comparisons && comparisons.length > 0) {
      comparisonCards = comparisons.map(c => `
        <div class="blr-comparison-card">
          <div class="blr-comp-entity">${escapeHtml(c.entity || c.label)}</div>
          <div class="blr-comp-val">${escapeHtml(c.value)}${c.unit ? ' ' + escapeHtml(c.unit) : ''}</div>
          <div class="blr-comp-desc">${escapeHtml(c.description || c.label)}</div>
        </div>
      `).join('');
    }

    let calculationsHtml = '';
    if (calculations && calculations.length > 0) {
      calculationsHtml = calculations.map(calc => `
        <div class="blr-calc-box">
          <div class="blr-calc-header">
            <span class="blr-calc-tag">CALCULATED DIFFERENCE</span>
            <span class="blr-calc-val">${escapeHtml(calc.result)} ${escapeHtml(calc.unit || '')}</span>
          </div>
          <p class="blr-calc-desc">${escapeHtml(calc.interpretation || calc.description)}</p>
        </div>
      `).join('');
    }

    return `
      <section class="blr-section">
        <h2 class="blr-section-title">${sectionNum}. Side-by-Side Comparison & Calculated Difference</h2>
        ${comparisonCards ? `<div class="blr-comparison-grid">${comparisonCards}</div>` : ''}
        ${calculationsHtml}
      </section>
    `;
  }

  /**
   * Create Limitations Box Section
   */
  function createLimitationsBox(limitations, sectionNum = 5) {
    const defaultLimitations = [
      "NFHS-5 (2019-21) individual recode analysis is cross-sectional; observed associations do not establish causal relationships.",
      "Service quality metrics, clinical diagnostics, and hospital waiting times are explicitly absent from the NFHS-5 dataset.",
      "Population-level risk models should not be interpreted as individual clinical diagnoses or direct medical advice."
    ];
    const activeList = (limitations && limitations.length > 0) ? limitations : defaultLimitations;
    const itemsHtml = activeList.map(l => `<li>${escapeHtml(l)}</li>`).join('');

    return `
      <section class="blr-section">
        <h2 class="blr-section-title">${sectionNum}. Study Limitations & Research Constraints</h2>
        <div class="blr-limitations-box">
          <div class="blr-box-header">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            <span>Cross-Sectional Observational Constraints</span>
          </div>
          <ul class="blr-limitations-list">
            ${itemsHtml}
          </ul>
        </div>
      </section>
    `;
  }

  /**
   * Create Data Source References Section
   */
  function createSourcesSection(sources, sectionNum = 6) {
    const defaultSources = [
      "BarrierLens verified NFHS-5 analytics dataset (N = 724,115 women aged 15-49)",
      "Stage 1 ML Ensemble predictions & logistic regression odds ratios",
      "K-Means risk archetype clustering (k=2, Silhouette Score = 0.3986)"
    ];
    const activeSources = (sources && sources.length > 0) ? sources : defaultSources;
    const itemsHtml = activeSources.map(s => `<li>📄 ${escapeHtml(s)}</li>`).join('');

    return `
      <section class="blr-section">
        <h2 class="blr-section-title">${sectionNum}. Data Sources & Provenance</h2>
        <ul class="blr-sources-list">
          ${itemsHtml}
        </ul>
      </section>
    `;
  }

  /**
   * Create Dashboard Navigation References Section
   */
  function createDashboardLinksSection(relatedPage, sectionNum = 7) {
    if (!relatedPage) return '';
    const href = relatedPage.relativeUrl || relatedPage.url || '#';
    return `
      <section class="blr-section blr-no-print">
        <h2 class="blr-section-title">${sectionNum}. Interactive Dashboard Exploration</h2>
        <div class="blr-nav-card">
          <div>
            <div class="blr-nav-title">Contextual Dashboard Analysis Module</div>
            <p class="blr-nav-desc">Explore full interactive charts, spatial maps, and underlying demographic filters on the BarrierLens platform.</p>
          </div>
          <a href="${escapeHtml(href)}" class="blr-nav-btn">
            <span>View Analysis: ${escapeHtml(relatedPage.label || 'Open Module')}</span>
            &rarr;
          </a>
        </div>
      </section>
    `;
  }

  /**
   * Create Research Disclaimer Section
   */
  function createDisclaimerBox(disclaimerText) {
    const defaultDisclaimer = "BarrierLens presents population-level analytical findings based on verified NFHS-5 research data. Observed associations should not be interpreted as causal relationships or individual medical advice.";
    const text = disclaimerText || defaultDisclaimer;

    return `
      <div class="blr-disclaimer-card">
        <strong>RESEARCH DISCLAIMER:</strong> ${escapeHtml(text)}
      </div>
    `;
  }

  /**
   * Create Footer Section
   */
  function createFooter() {
    return `
      <footer class="blr-footer">
        <div>BarrierLens Research Intelligence Platform (P48) • Automated Research Report</div>
        <div>Verified Data Grounding System • Strictly Confidential Research Document</div>
      </footer>
    `;
  }

  return {
    escapeHtml,
    formatDate,
    createHeader,
    createExecutiveSummary,
    createFindingsSection,
    createMetricsTable,
    createComparisonSection,
    createLimitationsBox,
    createSourcesSection,
    createDashboardLinksSection,
    createDisclaimerBox,
    createFooter
  };
}));
