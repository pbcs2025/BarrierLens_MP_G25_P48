# NFHS-5 Data Setup

Stage 1 uses the **individual-level** women's recode file:

- `data/raw/NFHS5_Individual.csv` (~724,115 rows × 32 columns)

## Column groups (Stage 1)

| Group | Columns | Role in Stage 1 |
|-------|---------|-------------------|
| 1 Identifiers | caseid, v001, v002, v021, v024, v025 | Not model features |
| 2 Background | v012–v013, v106, v130, v131, v501, v717 | Features |
| 3 Household | v190, v169a, v170, v481 | Features |
| 4 Media | v157, v158, v159 | Features |
| 5 Autonomy | v743f (v466 empty in this file) | Features |
| 6 Barriers | v467b–v467h | Binarized targets |
| 7 Stage 2 | v626a | Reference only |
| 8 Bonus | s245a, s245b, s245h | Validation only |

Run preprocessing: `notebooks/01_preprocessing.ipynb` or `python scripts/run_stage1_pipeline.py`.
