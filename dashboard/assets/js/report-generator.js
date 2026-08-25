/**
 * BARRIERLENS — MEMBER 4: REPORT GENERATOR ENGINE
 * Core engine for generating Executive, Topic, Comparison, and Complete Research Reports.
 * Also provides HTML print/PDF preview modal rendering and document export.
 * Dual environment support: Browser (window.BarrierLensReportGenerator) & Node.js (module.exports).
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.BarrierLensReportGenerator = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function getTemplate() {
    if (typeof window !== 'undefined' && window.BarrierLensReportTemplate) {
      return window.BarrierLensReportTemplate;
    }
    if (typeof require !== 'undefined') {
      try { return require('./report-template.js'); } catch (e) {}
    }
    return null;
  }

  /**
   * Helper to normalize input data object into standard report data schema
   */
  function normalizeReportData(inputData) {
    if (!inputData) return {};
    return {
      query: inputData.query || inputData.userQuery || '',
      summary: inputData.answer || inputData.summary || 'Verified analytical research findings based on NFHS-5 dataset.',
      intent: inputData.intent || 'NATIONAL_OVERVIEW',
      metrics: inputData.metrics || inputData.evidence || [],
      calculations: inputData.calculations || [],
      sources: inputData.source || inputData.sources || [],
      relatedPage: inputData.relatedPage || null,
      limitationNote: inputData.limitationNote || null,
      disclaimer: inputData.disclaimer || null,
      generatedAt: inputData.generatedAt || new Date().toISOString()
    };
  }

  /**
   * 1. EXECUTIVE REPORT GENERATOR
   */
  function generateExecutiveReport(data) {
    const T = getTemplate();
    if (!T) throw new Error("BarrierLensReportTemplate module not found.");

    const d = normalizeReportData(data);
    const title = "Executive Research Overview — Healthcare Barriers & Access";

    const findings = [
      "Nationwide prevalence: 59.16% of Indian women face at least one healthcare access barrier (NFHS-5, N=724,115).",
      "Domain Hierarchy: Facility barriers (46.01%, Rank 1) dominate over Logistic (31.61%, Rank 2) and Household barriers (27.16%, Rank 3).",
      "Regional Disparity: State-level barrier exposure ranges from 7.58% (Kerala) to 84.00% (High-barrier states).",
      "Rural vs Urban: Rural women experience significantly higher barrier prevalence (63.49%) than urban women (46.03%).",
      "Risk Archetypes: K-Means clustering identifies 52.9% of women in Cluster 0 (High Vulnerability, composite barrier score 0.5868)."
    ];

    let html = '';
    html += T.createHeader(title, 'executive', d.generatedAt, d.query);
    html += T.createExecutiveSummary(d.summary);
    html += T.createFindingsSection(findings, 2);
    html += T.createMetricsTable(d.metrics, 3, "Key Verified Quantitative Indicators");
    if (d.calculations && d.calculations.length > 0) {
      html += T.createComparisonSection([], d.calculations, 4);
    }
    html += T.createLimitationsBox(d.limitationNote ? [d.limitationNote] : null, 5);
    html += T.createSourcesSection(d.sources, 6);
    html += T.createDashboardLinksSection(d.relatedPage, 7);
    html += T.createDisclaimerBox(d.disclaimer);
    html += T.createFooter();

    return {
      reportType: 'executive',
      title: title,
      html: html,
      data: d
    };
  }

  /**
   * 2. TOPIC REPORT GENERATOR
   */
  function generateTopicReport(data, topicName) {
    const T = getTemplate();
    if (!T) throw new Error("BarrierLensReportTemplate module not found.");

    const d = normalizeReportData(data);
    const topicTitle = topicName || (d.relatedPage ? d.relatedPage.label : "Healthcare Access Domain Analysis");
    const title = `Topic Research Report — ${topicTitle}`;

    const findings = [
      `Detailed investigation into ${topicTitle} across the 724,115 women sample in NFHS-5.`,
      `Verified empirical metrics reflect observed cross-sectional survey prevalence.`,
      `Predictive associations derived using Stage 1 ML Ensembles and Stage 2 Healthcare Utilization models.`
    ];

    let html = '';
    html += T.createHeader(title, 'topic', d.generatedAt, d.query);
    html += T.createExecutiveSummary(d.summary);
    html += T.createFindingsSection(findings, 2);
    html += T.createMetricsTable(d.metrics, 3, `Verified Indicators for ${topicTitle}`);
    if (d.calculations && d.calculations.length > 0) {
      html += T.createComparisonSection([], d.calculations, 4);
    }
    html += T.createLimitationsBox(d.limitationNote ? [d.limitationNote] : null, 5);
    html += T.createSourcesSection(d.sources, 6);
    html += T.createDashboardLinksSection(d.relatedPage, 7);
    html += T.createDisclaimerBox(d.disclaimer);
    html += T.createFooter();

    return {
      reportType: 'topic',
      title: title,
      html: html,
      data: d
    };
  }

  /**
   * 3. COMPARISON REPORT GENERATOR
   */
  function generateComparisonReport(data) {
    const T = getTemplate();
    if (!T) throw new Error("BarrierLensReportTemplate module not found.");

    const d = normalizeReportData(data);
    const title = "Comparative Research Report — Geographical & Demographic Disparities";

    const findings = [
      "Comparative analysis evaluates disparity gaps between geographic units or demographic subgroups.",
      "Calculated percentage point differences are explicitly derived and labeled to prevent data distortion.",
      "Identifies specific sub-populations requiring targeted healthcare infrastructure investments."
    ];

    let html = '';
    html += T.createHeader(title, 'comparison', d.generatedAt, d.query);
    html += T.createExecutiveSummary(d.summary);
    html += T.createFindingsSection(findings, 2);
    html += T.createComparisonSection(d.metrics, d.calculations, 3);
    html += T.createMetricsTable(d.metrics, 4, "Underlying Metric Breakdown");
    html += T.createLimitationsBox(d.limitationNote ? [d.limitationNote] : null, 5);
    html += T.createSourcesSection(d.sources, 6);
    html += T.createDashboardLinksSection(d.relatedPage, 7);
    html += T.createDisclaimerBox(d.disclaimer);
    html += T.createFooter();

    return {
      reportType: 'comparison',
      title: title,
      html: html,
      data: d
    };
  }

  /**
   * 4. COMPLETE RESEARCH REPORT GENERATOR
   */
  function generateCompleteReport(data) {
    const T = getTemplate();
    if (!T) throw new Error("BarrierLensReportTemplate module not found.");

    const d = normalizeReportData(data);
    const title = "BarrierLens Complete Research Intelligence Report (P48)";

    const findings = [
      "Full Multi-Dimensional Study: Covers 724,115 Indian women across 36 States and UTs from NFHS-5 (2019-21).",
      "Domain Hierarchy: Facility Barriers (46.01%) > Logistic Barriers (31.61%) > Household Barriers (27.16%).",
      "Geographic Disparity Range: Kerala (7.58% Any Barrier) to Bihar/High-exposure states (>55%).",
      "Residence Disparity Gap: Rural (63.49%) vs Urban (46.03%) with 17.46 percentage point gap.",
      "K-Means Clustering ($k=2$, Silhouette 0.3986): Cluster 0 (52.9% High Vulnerability) vs Cluster 1 (47.1% High Media Inclusion).",
      "Stage 2 Outcome Utilization Models: Family Planning Unmet Need ($N=466,859$, AUC 0.6591) & ANC Gap ($N=163,018$, AUC 0.6356).",
      "SHAP Explainability Drivers: Wealth Tier (Poorest OR 1.26 vs Richest OR 0.78) and Education (No Education OR 1.20) serve as key risk determinants."
    ];

    let html = '';
    html += T.createHeader(title, 'complete', d.generatedAt, d.query);
    html += T.createExecutiveSummary(d.summary);
    html += T.createFindingsSection(findings, 2);
    html += T.createMetricsTable(d.metrics, 3, "Complete Study Verified Metrics & Empirical Indicators");
    if (d.calculations && d.calculations.length > 0) {
      html += T.createComparisonSection([], d.calculations, 4);
    }
    html += T.createLimitationsBox(d.limitationNote ? [d.limitationNote] : null, 5);
    html += T.createSourcesSection(d.sources, 6);
    html += T.createDashboardLinksSection(d.relatedPage, 7);
    html += T.createDisclaimerBox(d.disclaimer);
    html += T.createFooter();

    return {
      reportType: 'complete',
      title: title,
      html: html,
      data: d
    };
  }

  /**
   * Generic Report Generator dispatch function
   */
  function generateReport(type = 'executive', data = {}) {
    const reportType = (type || 'executive').toLowerCase();
    switch (reportType) {
      case 'executive':
        return generateExecutiveReport(data);
      case 'topic':
        return generateTopicReport(data);
      case 'comparison':
        return generateComparisonReport(data);
      case 'complete':
        return generateCompleteReport(data);
      default:
        return generateExecutiveReport(data);
    }
  }

  /**
   * Browser Modal UI Implementation
   */
  function openReportModal(reportResult) {
    if (typeof document === 'undefined') return;

    // Remove existing modal if any
    const existingModal = document.getElementById('bl-report-modal');
    if (existingModal) existingModal.remove();

    // Ensure CSS link
    if (!document.querySelector('link[href*="report.css"]')) {
      const pathname = window.location.pathname.replace(/\\/g, '/');
      const prefix = pathname.includes('/pages/') ? '../' : '';
      const linkReport = document.createElement('link');
      linkReport.rel = 'stylesheet';
      linkReport.href = `${prefix}assets/css/report.css`;
      document.head.appendChild(linkReport);
    }

    const modalHtml = `
      <div class="blr-modal-overlay" id="bl-report-modal" role="dialog" aria-modal="true" aria-label="Research Report Viewer">
        <div class="blr-modal-container">
          <!-- Toolbar Header -->
          <div class="blr-toolbar">
            <div class="blr-toolbar-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
              <span>BarrierLens Research Report Viewer</span>
            </div>
            <div class="blr-toolbar-actions">
              <button class="blr-btn blr-btn-print" id="blr-print-btn" title="Print or Save as PDF">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                <span>Print / Save PDF</span>
              </button>
              <button class="blr-btn blr-btn-secondary" id="blr-download-btn" title="Download Report HTML">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                <span>Download HTML</span>
              </button>
              <button class="blr-btn blr-btn-close" id="blr-close-btn" aria-label="Close Report Viewer">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
          </div>
          <!-- Document Content Area -->
          <div class="blr-document-body" id="blr-document-body">
            ${reportResult.html}
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Event handlers
    const modalElem = document.getElementById('bl-report-modal');
    const closeBtn = document.getElementById('blr-close-btn');
    const printBtn = document.getElementById('blr-print-btn');
    const downloadBtn = document.getElementById('blr-download-btn');

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        if (modalElem) modalElem.remove();
      });
    }

    if (printBtn) {
      printBtn.addEventListener('click', () => {
        window.print();
      });
    }

    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => {
        downloadReportHtml(reportResult.html, `${reportResult.reportType}_report.html`);
      });
    }

    // Close on overlay click or Escape key
    if (modalElem) {
      modalElem.addEventListener('click', (e) => {
        if (e.target === modalElem) modalElem.remove();
      });
    }

    document.addEventListener('keydown', function escHandler(e) {
      if (e.key === 'Escape' && document.getElementById('bl-report-modal')) {
        const m = document.getElementById('bl-report-modal');
        if (m) m.remove();
        document.removeEventListener('keydown', escHandler);
      }
    });
  }

  /**
   * Helper to trigger HTML file download
   */
  function downloadReportHtml(htmlContent, filename = "barrierlens_report.html") {
    if (typeof document === 'undefined') return;
    const fullDocument = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>BarrierLens Research Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 40px; color: #0f172a; line-height: 1.6; }
    .blr-header { border-bottom: 3px solid #2563eb; padding-bottom: 16px; margin-bottom: 24px; }
    .blr-brand-title { font-size: 1.6rem; font-weight: 800; color: #1e40af; }
    .blr-report-title { font-size: 1.5rem; font-weight: 700; color: #0f172a; margin: 12px 0 8px; }
    .blr-type-badge { display: inline-block; padding: 4px 12px; background: #eff6ff; color: #2563eb; font-weight: 700; border-radius: 4px; font-size: 0.8rem; }
    .blr-section { margin-bottom: 28px; }
    .blr-section-title { font-size: 1.2rem; font-weight: 700; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; color: #1e293b; margin-bottom: 12px; }
    .blr-summary-box { background: #f8fafc; padding: 16px; border-left: 4px solid #2563eb; border-radius: 4px; }
    .blr-table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    .blr-table th, .blr-table td { border: 1px solid #cbd5e1; padding: 10px 14px; text-align: left; }
    .blr-table th { background: #f1f5f9; font-weight: 700; }
    .blr-calc-box { background: #fffbeb; border: 1px solid #fef3c7; border-left: 4px solid #d97706; padding: 14px; border-radius: 6px; margin-top: 12px; }
    .blr-calc-tag { font-size: 0.75rem; font-weight: 700; color: #b45309; background: #fef3c7; padding: 2px 8px; border-radius: 4px; }
    .blr-limitations-box { background: #fef2f2; border: 1px solid #fee2e2; border-left: 4px solid #dc2626; padding: 14px; border-radius: 6px; }
    .blr-disclaimer-card { background: #f8fafc; border: 1px solid #cbd5e1; padding: 14px; font-size: 0.85rem; color: #475569; border-radius: 6px; margin-top: 24px; }
    .blr-footer { font-size: 0.8rem; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 32px; display: flex; justify-content: space-between; }
    @media print { .blr-no-print { display: none !important; } }
  </style>
</head>
<body>
  ${htmlContent}
</body>
</html>`;

    const blob = new Blob([fullDocument], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return {
    generateExecutiveReport,
    generateTopicReport,
    generateComparisonReport,
    generateCompleteReport,
    generateReport,
    openReportModal,
    downloadReportHtml
  };
}));
