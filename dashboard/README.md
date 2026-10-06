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

## Entry Point: Login First
`login.html` is the first page users see. After a successful (demo) sign-in the
animated transition opens the existing Dashboard Home in `index.html`.

- `login.html` — landing / login experience (hero, badges, floating data cards, glass login card, project team)
- `assets/css/login.css` — login-only design system and CSS animations
- `assets/js/auth.js` — demo session helpers, shared by the login page and the dashboard guard in `nav.js`
- `assets/js/login-page.js` — form handling, show/hide password, sign-in transition
- `nav.js` keeps a client-side session guard so the dashboard is not reachable before sign-in

Authentication is a **local demonstration gate only (not production-level security)**.

## How to Run Locally
1. From the project root run `node server.js` (or `start_project.bat`) and open
   `http://localhost:3000/login.html`.
2. Sign in with `research@barrierlens.in` / `BarrierLens@2025`, or press **Continue as Demo**.
3. Serving this folder directly (for example `python -m http.server` from `dashboard/`) also
   works; the demo sign-in then falls back to the local credential check.
4. All data files are loaded locally from `dashboard/assets/data/` via `fetch()`.

## Task Allocation
- **Member 1 (Data Pipeline Lead):** Data exports, `national_overview.html` (Page A), `multiple_barrier.html` (Page G).
- **Member 2 (Base Paper Lead):** `base_paper_comparison.html` (Page B), `empowerment.html` (Page F), `explainability.html` (Page J), `labels.js`.
- **Member 3 (Analytics Lead):** `state_analysis.html` (Page C), `demographic_analysis.html` (Page D), `rural_urban.html` (Page E), `chart-utils.js`.
- **Member 4 (UI & Deployment Lead):** Site shell (`index.html`, `style.css`, `nav.js`), `login.html` + `login.css` (login-first entry), `risk_archetypes.html` (Page H), `outcome_impact.html` (Page I), GitHub Pages deployment.
