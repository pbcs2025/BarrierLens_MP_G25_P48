/**
 * BARRIERLENS — MEMBER 1: CHATBOT DATA REGISTRY & LOADER
 * Central data configuration, asynchronous loader, cache management, and multilingual term mapping.
 * Dual environment support: Browser (fetch) & Node.js (fs).
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.BarrierLensData = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /**
   * Central Data Source Registry mapping keys to relative file paths and metadata.
   */
  const CHATBOT_DATA_SOURCES = {
    nationalOverview: {
      file: "dashboard/assets/data/national_overview.json",
      purpose: "National-level BarrierLens overview"
    },
    stateSummary: {
      file: "dashboard/assets/data/state_summary.json",
      purpose: "State-level healthcare access barrier analysis"
    },
    demographicSummary: {
      file: "dashboard/assets/data/demographic_summary.json",
      purpose: "Socio-demographic barrier breakdown (wealth, education, age, etc.)"
    },
    ruralUrbanSummary: {
      file: "dashboard/assets/data/rural_urban_summary.json",
      purpose: "Rural vs Urban healthcare barrier comparison"
    },
    clusterSummary: {
      file: "dashboard/assets/data/cluster_summary.json",
      purpose: "K-Means cluster risk archetypes"
    },
    regressionSummary: {
      file: "dashboard/assets/data/regression_summary.json",
      purpose: "Stage 1 logistic regression odds ratios and coefficients"
    },
    outcomeImpactSummary: {
      file: "dashboard/assets/data/outcome_impact_summary.json",
      purpose: "Stage 2 healthcare utilization impact (unmet FP & ANC gap)"
    },
    empowermentSummary: {
      file: "dashboard/assets/data/empowerment_summary.json",
      purpose: "Household empowerment and medical autonomy analysis"
    },
    multipleBarrierSummary: {
      file: "dashboard/assets/data/multiple_barrier_summary.json",
      purpose: "Multiple overlapping barrier count analysis (0-3 barriers)"
    },
    basePaperReference: {
      file: "dashboard/assets/data/base_paper_reference.json",
      purpose: "Base paper reference findings (Pradhan & De, 2025)"
    },
    validationReport: {
      file: "dashboard/assets/data/validation_report.json",
      purpose: "Verified data integrity & validation report"
    }
  };

  /**
   * In-memory cache for loaded JSON files.
   */
  const _dataCache = {};

  /**
   * Resolve environment-appropriate file path or URL.
   * Auto-adjusts relative path if executing inside dashboard subpages.
   */
  function resolveFilePath(sourceKey, basePath = '') {
    const config = CHATBOT_DATA_SOURCES[sourceKey];
    if (!config) {
      throw new Error(`Unknown data source key: "${sourceKey}"`);
    }
    let relPath = config.file;
    if (basePath) {
      if (!basePath.endsWith('/')) basePath += '/';
      relPath = basePath + relPath.replace(/^dashboard\//, '');
    } else if (typeof window !== 'undefined' && window.location && window.location.pathname) {
      // Auto-detect if loaded inside dashboard/pages/ directory
      if (window.location.pathname.indexOf('/pages/') !== -1) {
        relPath = '../assets/data/' + relPath.replace(/^dashboard\/assets\/data\//, '');
      }
    }
    return relPath;
  }

  /**
   * Load a single data source asynchronously.
   * Handles browser fetch & Node.js filesystem loading with safe error handling.
   */
  async function loadDataSource(sourceKey, basePath = '') {
    if (_dataCache[sourceKey]) {
      return _dataCache[sourceKey];
    }

    const pathOrUrl = resolveFilePath(sourceKey, basePath);

    // Node.js environment detection
    if (typeof window === 'undefined' && typeof require !== 'undefined') {
      try {
        const fs = require('fs');
        const path = require('path');
        let fullPath = pathOrUrl;
        if (!path.isAbsolute(fullPath)) {
          fullPath = path.resolve(process.cwd(), pathOrUrl);
        }
        if (!fs.existsSync(fullPath)) {
          // Fallback search relative to process.cwd() or script directory
          const altPath = path.resolve(process.cwd(), 'dashboard/assets/data', path.basename(pathOrUrl));
          if (fs.existsSync(altPath)) fullPath = altPath;
        }
        const fileContent = fs.readFileSync(fullPath, 'utf8');
        const data = JSON.parse(fileContent);
        _dataCache[sourceKey] = data;
        return data;
      } catch (err) {
        console.warn(`[BarrierLensData] Warning: Failed to load "${sourceKey}" via Node fs: ${err.message}`);
        return null;
      }
    }

    // Browser environment
    try {
      const response = await fetch(pathOrUrl);
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status} loading ${pathOrUrl}`);
      }
      const data = await response.json();
      _dataCache[sourceKey] = data;
      return data;
    } catch (err) {
      console.warn(`[BarrierLensData] Warning: Failed to fetch "${sourceKey}": ${err.message}`);
      return null;
    }
  }

  /**
   * Preload all registered data sources into memory cache.
   */
  async function preloadChatbotData(basePath = '') {
    const keys = Object.keys(CHATBOT_DATA_SOURCES);
    const results = await Promise.allSettled(
      keys.map(key => loadDataSource(key, basePath))
    );
    const loaded = {};
    keys.forEach((key, idx) => {
      if (results[idx].status === 'fulfilled' && results[idx].value) {
        loaded[key] = results[idx].value;
      } else {
        loaded[key] = _dataCache[key] || null;
      }
    });
    return loaded;
  }

  /**
   * Set cache directly (useful for testing or custom injection).
   */
  function setDataSource(sourceKey, data) {
    _dataCache[sourceKey] = data;
  }

  /**
   * Clear in-memory cache.
   */
  function clearCache() {
    Object.keys(_dataCache).forEach(k => delete _dataCache[k]);
  }

  /**
   * Multilingual Keyword Dictionaries for Language-Aware Entity & Intent Support.
   */
  const MULTILINGUAL_DICTIONARY = {
    en: {
      household: ["household", "family", "permission", "alone", "distance"],
      logistic: ["logistic", "transport", "money", "cost", "financial", "escort"],
      facility: ["facility", "provider", "doctor", "female provider", "medicine"],
      rural: ["rural", "village"],
      urban: ["urban", "city", "town"],
      compare: ["compare", "versus", "vs", "difference", "higher", "lower", "between"]
    },
    kn: {
      states: {
        "ಕರ್ನಾಟಕ": "Karnataka",
        "ಕೇರಳ": "Kerala",
        "ತಮಿಳುನಾಡು": "Tamil Nadu",
        "ಮಹಾರಾಷ್ಟ್ರ": "Maharashtra"
      },
      household: ["ಮನೆ", "ಕುಟುಂಬ", "ಅನುಮತಿ", "ಒಂಟಿಯಾಗಿ"],
      logistic: ["ಸಾರಿಗೆ", "ಹಣ", "ವೆಚ್ಚ", "ದೂರ"],
      facility: ["ಆಸ್ಪತ್ರೆ", "ವೈದ್ಯರು", "ಸೌಲಭ್ಯ", "ಔಷಧ"],
      rural: ["ಗ್ರಾಮೀಣ", "ಹಳ್ಳಿ"],
      urban: ["ನಗರ", "ಪಟ್ಟಣ"],
      compare: ["ಹೋಲಿಕೆ", "ವ್ಯತ್ಯಾಸ", "ಹೋಲಿಸಿ", "ನಡುವೆ", "ಹೋಲಿಸು"]
    },
    hi: {
      states: {
        "कर्नाटक": "Karnataka",
        "केरल": "Kerala",
        "तमिलनाडु": "Tamil Nadu",
        "महाराष्ट्र": "Maharashtra",
        "उत्तर प्रदेश": "Uttar Pradesh"
      },
      household: ["घरेलू", "परिवार", "अनुमति", "अकेले"],
      logistic: ["परिवहन", "पैसा", "लागत", "दूरी", "वित्तीय"],
      facility: ["अस्पताल", "डॉक्टर", "सुविधा", "दवा"],
      rural: ["ग्रामीण", "गांव"],
      urban: ["शहरी", "शहर"],
      compare: ["तुलना", "अंतर", "बनाम", "बीच"]
    }
  };

  return {
    CHATBOT_DATA_SOURCES,
    loadDataSource,
    preloadChatbotData,
    setDataSource,
    clearCache,
    MULTILINGUAL_DICTIONARY
  };
}));
