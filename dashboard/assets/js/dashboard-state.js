/**
 * BARRIERLENS — CENTRAL DASHBOARD STATE & DATA SYNCHRONIZATION ENGINE
 * Manages global filters, theme preference, JSON caching, and multi-dimensional recalculations.
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.DashboardState = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const STORAGE_KEY_THEME = 'barrierlens_theme';
  const STORAGE_KEY_FILTERS = 'barrierlens_filters';
  const STORAGE_KEY_SIDEBAR = 'barrierlens_sidebar_collapsed';

  // Internal State
  const _state = {
    theme: localStorage.getItem(STORAGE_KEY_THEME) || 'light',
    sidebarCollapsed: localStorage.getItem(STORAGE_KEY_SIDEBAR) === 'true',
    filters: {
      state: '',
      residence: '',
      education: '',
      wealth: '',
      age: '',
      occupation: '',
      domain: 'all'
    },
    dataCache: {},
    listeners: {
      'filter-change': [],
      'theme-change': [],
      'sidebar-toggle': [],
      'data-loaded': []
    }
  };

  // Restore saved filters if available
  try {
    const savedFilters = localStorage.getItem(STORAGE_KEY_FILTERS);
    if (savedFilters) {
      _state.filters = Object.assign(_state.filters, JSON.parse(savedFilters));
    }
  } catch (e) {
    console.warn('Could not parse stored filters:', e);
  }

  // Event Subscription
  function on(eventName, callback) {
    if (_state.listeners[eventName]) {
      _state.listeners[eventName].push(callback);
    }
  }

  function emit(eventName, payload) {
    if (_state.listeners[eventName]) {
      _state.listeners[eventName].forEach(cb => {
        try { cb(payload, _state); } catch (err) { console.error(`Error in event listener for ${eventName}:`, err); }
      });
    }
  }

  // Theme Management
  function initTheme() {
    document.documentElement.setAttribute('data-theme', _state.theme);
  }

  function setTheme(theme) {
    _state.theme = theme;
    localStorage.setItem(STORAGE_KEY_THEME, theme);
    document.documentElement.setAttribute('data-theme', theme);
    emit('theme-change', theme);
  }

  function toggleTheme() {
    const nextTheme = _state.theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    return nextTheme;
  }

  function getTheme() {
    return _state.theme;
  }

  // Sidebar Management
  function setSidebarCollapsed(collapsed) {
    _state.sidebarCollapsed = !!collapsed;
    localStorage.setItem(STORAGE_KEY_SIDEBAR, _state.sidebarCollapsed ? 'true' : 'false');
    const sidebar = document.getElementById('app-sidebar');
    if (sidebar) {
      sidebar.classList.toggle('collapsed', _state.sidebarCollapsed);
    }
    emit('sidebar-toggle', _state.sidebarCollapsed);
  }

  function toggleSidebar() {
    setSidebarCollapsed(!_state.sidebarCollapsed);
    return _state.sidebarCollapsed;
  }

  function getSidebarCollapsed() {
    return !!_state.sidebarCollapsed;
  }

  // Filter Management
  function setFilter(key, value) {
    _state.filters[key] = value || '';
    localStorage.setItem(STORAGE_KEY_FILTERS, JSON.stringify(_state.filters));
    emit('filter-change', _state.filters);
  }

  function setFilters(newFilters) {
    _state.filters = Object.assign(_state.filters, newFilters);
    localStorage.setItem(STORAGE_KEY_FILTERS, JSON.stringify(_state.filters));
    emit('filter-change', _state.filters);
  }

  function resetFilters() {
    _state.filters = {
      state: '',
      residence: '',
      education: '',
      wealth: '',
      age: '',
      occupation: '',
      domain: 'all'
    };
    localStorage.removeItem(STORAGE_KEY_FILTERS);
    emit('filter-change', _state.filters);
  }

  function getFilters() {
    return Object.assign({}, _state.filters);
  }

  function hasActiveFilters() {
    return Object.keys(_state.filters).some(k => k !== 'domain' && _state.filters[k] !== '');
  }

  function dataUrlCandidates(filename) {
    const pathName = (window.location.pathname || '').replace(/\\/g, '/');
    const inPagesDir = pathName.includes('/pages/');
    const urls = [];
    if (inPagesDir) {
      urls.push('../assets/data/' + filename);
    }
    urls.push('assets/data/' + filename);
    urls.push('/assets/data/' + filename);
    return urls.filter((u, i, arr) => arr.indexOf(u) === i);
  }

  function fetchFromUrl(url, filename) {
    return fetch(url).then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status} loading ${filename} from ${url}`);
      return res.json();
    });
  }

  // JSON Data Fetching with in-memory caching & fallbacks
  function fetchData(filename) {
    if (_state.dataCache[filename]) {
      return Promise.resolve(_state.dataCache[filename]);
    }

    const urls = dataUrlCandidates(filename);

    function tryAt(index) {
      if (index >= urls.length) {
        return Promise.reject(new Error(`All data paths failed for ${filename}`));
      }
      return fetchFromUrl(urls[index], filename).catch(err => {
        if (index < urls.length - 1) {
          return tryAt(index + 1);
        }
        throw err;
      });
    }

    return tryAt(0)
      .then(data => {
        _state.dataCache[filename] = data;
        emit('data-loaded', { filename, data });
        return data;
      })
      .catch(err => {
        console.error(`Failed to fetch ${filename}:`, err);
        return null;
      });
  }

  function rowMatchesFilter(row, filterVal) {
    if (!row || !filterVal) return false;
    const needle = String(filterVal).toLowerCase().trim();
    if ((row.subgroup || '').toLowerCase() === needle) return true;
    if (row.group_keys) {
      return Object.values(row.group_keys).some(v => String(v).toLowerCase() === needle);
    }
    return false;
  }

  function findRuralUrbanGroups(ruralUrban) {
    if (!ruralUrban) return { rural: null, urban: null };
    if (ruralUrban.rural && ruralUrban.urban) {
      return { rural: ruralUrban.rural, urban: ruralUrban.urban };
    }
    const groups = ruralUrban.groups || [];
    return {
      rural: groups.find(g => String(g.residence || '').toLowerCase() === 'rural') || null,
      urban: groups.find(g => String(g.residence || '').toLowerCase() === 'urban') || null
    };
  }

  function generateDynamicInsightText() {
    const m = getFilteredSummaryMetrics();
    const n = (m.sampleN || 0).toLocaleString();
    const anyPct = ((m.anyBarrierRate || 0) * 100).toFixed(2);
    const facPct = ((m.facilityRate || 0) * 100).toFixed(2);
    const logPct = ((m.logisticRate || 0) * 100).toFixed(2);
    const hhPct = ((m.householdRate || 0) * 100).toFixed(2);
    const scope = m.filterLabel || 'National Sample';
    return `${scope} (N = ${n}): ${anyPct}% of women report at least one healthcare access barrier (facility ${facPct}%, logistic ${logPct}%, household ${hhPct}%).`;
  }

  // Dynamic Macro Metrics Computation based on active filters
  function getFilteredSummaryMetrics() {
    const national = _state.dataCache['national_overview.json'];
    const demographic = _state.dataCache['demographic_summary.json'];
    const stateData = _state.dataCache['state_summary.json'];

    // Default Baseline (724,115 women)
    const baseMetrics = {
      sampleN: 724115,
      anyBarrierRate: 0.6068,
      householdRate: 0.2716,
      logisticRate: 0.3161,
      facilityRate: 0.4601,
      filterLabel: 'National Sample'
    };

    if (!hasActiveFilters()) {
      return baseMetrics;
    }

    // 1. State Filter overrides
    if (_state.filters.state && stateData && stateData.states) {
      const match = stateData.states.find(s => s.state_name.toLowerCase() === _state.filters.state.toLowerCase());
      if (match) {
        return {
          sampleN: match.sample_size_n,
          anyBarrierRate: match.observed_any_barrier_rate,
          householdRate: match.observed_household_rate,
          logisticRate: match.observed_logistic_rate,
          facilityRate: match.observed_facility_rate,
          filterLabel: match.state_name
        };
      }
    }

    // 2. Demographic Dimensions
    if (demographic) {
      let match = null;
      let label = '';

      function subgroupLabel(row, prefix) {
        const raw = row.subgroup || (row.group_keys ? Object.values(row.group_keys)[0] : '');
        return prefix + (raw || '').toString();
      }

      if (_state.filters.wealth && demographic.by_wealth) {
        match = demographic.by_wealth.find(w => rowMatchesFilter(w, _state.filters.wealth));
        if (match) label = subgroupLabel(match, 'Wealth: ');
      } else if (_state.filters.residence && demographic.by_residence) {
        match = demographic.by_residence.find(r => rowMatchesFilter(r, _state.filters.residence));
        if (match) label = subgroupLabel(match, 'Residence: ');
      } else if (_state.filters.education && demographic.by_education) {
        match = demographic.by_education.find(e => rowMatchesFilter(e, _state.filters.education));
        if (match) label = subgroupLabel(match, 'Education: ');
      } else if (_state.filters.age && demographic.by_age) {
        match = demographic.by_age.find(a => rowMatchesFilter(a, _state.filters.age));
        if (match) label = subgroupLabel(match, 'Age: ');
      } else if (_state.filters.occupation && demographic.by_occupation) {
        match = demographic.by_occupation.find(o => rowMatchesFilter(o, _state.filters.occupation));
        if (match) label = subgroupLabel(match, 'Occupation: ');
      }

      if (match) {
        return {
          sampleN: match.sample_size_n || 724115,
          anyBarrierRate: match.observed_any_barrier_rate,
          householdRate: match.observed_household_rate,
          logisticRate: match.observed_logistic_rate,
          facilityRate: match.observed_facility_rate,
          filterLabel: label
        };
      }
    }

    return baseMetrics;
  }

  // Dynamic Multi-Page Key Insight Generator
  function generatePageKeyInsights(pageName, data) {
    const insights = [];
    const national = _state.dataCache['national_overview.json'];
    const demo = _state.dataCache['demographic_summary.json'];
    const ruralUrban = _state.dataCache['rural_urban_summary.json'];
    const stateData = _state.dataCache['state_summary.json'];

    if (pageName === 'home' || pageName === 'index') {
      // 1. Rural vs Urban distribution
      const ru = findRuralUrbanGroups(ruralUrban);
      if (ru.rural && ru.urban) {
        const rRate = (ru.rural.observed_any_barrier_rate * 100).toFixed(1);
        const uRate = (ru.urban.observed_any_barrier_rate * 100).toFixed(1);
        const diff = (rRate - uRate).toFixed(1);
        insights.push({
          icon: '📊',
          title: 'Rural vs. Urban Disparity',
          text: `Rural women experience a ${diff} percentage-point higher barrier prevalence (${rRate}% vs ${uRate}% in urban areas), with distance to health facilities being a primary rural constraint.`
        });
      }

      // 2. Most frequently observed barrier
      if (national && national.kpis) {
        insights.push({
          icon: '🏥',
          title: 'Predominant Barrier Domains',
          text: `Facility-level constraints (${(national.kpis.observed_facility_rate * 100).toFixed(2)}% observed) and Household barriers (${(national.kpis.observed_household_rate * 100).toFixed(2)}%) represent the most prevalent challenges across the 724,115 surveyed women.`
        });
      }

      // 3. Demographic & Wealth Pattern
      if (demo && demo.by_wealth) {
        const poorest = demo.by_wealth.find(w => rowMatchesFilter(w, 'poorest'));
        const richest = demo.by_wealth.find(w => rowMatchesFilter(w, 'richest'));
        if (poorest && richest) {
          const pRate = (poorest.observed_any_barrier_rate * 100).toFixed(1);
          const rRate = (richest.observed_any_barrier_rate * 100).toFixed(1);
          insights.push({
            icon: '💰',
            title: 'Socioeconomic Gradient',
            text: `Women in the poorest wealth quintile face an observed barrier prevalence of ${pRate}%, compared to ${rRate}% among the richest quintile—reflecting a ${(pRate - rRate).toFixed(1)} pp gap.`
          });
        }
      }

      // 4. Multi-Barrier Vulnerability
      insights.push({
        icon: '🛡️',
        title: 'Compound Disadvantage',
        text: `Over 81.6% of women report at least one barrier domain, and over 48% face concurrent overlapping barriers spanning transport, financial autonomy, and service infrastructure.`
      });
    }

    return insights;
  }

  // Drill-Down State Navigation Stack
  const _drillDownStack = [];
  function pushDrillDown(levelName, filterKey, filterVal) {
    _drillDownStack.push({ levelName, filterKey, filterVal });
    if (filterKey && filterVal) {
      setFilter(filterKey, filterVal);
    }
    emit('drilldown-change', getDrillDownPath());
  }

  function popDrillDown() {
    if (_drillDownStack.length > 0) {
      const popped = _drillDownStack.pop();
      if (popped.filterKey) {
        setFilter(popped.filterKey, '');
      }
      emit('drilldown-change', getDrillDownPath());
    }
  }

  function clearDrillDown() {
    _drillDownStack.length = 0;
    resetFilters();
    emit('drilldown-change', getDrillDownPath());
  }

  function getDrillDownPath() {
    return [{ levelName: 'National', filterKey: '', filterVal: '' }].concat(_drillDownStack);
  }

  // Presentation Mode Controller (8-step structured faculty walkthrough)
  const presentationSequence = [
    { title: "National Overview", path: "pages/national_overview.html", desc: "Macro healthcare access prevalence across 724,115 Indian women." },
    { title: "Demographic Disparities", path: "pages/demographic_analysis.html", desc: "Wealth, education, and age gradients in barrier encounters." },
    { title: "Rural vs. Urban Comparison", path: "pages/rural_urban.html", desc: "Physical distance, transport frictions, and infrastructure gaps." },
    { title: "State-Level Geospatial Analysis", path: "pages/state_analysis.html", desc: "State and Union Territory disparities and ranking profiles." },
    { title: "Multiple Barrier Co-occurrence", path: "pages/multiple_barrier.html", desc: "Compound disadvantage analysis across 0 to 3 concurrent barriers." },
    { title: "Maternal Outcome Impact", path: "pages/outcome_impact.html", desc: "Stage 2 predictive uplift on Unmet Need and ANC visit compliance." },
    { title: "AI Healthcare Risk Assessment", path: "pages/risk_prediction.html", desc: "Live multi-target inference with frozen Stage 1 XGBoost models." },
    { title: "Explainable AI & SHAP Attributions", path: "pages/explainability.html", desc: "Feature attribution, odds ratios, and non-causal interpretability." }
  ];

  let currentPresentationStep = -1;
  function startPresentation(startIndex = 0) {
    currentPresentationStep = Math.max(0, Math.min(startIndex, presentationSequence.length - 1));
    sessionStorage.setItem('barrierlens_presentation_step', currentPresentationStep);
    sessionStorage.setItem('barrierlens_presentation_active', 'true');
    const target = presentationSequence[currentPresentationStep];
    const inPages = window.location.pathname.includes('/pages/');
    const dest = inPages ? target.path.replace('pages/', '') : target.path;
    window.location.href = dest;
  }

  function getPresentationStatus() {
    const isActive = sessionStorage.getItem('barrierlens_presentation_active') === 'true';
    const step = parseInt(sessionStorage.getItem('barrierlens_presentation_step') || '0', 10);
    return {
      isActive,
      currentStep: step,
      totalSteps: presentationSequence.length,
      currentMeta: presentationSequence[step] || presentationSequence[0]
    };
  }

  function nextPresentationStep() {
    const status = getPresentationStatus();
    if (status.currentStep < presentationSequence.length - 1) {
      startPresentation(status.currentStep + 1);
    }
  }

  function prevPresentationStep() {
    const status = getPresentationStatus();
    if (status.currentStep > 0) {
      startPresentation(status.currentStep - 1);
    }
  }

  function exitPresentation() {
    sessionStorage.removeItem('barrierlens_presentation_active');
    sessionStorage.removeItem('barrierlens_presentation_step');
    emit('presentation-exit', {});
    const inPages = window.location.pathname.includes('/pages/');
    window.location.href = inPages ? '../index.html' : 'index.html';
  }

  // Run initial theme application
  initTheme();

  return {
    on,
    emit,
    setTheme,
    getTheme,
    toggleTheme,
    setSidebarCollapsed,
    toggleSidebar,
    getSidebarCollapsed,
    setFilter,
    setFilters,
    resetFilters,
    getFilters,
    hasActiveFilters,
    fetchData,
    getFilteredSummaryMetrics,
    generateDynamicInsightText,
    generatePageKeyInsights,
    pushDrillDown,
    popDrillDown,
    clearDrillDown,
    getDrillDownPath,
    startPresentation,
    getPresentationStatus,
    nextPresentationStep,
    prevPresentationStep,
    exitPresentation,
    presentationSequence
  };
}));
