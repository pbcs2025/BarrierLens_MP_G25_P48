# NFHS-5 Data Setup

Stage 1 uses the **individual-level** women's recode file:

- Primary: `data/raw/IAIR7EFL.DTA` (DHS Stata recode, 724,115 rows)
- Working copy: `data/raw/NFHS5_Individual.csv` (exported subset, same rows)

## Analytic sample (v5 decision)

**Rule: full sample (724,115 women).** All barrier items (v467b–h) have zero missingness in this extract, so the barrier module was asked of the full interviewed sample. The base paper's N=108,785 implies a subgroup filter on their side; we model the full file unless the team later switches `ANALYTIC_SAMPLE` in `load_data.py` to `"ever_married"`.

## Column groups (Stage 1)

| Group | Columns | Role in Stage 1 |
|-------|---------|-------------------|
| 1 Identifiers | caseid, v001, v002, v021, v024, v025 | Not model features |
| 2 Background | v012–v013, v106, v130, v131, v501, v717 | Features |
| 3 Household | v190, v169a, v170, v481 | Features |
| 4 Media | v157, v158, v159 | Features → `media_exposure_index` |
| 5 Autonomy | v743f (v466 empty in this file) | Features |
| 6 Barriers | v467b–v467h (+ f/i if present in DTA) | Binarized targets (OR logic) |
| 7 Stage 2 | v626a, m14 | Reference only |
| 8 Bonus | s245a, s245b, s245h | Validation only |

**Note:** India's NFHS-5 extract does not include `v467f` (companion) or `v467i` (no drugs) in the exported CSV; targets are built from available columns with a warning.

**Feature coverage:** barrier items are answered for all 724,115 women, but modules such as `v717`, `v169a`, `v170`, and `v743f` are only populated for ~108K rows (matching the base paper's analytic N). Structural missingness is encoded as a `missing` category, not mode-imputed.

Run preprocessing: `notebooks/01_preprocessing.ipynb` or `python scripts/run_preprocessing_only.py`.

## Confirmed target prevalences (v5 rebuild, full N=724,115)

| Target | Positive rate | Built from |
|--------|---------------|------------|
| `target_household` | 27.2% (196,638 / 724,115) | v467b, v467c (v467f absent in India extract) |
| `target_logistic` | 31.6% (228,867 / 724,115) | v467d, v467e |
| `target_facility` | 46.0% (333,147 / 724,115) | v467g, v467h (v467i absent in India extract) |

Post-encoding feature matrix: **724,115 × 37** (one-hot state/religion/caste/marital/occupation + engineered indices).
