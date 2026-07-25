"""Stage 2 Random Forest training for BarrierLens health-outcome prediction.

Trains separate RandomForestClassifier models for:
  - target_anc_gap   (m14 < 4 ANC visits — skipped until m14 is extracted)
  - target_unmet_fp  (unmet need for family planning)

Mirrors the structure, output schema, naming conventions, and console-output
style of stage2_xgboost.py and stage2_logistic.py so that all Stage 2 models
are directly comparable in 12_stage2_model_compare.ipynb and
scripts/run_stage2_model_compare.py.

Target availability
-------------------
Both targets are declared in STAGE2_TARGETS (same constant as XGBoost/LR).
target_anc_gap requires the m14 column, extracted via scripts/patch_m14_extract.py.
Until that step is re-run the pipeline detects zero valid rows at runtime and
skips the target with an INFO-level message.  No code change is needed here when
the data becomes available.
"""

from __future__ import annotations

import logging
import textwrap
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import joblib
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import shap
from sklearn.ensemble import RandomForestClassifier
from sklearn.inspection import permutation_importance
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import (
    RandomizedSearchCV,
    StratifiedKFold,
    cross_val_score,
    train_test_split,
)

from src.evaluation.stage2_metrics import compute_barrier_uplift, evaluate_model
from src.evaluation.feature_labels import map_feature_names
from src.models.stage2_xgboost import (
    STAGE2_TARGETS,
    TARGET_DISPLAY,
    filter_target_sample,
    load_stage2_data,
    split_feature_sets,
)
from src.preprocessing.stage2_integration import _sanitize_feature_names

logger = logging.getLogger(__name__)

PROJECT_ROOT      = Path(__file__).resolve().parents[2]
STAGE2_OUTPUT_DIR = PROJECT_ROOT / "outputs" / "stage2_results"
STAGE2_MODELS_DIR = PROJECT_ROOT / "saved_models" / "stage2"
SHAP_DIR          = STAGE2_OUTPUT_DIR / "shap"

# Minimum valid (non-null) rows required to attempt training for a target.
# Targets below this threshold are skipped gracefully with an INFO log.
MIN_VALID_SAMPLES: int = 100

# Default hyperparameters (Stage 2 guide §3.2)
BASE_RF_PARAMS: Dict[str, Any] = {
    "n_estimators":  300,
    "max_depth":     15,
    "class_weight":  "balanced",
    "random_state":  42,
    "n_jobs":        -1,
}

# RandomizedSearchCV search space for hyperparameter tuning
SEARCH_PARAM_GRID: Dict[str, List[Any]] = {
    "n_estimators":      [200, 300, 400],
    "max_depth":         [8, 12, 16, 20],
    "min_samples_split": [2, 5, 10],
    "min_samples_leaf":  [1, 2, 4, 8],
    "max_features":      ["sqrt", "log2"],
    "bootstrap":         [True],
    "criterion":         ["gini", "entropy"],
}

BARRIER_COLS: Tuple[str, ...] = (
    "household_barrier_prob",
    "logistic_barrier_prob",
    "facility_barrier_prob",
)


# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

def configure_logging(level: int = logging.INFO) -> None:
    """Configure the root logger — mirrors stage2_xgboost.configure_logging."""
    logging.basicConfig(
        level=level,
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    )


# ---------------------------------------------------------------------------
# Model construction
# ---------------------------------------------------------------------------

def build_random_forest_classifier(**overrides: Any) -> RandomForestClassifier:
    """Instantiate a RandomForestClassifier with Stage 2 defaults."""
    return RandomForestClassifier(**{**BASE_RF_PARAMS, **overrides})


# ---------------------------------------------------------------------------
# Hyperparameter tuning
# ---------------------------------------------------------------------------

