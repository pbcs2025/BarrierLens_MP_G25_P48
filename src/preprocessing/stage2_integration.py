# src/preprocessing/stage2_integration.py
#
# Owner: RBM
# Purpose: build the two Stage 2 targets (ANC gap, unmet family-planning need)
# and the three out-of-fold Stage 1 barrier probabilities that feed clustering
# and every Stage 2 model. Run the OOF step as a background script, not
# interactively — see the __main__ block at the bottom.

from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.model_selection import StratifiedKFold, cross_val_predict
from xgboost import XGBClassifier

PROJECT_ROOT = Path(__file__).resolve().parents[2]
PROCESSED_DIR = PROJECT_ROOT / "data" / "processed"
STAGE2_DIR = PROCESSED_DIR / "stage2"
CHECKPOINT_DIR = PROJECT_ROOT / "outputs" / "stage2_results" / "oof_checkpoints"


# ---------------------------------------------------------------------------
# Step 1-2: discovery — run this first, interactively, to confirm columns
# and exact v626a category text before trusting the target-builder below.
# ---------------------------------------------------------------------------
def discover_targets(df: pd.DataFrame) -> None:
    print(df['v626a'].value_counts(dropna=False))
    print(df['m14'].describe())
    print('m14 non-null:', df['m14'].notna().sum(), '/', len(df))
    print('v626a non-null:', df['v626a'].notna().sum(), '/', len(df))


# ---------------------------------------------------------------------------
# Step 3: build the two Stage 2 targets, each on its own restricted sample.
# Structural missingness (no birth in reference period / never-married) is
# NOT imputed — each target keeps its own mask.
# ---------------------------------------------------------------------------
def build_stage2_targets(df: pd.DataFrame) -> pd.DataFrame:
    """Build both Stage 2 targets on their restricted samples (Guide Section 2.2)."""
    y = pd.DataFrame(index=df.index)

    # v626a is NOT just NaN-vs-not for non-applicable women — DHS gives them
    # explicit categories ('never had sex', 'infecund, menopausal',
    # 'not married and no sex in last 30 days') that .notna() would wrongly
    # keep. Restrict to the five categories where "unmet need" is a
    # meaningful yes/no question at all.
    valid_categories = [
        'no unmet need', 'using for spacing', 'using for limiting',
        'unmet need for spacing', 'unmet need for limiting',
    ]
    positive_categories = ['unmet need for spacing', 'unmet need for limiting']

    mask_fp = df['v626a'].isin(valid_categories)
    # NOTE: do not use str.contains('unmet need') here — it also matches
    # the string 'no unmet need' (substring trap) and silently inflates the
    # positive class. Use an explicit isin() against the positive labels only.
    y.loc[mask_fp, 'target_unmet_fp'] = df.loc[mask_fp, 'v626a'].isin(positive_categories).astype(int)

    n_fp = y['target_unmet_fp'].notna().sum()
    print(f"target_unmet_fp restricted N: {n_fp} / {len(df)}")

    # target_anc_gap: 1 if m14 < 4 ANC visits, else 0; NaN where m14 is missing
    if "m14" in df.columns:
        mask_anc = df["m14"].notna()
        y.loc[mask_anc, "target_anc_gap"] = (df.loc[mask_anc, "m14"] < 4).astype(int)
        print(f"target_anc_gap restricted N: {mask_anc.sum():,} / {len(df):,}")
    else:
        print("WARNING: m14 not in raw extract — target_anc_gap will be all-NaN.")

    return y


# ---------------------------------------------------------------------------
# Step 4: out-of-fold Stage 1 barrier probabilities. Mandatory cross_val_predict
# to avoid leakage — the fitted Stage 1 models saw 80% of these rows already.
# ---------------------------------------------------------------------------
def _sanitize_feature_names(X: pd.DataFrame) -> pd.DataFrame:
    """
    XGBoost rejects feature names containing [, ], or < (it uses them
    internally in its own tree format). PBC's one-hot encoding produced at
    least one category label with brackets, e.g.
    'v501_never in union  [includes: married gauna not performed]'.
    This renames columns only for the XGBoost call — it does not touch the
    saved CSV or any other model's view of the data.
    """
    clean_cols = (
        X.columns.astype(str)
        .str.replace(r'[\[\]<]', '', regex=True)
    )
    if clean_cols.duplicated().any():
        # extremely unlikely, but guard against two columns colliding after
        # stripping characters
        dupes = clean_cols[clean_cols.duplicated()].tolist()
        raise ValueError(f"Column name collision after sanitizing: {dupes}")
    return X.set_axis(clean_cols, axis=1)


