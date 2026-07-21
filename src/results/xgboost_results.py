"""Evaluation, plotting, persistence, and reporting for Stage 1 XGBoost models."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

import joblib
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
    roc_curve,
)

from src.evaluation.feature_labels import TARGET_DISPLAY, to_display_name
from src.models.xgboost_model import TARGET_KEYS, XGB_HYPERPARAMETERS

logger = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).resolve().parents[2]
MODEL_NAME = "XGBoost"
TOP_N_FEATURES = 20


def ensure_output_dirs(
    models_dir: Optional[Path] = None,
    results_dir: Optional[Path] = None,
    plots_dir: Optional[Path] = None,
) -> Dict[str, Path]:
    """
    Create ``models/``, ``results/``, and ``plots/`` if they do not exist.

    Returns
    -------
    dict
        Resolved directory paths.
    """
    paths = {
        "models_dir": Path(models_dir or PROJECT_ROOT / "models"),
        "results_dir": Path(results_dir or PROJECT_ROOT / "results"),
        "plots_dir": Path(plots_dir or PROJECT_ROOT / "plots"),
    }
    for path in paths.values():
        path.mkdir(parents=True, exist_ok=True)
    return paths


def evaluate_xgboost_model(
    model: Any,
    X_test: np.ndarray,
    y_test: Union[pd.Series, np.ndarray],
    target_name: str,
) -> Dict[str, Any]:
    """
    Compute hold-out evaluation metrics for one fitted XGBoost model.

    Parameters
    ----------
    model:
        Fitted ``XGBClassifier``.
    X_test:
        Scaled test features.
    y_test:
        Test labels.
    target_name:
        Barrier key.

    Returns
    -------
    dict
        Metrics, predictions, probabilities, confusion matrix, and report text.
    """
    try:
        y_pred = model.predict(X_test)
        y_prob = model.predict_proba(X_test)[:, 1]

        metrics = {
            "Model": MODEL_NAME,
            "Target": target_name,
            "Accuracy": round(float(accuracy_score(y_test, y_pred)), 4),
            "Precision": round(float(precision_score(y_test, y_pred, zero_division=0)), 4),
            "Recall": round(float(recall_score(y_test, y_pred, zero_division=0)), 4),
            "F1-Score": round(float(f1_score(y_test, y_pred, zero_division=0)), 4),
            "ROC-AUC": round(float(roc_auc_score(y_test, y_prob)), 4),
        }
        cm = confusion_matrix(y_test, y_pred)
        report = classification_report(y_test, y_pred, zero_division=0)

        logger.info(
            "%s | %s — Accuracy: %.4f, ROC-AUC: %.4f, F1: %.4f",
            MODEL_NAME,
            target_name,
            metrics["Accuracy"],
            metrics["ROC-AUC"],
            metrics["F1-Score"],
        )

        return {
            "metrics": metrics,
            "y_pred": y_pred,
            "y_prob": y_prob,
            "confusion_matrix": cm,
            "classification_report": report,
        }
    except Exception:
        logger.exception("Evaluation failed for target_%s.", target_name)
        raise


def save_predictions(
    y_test: Union[pd.Series, np.ndarray],
    y_pred: np.ndarray,
    y_prob: np.ndarray,
    target_name: str,
    results_dir: Path,
) -> Path:
    """Save test-set predictions to ``results/xgb_predictions_{target}.csv``."""
    output_path = results_dir / f"xgb_predictions_{target_name}.csv"
    predictions_df = pd.DataFrame(
        {
            "actual": np.asarray(y_test),
            "predicted": np.asarray(y_pred),
            "probability": np.asarray(y_prob),
        }
    )
    predictions_df.to_csv(output_path, index=False)
    logger.info("Saved predictions to %s", output_path)
    return output_path


def save_metrics_csv(metrics_rows: List[Dict[str, Any]], results_dir: Path) -> Path:
    """Persist combined metrics to ``results/xgb_metrics.csv``."""
    output_path = results_dir / "xgb_metrics.csv"
    pd.DataFrame(metrics_rows).to_csv(output_path, index=False)
    logger.info("Saved metrics to %s", output_path)
    return output_path


def plot_roc_curve(
    y_test: Union[pd.Series, np.ndarray],
    y_prob: np.ndarray,
    target_name: str,
    plots_dir: Path,
) -> Path:
    """Generate and save ROC curve plot."""
    fpr, tpr, _ = roc_curve(y_test, y_prob)
    roc_auc = roc_auc_score(y_test, y_prob)

    plt.figure(figsize=(8, 6))
    plt.plot(fpr, tpr, label=f"{MODEL_NAME} (AUC = {roc_auc:.4f})")
    plt.plot([0, 1], [0, 1], "k--", label="Random baseline")
    plt.xlabel("False Positive Rate")
    plt.ylabel("True Positive Rate")
    plt.title(f"ROC Curve — {MODEL_NAME} | {TARGET_DISPLAY.get(target_name, target_name)}")
    plt.legend(loc="lower right")
    plt.tight_layout()

    output_path = plots_dir / f"xgb_{target_name}_roc.png"
    plt.savefig(output_path, dpi=150, bbox_inches="tight")
    plt.close()
    logger.info("Saved ROC plot to %s", output_path)
    return output_path


def plot_confusion_matrix_heatmap(
    confusion_mat: np.ndarray,
    target_name: str,
    plots_dir: Path,
) -> Path:
    """Generate and save confusion matrix heatmap."""
    plt.figure(figsize=(6, 5))
    sns.heatmap(
        confusion_mat,
        annot=True,
        fmt="d",
        cmap="Blues",
        xticklabels=["Low Barrier", "High Barrier"],
        yticklabels=["Low Barrier", "High Barrier"],
    )
    plt.title(f"Confusion Matrix — {MODEL_NAME} | {TARGET_DISPLAY.get(target_name, target_name)}")
    plt.ylabel("Actual")
    plt.xlabel("Predicted")
    plt.tight_layout()

    output_path = plots_dir / f"xgb_{target_name}_confusion.png"
    plt.savefig(output_path, dpi=150, bbox_inches="tight")
    plt.close()
    logger.info("Saved confusion matrix plot to %s", output_path)
    return output_path


def plot_feature_importance(
    model: Any,
    feature_names: List[str],
    target_name: str,
    plots_dir: Path,
    top_n: int = TOP_N_FEATURES,
) -> pd.DataFrame:
    """
    Plot top-N feature importances and return the ranked importance table.

    Returns
    -------
    pd.DataFrame
        Columns: ``feature``, ``display_name``, ``importance``.
    """
    importances = model.feature_importances_
    importance_df = pd.DataFrame(
        {
            "feature": feature_names,
            "display_name": [to_display_name(name) for name in feature_names],
            "importance": importances,
        }
    ).sort_values("importance", ascending=False)

    top_df = importance_df.head(top_n).sort_values("importance", ascending=True)

    plt.figure(figsize=(10, 8))
    plt.barh(top_df["display_name"], top_df["importance"], color="#2a6f97")
    plt.xlabel("Feature Importance (Gain)")
    plt.title(
        f"Top {top_n} Feature Importance — {MODEL_NAME} | "
        f"{TARGET_DISPLAY.get(target_name, target_name)}"
    )
    plt.tight_layout()

    output_path = plots_dir / f"xgb_{target_name}_importance.png"
    plt.savefig(output_path, dpi=150, bbox_inches="tight")
    plt.close()
    logger.info("Saved feature importance plot to %s", output_path)
    return importance_df


def _format_metrics_table(metrics_df: pd.DataFrame) -> str:
    """Render metrics as a markdown table."""
    display_df = metrics_df.copy()
    display_df["Target"] = display_df["Target"].map(
        lambda key: TARGET_DISPLAY.get(key, key)
    )
    headers = list(display_df.columns)
    lines = [
        "| " + " | ".join(headers) + " |",
        "| " + " | ".join(["---"] * len(headers)) + " |",
    ]
    for _, row in display_df.iterrows():
        lines.append("| " + " | ".join(str(row[col]) for col in headers) + " |")
    return "\n".join(lines)


def generate_xgboost_report(
    metrics_df: pd.DataFrame,
    dataset_stats: Dict[str, Any],
    importance_by_target: Dict[str, pd.DataFrame],
    hyperparameters: Optional[Dict[str, Any]] = None,
    results_dir: Optional[Path] = None,
) -> Path:
    """
    Write ``results/xgboost_report.md`` for the comparison notebook.

    Parameters
    ----------
    metrics_df:
        Combined evaluation metrics for all targets.
    dataset_stats:
        Dataset size and class balance statistics.
    importance_by_target:
        Feature importance DataFrames keyed by target name.
    hyperparameters:
        Model hyperparameter dictionary.
    results_dir:
        Output directory for the markdown report.

    Returns
    -------
    Path
        Path to the written report file.
    """
    results_dir = Path(results_dir or PROJECT_ROOT / "results")
    results_dir.mkdir(parents=True, exist_ok=True)
    hyperparameters = hyperparameters or dict(XGB_HYPERPARAMETERS)

    best_row = metrics_df.sort_values("ROC-AUC", ascending=False).iloc[0]
    best_target = best_row["Target"]
    best_auc = best_row["ROC-AUC"]

    balance_lines = []
    for target_name in TARGET_KEYS:
        stats = dataset_stats["targets"][target_name]
        balance_lines.append(
            f"- **{TARGET_DISPLAY[target_name]}**: "
            f"{stats['negative']:,} low-barrier / {stats['positive']:,} high-barrier "
            f"(positive rate {stats['positive_rate']:.2%}, "
            f"scale_pos_weight = {stats['scale_pos_weight']:.4f})"
        )

    importance_sections = []
    for target_name in TARGET_KEYS:
        top_features = importance_by_target[target_name].head(10)
        feature_lines = "\n".join(
            f"  {idx}. {row.display_name} ({row.importance:.4f})"
            for idx, row in enumerate(top_features.itertuples(), start=1)
        )
        importance_sections.append(
            f"### {TARGET_DISPLAY[target_name].title()}\n{feature_lines}"
        )

    hyperparam_lines = "\n".join(
        f"- `{key}`: {value}" for key, value in hyperparameters.items()
    )
    hyperparam_lines += "\n- `scale_pos_weight`: computed per target (negatives / positives)"

    report = f"""# Stage 1 XGBoost Report — BarrierLens (P48)

