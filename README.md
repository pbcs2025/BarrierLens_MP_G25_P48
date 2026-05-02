# BarrierLens Project (P48)

Stage 1 of the Women's Healthcare Access Research Project. This repository implements district-level barrier classification using the NFHS-5 India dataset.

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
   - `data/raw/NFHS5_Women.csv`
3. Run notebooks in order:
   - `notebooks/00_data_exploration.ipynb`
   - `notebooks/01_preprocessing.ipynb`
   - Stage 1 model notebooks (`02` to `06`)

## Notes
- `data/` and `saved_models/` are gitignored by default to avoid large file commits.
- Stage 2, clustering, and platform components are placeholders in this phase.
