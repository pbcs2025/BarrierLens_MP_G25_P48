// Shared Plotly Helper Functions for BarrierLens
const ChartUtils = {
  // Theme colors
  colors: {
    railA: "#0284c7", // Blue for Rail A (Observed)
    railB: "#7c3aed", // Purple/Indigo for Rail B (Predicted)
    basePaper: "#64748b", // Slate for Base Paper
    facility: "#e11d48", // Rose
    logistic: "#d97706", // Amber
    household: "#2563eb", // Blue
    c0: "#0284c7",
    c1: "#d97706",
    c2: "#e11d48",
    c3: "#7c3aed"
  },

  createGroupedBarChart: function (containerId, title, categories, seriesList) {
    const data = seriesList.map(s => ({
      x: categories,
      y: s.values,
      name: s.name,
      type: 'bar',
      marker: { color: s.color },
      text: s.values.map(v => (v > 1 ? v.toFixed(1) + '%' : (v * 100).toFixed(1) + '%')),
      textposition: 'auto',
      hovertemplate: '<b>%{x}</b><br>' + s.name + ': %{y}<extra></extra>'
    }));

    const layout = {
      title: { text: title, font: { size: 16, color: '#0f172a' } },
      barmode: 'group',
      margin: { t: 50, b: 40, l: 50, r: 20 },
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent',
      xaxis: { color: '#64748b' },
      yaxis: { color: '#64748b', gridcolor: '#f1f5f9', title: 'Prevalence / Probability' },
      legend: { orientation: 'h', y: -0.15 }
    };

    const config = { responsive: true, displayModeBar: false };
    Plotly.newPlot(containerId, data, layout, config);
  },

  createStackedBarChart: function (containerId, title, categories, seriesList) {
    const data = seriesList.map(s => ({
      x: categories,
      y: s.values,
      name: s.name,
      type: 'bar',
      marker: { color: s.color },
      text: s.values.map(v => (v > 1 ? v.toFixed(1) + '%' : (v * 100).toFixed(1) + '%')),
      textposition: 'inside',
      hovertemplate: '<b>%{x}</b><br>' + s.name + ': %{y}<extra></extra>'
    }));

    const layout = {
      title: { text: title, font: { size: 16, color: '#0f172a' } },
      barmode: 'stack',
      margin: { t: 50, b: 50, l: 50, r: 20 },
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent',
      xaxis: { color: '#64748b' },
      yaxis: { color: '#64748b', gridcolor: '#f1f5f9', title: 'Percentage of Women' },
      legend: { orientation: 'h', y: -0.15 }
    };

    const config = { responsive: true, displayModeBar: false };
    Plotly.newPlot(containerId, data, layout, config);
  }
};
