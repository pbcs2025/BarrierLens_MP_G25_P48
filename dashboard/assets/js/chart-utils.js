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
  },

  createRankedBarChart: function (containerId, title, categories, values, color = '#0284c7', yAxisTitle = 'Prevalence (%)') {
    const data = [{
      x: categories,
      y: values,
      type: 'bar',
      marker: { color: color },
      text: values.map(v => (typeof v === 'number' ? (v > 1 ? v.toFixed(1) + '%' : (v * 100).toFixed(1) + '%') : v)),
      textposition: 'auto',
      hovertemplate: '<b>%{x}</b><br>' + yAxisTitle + ': %{y:.1f}%<extra></extra>'
    }];

    const layout = {
      title: { text: title, font: { size: 16, color: '#0f172a' } },
      margin: { t: 50, b: 100, l: 60, r: 20 },
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent',
      xaxis: { color: '#64748b', tickangle: -45 },
      yaxis: { color: '#64748b', gridcolor: '#f1f5f9', title: yAxisTitle }
    };

    const config = { responsive: true, displayModeBar: false };
    Plotly.newPlot(containerId, data, layout, config);
  },

  createHorizontalBarChart: function (containerId, title, categories, values, color = '#0284c7', xAxisTitle = 'Prevalence (%)') {
    const data = [{
      x: values,
      y: categories,
      type: 'bar',
      orientation: 'h',
      marker: { color: color },
      text: values.map(v => (typeof v === 'number' ? (v > 1 ? v.toFixed(1) + '%' : (v * 100).toFixed(1) + '%') : v)),
      textposition: 'auto',
      hovertemplate: '<b>%{y}</b><br>' + xAxisTitle + ': %{x:.1f}%<extra></extra>'
    }];

    const layout = {
      title: { text: title, font: { size: 16, color: '#0f172a' } },
      margin: { t: 50, b: 50, l: 180, r: 30 },
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent',
      xaxis: { color: '#64748b', gridcolor: '#f1f5f9', title: xAxisTitle },
      yaxis: { color: '#0f172a', autorange: 'reversed' }
    };

    const config = { responsive: true, displayModeBar: false };
    Plotly.newPlot(containerId, data, layout, config);
  },

  createTreemapChart: function (containerId, title, labels, values, colorscale = 'Blues', domainName = 'Prevalence') {
    const data = [{
      type: 'treemap',
      labels: labels,
      parents: labels.map(() => ''),
      values: values,
      texttemplate: '<b>%{label}</b><br>%{value:.1f}%',
      textfont: { size: 13 },
      hovertemplate: 'State / UT: <b>%{label}</b><br>' + domainName + ': <b>%{value:.1f}%</b><extra></extra>',
      marker: {
        colors: values,
        colorscale: colorscale,
        showscale: true,
        colorbar: { title: 'Prevalence (%)' }
      }
    }];

    const layout = {
      title: { text: title, font: { size: 16, color: '#0f172a' } },
      margin: { t: 50, b: 20, l: 20, r: 20 },
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent'
    };

    const config = { responsive: true, displayModeBar: false };
    Plotly.newPlot(containerId, data, layout, config);
  }
};



