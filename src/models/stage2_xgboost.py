"""Stage 2 XGBoost training for BarrierLens health-outcome prediction.

Trains separate XGBoost classifiers for:
  - target_anc_gap   (m14 < 4)
  - target_unmet_fp  (unmet need for family planning)

Includes hyperparameter tuning, hold-out evaluation, 3-fold CV stability checks,
barrier-uplift analysis, and SHAP explainability.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Tuple, Union

import joblib
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import shap
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import GridSearchCV, StratifiedKFold, cross_val_score, train_test_split

from src.evaluation.stage2_metrics import compute_barrier_uplift, evaluate_model
from src.preprocessing.stage2_integration import _sanitize_feature_names

try:
    from xgboost import XGBClassifier
except ImportError as exc:  # pragma: no cover
    raise ImportError(
        "XGBoost is required for Stage 2 models. Install with: pip install xgboost"
    ) from exc

logger = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).resolve().parents[2]
STAGE2_DATA_DIR = PROJECT_ROOT / "data" / "processed" / "stage2"
STAGE2_OUTPUT_DIR = PROJECT_ROOT / "outputs" / "stage2_results"
STAGE2_MODELS_DIR = PROJECT_ROOT / "saved_models" / "stage2"
SHAP_DIR = STAGE2_OUTPUT_DIR / "shap"

# NOTE: target_anc_gap removed - m14 column not available in current extract
# Only target_unmet_fp (family planning unmet need) is available
STAGE2_TARGETS: Tuple[str, ...] = ("target_unmet_fp",)
TARGET_DISPLAY = {
    "target_anc_gap": "ANC Care Gap",  # Not available (m14 missing)
    "target_unmet_fp": "Unmet Family Planning Need",
}

BARRIER_COLS: Tuple[str, ...] = (
    "household_barrier_prob",
    "logistic_barrier_prob",
    "facility_barrier_prob",
)

LEAKAGE_COLS = {"s245a", "s245b", "s245h"}

BASE_XGB_PARAMS: Dict[str, Any] = {
    "learning_rate": 0.08,
    "subsample": 0.8,
    "colsample_bytree": 0.8,
    "tree_method": "hist",
    "eval_metric": "auc",
    "random_state": 42,
    "n_jobs": -1,
}

TUNE_PARAM_GRID: Dict[str, List[Any]] = {
    "n_estimators": [300, 350, 400],
    "max_depth": [5, 6, 7],
}


def compute_scale_pos_weight(y: Union[pd.Series, np.ndarray]) -> float:
    """Return negative / positive count ratio for XGBoost imbalance handling."""
    y_array = np.asarray(y)
    neg = int(np.sum(y_array == 0))
    pos = int(np.sum(y_array == 1))
    if pos == 0 or neg == 0:
        raise ValueError("Cannot compute scale_pos_weight: need both class labels present.")
    return neg / pos


def load_stage2_data(
    data_dir: Optional[Path] = None,
    outputs_dir: Optional[Path] = None,
) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    Load Stage 2 feature matrix (with cluster dummies) and target DataFrame.

    Returns
    -------
    X_full, y
        Feature matrix including one-hot cluster columns; targets with structural NaNs.
    """
    data_dir = Path(data_dir or STAGE2_DATA_DIR)
    outputs_dir = Path(outputs_dir or STAGE2_OUTPUT_DIR)

    required = [
        data_dir / "X_stage2_preclustering.csv",
        data_dir / "y_stage2_targets.csv",
        outputs_dir / "cluster_assignments.csv",
    ]
    for path in required:
        if not path.exists():
            raise FileNotFoundError(
                f"Missing Stage 2 input: {path}. Run scripts/run_stage2_data_prep.py first."
            )

    X_pre = pd.read_csv(data_dir / "X_stage2_preclustering.csv")
    y = pd.read_csv(data_dir / "y_stage2_targets.csv")
    clusters = pd.read_csv(outputs_dir / "cluster_assignments.csv").squeeze("columns")

    drop_leakage = [c for c in X_pre.columns if c in LEAKAGE_COLS]
    if drop_leakage:
        X_pre = X_pre.drop(columns=drop_leakage)

    cluster_dummies = pd.get_dummies(clusters, prefix="cluster")
    X_full = pd.concat([X_pre.reset_index(drop=True), cluster_dummies.reset_index(drop=True)], axis=1)

    logger.info("Loaded Stage 2 data: X=%s, targets=%s", X_full.shape, list(y.columns))
    return X_full, y


def split_feature_sets(feature_names: List[str]) -> Tuple[List[str], List[str]]:
    """
    Return (socioeconomic_only, full) feature name lists.

    Baseline excludes Stage 1 barrier probabilities and cluster one-hot columns.
    """
    socio = [
        c
        for c in feature_names
        if c not in BARRIER_COLS
        and not c.startswith("cluster_")
        and c != "composite_barrier_score"
    ]
    full = list(feature_names)
    return socio, full