def tune_random_forest_hyperparameters(
    X_train:      pd.DataFrame,
    y_train:      pd.Series,
    sample_size:  int = 50_000,
    cv_folds:     int = 3,
    random_state: int = 42,
) -> Dict[str, Any]:
    """RandomizedSearchCV on a stratified subsample for tractability.

    Running the search on the full training set is impractical at 370k rows.
    A 50k stratified subsample reliably identifies the best hyperparameter
    region while keeping tuning time under a few minutes.
    """
    if len(X_train) > sample_size:
        X_tune, _, y_tune, _ = train_test_split(
            X_train, y_train,
            train_size=sample_size,
            stratify=y_train,
            random_state=random_state,
        )
        logger.info("Hyperparameter tuning on %s-row subsample", f"{len(y_tune):,}")
    else:
        X_tune, y_tune = X_train, y_train

    search = RandomizedSearchCV(
        estimator=RandomForestClassifier(class_weight="balanced",
                                         random_state=random_state, n_jobs=-1),
        param_distributions=SEARCH_PARAM_GRID,
        n_iter=10,
        scoring="roc_auc",
        cv=cv_folds,
        random_state=random_state,
        n_jobs=-1,
        refit=False,
        verbose=0,
    )
    search.fit(X_tune, y_tune)
    logger.info(
        "Best hyperparameters: %s (CV ROC-AUC=%.4f)",
        search.best_params_, search.best_score_,
    )
    return search.best_params_


# ---------------------------------------------------------------------------
# Training
# ---------------------------------------------------------------------------

def train_stage2_random_forest(
    X_train:     pd.DataFrame,
    y_train:     pd.Series,
    target_name: str,
    hyperparams: Optional[Dict[str, Any]] = None,
    save_path:   Optional[Path] = None,
) -> RandomForestClassifier:
    """Fit one Stage 2 Random Forest model for a single health-outcome target.

    This is the primary public entry point used by notebooks and scripts,
    mirroring train_stage2_xgboost / train_stage2_logistic in signature style.
    """
    params = {**BASE_RF_PARAMS, **(hyperparams or {})}
    model  = RandomForestClassifier(**params)
    logger.info("Training Stage 2 Random Forest for %s ...", target_name)
    model.fit(X_train, y_train)

    if save_path is not None:
        Path(save_path).parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(model, save_path)
        logger.info("Saved model -> %s", save_path)

    return model


# ---------------------------------------------------------------------------
# Barrier uplift
# ---------------------------------------------------------------------------

def run_barrier_uplift_for_target(
    X:           pd.DataFrame,
    y:           pd.Series,
    target_name: str,
    hyperparams: Optional[Dict[str, Any]] = None,
    cv_folds:    int = 3,
) -> Dict[str, Any]:
    """Compare socioeconomic-only vs full feature ROC-AUC via cross-validation.

    Mirrors run_barrier_uplift_for_target in stage2_xgboost.py and
    stage2_logistic.py.
    """
    params = {**BASE_RF_PARAMS, **(hyperparams or {})}
    socio_cols, full_cols = split_feature_sets(X.columns.tolist())
    X_socio = _sanitize_feature_names(X[socio_cols])
    X_full  = _sanitize_feature_names(X[full_cols])

    def model_fn() -> RandomForestClassifier:
        return RandomForestClassifier(**params)

    cv = StratifiedKFold(n_splits=cv_folds, shuffle=True, random_state=42)
    return compute_barrier_uplift(model_fn, X_socio, X_full, y, target_name, cv)


# ---------------------------------------------------------------------------
# SHAP analysis
# ---------------------------------------------------------------------------