def build_oof_barrier_probabilities(X, y_household, y_logistic, y_facility,
                                     n_splits=3, random_state=42, checkpoint=True):
    X = _sanitize_feature_names(X)
    kf = StratifiedKFold(n_splits=n_splits, shuffle=True, random_state=random_state)
    base_kwargs = dict(max_depth=6, n_estimators=300, learning_rate=0.08,
                        subsample=0.8, colsample_bytree=0.8, tree_method='hist',
                        random_state=random_state)

    if checkpoint:
        CHECKPOINT_DIR.mkdir(parents=True, exist_ok=True)

    oof = {}
    for name, y in [('household_barrier_prob', y_household),
                     ('logistic_barrier_prob', y_logistic),
                     ('facility_barrier_prob', y_facility)]:
        ckpt_path = CHECKPOINT_DIR / f"{name}.npy"
        if checkpoint and ckpt_path.exists():
            print(f"Loading existing checkpoint for {name}, skipping refit.")
            oof[name] = np.load(ckpt_path)
            continue

        print(f"Running 3-fold OOF for {name} ...")
        neg, pos = (y == 0).sum(), (y == 1).sum()
        model = XGBClassifier(scale_pos_weight=neg / pos, **base_kwargs)
        probs = cross_val_predict(model, X, y, cv=kf, method='predict_proba', n_jobs=-1)[:, 1]
        oof[name] = probs

        if checkpoint:
            np.save(ckpt_path, probs)
            print(f"Checkpointed {name} -> {ckpt_path}")

    return pd.DataFrame(oof)


# ---------------------------------------------------------------------------
# Step 5: composite barrier-exposure score — mean of the three OOF probs.
# ---------------------------------------------------------------------------
def build_composite_score(oof_df: pd.DataFrame) -> pd.Series:
    return oof_df[['household_barrier_prob', 'logistic_barrier_prob',
                    'facility_barrier_prob']].mean(axis=1)


# ---------------------------------------------------------------------------
# Sanity check: OOF AUC should be somewhat lower than in-sample AUC on the
# already-fitted Stage 1 models. If it's roughly EQUAL, something's wrong
# (likely leakage still present); if it's WILDLY lower, check fold balance.
# ---------------------------------------------------------------------------
def oof_vs_insample_check(oof_probs: np.ndarray, in_sample_probs: np.ndarray, y_true, target_name: str):
    from sklearn.metrics import roc_auc_score
    auc_oof = roc_auc_score(y_true, oof_probs)
    auc_in_sample = roc_auc_score(y_true, in_sample_probs)
    print(f"{target_name}: in-sample AUC={auc_in_sample:.4f} | OOF AUC={auc_oof:.4f} "
          f"| gap={auc_in_sample - auc_oof:+.4f}")
    return {'target': target_name, 'auc_in_sample': auc_in_sample, 'auc_oof': auc_oof}


if __name__ == "__main__":
    # Run this file directly (python -m src.preprocessing.stage2_integration)
    # as a background job — do NOT run build_oof_barrier_probabilities()
    # interactively in a notebook cell, per the guide's compute note.
    print("Loading Stage 1 processed features...")
    X = pd.read_csv(PROCESSED_DIR / "X_features.csv")
    y_household = pd.read_csv(PROCESSED_DIR / "y_household.csv").squeeze()
    y_logistic = pd.read_csv(PROCESSED_DIR / "y_logistic.csv").squeeze()
    y_facility = pd.read_csv(PROCESSED_DIR / "y_facility.csv").squeeze()

    print("Building OOF barrier probabilities (this will take a while)...")
    oof_df = build_oof_barrier_probabilities(X, y_household, y_logistic, y_facility)

    print("Building composite score...")
    oof_df['composite_barrier_score'] = build_composite_score(oof_df)

    STAGE2_DIR.mkdir(parents=True, exist_ok=True)
    out_path = STAGE2_DIR / "oof_barrier_probabilities.csv"
    oof_df.to_csv(out_path, index=False)
    print(f"Saved OOF probabilities -> {out_path}")