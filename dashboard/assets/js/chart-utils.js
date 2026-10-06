/**
 * BARRIERLENS — ADVANCED PLOTLY CHART UTILITIES & INTERACTIVITY ENGINE
 * Features: Dark/Light Mode Adaptability, Responsive Layouts, Modal Expanders, High-Res Export, Cross-Filtering.
 */

const ChartUtils = {
  // Theme Palette
  colors: {
    railA: "#0284c7",       // Soft sky blue for Rail A (Observed)
    railB: "#6366f1",       // Indigo purple for Rail B (Predicted)
    basePaper: "#64748b",   // Slate for Base Paper Reference
    facility: "#e11d48",    // Rose for Facility Barrier
    logistic: "#d97706",    // Amber for Logistic Barrier
    household: "#2563eb",   // Blue for Household Barrier
    overall: "#4f46e5",     // Indigo for Overall
    teal: "#0d9488",
    c0: "#e11d48",
    c1: "#0284c7",
    c2: "#d97706",
    c3: "#6366f1"
  },

  // Active chart registry for modals & cross-filtering
  _chartRegistry: {},

  showChartStatus: function (containerId, kind, message, retryFn) {
    const el = document.getElementById(containerId);
    if (!el) {
      console.error('Chart container not found:', containerId);
      return false;
    }
    if (kind === 'loading') {
      el.innerHTML = '<div style="padding: 40px; text-align: center; color: var(--text-muted);">' +
        (message || 'Loading chart...') + '</div>';
      return true;
    }
    if (kind === 'error') {
      const retryId = containerId + '-retry-btn';
      el.innerHTML = '<div style="padding: 40px; text-align: center; color: var(--text-muted);">' +
        '<div style="margin-bottom:12px;">' + (message || 'Unable to load chart.') + '</div>' +
        '<button type="button" class="chart-btn" id="' + retryId + '">Retry</button></div>';
      const btn = document.getElementById(retryId);
      if (btn && typeof retryFn === 'function') {
        btn.addEventListener('click', retryFn);
      }
    }
    return true;
  },

  ensureChartReady: function (containerId) {
    const el = document.getElementById(containerId);
    if (!el) {
      console.error('Chart container not found:', containerId);
      return false;
    }
    if (typeof Plotly === 'undefined') {
      console.error('Plotly is not loaded before chart render for', containerId);
      this.showChartStatus(containerId, 'error', 'Unable to load chart (Plotly is not available).');
      return false;
    }
    return true;
  },

  _plot: function (containerId, data, layout) {
    if (!this.ensureChartReady(containerId)) return;
    try {
      Plotly.react(containerId, data, layout, this.baseConfig);
    } catch (err) {
      console.error('Plotly.react failed for', containerId, err);
      this.showChartStatus(containerId, 'error', 'Unable to load chart.');
    }
  },

  loadJsonAndRender: function (opts) {
    const self = this;
    const containers = opts.containerIds || (opts.containerId ? [opts.containerId] : []);
    const loadingMsg = opts.loadingMessage || 'Loading chart...';
    const errorMsg = opts.errorMessage || 'Unable to load chart.';
    const filename = opts.filename;
    const filenames = opts.filenames;
    const render = opts.render;

    function run() {
      containers.forEach(function (id) { self.showChartStatus(id, 'loading', loadingMsg); });
      if (typeof Plotly === 'undefined') {
        containers.forEach(function (id) {
          self.showChartStatus(id, 'error', 'Unable to load chart (Plotly is not available).', run);
        });
        return;
      }
      if (!window.DashboardState || typeof window.DashboardState.fetchData !== 'function') {
        console.error('DashboardState is not initialized');
        containers.forEach(function (id) { self.showChartStatus(id, 'error', errorMsg, run); });
        return;
      }
      const request = filenames
        ? Promise.all(filenames.map(function (f) { return window.DashboardState.fetchData(f); }))
        : window.DashboardState.fetchData(filename);
      request.then(function (data) {
        const ok = filenames ? (Array.isArray(data) && data.every(Boolean)) : !!data;
        if (!ok) {
          containers.forEach(function (id) { self.showChartStatus(id, 'error', errorMsg, run); });
          return;
        }
        try {
          render(data);
        } catch (err) {
          console.error('Chart render failed:', err);
          containers.forEach(function (id) { self.showChartStatus(id, 'error', errorMsg, run); });
        }
      }).catch(function (err) {
        console.error('Chart data load failed:', err);
        containers.forEach(function (id) { self.showChartStatus(id, 'error', errorMsg, run); });
      });
    }

    run();
    return run;
  },

  // Base Plotly Configuration
  baseConfig: {
    responsive: true,
    displayModeBar: true,
    displaylogo: false,
    modeBarButtonsToRemove: ['lasso2d', 'select2d', 'autoScale2d'],
    toImageButtonOptions: {
      format: 'png',
      filename: 'barrierlens_chart_export',
      height: 600,
      width: 900,
      scale: 2
    }
  },

  // Dark/Light Theme layout detector
  getBaseLayout: function (title, xAxisTitle = '', yAxisTitle = '') {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#f8fafc' : '#0f172a';
    const mutedColor = isDark ? '#94a3b8' : '#64748b';
    const gridColor = isDark ? '#1e293b' : '#f1f5f9';
    const zerolineColor = isDark ? '#334155' : '#e2e8f0';

    return {
      title: {
        text: title,
        font: { family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', size: 15, color: textColor, weight: 800 },
        x: 0,
        xanchor: 'left'
      },
      margin: { t: 50, b: 60, l: 60, r: 20 },
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent',
      font: { family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', color: mutedColor },
      xaxis: {
        title: { text: xAxisTitle, font: { size: 12, color: mutedColor } },
        color: mutedColor,
        gridcolor: gridColor,
        zerolinecolor: zerolineColor
      },
      yaxis: {
        title: { text: yAxisTitle, font: { size: 12, color: mutedColor } },
        color: mutedColor,
        gridcolor: gridColor,
        zerolinecolor: zerolineColor
      },
      legend: {
        orientation: 'h',
        y: -0.22,
        x: 0,
        font: { size: 12, color: mutedColor }
      },
      hoverlabel: {
        bgcolor: isDark ? '#1e293b' : '#0f172a',
        font: { family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', size: 12, color: '#ffffff' },
        bordercolor: 'transparent'
      }
    };
  },

  // Attach toolbar actions (Fullscreen modal, Download, Explanation)
  injectChartActions: function (containerId, title, explanation) {
    const el = document.getElementById(containerId);
    if (!el || el.dataset.actionsInjected) return;

    const parentCard = el.closest('.card');
    if (parentCard) {
      let titleRow = parentCard.querySelector('.card-title-row');
      if (!titleRow) {
        const titleEl = parentCard.querySelector('.card-title');
        if (titleEl) {
          titleRow = document.createElement('div');
          titleRow.className = 'card-title-row';
          titleEl.parentNode.insertBefore(titleRow, titleEl);
          titleRow.appendChild(titleEl);
        }
      }

      if (titleRow && !titleRow.querySelector('.card-actions')) {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'card-actions';
        actionsDiv.innerHTML = `
          <button class="chart-btn" onclick="ChartUtils.openExpandedChartModal('${containerId}', '${title.replace(/'/g, "\\'")}', \`${(explanation || '').replace(/`/g, '\\`')}\`)" title="Expand Fullscreen with Explanation">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
            <span>Expand &amp; Explain</span>
          </button>
          <button class="chart-btn" onclick="Plotly.downloadImage('${containerId}', {format: 'png', filename: '${containerId}_export', height: 600, width: 900, scale: 2})" title="Export High-Res PNG">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            <span>PNG</span>
          </button>
        `;
        titleRow.appendChild(actionsDiv);
      }
    }
    el.dataset.actionsInjected = "true";
  },

  createGroupedBarChart: function (containerId, title, categories, seriesList, explanation) {
    const formattedCategories = categories.map(c => window.LabelRenderer ? window.LabelRenderer.formatFeatureName(c) : c);

    const data = seriesList.map(s => ({
      x: formattedCategories,
      y: s.values,
      name: s.name,
      type: 'bar',
      marker: { color: s.color, cornerradius: 4 },
      text: s.values.map(v => (typeof v === 'number' ? (v > 1 ? v.toFixed(1) + '%' : (v * 100).toFixed(1) + '%') : v)),
      textposition: 'auto',
      hovertemplate: '<b>%{x}</b><br>' + s.name + ': <b>%{text}</b><extra></extra>'
    }));

    const layout = this.getBaseLayout(title, '', 'Prevalence / Probability');
    layout.barmode = 'group';

    this._chartRegistry[containerId] = { type: 'grouped', data, layout, title, explanation, categories, seriesList };
    this._plot(containerId, data, layout);
    this.injectChartActions(containerId, title, explanation);
  },

  createStackedBarChart: function (containerId, title, categories, seriesList, explanation) {
    const formattedCategories = categories.map(c => window.LabelRenderer ? window.LabelRenderer.formatFeatureName(c) : c);

    const data = seriesList.map(s => ({
      x: formattedCategories,
      y: s.values,
      name: s.name,
      type: 'bar',
      marker: { color: s.color, cornerradius: 4 },
      text: s.values.map(v => (typeof v === 'number' ? (v > 1 ? v.toFixed(1) + '%' : (v * 100).toFixed(1) + '%') : v)),
      textposition: 'inside',
      hovertemplate: '<b>%{x}</b><br>' + s.name + ': <b>%{text}</b><extra></extra>'
    }));

    const layout = this.getBaseLayout(title, '', 'Percentage of Women (%)');
    layout.barmode = 'stack';

    this._chartRegistry[containerId] = { type: 'stacked', data, layout, title, explanation, categories, seriesList };
    this._plot(containerId, data, layout);
    this.injectChartActions(containerId, title, explanation);
  },

  createRankedBarChart: function (containerId, title, categories, values, color = '#0284c7', yAxisTitle = 'Prevalence (%)', explanation = '') {
    const formattedCategories = categories.map(c => window.LabelRenderer ? window.LabelRenderer.formatFeatureName(c) : c);

    const data = [{
      x: formattedCategories,
      y: values,
      type: 'bar',
      marker: { color: color, cornerradius: 4 },
      text: values.map(v => (typeof v === 'number' ? (v > 1 ? v.toFixed(1) + '%' : (v * 100).toFixed(1) + '%') : v)),
      textposition: 'auto',
      hovertemplate: '<b>%{x}</b><br>' + yAxisTitle + ': <b>%{text}</b><extra></extra>'
    }];

    const layout = this.getBaseLayout(title, '', yAxisTitle);
    layout.margin.b = 100;
    layout.xaxis.tickangle = -45;

    this._chartRegistry[containerId] = { type: 'ranked', data, layout, title, explanation, categories, values, color, yAxisTitle };
    this._plot(containerId, data, layout);
    this.injectChartActions(containerId, title, explanation);
  },

  createHorizontalBarChart: function (containerId, title, categories, values, color = '#6366f1', xAxisTitle = 'Odds Ratio (OR)', explanation = '') {
    const formattedCategories = categories.map(c => window.LabelRenderer ? window.LabelRenderer.formatFeatureName(c) : c);

    const data = [{
      x: values,
      y: formattedCategories,
      type: 'bar',
      orientation: 'h',
      marker: { color: color, cornerradius: 4 },
      text: values.map(v => (typeof v === 'number' ? v.toFixed(3) : v)),
      textposition: 'auto',
      hovertemplate: '<b>%{y}</b><br>' + xAxisTitle + ': <b>%{x:.3f}</b><extra></extra>'
    }];

    const layout = this.getBaseLayout(title, xAxisTitle, '');
    layout.margin.l = 300;
    layout.yaxis.autorange = 'reversed';

    this._chartRegistry[containerId] = { type: 'horizontal', data, layout, title, explanation, categories, values, color, xAxisTitle };
    this._plot(containerId, data, layout);
    this.injectChartActions(containerId, title, explanation);
  },

  createTreemapChart: function (containerId, title, labels, values, colorscale = 'Blues', domainName = 'Prevalence', explanation = '') {
    const data = [{
      type: 'treemap',
      labels: labels,
      parents: labels.map(() => ''),
      values: values,
      texttemplate: '<b>%{label}</b><br>%{value:.1f}%',
      textfont: { family: '-apple-system, BlinkMacSystemFont, sans-serif', size: 13, color: '#ffffff' },
      hovertemplate: 'State / UT: <b>%{label}</b><br>' + domainName + ': <b>%{value:.1f}%</b><extra></extra>',
      marker: {
        colors: values,
        colorscale: colorscale,
        showscale: true,
        colorbar: { title: { text: 'Prevalence (%)', font: { size: 11 } } }
      }
    }];

    const layout = {
      title: {
        text: title,
        font: { family: '-apple-system, BlinkMacSystemFont, sans-serif', size: 15, color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#f8fafc' : '#0f172a', weight: 800 },
        x: 0,
        xanchor: 'left'
      },
      margin: { t: 50, b: 20, l: 20, r: 20 },
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent'
    };

    this._chartRegistry[containerId] = { type: 'treemap', data, layout, title, explanation, labels, values };
    this._plot(containerId, data, layout);
    this.injectChartActions(containerId, title, explanation);
  },

  // Full Screen Chart Modal with Detailed Non-Causal Explanation
  openExpandedChartModal: function (containerId, defaultTitle, customExplanation) {
    let modal = document.getElementById("chart-detail-modal");
    if (!modal) {
      const modalHtml = `
        <div class="modal-backdrop" id="chart-detail-modal">
          <div class="chart-modal-card">
            <div class="chart-modal-header">
              <div>
                <div id="chart-modal-title" style="font-size:1.15rem; font-weight:800; color:#ffffff;">Expanded Chart Visualization</div>
                <div style="font-size:0.8rem; color:#94a3b8; margin-top:2px;">Complete interactive inspection &amp; academic explanation</div>
              </div>
              <button id="close-chart-modal-btn" style="background:rgba(255,255,255,0.15); border:none; color:#ffffff; padding:6px 14px; border-radius:6px; font-weight:700; cursor:pointer;">Close &times;</button>
            </div>
            <div class="chart-modal-body">
              <div id="chart-modal-plot-container" class="chart-modal-plot-container"></div>
              <div class="callout callout-info" id="chart-modal-explanation"></div>
            </div>
          </div>
        </div>
      `;
      document.body.insertAdjacentHTML("beforeend", modalHtml);
      modal = document.getElementById("chart-detail-modal");

      document.getElementById("close-chart-modal-btn").onclick = () => modal.classList.remove("active");
      modal.onclick = (e) => { if (e.target === modal) modal.classList.remove("active"); };
    }

    const reg = this._chartRegistry[containerId];
    const title = reg ? reg.title : defaultTitle;
    const data = reg ? reg.data : [];
    const layout = reg ? JSON.parse(JSON.stringify(reg.layout)) : this.getBaseLayout(title);

    layout.height = 480;
    layout.margin.t = 40;
    layout.margin.b = 80;

    document.getElementById("chart-modal-title").textContent = title;
    modal.classList.add("active");

    Plotly.react("chart-modal-plot-container", data, layout, this.baseConfig);

    let explanationText = customExplanation || (reg ? reg.explanation : null);
    if (!explanationText) {
      explanationText = `
        <strong>Statistical Interpretation &amp; Academic Note:</strong><br>
        • Observed prevalence metrics are calculated from 724,115 Indian women surveyed in NFHS-5.<br>
        • Model predicted probabilities represent out-of-fold Stage 1 machine learning inferences.<br>
        <em>Note:</em> Differences between demographic cohorts describe observational cross-sectional patterns and should not be interpreted as physical causal relationships.
      `;
    }

    document.getElementById("chart-modal-explanation").innerHTML = explanationText;
  }
};

// Re-render all registered charts on theme change
if (window.DashboardState) {
  window.DashboardState.on('theme-change', function () {
    Object.keys(ChartUtils._chartRegistry).forEach(containerId => {
      const el = document.getElementById(containerId);
      if (el && ChartUtils._chartRegistry[containerId]) {
        const reg = ChartUtils._chartRegistry[containerId];
        const layout = ChartUtils.getBaseLayout(reg.title);
        if (reg.layout.barmode) layout.barmode = reg.layout.barmode;
        if (reg.layout.margin) layout.margin = reg.layout.margin;
        if (typeof Plotly !== 'undefined') {
          Plotly.relayout(containerId, layout);
        }
      }
    });
  });
}
