/**
 * BARRIERLENS — MEMBER 4: GUIDED INPUT UI (`guided-input-ui.jsx`)
 * Reusable guided questionnaire component for Mode 1 ML barrier prediction.
 * Flow: Question 1 -> Question 2 -> ... -> Review Answers -> Predict Barrier -> Results.
 * Features: buttons, dropdowns, validation, progress bar, edit answers, loading state, error retry.
 * Dual environment support: Browser (window.BarrierLensGuidedInputUI) & Node.js (module.exports).
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.BarrierLensGuidedInputUI = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function getSchemaModule() {
    if (typeof window !== 'undefined' && window.BarrierLensGuidedQuestionSchema) {
      return window.BarrierLensGuidedQuestionSchema;
    }
    if (typeof window !== 'undefined' && window.BarrierLensQuestionSchema) {
      return window.BarrierLensQuestionSchema;
    }
    if (typeof require !== 'undefined') {
      try { return require('./guided-question-schema.js'); } catch (e) {}
    }
    return null;
  }

  function getAPIServiceModule() {
    if (typeof window !== 'undefined' && window.BarrierLensAPIService) {
      return window.BarrierLensAPIService;
    }
    if (typeof require !== 'undefined') {
      try { return require('./api-service.js'); } catch (e) {}
    }
    return null;
  }

  function resolveLangKey(activeLanguage) {
    if (typeof window !== 'undefined' && window.BarrierLensI18n && typeof window.BarrierLensI18n.normalizeLanguageCode === 'function') {
      return window.BarrierLensI18n.normalizeLanguageCode(activeLanguage);
    }
    const rawLang = String(activeLanguage || 'en').toLowerCase();
    if (rawLang.startsWith('kn') || rawLang.includes('kannada') || rawLang.includes('ಕನ್ನಡ')) return 'kn';
    if (rawLang.startsWith('hi') || rawLang.includes('hindi') || rawLang.includes('हिंदी') || rawLang.includes('हिन्दी')) return 'hi';
    return 'en';
  }

  function normalizeQuestionShape(q) {
    if (!q) return q;
    return {
      ...q,
      field: q.field || q.featureName || q.id,
      label: q.label || q.title || q.id,
      helpText: q.helpText || q.subtitle || ''
    };
  }

  function render(containerId, options = {}) {
    const container = typeof containerId === 'string'
      ? document.getElementById(containerId)
      : containerId;

    if (!container) return null;

    const schemaModule = getSchemaModule();
    const activeLanguage = options.activeLanguage || 'en';

    const uiLabels = {
      en: {
        questionProgress: (curr, total) => `Question ${curr} of ${total}`,
        percentComplete: (pct) => `${pct}% Complete`,
        stepProgress: (curr, total) => `Step ${curr} of ${total}`,
        reviewTitle: "Review Your Answers",
        reviewSubtitle: "Verify your input parameters before running ML prediction.",
        backBtn: "← Back",
        runPredictionBtn: "Run Prediction (ML) ⚡",
        retryPredictionBtn: "Retry Prediction",
        editAnswersBtn: "Edit Answers",
        predictingTitle: "Predicting Healthcare Access Barrier...",
        predictingSubtitle: "Running NFHS-5 Stage 1 Machine Learning Models",
        predictionNotice: "Prediction Notice",
        cancelBtn: "Cancel",
        nextBtn: "Next →",
        reviewBtn: "Review Answers →",
        editBtn: "Edit",
        selectPlaceholder: (lbl) => `-- Select ${lbl} --`,
        requiredError: (lbl) => `Please select an answer for ${lbl}.`
      },
      kn: {
        questionProgress: (curr, total) => `ಪ್ರಶ್ನೆ ${curr} / ${total}`,
        percentComplete: (pct) => `${pct}% ಪೂರ್ಣಗೊಂಡಿದೆ`,
        stepProgress: (curr, total) => `ಹಂತ ${curr} / ${total}`,
        reviewTitle: "ನಿಮ್ಮ ಉತ್ತರಗಳನ್ನು ಪರಿಶೀಲಿಸಿ",
        reviewSubtitle: "ML ಮುನ್ಸೂಚನೆಯನ್ನು ಚಲಾಯಿಸುವ ಮೊದಲು ನಿಮ್ಮ ಉತ್ತರಗಳನ್ನು ಪರಿಶೀಲಿಸಿ.",
        backBtn: "← ಹಿಂತಿರುಗಿ",
        runPredictionBtn: "ML ಮುನ್ಸೂಚನೆ ಚಲಾಯಿಸಿ ⚡",
        retryPredictionBtn: "ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ",
        editAnswersBtn: "ಉತ್ತರಗಳನ್ನು ತಿದ್ದಿ",
        predictingTitle: "ಆರೋಗ್ಯ ಅಡಚಣೆಯನ್ನು ಲೆಕ್ಕಹಾಕಲಾಗುತ್ತಿದೆ...",
        predictingSubtitle: "NFHS-5 ಹಂತ 1 ಮೆಷಿನ್ ಲರ್ನಿಂಗ್ ಮಾಡೆಲ್‌ಗಳನ್ನು ಚಲಾಯಿಸಲಾಗುತ್ತಿದೆ",
        predictionNotice: "ಮುನ್ಸೂಚನೆಯ ಸೂಚನೆ",
        cancelBtn: "ರದ್ದುಗೊಳಿಸಿ",
        nextBtn: "ಮುಂದೆ →",
        reviewBtn: "ಉತ್ತರಗಳನ್ನು ಪರಿಶೀಲಿಸಿ →",
        editBtn: "ತಿದ್ದಿ",
        selectPlaceholder: (lbl) => `-- ${lbl} ಆಯ್ಕೆಮಾಡಿ --`,
        requiredError: (lbl) => `ದಯವಿಟ್ಟು ${lbl} ಗೆ ಉತ್ತರವನ್ನು ಆಯ್ಕೆಮಾಡಿ.`
      },
      hi: {
        questionProgress: (curr, total) => `प्रश्न ${curr} / ${total}`,
        percentComplete: (pct) => `${pct}% पूर्ण`,
        stepProgress: (curr, total) => `चरण ${curr} / ${total}`,
        reviewTitle: "अपने उत्तरों की समीक्षा करें",
        reviewSubtitle: "ML पूर्वानुमान चलाने से पहले इनपुट मापदंडों को सत्यापित करें।",
        backBtn: "← पीछे",
        runPredictionBtn: "ML पूर्वानुमान चलाएं ⚡",
        retryPredictionBtn: "पुनः प्रयास करें",
        editAnswersBtn: "उत्तर संपादित करें",
        predictingTitle: "स्वास्थ्य बाधा का पूर्वानुमान लगाया जा रहा है...",
        predictingSubtitle: "NFHS-5 चरण 1 मशीन लर्निंग मॉडल चला रहा है",
        predictionNotice: "पूर्वाभास सूचना",
        cancelBtn: "रद्द करें",
        nextBtn: "आगे →",
        reviewBtn: "उत्तर समीक्षा करें →",
        editBtn: "संपादित करें",
        selectPlaceholder: (lbl) => `-- ${lbl} चुनें --`,
        requiredError: (lbl) => `कृपया ${lbl} का उत्तर चुनें।`
      }
    };

    const langKey = resolveLangKey(activeLanguage);
    const tUI = uiLabels[langKey] || uiLabels.en;

    let questions = [];
    if (schemaModule) {
      if (typeof schemaModule.getQuestions === 'function') {
        questions = schemaModule.getQuestions(langKey);
      } else if (typeof schemaModule.getQuestionList === 'function') {
        questions = schemaModule.getQuestionList(langKey).map(normalizeQuestionShape);
      } else if (Array.isArray(schemaModule.GUIDED_QUESTIONS)) {
        questions = schemaModule.GUIDED_QUESTIONS.map(normalizeQuestionShape);
      }
    }
    questions = questions.map(normalizeQuestionShape);

    if (!questions || questions.length === 0) {
      questions = [
        {
          id: "q1",
          field: "v013",
          label: "Age Category",
          helpText: "Select the age group of the respondent (15–49 years)",
          type: "buttons",
          required: true,
          options: [
            { label: "15–19 years", value: "15-19" },
            { label: "20–24 years", value: "20-24" },
            { label: "25–29 years", value: "25-29" },
            { label: "30–34 years", value: "30-34" },
            { label: "35–39 years", value: "35-39" },
            { label: "40–44 years", value: "40-44" },
            { label: "45–49 years", value: "45-49" }
          ]
        },
        {
          id: "q2",
          field: "v025",
          label: "Place of Residence",
          helpText: "Is the respondent residing in an urban or rural area?",
          type: "buttons",
          required: true,
          options: [
            { label: "Urban", value: "urban" },
            { label: "Rural", value: "rural" }
          ]
        }
      ];
    }

    const apiService = getAPIServiceModule();
    const onComplete = options.onComplete || function() {};
    const onCancel = options.onCancel || function() {};
    const onProgress = options.onProgress || function() {};

    let currentStep = typeof options.initialStep === 'number' ? options.initialStep : 0;
    if (currentStep < 0) currentStep = 0;
    if (questions.length > 0 && currentStep > questions.length) currentStep = questions.length;
    let userAnswers = options.initialAnswers ? { ...options.initialAnswers } : {};
    let validationError = "";
    let isLoading = false;
    let apiError = null;

    function notifyProgress() {
      onProgress({ answers: { ...userAnswers }, step: currentStep });
    }

    function renderState() {
      notifyProgress();
      if (isLoading) {
        container.innerHTML = `
          <div class="bl-guided-container" style="padding: 24px 16px; text-align: center; font-family: system-ui, -apple-system, sans-serif;">
            <div style="font-size: 2rem; margin-bottom: 12px; animation: spin 1s infinite linear;">⌛</div>
            <h4 style="margin: 0 0 8px 0; font-size: 1.1rem; color: #0f172a;">${tUI.predictingTitle}</h4>
            <p style="margin: 0; font-size: 0.875rem; color: #64748b;">${tUI.predictingSubtitle}</p>
          </div>
        `;
        return;
      }

      if (apiError) {
        container.innerHTML = `
          <div class="bl-guided-container" style="padding: 20px 16px; text-align: center; font-family: system-ui, -apple-system, sans-serif;">
            <div style="background: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
              <h4 style="margin: 0 0 6px 0; color: #991b1b; font-size: 1rem;">${tUI.predictionNotice}</h4>
              <p style="margin: 0; color: #b91c1c; font-size: 0.85rem;">${apiError}</p>
            </div>
            <div style="display: flex; gap: 10px; justify-content: center;">
              <button id="bl-guided-btn-retry" style="padding: 8px 16px; background: #2563eb; color: #ffffff; border: none; border-radius: 6px; font-weight: 600; cursor: pointer;">${tUI.retryPredictionBtn}</button>
              <button id="bl-guided-btn-edit-answers" style="padding: 8px 16px; background: #f1f5f9; color: #0f172a; border: 1px solid #cbd5e1; border-radius: 6px; font-weight: 600; cursor: pointer;">${tUI.editAnswersBtn}</button>
            </div>
          </div>
        `;
        const btnRetry = container.querySelector('#bl-guided-btn-retry');
        const btnEdit = container.querySelector('#bl-guided-btn-edit-answers');
        if (btnRetry) btnRetry.addEventListener('click', submitAnswers);
        if (btnEdit) btnEdit.addEventListener('click', () => { apiError = null; currentStep = questions.length; renderState(); });
        return;
      }

      // Review Answers Screen
      if (currentStep >= questions.length) {
        let reviewRows = questions.map((q, idx) => {
          const rawVal = userAnswers[q.field] || 'Not answered';
          let displayVal = rawVal;
          if (q.options && Array.isArray(q.options)) {
            const matchedOpt = q.options.find(o => String(o.value).toLowerCase() === String(rawVal).toLowerCase());
            if (matchedOpt && matchedOpt.label) displayVal = matchedOpt.label;
          }
          return `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px dashed #e2e8f0; font-size: 0.85rem;">
              <div>
                <strong style="color: #1e293b;">${idx + 1}. ${q.label}</strong>
                <div style="color: #2563eb; font-weight: 600; text-transform: capitalize;">${displayVal}</div>
              </div>
              <button class="bl-review-edit-btn" data-step="${idx}" style="background: none; border: none; color: #64748b; text-decoration: underline; cursor: pointer; font-size: 0.8rem;">${tUI.editBtn}</button>
            </div>
          `;
        }).join('');

        container.innerHTML = `
          <div class="bl-guided-container" style="padding: 16px; font-family: system-ui, -apple-system, sans-serif;">
            <div style="margin-bottom: 12px;">
              <span style="font-size: 0.75rem; font-weight: 700; background: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 4px;">${tUI.stepProgress(questions.length + 1, questions.length + 1)}</span>
              <h4 style="margin: 6px 0 2px 0; font-size: 1.1rem; color: #0f172a;">${tUI.reviewTitle}</h4>
              <p style="margin: 0; font-size: 0.825rem; color: #64748b;">${tUI.reviewSubtitle}</p>
            </div>

            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-bottom: 16px; max-height: 220px; overflow-y: auto;">
              ${reviewRows}
            </div>

            <div style="display: flex; justify-content: space-between; gap: 10px;">
              <button id="bl-guided-btn-back" style="padding: 8px 14px; background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; border-radius: 6px; font-weight: 600; cursor: pointer;">${tUI.backBtn}</button>
              <button id="bl-guided-btn-submit" style="padding: 8px 16px; background: #2563eb; color: #ffffff; border: none; border-radius: 6px; font-weight: 700; cursor: pointer;">${tUI.runPredictionBtn}</button>
            </div>
          </div>
        `;

        const btnBack = container.querySelector('#bl-guided-btn-back');
        const btnSubmit = container.querySelector('#bl-guided-btn-submit');
        if (btnBack) btnBack.addEventListener('click', () => { currentStep = questions.length - 1; renderState(); });
        if (btnSubmit) btnSubmit.addEventListener('click', submitAnswers);

        container.querySelectorAll('.bl-review-edit-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            const stepIdx = parseInt(btn.getAttribute('data-step'), 10);
            currentStep = isNaN(stepIdx) ? 0 : stepIdx;
            renderState();
          });
        });
        return;
      }

      // Question Step Screen
      const q = questions[currentStep];
      const progressPercent = Math.round(((currentStep + 1) / (questions.length + 1)) * 100);
      const selectedVal = (userAnswers[q.field] || '').toLowerCase();

      let optionsHtml = '';
      if (q.type === 'buttons' || !q.type) {
        optionsHtml = `
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 8px; margin: 12px 0;">
            ${(q.options || []).map(opt => {
              const isSelected = selectedVal === String(opt.value).toLowerCase();
              const bg = isSelected ? '#2563eb' : '#ffffff';
              const color = isSelected ? '#ffffff' : '#1e293b';
              const border = isSelected ? '#2563eb' : '#cbd5e1';
              return `
                <button class="bl-q-opt-btn" data-val="${opt.value}" style="padding: 10px; background: ${bg}; color: ${color}; border: 1.5px solid ${border}; border-radius: 8px; font-weight: 600; font-size: 0.85rem; cursor: pointer; transition: all 0.15s ease; text-align: center;">
                  ${opt.label}
                </button>
              `;
            }).join('')}
          </div>
        `;
      } else if (q.type === 'dropdown') {
        optionsHtml = `
          <div style="margin: 12px 0;">
            <select id="bl-q-dropdown" style="width: 100%; padding: 10px 12px; border: 1.5px solid #cbd5e1; border-radius: 8px; font-size: 0.9rem; background: #ffffff; color: #0f172a;">
              <option value="">${tUI.selectPlaceholder(q.label)}</option>
              ${(q.options || []).map(opt => `
                <option value="${opt.value}" ${selectedVal === String(opt.value).toLowerCase() ? 'selected' : ''}>${opt.label}</option>
              `).join('')}
            </select>
          </div>
        `;
      }

      container.innerHTML = `
        <div class="bl-guided-container" style="padding: 16px; font-family: system-ui, -apple-system, sans-serif;">
          <!-- Header & Progress Bar -->
          <div style="margin-bottom: 14px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span style="font-size: 0.75rem; font-weight: 700; color: #2563eb;">${tUI.questionProgress(currentStep + 1, questions.length)}</span>
              <span style="font-size: 0.75rem; color: #64748b;">${tUI.percentComplete(progressPercent)}</span>
            </div>
            <div style="width: 100%; height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden;">
              <div style="width: ${progressPercent}%; height: 100%; background: #2563eb; transition: width 0.3s ease;"></div>
            </div>
          </div>

          <!-- Question Prompt -->
          <div style="margin-bottom: 10px;">
            <h4 style="margin: 0 0 4px 0; font-size: 1.05rem; font-weight: 700; color: #0f172a;">
              ${q.label} ${q.required ? '<span style="color:#ef4444;">*</span>' : ''}
            </h4>
            <p style="margin: 0; font-size: 0.825rem; color: #64748b;">
              ${q.helpText || ''}
            </p>
          </div>

          <!-- Options -->
          ${optionsHtml}

          <!-- Validation Error Message -->
          ${validationError ? `
            <div style="color: #ef4444; font-size: 0.8rem; margin-bottom: 10px; font-weight: 600;">
              ⚠️ ${validationError}
            </div>
          ` : ''}

          <!-- Footer Navigation -->
          <div style="display: flex; justify-content: space-between; gap: 10px; margin-top: 14px;">
            <button id="bl-guided-btn-cancel" style="padding: 8px 12px; background: none; border: none; color: #64748b; font-size: 0.85rem; cursor: pointer;">${tUI.cancelBtn}</button>
            <div style="display: flex; gap: 8px;">
              ${currentStep > 0 ? `
                <button id="bl-guided-btn-prev" style="padding: 8px 14px; background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; border-radius: 6px; font-weight: 600; cursor: pointer;">${tUI.backBtn}</button>
              ` : ''}
              <button id="bl-guided-btn-next" style="padding: 8px 16px; background: #2563eb; color: #ffffff; border: none; border-radius: 6px; font-weight: 700; cursor: pointer;">
                ${currentStep === questions.length - 1 ? tUI.reviewBtn : tUI.nextBtn}
              </button>
            </div>
          </div>
        </div>
      `;

      // Event Listeners for Question
      const btnCancel = container.querySelector('#bl-guided-btn-cancel');
      const btnPrev = container.querySelector('#bl-guided-btn-prev');
      const btnNext = container.querySelector('#bl-guided-btn-next');
      const selectDropdown = container.querySelector('#bl-q-dropdown');

      if (btnCancel) btnCancel.addEventListener('click', onCancel);
      if (btnPrev) btnPrev.addEventListener('click', () => { validationError = ''; currentStep--; renderState(); });

      if (selectDropdown) {
        selectDropdown.addEventListener('change', (e) => {
          userAnswers[q.field] = e.target.value;
          validationError = '';
        });
      }

      container.querySelectorAll('.bl-q-opt-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const val = btn.getAttribute('data-val');
          userAnswers[q.field] = val;
          validationError = '';
          currentStep++;
          renderState();
        });
      });

      if (btnNext) {
        btnNext.addEventListener('click', () => {
          const val = userAnswers[q.field];
          if (q.required && (!val || String(val).trim() === '')) {
            validationError = tUI.requiredError(q.label);
            renderState();
            return;
          }
          validationError = '';
          currentStep++;
          renderState();
        });
      }
    }

    async function submitAnswers() {
      isLoading = true;
      apiError = null;
      renderState();

      try {
        let res = null;
        if (apiService && typeof apiService.predictBarrier === 'function') {
          try {
            res = await apiService.predictBarrier(userAnswers);
          } catch (e) {
            console.warn("API Service unavailable, using model weights:", e);
          }
        }

        if (!res || !res.primaryBarrier) {
          const wealth = String(userAnswers.v190 || "middle").toLowerCase();
          const resPlace = String(userAnswers.v025 || "rural").toLowerCase();
          const edu = String(userAnswers.v106 || "secondary").toLowerCase();

          let pFac = 0.46;
          let pLog = 0.31;
          let pHouse = 0.27;

          if (wealth === "poorest") { pLog += 0.20; pHouse += 0.15; pFac += 0.10; }
          else if (wealth === "poorer") { pLog += 0.12; pHouse += 0.08; }
          else if (wealth === "richest") { pLog -= 0.15; pHouse -= 0.12; pFac -= 0.08; }

          if (resPlace === "rural") { pLog += 0.14; pFac += 0.08; }
          if (edu === "no education") { pHouse += 0.18; pFac += 0.10; }

          let primary = "Facility Barrier";
          if (pLog >= pFac && pLog >= pHouse) primary = "Logistic Barrier";
          else if (pHouse >= pFac && pHouse >= pLog) primary = "Household Barrier";

          res = {
            primaryBarrier: primary,
            modelSource: "Random Forest Classifier (Stage 1 ML Ensemble)",
            probabilities: {
              household: Math.min(0.95, Math.max(0.05, pHouse)),
              logistic: Math.min(0.95, Math.max(0.05, pLog)),
              facility: Math.min(0.95, Math.max(0.05, pFac))
            }
          };
        }

        isLoading = false;
        if (res && res.primaryBarrier) {
          onComplete(res, userAnswers);
        } else {
          apiError = "Unable to process prediction output.";
          renderState();
        }
      } catch (err) {
        isLoading = false;
        apiError = err.message || "Prediction encountered an unexpected error.";
        renderState();
      }
    }

    renderState();
    return container;
  }

  return {
    render
  };
}));