def filter_target_sample(
    X: pd.DataFrame,
    y: pd.DataFrame,
    target_col: str,
) -> Tuple[pd.DataFrame, pd.Series]:
    """Restrict to rows where the target is non-null (structural missingness preserved)."""
    if target_col not in y.columns:
        raise KeyError(f"Target column '{target_col}' not found.")

    mask = y[target_col].notna()
    if mask.sum() == 0:
        raise ValueError(
            f"No non-null rows for {target_col}. "
            "If target_anc_gap, ensure m14 is present in the raw extract."
        )

    X_t = X.loc[mask].reset_index(drop=True)
    y_t = y.loc[mask, target_col].astype(int).reset_index(drop=True)
    logger.info("%s — analytic sample: %s rows (positive rate %.4f)", target_col, len(y_t), y_t.mean())
    return X_t, y_t


def build_xgb_classifier(scale_pos_weight: float, **overrides: Any) -> XGBClassifier:
    """Instantiate XGBClassifier with Stage 2 defaults."""
    params = {**BASE_XGB_PARAMS, "scale_pos_weight": scale_pos_weight, **overrides}
    return XGBClassifier(**params)


def tune_xgboost_hyperparameters(
    X_train: pd.DataFrame,
    y_train: pd.Series,
    tune_sample_size: int = 80_000,
    cv_folds: int = 3,
    random_state: int = 42,
) -> Dict[str, Any]:
    """
    Grid-search n_estimators and max_depth on a stratified subsample for tractability.
    """
    scale_pos_weight = compute_scale_pos_weight(y_train)
    base = build_xgb_classifier(scale_pos_weight)

    if len(y_train) > tune_sample_size:
        X_tune, _, y_tune, _ = train_test_split(
            X_train,
            y_train,
            train_size=tune_sample_size,
            stratify=y_train,
            random_state=random_state,
        )
        logger.info("Hyperparameter tuning on %s-row stratified subsample", f"{len(y_tune):,}")
    else:
        X_tune, y_tune = X_train, y_train

    grid = GridSearchCV(
        base,
        TUNE_PARAM_GRID,
        cv=cv_folds,
        scoring="roc_auc",
        n_jobs=-1,
    )
    grid.fit(X_tune, y_tune)
    logger.info("Best hyperparameters: %s (CV ROC-AUC=%.4f)", grid.best_params_, grid.best_score_)
    return grid.best_params_


def train_stage2_xgboost(
    X_train: Union[pd.DataFrame, np.ndarray],
    y_train: Union[pd.Series, np.ndarray],
    target_name: str,
    hyperparams: Optional[Dict[str, Any]] = None,
    save_path: Optional[Path] = None,
) -> XGBClassifier:
    """Train one Stage 2 XGBoost model for a single health-outcome target."""
    scale_pos_weight = compute_scale_pos_weight(y_train)
    params = hyperparams or {"n_estimators": 350, "max_depth": 6}
    model = build_xgb_classifier(scale_pos_weight, **params)
    logger.info("Training Stage 2 XGBoost for %s ...", target_name)
    model.fit(X_train, y_train)

    if save_path is not None:
        save_path = Path(save_path)
        save_path.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(model, save_path)
        logger.info("Saved model -> %s", save_path)

    return model


def evaluate_stage2_model(
    model: XGBClassifier,
    X_test: pd.DataFrame,
    y_test: pd.Series,
    target_name: str,
) -> Dict[str, Any]:
    """Hold-out metrics for one fitted Stage 2 XGBoost model."""
    results = evaluate_model(model, X_test, y_test, "XGBoost", target_name)
    cm = confusion_matrix(y_test, model.predict(X_test))
    return {
        **results,
        "ConfusionMatrix": cm.tolist(),
        "ClassificationReport": classification_report(
            y_test, model.predict(X_test), zero_division=0
        ),
    }


def evaluate_with_cv_stability(
    model_factory: Callable[[], XGBClassifier],
    X: pd.DataFrame,
    y: pd.Series,
    cv_folds: int = 3,
) -> float:
    """Return mean 3-fold CV ROC-AUC for stability reporting."""
    cv = StratifiedKFold(n_splits=cv_folds, shuffle=True, random_state=42)
    scores = cross_val_score(model_factory(), X, y, cv=cv, scoring="roc_auc", n_jobs=-1)
    return float(scores.mean())


