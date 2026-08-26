/**
 * BARRIERLENS — MEMBER 4: BARRIER SELECTION & CHANGE UI (`barrier-ui.js`)
 * Renders interactive menu for the 5 canonical barrier categories (Household, Logistic, Facility, Multiple, All).
 * Updates shared Active Barrier Context (`barrierSource = "user_selection"`, `activeBarrier = selected barrier`).
 * Dual environment support: Browser (window.BarrierLensBarrierUI) & Node.js (module.exports).
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.BarrierLensBarrierUI = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const BARRIER_OPTIONS = [
    {
      id: "household",
      name: "Household Barrier",
      icon: "🏠",
      desc: "Autonomy, family permissions, and household decision constraints"
    },
    {
      id: "logistic",
      name: "Logistic Barrier",
      icon: "🚗",
      desc: "Transportation, distance to facility, travel costs, and escort needs"
    },
    {
      id: "facility",
      name: "Facility Barrier",
      icon: "🏥",
      desc: "Provider availability, medicines, facility infrastructure, and treatment"
    },
    {
      id: "multiple",
      name: "Multiple Barriers",
      icon: "⚠️",
      desc: "Overlapping compound barriers (2 or more barrier dimensions)"
    },
    {
      id: "all",
      name: "All Barriers",
      icon: "📊",
      desc: "Overall composite national and state-level healthcare access prevalence"
    }
  ];

  function render(containerId, options = {}) {
    const container = typeof containerId === 'string'
      ? document.getElementById(containerId)
      : containerId;

    if (!container) return null;

    const onSelectBarrier = options.onSelectBarrier || function() {};
    const activeBarrier = options.activeBarrier || "All Barriers";

    const buttonsHtml = BARRIER_OPTIONS.map(b => {
      const isSelected = b.name.toLowerCase() === activeBarrier.toLowerCase();
      const bg = isSelected ? '#eff6ff' : '#ffffff';
      const border = isSelected ? '#2563eb' : '#e2e8f0';
      const textColor = isSelected ? '#1e40af' : '#0f172a';

      return `
        <button class="bl-barrier-select-btn" data-barrier="${b.name}" style="width: 100%; text-align: left; padding: 12px 14px; background: ${bg}; border: 1.5px solid ${border}; border-radius: 8px; margin-bottom: 8px; cursor: pointer; transition: all 0.15s ease; display: flex; align-items: flex-start; gap: 10px;">
          <span style="font-size: 1.25rem;">${b.icon}</span>
          <div style="flex: 1;">
            <div style="font-weight: 700; font-size: 0.925rem; color: ${textColor}; display: flex; justify-content: space-between; align-items: center;">
              <span>${b.name}</span>
              ${isSelected ? '<span style="font-size: 0.75rem; background: #2563eb; color: #fff; padding: 2px 6px; border-radius: 4px;">Active</span>' : ''}
            </div>
            <div style="font-size: 0.8rem; color: #64748b; margin-top: 2px;">${b.desc}</div>
          </div>
        </button>
      `;
    }).join('');

    container.innerHTML = `
      <div class="bl-barrier-ui-wrapper" style="padding: 14px; font-family: system-ui, -apple-system, sans-serif;">
        <div style="margin-bottom: 12px; text-align: center;">
          <h4 style="margin: 0 0 4px 0; font-size: 1.05rem; color: #0f172a;">Explore Healthcare Access Barriers</h4>
          <p style="margin: 0; font-size: 0.825rem; color: #64748b;">Select a barrier category to view verified NFHS-5 evidence & solutions:</p>
        </div>
        <div class="bl-barrier-buttons-list">
          ${buttonsHtml}
        </div>
      </div>
    `;

    container.querySelectorAll('.bl-barrier-select-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const selected = btn.getAttribute('data-barrier');
        onSelectBarrier(selected);
      });
    });

    return container;
  }

  return {
    BARRIER_OPTIONS,
    render
  };
}));
