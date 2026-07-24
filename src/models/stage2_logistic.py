# src/models/stage2_logistic.py
#
# Owner: PBC
# Two separate LogisticRegression models (one per Stage 2 target) on each
# target's restricted sample — not MultiOutputClassifier (Guide Section 6.2).

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Tuple

import joblib
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.preprocessing import StandardScaler

from src.evaluation.stage2_metrics import compute_barrier_uplift, evaluate_model
from src.models.stage2_xgboost import (
    STAGE2_TARGETS,
    TARGET_DISPLAY,
    filter_target_sample,
    load_stage2_data,
    split_feature_sets,
)
from src.preprocessing.stage2_integration import _sanitize_feature_names

logger = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).resolve().parents[2]
STAGE2_OUTPUT_DIR = PROJECT_ROOT / "outputs" / "stage2_results"
STAGE2_MODELS_DIR = PROJECT_ROOT / "saved_models" / "stage2"


def train_stage2_logistic(
    X_train: np.ndarray,
    y_train: pd.Series,
    feature_names: List[str],
    target_name: str,
    save_dir: Optional[Path] = None,
) -> Tuple[LogisticRegression, pd.DataFrame]:
    """Train one balanced LR model; save model + scaler bundle and print top odds ratios."""
    model = LogisticRegression(
        solver="lbfgs",
        max_iter=1000,
        C=1.0,
        class_weight="balanced",
        random_state=42,
    )
    model.fit(X_train, y_train)

    save_dir = Path(save_dir or STAGE2_MODELS_DIR)
    save_dir.mkdir(parents=True, exist_ok=True)

    coefs = pd.DataFrame(
        {
            "Feature": feature_names,
            "Coefficient": model.coef_[0],
            "OddsRatio": np.exp(model.coef_[0]),
        }
    ).sort_values("OddsRatio", ascending=False)

    print(f"--- Top predictors for {target_name} ---")
    print(coefs.head(10).to_string(index=False))

    return model, coefs


def evaluate_stage2_logistic(
    model: LogisticRegression,
    X_test: np.ndarray,
    y_test: pd.Series,
    target_name: str,
) -> Dict[str, Any]:
    """Hold-out metrics for one fitted Stage 2 logistic model."""
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]
    return {
        **evaluate_model(model, X_test, y_test, "Logistic Regression", target_name),
        "Accuracy": round(float(accuracy_score(y_test, y_pred)), 4),
        "ROC-AUC": round(float(roc_auc_score(y_test, y_prob)), 4),
        "Precision": round(float(precision_score(y_test, y_pred, zero_division=0)), 4),
        "Recall": round(float(recall_score(y_test, y_pred, zero_division=0)), 4),
        "F1-Score": round(float(f1_score(y_test, y_pred, zero_division=0)), 4),
    }


def run_barrier_uplift_for_target(
    X: pd.DataFrame,
    y: pd.Series,
    target_name: str,
    cv_folds: int = 3,
) -> Dict[str, Any]:
    """Compare socioeconomic-only vs full feature ROC-AUC via 3-fold CV."""
    socio_cols, full_cols = split_feature_sets(X.columns.tolist())
    X_socio = _sanitize_feature_names(X[socio_cols])
    X_full = _sanitize_feature_names(X[full_cols])

    def model_fn() -> LogisticRegression:
        return LogisticRegression(
            solver="lbfgs",
            max_iter=1000,
            class_weight="balanced",
            random_state=42,
        )

    cv = StratifiedKFold(n_splits=cv_folds, shuffle=True, random_state=42)
    return compute_barrier_uplift(model_fn, X_socio, X_full, y, target_name, cv)


def train_evaluate_target(
    X_full: pd.DataFrame,
    y: pd.DataFrame,
    target_col: str,
    models_dir: Optional[Path] = None,
    results_dir: Optional[Path] = None,
) -> Optional[Dict[str, Any]]:
    """End-to-end train, evaluate, and barrier-uplift for one Stage 2 target."""
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
    _, full_cols = split_feature_sets(X_t.columns.tolist())
    X_model = X_t[full_cols]

    X_train, X_test, y_train, y_test = train_test_split(
        X_model,
        y_t,
        test_size=0.20,
        random_state=42,
        stratify=y_t,
    )

    scaler = StandardScaler()
    X_tr_scaled = scaler.fit_transform(X_train)
    X_te_scaled = scaler.transform(X_test)

    model, coefs = train_stage2_logistic(
        X_tr_scaled,
        y_train,
        full_cols,
        target_col,
        save_dir=models_dir,
    )
    joblib.dump(
        {"model": model, "scaler": scaler, "feature_names": full_cols},
        models_dir / f"stage2_logistic_{target_col}.pkl",
    )

    y_pred = model.predict(X_te_scaled)
    metrics = evaluate_stage2_logistic(model, X_te_scaled, y_test, target_col)
    metrics.update(
        {
            "Target": target_col,
            "TrainSize": len(y_train),
            "TestSize": len(y_test),
            "PositiveRate": round(float(y_t.mean()), 4),
        }
    )

    cv = StratifiedKFold(n_splits=3, shuffle=True, random_state=42)
    cv_scores = cross_val_score(
        LogisticRegression(
            solver="lbfgs",
            max_iter=1000,
            class_weight="balanced",
            random_state=42,
        ),
        scaler.fit_transform(X_model),
        y_t,
        cv=cv,
        scoring="roc_auc",
        n_jobs=-1,
    )
    metrics["CV_ROC-AUC"] = round(float(cv_scores.mean()), 4)

    print(f"\n=== Logistic Regression | {TARGET_DISPLAY.get(target_col, target_col)} ===")
    for key in ["Accuracy", "ROC-AUC", "Precision", "Recall", "F1-Score", "CV_ROC-AUC"]:
        print(f"  {key:12s}: {metrics[key]}")
    print(classification_report(y_test, y_pred, zero_division=0))

    uplift = run_barrier_uplift_for_target(X_t, y_t, target_col)
    metrics["Baseline_ROC-AUC"] = round(uplift["auc_socioeconomic_only"], 4)
    metrics["Full_ROC-AUC"] = round(uplift["auc_with_barriers"], 4)
    metrics["Barrier_Uplift"] = round(uplift["uplift"], 4)

    coefs.to_csv(results_dir / f"logistic_coefficients_{target_col}.csv", index=False)

    return {
        "target": target_col,
        "model": model,
        "scaler": scaler,
        "metrics": metrics,
        "coefficients": coefs,
        "uplift": uplift,
    }


def train_all_stage2_logistic(
    data_dir: Optional[Path] = None,
    models_dir: Optional[Path] = None,
    results_dir: Optional[Path] = None,
) -> Dict[str, Any]:
    """Train and evaluate logistic regression for all available Stage 2 targets."""
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
        metrics_df = pd.DataFrame(results["metrics_rows"])
        metrics_path = results_dir / "logistic_evaluation_results.csv"
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
    bundle = train_all_stage2_logistic()
    print(f"Completed Stage 2 Logistic Regression for {len(bundle.get('targets', {}))} target(s).")