def run_barrier_uplift_for_target(
    X: pd.DataFrame,
    y: pd.Series,
    target_name: str,
    hyperparams: Dict[str, Any],
    cv_folds: int = 3,
) -> Dict[str, Any]:
    """Compare socioeconomic-only vs full feature ROC-AUC via cross-validation."""
    feature_names = X.columns.tolist()
    socio_cols, full_cols = split_feature_sets(feature_names)
    X_socio = _sanitize_feature_names(X[socio_cols])
    X_full = _sanitize_feature_names(X[full_cols])

    def model_fn() -> XGBClassifier:
        return build_xgb_classifier(compute_scale_pos_weight(y), **hyperparams)

    cv = StratifiedKFold(n_splits=cv_folds, shuffle=True, random_state=42)
    return compute_barrier_uplift(model_fn, X_socio, X_full, y, target_name, cv)


def run_shap_analysis(
    model: XGBClassifier,
    X_sample: pd.DataFrame,
    target_name: str,
    output_dir: Optional[Path] = None,
    sample_size: int = 5000,
    random_state: int = 42,
) -> pd.DataFrame:
    """
    Generate SHAP bar and beeswarm plots; return ranked mean |SHAP| table.

    Uses a stratified subsample for memory efficiency on large NFHS-5 data.
    """
    output_dir = Path(output_dir or SHAP_DIR)
    output_dir.mkdir(parents=True, exist_ok=True)

    X_clean = _sanitize_feature_names(X_sample)
    if len(X_clean) > sample_size:
        rng = np.random.RandomState(random_state)
        idx = rng.choice(len(X_clean), size=sample_size, replace=False)
        X_clean = X_clean.iloc[idx]

    explainer = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(X_clean)
    if isinstance(shap_values, list):
        shap_vals = np.array(shap_values[1])
    else:
        shap_vals = np.array(shap_values)
    if shap_vals.ndim == 3:
        shap_vals = shap_vals[:, :, 1]

    mean_abs = np.abs(shap_vals).mean(axis=0)
    importance_df = (
        pd.DataFrame({"feature": X_clean.columns, "mean_abs_shap": mean_abs})
        .sort_values("mean_abs_shap", ascending=False)
        .reset_index(drop=True)
    )
    importance_df.to_csv(output_dir / f"xgb_shap_importance_{target_name}.csv", index=False)

    # Bar plot — top 20
    top_n = 20
    top = importance_df.head(top_n).sort_values("mean_abs_shap")
    plt.figure(figsize=(10, 8))
    plt.barh(top["feature"], top["mean_abs_shap"], color="#1d3557")
    plt.xlabel("Mean |SHAP value|")
    plt.title(f"SHAP Feature Importance — XGBoost | {TARGET_DISPLAY.get(target_name, target_name)}")
    plt.tight_layout()
    plt.savefig(output_dir / f"xgb_shap_bar_{target_name}.png", dpi=300, bbox_inches="tight")
    plt.close()

    # Beeswarm summary
    plt.figure(figsize=(10, 8))
    shap.summary_plot(shap_vals, X_clean, max_display=20, show=False)
    plt.title(f"SHAP Beeswarm — {TARGET_DISPLAY.get(target_name, target_name)}")
    plt.tight_layout()
    plt.savefig(output_dir / f"xgb_shap_beeswarm_{target_name}.png", dpi=300, bbox_inches="tight")
    plt.close()

    # Barrier vs socioeconomic comparison bar
    barrier_mask = importance_df["feature"].isin(BARRIER_COLS)
    barrier_sum = importance_df.loc[barrier_mask, "mean_abs_shap"].sum()
    cluster_sum = importance_df.loc[importance_df["feature"].str.startswith("cluster_"), "mean_abs_shap"].sum()
    socio_sum = importance_df.loc[~barrier_mask & ~importance_df["feature"].str.startswith("cluster_"), "mean_abs_shap"].sum()

    groups = pd.DataFrame(
        {
            "group": ["Stage 1 barrier probs", "Cluster features", "Socioeconomic / other"],
            "total_mean_abs_shap": [barrier_sum, cluster_sum, socio_sum],
        }
    )
    groups.to_csv(output_dir / f"xgb_shap_group_summary_{target_name}.csv", index=False)

    plt.figure(figsize=(7, 5))
    plt.bar(groups["group"], groups["total_mean_abs_shap"], color=["#e63946", "#457b9d", "#2a9d8f"])
    plt.ylabel("Sum of mean |SHAP|")
    plt.title(f"SHAP Contribution by Feature Group — {TARGET_DISPLAY.get(target_name, target_name)}")
    plt.xticks(rotation=15, ha="right")
    plt.tight_layout()
    plt.savefig(output_dir / f"xgb_shap_group_comparison_{target_name}.png", dpi=300, bbox_inches="tight")
    plt.close()

    logger.info("SHAP plots saved to %s", output_dir)
    return importance_df