def run_shap_analysis(
    model:        RandomForestClassifier,
    X_sample:     pd.DataFrame,
    target_name:  str,
    output_dir:   Optional[Path] = None,
    sample_size:  int = 2000,
    random_state: int = 42,
) -> pd.DataFrame:
    """Generate SHAP bar and beeswarm plots; return ranked mean |SHAP| table.

    File naming mirrors XGBoost: xgb_shap_* → rf_shap_*
    Structure mirrors run_shap_analysis in stage2_xgboost.py exactly.
    """
    output_dir = Path(output_dir or SHAP_DIR)
    output_dir.mkdir(parents=True, exist_ok=True)

    X_clean = _sanitize_feature_names(X_sample)
    if len(X_clean) > sample_size:
        rng = np.random.RandomState(random_state)
        idx = rng.choice(len(X_clean), size=sample_size, replace=False)
        X_clean = X_clean.iloc[idx].reset_index(drop=True)

    logger.info(
        "Computing SHAP values for '%s' on %d samples ...", target_name, len(X_clean)
    )
    explainer   = shap.TreeExplainer(model)
    shap_raw    = explainer.shap_values(X_clean)

    # Handle both list-of-arrays (old shap API) and 3-D array (new API)
    if isinstance(shap_raw, list):
        shap_vals = np.array(shap_raw[1])
    else:
        shap_vals = np.array(shap_raw)
    if shap_vals.ndim == 3:
        shap_vals = shap_vals[:, :, 1]

    mean_abs = np.abs(shap_vals).mean(axis=0)
    importance_df = (
        pd.DataFrame({"feature": X_clean.columns, "mean_abs_shap": mean_abs})
        .sort_values("mean_abs_shap", ascending=False)
        .reset_index(drop=True)
    )
    importance_df.to_csv(
        output_dir / f"rf_shap_importance_{target_name}.csv", index=False
    )

    # Apply readable names for plots
    X_display = X_clean.copy()
    X_display.columns = map_feature_names(X_clean.columns)
    display_importance = importance_df.copy()
    display_importance["feature"] = map_feature_names(importance_df["feature"])

    # ── Bar plot — top 20 ─────────────────────────────────────────────────
    top_n = 20
    top   = display_importance.head(top_n).sort_values("mean_abs_shap")
    labels = [textwrap.fill(f, 40) for f in top["feature"]]
    fig, ax = plt.subplots(figsize=(10, 8))
    ax.barh(labels, top["mean_abs_shap"], color="#1d3557")
    ax.set_xlabel("Mean |SHAP value|", fontsize=11)
    ax.set_title(
        f"SHAP Feature Importance — Random Forest | "
        f"{TARGET_DISPLAY.get(target_name, target_name)}",
        fontsize=13,
    )
    ax.tick_params(labelsize=10)
    plt.tight_layout()
    plt.savefig(
        output_dir / f"rf_shap_bar_{target_name}.png", dpi=300, bbox_inches="tight"
    )
    plt.close()

    # ── Beeswarm summary ──────────────────────────────────────────────────
    plt.figure(figsize=(10, 8))
    shap.summary_plot(shap_vals, X_display, max_display=20, show=False)
    plt.title(
        f"SHAP Beeswarm — {TARGET_DISPLAY.get(target_name, target_name)}",
        fontsize=13,
    )
    plt.tight_layout()
    plt.savefig(
        output_dir / f"rf_shap_beeswarm_{target_name}.png", dpi=300, bbox_inches="tight"
    )
    plt.close()

    # ── Barrier vs socioeconomic group summary ────────────────────────────
    barrier_mask  = importance_df["feature"].isin(BARRIER_COLS)
    cluster_mask  = importance_df["feature"].str.startswith("cluster_")
    barrier_sum   = importance_df.loc[barrier_mask,  "mean_abs_shap"].sum()
    cluster_sum   = importance_df.loc[cluster_mask,  "mean_abs_shap"].sum()
    socio_sum     = importance_df.loc[~barrier_mask & ~cluster_mask, "mean_abs_shap"].sum()

    groups = pd.DataFrame({
        "group":             ["Stage 1 barrier probs", "Cluster features", "Socioeconomic / other"],
        "total_mean_abs_shap": [barrier_sum, cluster_sum, socio_sum],
    })
    groups.to_csv(
        output_dir / f"rf_shap_group_summary_{target_name}.csv", index=False
    )

    fig, ax = plt.subplots(figsize=(7, 5))
    ax.bar(
        groups["group"], groups["total_mean_abs_shap"],
        color=["#e63946", "#457b9d", "#2a9d8f"],
    )
    ax.set_ylabel("Sum of mean |SHAP|", fontsize=11)
    ax.set_title(
        f"SHAP Contribution by Feature Group — "
        f"{TARGET_DISPLAY.get(target_name, target_name)}",
        fontsize=13,
    )
    ax.tick_params(labelsize=10)
    plt.xticks(rotation=15, ha="right")
    plt.tight_layout()
    plt.savefig(
        output_dir / f"rf_shap_group_comparison_{target_name}.png",
        dpi=300, bbox_inches="tight",
    )
    plt.close()

    # Save SHAP importance CSV with human-readable feature names
    shap_csv_display = display_importance.copy()
    shap_csv_display.to_csv(
        output_dir / f"rf_shap_importance_{target_name}.csv", index=False
    )

    logger.info("SHAP plots saved to %s", output_dir)
    return display_importance


