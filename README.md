# BarrierLens Project (P48)

Stage 1 of the Women's Healthcare Access Research Project. This repository implements **individual-level** barrier classification using the NFHS-5 India women's recode (`NFHS5_Individual.csv`, ~724k rows).

## Stage 1 Scope
- Dataset exploration and preprocessing
- Target construction for household, logistic, and facility barriers
- Model training for Logistic Regression, Decision Tree, Random Forest, and XGBoost
- Evaluation with cross-validation and hold-out metrics

## Project Root
This project root is `BarrierLens_MP_G25_P48` (updated from the earlier `barrier-lens-p48` naming).

## Quick Start
1. Install dependencies:
   - `pip install -r requirements.txt`
2. Place dataset at:
   - `data/raw/NFHS5_Individual.csv`
3. Run notebooks in order:
   - `notebooks/00_data_exploration.ipynb`
   - `notebooks/01_preprocessing.ipynb`
   - Stage 1 model notebooks (`02` to `06`)

## Running the Web Platform
1. `start_project.bat` (Windows) or `start_project.ps1` — or run `node server.js`
2. The browser opens `http://localhost:3000/login.html`
3. Sign in with the demonstration account, or press **Continue as Demo**
4. On success the animated transition opens **Dashboard Home** (`/index.html`)

| Item | Value |
| --- | --- |
| Login page | `http://localhost:3000/login.html` |
| Dashboard home | `http://localhost:3000/index.html` |
| Demo account | `research@barrierlens.in` / `BarrierLens@2025` |
| Demo shortcut | `demo` / `demo1234`, or the **Continue as Demo** button |
| Team logins | `1ga23cs114`, `1ga23cs125`, `1ga23cs130`, `1ga23cs153` (same password) |
| Optional backend | `python backend/app.py` — chatbot (`/api/chat`) and ML prediction (`/api/*`) |

### About the authentication
The login gate is a **local demonstration feature, not production-level security**.
Credentials are plain text in `dashboard/assets/js/auth.js` and `server.js`, sessions are
held in browser storage plus a process-memory cookie, and there is no rate limiting or
hashing. It exists only to present the project as a login-first application.
Set `BL_DISABLE_AUTH=1` to serve the dashboard without the gate while debugging.

## Notes
- `data/` and `saved_models/` are gitignored by default to avoid large file commits.
- Stage 2, clustering, and platform components are placeholders in this phase.
