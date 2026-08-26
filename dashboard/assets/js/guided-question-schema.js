/**
 * BARRIERLENS — MEMBER 1: GUIDED QUESTION SCHEMA
 * Feature inventory and schema mapping raw NFHS-5 model features (v013, v025, v106, v190, v501, v743f, v481)
 * into structured guided questions for Mode 1 barrier prediction.
 * Dual environment support: Browser (window.BarrierLensGuidedQuestionSchema) & Node.js (module.exports).
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.BarrierLensGuidedQuestionSchema = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const GUIDED_QUESTIONS = [
    {
      id: "q1",
      field: "v013",
      label: "Age Category",
      helpText: "Select the age group of the respondent",
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
    },
    {
      id: "q3",
      field: "v106",
      label: "Highest Educational Level",
      helpText: "Highest level of formal schooling completed",
      type: "buttons",
      required: true,
      options: [
        { label: "No Education", value: "no education" },
        { label: "Primary", value: "primary" },
        { label: "Secondary", value: "secondary" },
        { label: "Higher", value: "higher" }
      ]
    },
    {
      id: "q4",
      field: "v190",
      label: "Household Wealth Index",
      helpText: "Household wealth quintile based on NFHS asset index",
      type: "buttons",
      required: true,
      options: [
        { label: "Poorest (Lowest 20%)", value: "poorest" },
        { label: "Poorer", value: "poorer" },
        { label: "Middle", value: "middle" },
        { label: "Richer", value: "richer" },
        { label: "Richest (Top 20%)", value: "richest" }
      ]
    },
    {
      id: "q5",
      field: "v501",
      label: "Marital Status",
      helpText: "Current marital status of respondent",
      type: "dropdown",
      required: true,
      options: [
        { label: "Currently Married", value: "currently married" },
        { label: "Never Married", value: "never married" },
        { label: "Widowed", value: "widowed" },
        { label: "Divorced", value: "divorced" },
        { label: "Separated", value: "separated" }
      ]
    },
    {
      id: "q6",
      field: "v743f",
      label: "Healthcare Decision Autonomy",
      helpText: "Who usually makes decisions regarding respondent's medical care?",
      type: "dropdown",
      required: true,
      options: [
        { label: "Respondent Alone", value: "respondent alone" },
        { label: "Respondent & Husband/Partner Jointly", value: "respondent and husband/partner" },
        { label: "Husband/Partner Alone", value: "husband/partner alone" },
        { label: "Someone Else / Family", value: "someone else" }
      ]
    },
    {
      id: "q7",
      field: "v481",
      label: "Health Insurance / Scheme Coverage",
      helpText: "Is the respondent covered by any health scheme or insurance?",
      type: "buttons",
      required: true,
      options: [
        { label: "Yes", value: "yes" },
        { label: "No", value: "no" }
      ]
    }
  ];

  function getQuestions() {
    return JSON.parse(JSON.stringify(GUIDED_QUESTIONS));
  }

  function validateAnswers(answers) {
    const errors = {};
    GUIDED_QUESTIONS.forEach(q => {
      if (q.required && (!answers[q.field] || String(answers[q.field]).trim() === '')) {
        errors[q.field] = `${q.label} is required.`;
      }
    });
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  return {
    GUIDED_QUESTIONS,
    getQuestions,
    validateAnswers
  };
}));
