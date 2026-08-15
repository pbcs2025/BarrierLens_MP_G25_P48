# BarrierLens (P48) Interactive Static Website Dashboard

Grounded in:
- Pradhan & De (2025), *BMC Health Services Research*, 25:323
- WHCARP Project Approach Document v2
- Stage 1 Guide v5 & Stage 2 Guide v2
- Faculty "Results to be Found" Requirements

## Tech Stack
- Static HTML5, CSS3, JavaScript (ES6)
- Plotly.js (loaded via CDN)
- Static JSON exports generated via Python from Stage 1 & Stage 2 ML models

## How to Run Locally
1. Open `dashboard/index.html` in any web browser (or serve using `python -m http.server 8000` inside `dashboard/` folder).
2. All data files are loaded locally from `dashboard/assets/data/` via `fetch()`.

## Task Allocation
- **Member 1 (Data Pipeline Lead):** Data exports, `national_overview.html` (Page A), `multiple_barrier.html` (Page G).
- **Member 2 (Base Paper Lead):** `base_paper_comparison.html` (Page B), `empowerment.html` (Page F), `explainability.html` (Page J), `labels.js`.
- **Member 3 (Analytics Lead):** `state_analysis.html` (Page C), `demographic_analysis.html` (Page D), `rural_urban.html` (Page E), `chart-utils.js`.
- **Member 4 (UI & Deployment Lead):** Site shell (`index.html`, `style.css`, `nav.js`), `risk_archetypes.html` (Page H), `outcome_impact.html` (Page I), GitHub Pages deployment.