## Hyperparameters

{hyperparam_lines}

## Dataset Statistics

- **Total samples**: {dataset_stats['n_samples']:,}
- **Features**: {dataset_stats['n_features']}
- **Train/test split**: 80/20 stratified (via `split_and_scale`)
- **Scaling**: StandardScaler fit on training fold only

## Class Balance

{chr(10).join(balance_lines)}

## Evaluation Metrics (Hold-out Test Set)

{_format_metrics_table(metrics_df)}

## Best Performing Target

**{TARGET_DISPLAY.get(best_target, best_target)}** achieved the highest ROC-AUC (**{best_auc:.4f}**),
making it the strongest barrier prediction task among the three Stage 1 targets for XGBoost.

## Top Important Features

{chr(10).join(importance_sections)}

## Observations

- XGBoost uses histogram-based training (`tree_method='hist'`) for tractable fit on large NFHS-5 samples.
- Per-target `scale_pos_weight` addresses restored class imbalance without SMOTE.
- Household barriers are typically the most separable target; facility barriers are often the hardest.
- Feature importances highlight socioeconomic, media exposure, and autonomy-related predictors.

## Limitations

- Hold-out metrics reflect a single stratified split; they do not capture temporal or geographic drift.
- Feature importances indicate association, not causal effects on healthcare access.
- Models are trained on proxy-derived binary targets rather than direct barrier survey responses for all women.

