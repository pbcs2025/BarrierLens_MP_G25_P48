// Shared Plotly Helper Functions & Expanded Chart Modal for BarrierLens Dashboard
const ChartUtils = {
  // Soft Lavender & Theme Palette
  colors: {
    railA: "#0284c7",       // Soft sky blue for Rail A (Observed)
    railB: "#7c3aed",       // Lavender purple for Rail B (Predicted)
    basePaper: "#64748b",   // Slate for Base Paper Reference
    facility: "#e11d48",    // Soft rose for Facility
    logistic: "#d97706",    // Subtle amber for Logistic
    household: "#2563eb",   // Soft blue for Household
    overall: "#7c3aed",     // Lavender for Overall
    c0: "#0284c7",
    c1: "#d97706",
    c2: "#e11d48",
    c3: "#7c3aed"
  },

  // Registry for active charts to support click-to-expand
  _chartRegistry: {},

  // Base Chart Config
  baseConfig: {
    responsive: true,
    displayModeBar: true,
    displaylogo: false,
    modeBarButtonsToRemove: ['lasso2d', 'select2d', 'autoScale2d']
  },

  // Common Layout Styling
  getBaseLayout: function (title, xAxisTitle = '', yAxisTitle = '') {
    return {
      title: {
        text: title,
        font: { family: '-apple-system, sans-serif', size: 15, color: '#1e1b4b', weight: 800 },
        x: 0,
        xanchor: 'left'
      },
      margin: { t: 50, b: 60, l: 60, r: 20 },
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent',
      font: { family: '-apple-system, sans-serif', color: '#64748b' },
      xaxis: {
        title: { text: xAxisTitle, font: { size: 12, color: '#64748b' } },
        color: '#64748b',
        gridcolor: '#e9d5ff',
        zerolinecolor: '#e2e8f0'
      },
      yaxis: {
        title: { text: yAxisTitle, font: { size: 12, color: '#64748b' } },
        color: '#64748b',
        gridcolor: '#e9d5ff',
        zerolinecolor: '#e2e8f0'
      },
      legend: {
        orientation: 'h',
        y: -0.22,
        x: 0,
        font: { size: 12, color: '#475569' }
      },
      hoverlabel: {
        bgcolor: '#2e1065',
        font: { family: '-apple-system, sans-serif', size: 12, color: '#ffffff' },
        bordercolor: 'transparent'
      }
    };
  },

  // Register click handler for expanded view modal
  registerChartClick: function (containerId, title, explanationText) {
    const el = document.getElementById(containerId);
    if (!el) return;

    el.onclick = () => {
      this.openExpandedChartModal(containerId, title, explanationText);
    };
  },

  createGroupedBarChart: function (containerId, title, categories, seriesList, explanation) {
    // Format categories to human-readable names if needed
    const formattedCategories = categories.map(c => LabelRenderer ? LabelRenderer.formatFeatureName(c) : c);

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

    this._chartRegistry[containerId] = { data, layout, title, explanation };
    Plotly.react(containerId, data, layout, this.baseConfig);
    this.registerChartClick(containerId, title, explanation);
  },

  createStackedBarChart: function (containerId, title, categories, seriesList, explanation) {
    const formattedCategories = categories.map(c => LabelRenderer ? LabelRenderer.formatFeatureName(c) : c);

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

    this._chartRegistry[containerId] = { data, layout, title, explanation };
    Plotly.react(containerId, data, layout, this.baseConfig);
    this.registerChartClick(containerId, title, explanation);
  },

  createRankedBarChart: function (containerId, title, categories, values, color = '#0284c7', yAxisTitle = 'Prevalence (%)', explanation = '') {
    const formattedCategories = categories.map(c => LabelRenderer ? LabelRenderer.formatFeatureName(c) : c);

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

    this._chartRegistry[containerId] = { data, layout, title, explanation };
    Plotly.react(containerId, data, layout, this.baseConfig);
    this.registerChartClick(containerId, title, explanation);
  },

  createHorizontalBarChart: function (containerId, title, categories, values, color = '#7c3aed', xAxisTitle = 'Odds Ratio (OR)', explanation = '') {
    const formattedCategories = categories.map(c => LabelRenderer ? LabelRenderer.formatFeatureName(c) : c);

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
    layout.margin.l = 320;
    layout.yaxis.autorange = 'reversed';

    this._chartRegistry[containerId] = { data, layout, title, explanation };
    Plotly.react(containerId, data, layout, this.baseConfig);
    this.registerChartClick(containerId, title, explanation);
  },

  createTreemapChart: function (containerId, title, labels, values, colorscale = 'Purples', domainName = 'Prevalence', explanation = '') {
    const data = [{
      type: 'treemap',
      labels: labels,
      parents: labels.map(() => ''),
      values: values,
      texttemplate: '<b>%{label}</b><br>%{value:.1f}%',
      textfont: { family: '-apple-system, sans-serif', size: 13, color: '#ffffff' },
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
        font: { family: '-apple-system, sans-serif', size: 15, color: '#1e1b4b', weight: 800 },
        x: 0,
        xanchor: 'left'
      },
      margin: { t: 50, b: 20, l: 20, r: 20 },
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent'
    };

    this._chartRegistry[containerId] = { data, layout, title, explanation };
    Plotly.react(containerId, data, layout, this.baseConfig);
    this.registerChartClick(containerId, title, explanation);
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
                <div style="font-size:0.8rem; color:#e9d5ff; margin-top:2px;">Complete interactive inspection &amp; statistical explanation</div>
              </div>
              <button id="close-chart-modal-btn" style="background:rgba(255,255,255,0.15); border:none; color:#ffffff; padding:6px 12px; border-radius:6px; font-weight:700; cursor:pointer;">Close &times;</button>
            </div>
            <div class="chart-modal-body">
              <div id="chart-modal-plot-container" class="chart-modal-plot-container"></div>
              <div class="chart-explanation-box" id="chart-modal-explanation"></div>
            </div>
          </div>
        </div>
      `;
      document.body.insertAdjacentHTML("beforeend", modalHtml);
      modal = document.getElementById("chart-detail-modal");

      document.getElementById("close-chart-modal-btn").onclick = () => {
        modal.classList.remove("active");
      };

      modal.onclick = (e) => {
        if (e.target === modal) modal.classList.remove("active");
      };
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

    // Dynamic Statistical & Non-Causal Explanation
    let explanationText = customExplanation || (reg ? reg.explanation : null);
    if (!explanationText) {
      if (title.toLowerCase().includes("odds ratio")) {
        explanationText = `
          <strong>Understanding Logistic Regression Odds Ratios (OR):</strong><br>
          • <strong>OR > 1:</strong> Indicates higher odds of experiencing the barrier associated with this feature.<br>
          • <strong>OR < 1:</strong> Indicates lower odds of experiencing the barrier (protective factor).<br>
          • <strong>OR ≈ 1:</strong> Indicates little to no observed association in the logistic model.<br>
          <em>Note:</em> Odds ratios describe cross-sectional statistical associations in the NFHS-5 dataset. They do not demonstrate causal mechanics.
        `;
      } else if (title.toLowerCase().includes("shap")) {
        explanationText = `
          <strong>Understanding SHAP (SHapley Additive exPlanations):</strong><br>
          • <strong>Feature Impact:</strong> SHAP values quantify each feature's directional contribution to the model's prediction for an individual woman.<br>
          • <strong>Beeswarm Plot:</strong> Points positioned further right indicate higher predicted barrier risk; color represents feature value (red = high, blue = low).<br>
          <em>Note:</em> SHAP values measure machine learning model attribution value — they do not demonstrate real-world physical causality.
        `;
      } else {
        explanationText = `
          <strong>Understanding the Chart Metrics:</strong><br>
          This visualization compares observed survey prevalence (Rail A) and machine learning model predictions (Rail B) across key sub-populations.<br>
          <em>Note:</em> Differences between groups reflect observed sample distributions in NFHS-5 (N = 724,115). All statistics represent observational cross-sectional patterns.
        `;
      }
    }

    document.getElementById("chart-modal-explanation").innerHTML = explanationText;
  }
};
