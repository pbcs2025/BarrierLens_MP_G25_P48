/**
 * BARRIERLENS — UNIVERSAL FULL VIEW MODAL & LIGHTBOX ENGINE
 * ---------------------------------------------------------------------------
 * Provides full-screen/modal inspection for all dashboard graphs, SHAP plots,
 * bar charts, beeswarms, waterfalls, and Plotly visualizations.
 */

(function (global) {
  "use strict";

  var modalEl = null;
  var modalImg = null;
  var modalTitle = null;
  var modalSubtitle = null;
  var modalBadge = null;
  var closeBtn = null;
  var currentZoom = 1.0;

  function createModalDOM() {
    if (document.getElementById("bl-fullview-modal")) return;

    var style = document.createElement("style");
    style.id = "bl-fullview-styles";
    style.textContent = `
      .bl-modal-backdrop {
        position: fixed;
        inset: 0;
        z-index: 99999;
        background: rgba(5, 9, 26, 0.88);
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.28s ease, transform 0.28s ease;
        padding: 20px;
        box-sizing: border-box;
      }

      .bl-modal-backdrop.is-open {
        opacity: 1;
        pointer-events: auto;
      }

      .bl-modal-container {
        position: relative;
        max-width: 94vw;
        max-height: 90vh;
        width: 1200px;
        background: rgba(13, 20, 53, 0.95);
        border: 1px solid rgba(148, 163, 255, 0.3);
        border-radius: 16px;
        box-shadow: 0 24px 60px rgba(0, 0, 0, 0.75), 0 0 30px rgba(99, 102, 241, 0.25);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        transform: scale(0.95);
        transition: transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1);
      }

      .bl-modal-backdrop.is-open .bl-modal-container {
        transform: scale(1);
      }

      .bl-modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 24px;
        background: rgba(8, 14, 36, 0.85);
        border-bottom: 1px solid rgba(148, 163, 255, 0.18);
      }

      .bl-modal-title-group {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .bl-modal-title {
        font-size: 1.15rem;
        font-weight: 800;
        color: #ffffff;
        margin: 0;

        letter-spacing: -0.01em;
      }

      .bl-modal-sub {
        font-size: 0.8rem;
        color: #97a2d4;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .bl-modal-badge {
        display: inline-block;
        padding: 2px 8px;
        border-radius: 4px;
        background: rgba(79, 70, 229, 0.35);
        border: 1px solid rgba(129, 140, 248, 0.4);
        color: #c3cbf3;
        font-size: 0.72rem;
        font-weight: 700;
      }

      .bl-modal-actions {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .bl-modal-btn {
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.15);
        color: #ffffff;
        width: 36px;
        height: 36px;
        border-radius: 8px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .bl-modal-btn:hover {
        background: rgba(255, 255, 255, 0.2);
        transform: translateY(-1px);
      }

      .bl-modal-body {
        position: relative;
        flex: 1;
        overflow: auto;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
        background: #060a1e;
        min-height: 400px;
      }

      .bl-modal-img {
        max-width: 100%;
        max-height: 75vh;
        object-fit: contain;
        border-radius: 8px;
        box-shadow: 0 8px 30px rgba(0,0,0,0.5);
        transition: transform 0.2s ease;
      }

      .bl-fullview-hint {
        cursor: pointer !important;
        transition: transform 0.22s ease, box-shadow 0.22s ease;
      }

      .bl-fullview-hint:hover {
        transform: scale(1.018);
        box-shadow: 0 8px 24px rgba(79, 70, 229, 0.35);
      }
    `;
    document.head.appendChild(style);

    var markup = `
      <div class="bl-modal-backdrop" id="bl-fullview-modal" role="dialog" aria-modal="true" aria-hidden="true">
        <div class="bl-modal-container">
          <header class="bl-modal-header">
            <div class="bl-modal-title-group">
              <h2 class="bl-modal-title" id="bl-modal-title">Graph Full View</h2>
              <div class="bl-modal-sub">
                <span id="bl-modal-sub-text">High-Resolution Model Visualization</span>
                <span class="bl-modal-badge" id="bl-modal-badge">FULL VIEW MODE</span>
              </div>
            </div>
            <div class="bl-modal-actions">
              <button type="button" class="bl-modal-btn" id="bl-modal-zoom-in" title="Zoom In">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
              </button>
              <button type="button" class="bl-modal-btn" id="bl-modal-zoom-out" title="Zoom Out">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
              </button>
              <button type="button" class="bl-modal-btn" id="bl-modal-close" title="Close Full View (Esc)">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </header>
          <div class="bl-modal-body">
            <img class="bl-modal-img" id="bl-modal-img" src="" alt="Graph Full View">
          </div>
        </div>
      </div>
    `;

    var div = document.createElement("div");
    div.innerHTML = markup;
    document.body.appendChild(div.firstElementChild);

    modalEl = document.getElementById("bl-fullview-modal");
    modalImg = document.getElementById("bl-modal-img");
    modalTitle = document.getElementById("bl-modal-title");
    modalSubtitle = document.getElementById("bl-modal-sub-text");
    modalBadge = document.getElementById("bl-modal-badge");
    closeBtn = document.getElementById("bl-modal-close");

    // Event listeners
    closeBtn.addEventListener("click", closeModal);
    modalEl.addEventListener("click", function (e) {
      if (e.target === modalEl) closeModal();
    });

    document.getElementById("bl-modal-zoom-in").addEventListener("click", function () {
      currentZoom = Math.min(2.5, currentZoom + 0.25);
      modalImg.style.transform = `scale(${currentZoom})`;
    });

    document.getElementById("bl-modal-zoom-out").addEventListener("click", function () {
      currentZoom = Math.max(0.75, currentZoom - 0.25);
      modalImg.style.transform = `scale(${currentZoom})`;
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && modalEl && modalEl.classList.contains("is-open")) {
        closeModal();
      }
    });
  }

  function openImageModal(src, title, subtitle, badgeText) {
    createModalDOM();
    currentZoom = 1.0;
    modalImg.style.transform = "scale(1)";
    modalImg.src = src;
    modalTitle.textContent = title || "Graph Full View Mode";
    modalSubtitle.textContent = subtitle || "BarrierLens Machine Learning Intelligence";
    modalBadge.textContent = badgeText || "FULL VIEW";

    modalEl.classList.add("is-open");
    modalEl.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    if (!modalEl) return;
    modalEl.classList.remove("is-open");
    modalEl.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  function attachFullViewListeners() {
    createModalDOM();

    // 1. Attach to all SHAP cards
    var cards = document.querySelectorAll(".shap-card, .card");
    cards.forEach(function (card) {
      var img = card.querySelector("img");
      if (!img) return;

      img.classList.add("bl-fullview-hint");
      img.title = "Click to inspect in Full View Mode";

      img.onclick = function (e) {
        e.preventDefault();
        e.stopPropagation();

        var titleEl = card.querySelector("strong, .card-title, h3, h4");
        var capEl = card.querySelector(".shap-card-caption, .card-subtitle, span");

        var title = titleEl ? titleEl.textContent : img.alt || "Graph Visualization";
        var subtitle = capEl ? capEl.textContent : "BarrierLens Research Intelligence";

        openImageModal(img.src, title, subtitle, "FULL VIEW MODE");
      };
    });

    // 2. Attach to stand-alone graph images
    var allImages = document.querySelectorAll("img[src*='.png'], img[src*='.jpg'], img[src*='shap'], img[src*='rf_'], img[src*='xgb_']");
    allImages.forEach(function (img) {
      if (img.classList.contains("bl-fullview-hint")) return;
      img.classList.add("bl-fullview-hint");
      img.title = "Click to inspect in Full View Mode";

      img.onclick = function (e) {
        e.preventDefault();
        e.stopPropagation();
        var title = img.alt || img.title || "Graph Visualization";
        openImageModal(img.src, title, "BarrierLens Research Intelligence", "FULL VIEW MODE");
      };
    });
  }

  // Auto-init on DOMContentLoaded and periodic DOM mutations
  document.addEventListener("DOMContentLoaded", function () {
    attachFullViewListeners();
    setTimeout(attachFullViewListeners, 500);
    setTimeout(attachFullViewListeners, 1500);
  });

  global.BarrierLensFullView = {
    openModal: openImageModal,
    closeModal: closeModal,
    attach: attachFullViewListeners
  };
})(window);