# ---------------------------------------------------------------------------
# End-to-end single-target pipeline
# ---------------------------------------------------------------------------

def train_evaluate_target(
    X_full:      pd.DataFrame,
    y:           pd.DataFrame,
    target_col:  str,
    models_dir:  Optional[Path] = None,
    results_dir: Optional[Path] = None,
    tune:        bool = True,
) -> Optional[Dict[str, Any]]:
    """End-to-end train, evaluate, uplift, and SHAP for one Stage 2 target.

    Mirrors train_evaluate_target in stage2_xgboost.py and stage2_logistic.py:
    same argument names, same return dict keys, same console-output format,
    same output file naming so run_stage2_model_compare.py requires no changes.
    """
    models_dir  = Path(models_dir  or STAGE2_MODELS_DIR)
    results_dir = Path(results_dir or STAGE2_OUTPUT_DIR)
    models_dir.mkdir(parents=True,  exist_ok=True)
    results_dir.mkdir(parents=True, exist_ok=True)

    # ── 1. Filter to analytic sample ──────────────────────────────────────
    try:
        X_t, y_t = filter_target_sample(X_full, y, target_col)
    except ValueError as exc:
        # Expected path for targets whose source data is not yet available.
        # Logged at INFO (not WARNING) — this is a known, intentional skip.
        n_valid = int(y[target_col].notna().sum()) if target_col in y.columns else 0
        if n_valid == 0:
            logger.info(
                "Skipping '%s' — target has 0 non-null observations. "
                "This is expected: the required source column (m14 for "
                "target_anc_gap) has not yet been extracted into the current "
                "data files.  Re-run scripts/patch_m14_extract.py and then "
                "scripts/run_stage2_data_prep.py to populate this target.",
                target_col,
            )
        else:
            logger.info("Skipping '%s': %s", target_col, exc)
        return None

    X_t = _sanitize_feature_names(X_t)
    _, full_cols = split_feature_sets(X_t.columns.tolist())
    X_model = X_t[full_cols]

    # ── 2. Train / test split ─────────────────────────────────────────────
    X_train, X_test, y_train, y_test = train_test_split(
        X_model, y_t, test_size=0.20, random_state=42, stratify=y_t,
    )

    # ── 3. Hyperparameter tuning ──────────────────────────────────────────
    hyperparams = (
        tune_random_forest_hyperparameters(X_train, y_train)
        if tune
        else {"n_estimators": 300, "max_depth": 15}
    )

    # ── 4. Train on full training set ─────────────────────────────────────
    model = train_stage2_random_forest(
        X_train, y_train, target_col,
        hyperparams=hyperparams,
        save_path=models_dir / f"stage2_random_forest_{target_col}.pkl",
    )

    # Save best hyperparameters for reproducibility and audit
    import json as _json
    hp_path = results_dir / f"best_hyperparameters_{target_col}.json"
    hp_path.write_text(
        _json.dumps({**BASE_RF_PARAMS, **hyperparams}, indent=2, default=str),
        encoding="utf-8",
    )
    logger.info("Saved hyperparameters -> %s", hp_path)

    # ── 5. Hold-out evaluation ────────────────────────────────────────────
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]

    metrics: Dict[str, Any] = {
        "Model":        "Random Forest",
        "Target":       target_col,
        "Accuracy":     round(float(accuracy_score(y_test, y_pred)),                    4),
        "ROC-AUC":      round(float(roc_auc_score(y_test, y_prob)),                     4),
        "Precision":    round(float(precision_score(y_test, y_pred, zero_division=0)),  4),
        "Recall":       round(float(recall_score(y_test, y_pred, zero_division=0)),     4),
        "F1-Score":     round(float(f1_score(y_test, y_pred, zero_division=0)),         4),
        "TrainSize":    len(y_train),
        "TestSize":     len(y_test),
        "PositiveRate": round(float(y_t.mean()), 4),
    }

    # 3-fold CV stability check (subsample for speed — mirrors XGBoost approach)
    cv_size = min(len(X_train), 80_000)
    X_cv_sub, _, y_cv_sub, _ = train_test_split(
        X_train, y_train,
        train_size=cv_size, stratify=y_train, random_state=42,
    ) if len(X_train) > cv_size else (X_train, None, y_train, None)

    cv = StratifiedKFold(n_splits=3, shuffle=True, random_state=42)
    cv_scores = cross_val_score(
        build_random_forest_classifier(**hyperparams),
        X_cv_sub, y_cv_sub, cv=cv, scoring="roc_auc", n_jobs=-1,
    )
    metrics["CV_ROC-AUC"] = round(float(cv_scores.mean()), 4)

    # Console output — matches XGBoost / LR format exactly
    print(f"\n=== Random Forest | {TARGET_DISPLAY.get(target_col, target_col)} ===")
    for key in ["Accuracy", "ROC-AUC", "Precision", "Recall", "F1-Score", "CV_ROC-AUC"]:
        print(f"  {key:12s}: {metrics[key]}")
    print(classification_report(y_test, y_pred, zero_division=0))

    # Save classification report as CSV
    cr_df = pd.DataFrame(
        classification_report(y_test, y_pred, zero_division=0, output_dict=True)
    ).transpose().reset_index().rename(columns={"index": "class"})
    cr_df.to_csv(
        results_dir / f"classification_report_{target_col}.csv", index=False
    )

    # ── 6. Barrier uplift ─────────────────────────────────────────────────
    uplift = run_barrier_uplift_for_target(X_t, y_t, target_col, hyperparams)
    metrics["Baseline_ROC-AUC"] = round(uplift["auc_socioeconomic_only"], 4)
    metrics["Full_ROC-AUC"]     = round(uplift["auc_with_barriers"],       4)
    metrics["Barrier_Uplift"]   = round(uplift["uplift"],                  4)

    # Save barrier uplift as standalone CSV
    pd.DataFrame([{
        "target":                uplift["target"],
        "auc_socioeconomic_only": round(uplift["auc_socioeconomic_only"], 4),
        "auc_with_barriers":      round(uplift["auc_with_barriers"],      4),
        "uplift":                 round(uplift["uplift"],                 4),
    }]).to_csv(results_dir / f"rf_barrier_uplift_{target_col}.csv", index=False)

    # Save test-set predictions for downstream analysis / model comparison
    pd.DataFrame({
        "target": target_col,
        "y_true": y_test.to_numpy(),
        "y_pred": y_pred,
        "y_prob": y_prob,
    }).to_csv(results_dir / f"rf_predictions_{target_col}.csv", index=False)

    # ── 7. Feature importances ────────────────────────────────────────────
    raw_features = X_test.columns.tolist()
    display_features = map_feature_names(raw_features)
    feat_df = (
        pd.DataFrame({
            "feature_raw":     raw_features,
            "feature_display": display_features,
            "importance":      model.feature_importances_,
        })
        .sort_values("importance", ascending=False)
        .reset_index(drop=True)
    )
    feat_df.to_csv(results_dir / f"rf_feature_importance_{target_col}.csv", index=False)
    # Shared schema CSV — uses display name as "feature" for publication compatibility
    feat_df[["feature_display", "importance"]].rename(
        columns={"feature_display": "feature"}
    ).to_csv(results_dir / f"feature_importance_{target_col}.csv", index=False)
    feat_df.head(20)[["feature_display", "importance"]].rename(
        columns={"feature_display": "feature"}
    ).to_csv(results_dir / f"top20_features_{target_col}.csv", index=False)

    # Permutation importance on a capped subsample
    perm_n   = min(len(X_test), 10_000)
    X_perm   = X_test.iloc[:perm_n]
    y_perm   = y_test.iloc[:perm_n]
    perm_res = permutation_importance(
        model, X_perm, y_perm, n_repeats=5, random_state=42, n_jobs=-1
    )
    pd.DataFrame({
        "feature":              map_feature_names(X_perm.columns),
        "perm_importance_mean": perm_res.importances_mean,
        "perm_importance_std":  perm_res.importances_std,
    }).sort_values("perm_importance_mean", ascending=False).reset_index(drop=True).to_csv(
        results_dir / f"permutation_importance_{target_col}.csv", index=False
    )

    # ── 8. SHAP analysis ──────────────────────────────────────────────────
    shap_df = run_shap_analysis(model, X_test, target_col)

    return {
        "target":           target_col,
        "model":            model,
        "metrics":          metrics,
        "uplift":           uplift,
        "feature_importance": feat_df,
        "shap_importance":  shap_df,
        "X_test":           X_test,
        "y_test":           y_test,
    }