## Future Improvements

- Add stratified k-fold cross-validation for stability intervals on ROC-AUC.
- Tune `n_estimators` and `max_depth` with a stratified subsample via `sample_for_speed`.
- Integrate SHAP values for local explainability alongside global gain importances.
- Compare calibrated probabilities against logistic regression AORs for policy interpretability.
"""

    output_path = results_dir / "xgboost_report.md"
    output_path.write_text(report, encoding="utf-8")
    logger.info("Saved report to %s", output_path)
    return output_path


def save_all_xgboost_outputs(
    training_bundle: Dict[str, Any],
    results_dir: Optional[Path] = None,
    plots_dir: Optional[Path] = None,
) -> pd.DataFrame:
    """
    Evaluate all trained models and persist metrics, predictions, plots, and report.

    Parameters
    ----------
    training_bundle:
        Output dictionary from ``train_all_xgboost_models``.
    results_dir:
        Directory for CSV and markdown outputs.
    plots_dir:
        Directory for PNG plots.

    Returns
    -------
    pd.DataFrame
        Combined metrics for all targets.
    """
    dirs = ensure_output_dirs(
        models_dir=training_bundle.get("models_dir"),
        results_dir=results_dir,
        plots_dir=plots_dir,
    )
    results_dir = dirs["results_dir"]
    plots_dir = dirs["plots_dir"]

    feature_names: List[str] = training_bundle["feature_names"]
    splits: Dict[str, Dict[str, Any]] = training_bundle["splits"]
    models: Dict[str, Any] = training_bundle["models"]

    metrics_rows: List[Dict[str, Any]] = []
    importance_by_target: Dict[str, pd.DataFrame] = {}
    evaluation_details: Dict[str, Dict[str, Any]] = {}

    for target_name in TARGET_KEYS:
        split_data = splits[target_name]
        model = models[target_name]
        eval_result = evaluate_xgboost_model(
            model,
            split_data["X_test"],
            split_data["y_test"],
            target_name,
        )
        evaluation_details[target_name] = eval_result
        metrics_rows.append(eval_result["metrics"])

        save_predictions(
            split_data["y_test"],
            eval_result["y_pred"],
            eval_result["y_prob"],
            target_name,
            results_dir,
        )
        plot_roc_curve(
            split_data["y_test"],
            eval_result["y_prob"],
            target_name,
            plots_dir,
        )
        plot_confusion_matrix_heatmap(
            eval_result["confusion_matrix"],
            target_name,
            plots_dir,
        )
        importance_by_target[target_name] = plot_feature_importance(
            model,
            feature_names,
            target_name,
            plots_dir,
        )

    metrics_df = pd.DataFrame(metrics_rows)
    save_metrics_csv(metrics_rows, results_dir)
    generate_xgboost_report(
        metrics_df=metrics_df,
        dataset_stats=training_bundle["dataset_stats"],
        importance_by_target=importance_by_target,
        hyperparameters=training_bundle.get("hyperparameters"),
        results_dir=results_dir,
    )

    training_bundle["metrics_df"] = metrics_df
    training_bundle["evaluation_details"] = evaluation_details
    training_bundle["importance_by_target"] = importance_by_target
    training_bundle["results_dir"] = results_dir
    training_bundle["plots_dir"] = plots_dir

    return metrics_df


def load_saved_models(models_dir: Optional[Path] = None) -> Dict[str, Any]:
    """Load persisted ``xgb_*.pkl`` models from the models directory."""
    models_dir = Path(models_dir or PROJECT_ROOT / "models")
    models: Dict[str, Any] = {}
    for target_name in TARGET_KEYS:
        model_path = models_dir / f"xgb_{target_name}.pkl"
        if not model_path.exists():
            raise FileNotFoundError(f"Missing saved model: {model_path}")
        models[target_name] = joblib.load(model_path)
    return models