def train_evaluate_target(
    X_full: pd.DataFrame,
    y: pd.DataFrame,
    target_col: str,
    models_dir: Optional[Path] = None,
    results_dir: Optional[Path] = None,
    tune: bool = True,
) -> Optional[Dict[str, Any]]:
    """End-to-end train, evaluate, uplift, and SHAP for one Stage 2 target."""
    models_dir = Path(models_dir or STAGE2_MODELS_DIR)
    results_dir = Path(results_dir or STAGE2_OUTPUT_DIR)
    models_dir.mkdir(parents=True, exist_ok=True)
    results_dir.mkdir(parents=True, exist_ok=True)

    try:
        X_t, y_t = filter_target_sample(X_full, y, target_col)
    except ValueError as exc:
        logger.warning("Skipping %s: %s", target_col, exc)
        return None

    X_t = _sanitize_feature_names(X_t)
    X_train, X_test, y_train, y_test = train_test_split(
        X_t,
        y_t,
        test_size=0.20,
        random_state=42,
        stratify=y_t,
    )

    hyperparams = tune_xgboost_hyperparameters(X_train, y_train) if tune else {"n_estimators": 350, "max_depth": 6}

    model = train_stage2_xgboost(
        X_train,
        y_train,
        target_col,
        hyperparams=hyperparams,
        save_path=models_dir / f"stage2_xgboost_{target_col}.pkl",
    )

    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]
    metrics = {
        "Model": "XGBoost",
        "Target": target_col,
        "Accuracy": round(float(accuracy_score(y_test, y_pred)), 4),
        "ROC-AUC": round(float(roc_auc_score(y_test, y_prob)), 4),
        "Precision": round(float(precision_score(y_test, y_pred, zero_division=0)), 4),
        "Recall": round(float(recall_score(y_test, y_pred, zero_division=0)), 4),
        "F1-Score": round(float(f1_score(y_test, y_pred, zero_division=0)), 4),
        "TrainSize": len(y_train),
        "TestSize": len(y_test),
        "PositiveRate": round(float(y_t.mean()), 4),
        **{f"param_{k}": v for k, v in hyperparams.items()},
    }

    cv_auc = evaluate_with_cv_stability(
        lambda: build_xgb_classifier(compute_scale_pos_weight(y_train), **hyperparams),
        X_train,
        y_train,
    )
    metrics["CV_ROC-AUC"] = round(cv_auc, 4)

    print(f"\n=== XGBoost | {target_col} ===")
    for key in ["Accuracy", "ROC-AUC", "Precision", "Recall", "F1-Score", "CV_ROC-AUC"]:
        print(f"  {key:12s}: {metrics[key]}")
    print(classification_report(y_test, y_pred, zero_division=0))

    uplift = run_barrier_uplift_for_target(X_t, y_t, target_col, hyperparams)
    metrics["Baseline_ROC-AUC"] = round(uplift["auc_socioeconomic_only"], 4)
    metrics["Full_ROC-AUC"] = round(uplift["auc_with_barriers"], 4)
    metrics["Barrier_Uplift"] = round(uplift["uplift"], 4)

    shap_df = run_shap_analysis(model, X_test, target_col)

    return {
        "target": target_col,
        "model": model,
        "metrics": metrics,
        "uplift": uplift,
        "shap_importance": shap_df,
        "X_test": X_test,
        "y_test": y_test,
    }


def train_all_stage2_xgboost(
    data_dir: Optional[Path] = None,
    models_dir: Optional[Path] = None,
    results_dir: Optional[Path] = None,
) -> Dict[str, Any]:
    """Train and evaluate XGBoost for all available Stage 2 targets."""
    X_full, y = load_stage2_data(data_dir=data_dir)
    results: Dict[str, Any] = {"targets": {}, "metrics_rows": []}

    for target_col in STAGE2_TARGETS:
        bundle = train_evaluate_target(X_full, y, target_col, models_dir, results_dir)
        if bundle is None:
            continue
        results["targets"][target_col] = bundle
        results["metrics_rows"].append(bundle["metrics"])

    if results["metrics_rows"]:
        results_dir = Path(results_dir or STAGE2_OUTPUT_DIR)
        results_dir.mkdir(parents=True, exist_ok=True)
        metrics_df = pd.DataFrame(results["metrics_rows"])
        metrics_path = results_dir / "xgboost_evaluation_results.csv"
        metrics_df.to_csv(metrics_path, index=False)
        logger.info("Saved evaluation metrics -> %s", metrics_path)
        results["metrics_df"] = metrics_df

    return results


def configure_logging(level: int = logging.INFO) -> None:
    logging.basicConfig(
        level=level,
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    )


if __name__ == "__main__":
    configure_logging()
    bundle = train_all_stage2_xgboost()
    print(f"Completed Stage 2 XGBoost for {len(bundle.get('targets', {}))} target(s).")