# ---------------------------------------------------------------------------
# Full pipeline entry point
# ---------------------------------------------------------------------------

def train_all_stage2_random_forest(
    data_dir:    Optional[Path] = None,
    models_dir:  Optional[Path] = None,
    results_dir: Optional[Path] = None,
) -> Dict[str, Any]:
    """Train and evaluate Random Forest for all available Stage 2 targets.

    Mirrors train_all_stage2_xgboost / train_all_stage2_logistic:
    - same return dict structure
    - saves to rf_evaluation_results.csv (parallel to xgboost_evaluation_results.csv
      and logistic_evaluation_results.csv)
    - targets with insufficient data are skipped with an INFO log
    """
    X_full, y    = load_stage2_data(data_dir=data_dir)
    results_dir  = Path(results_dir or STAGE2_OUTPUT_DIR)
    results_dir.mkdir(parents=True, exist_ok=True)

    results: Dict[str, Any] = {"targets": {}, "metrics_rows": []}
    skipped: List[str]      = []

    for target_col in STAGE2_TARGETS:
        bundle = train_evaluate_target(X_full, y, target_col, models_dir, results_dir)
        if bundle is None:
            skipped.append(target_col)
            continue
        results["targets"][target_col] = bundle
        results["metrics_rows"].append(bundle["metrics"])

    if results["metrics_rows"]:
        metrics_df  = pd.DataFrame(results["metrics_rows"])
        # Primary evaluation results file (parallel to xgboost_evaluation_results.csv)
        metrics_path = results_dir / "rf_evaluation_results.csv"
        metrics_df.to_csv(metrics_path, index=False)
        logger.info("Saved evaluation metrics -> %s", metrics_path)
        results["metrics_df"] = metrics_df

    # Log training / skip summary
    trained = list(results["targets"].keys())
    logger.info(
        "Stage 2 Random Forest complete — trained: %s  |  skipped: %s",
        trained if trained else "none",
        skipped if skipped else "none",
    )

    return results


if __name__ == "__main__":
    configure_logging()
    bundle = train_all_stage2_random_forest()
    print(
        f"Completed Stage 2 Random Forest for "
        f"{len(bundle.get('targets', {}))} target(s)."
    )
