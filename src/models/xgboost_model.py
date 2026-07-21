"""Stage 1 XGBoost training for BarrierLens barrier prediction."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

import joblib
import numpy as np
import pandas as pd

from src.preprocessing.split_scale import split_and_scale

try:
    from xgboost import XGBClassifier
except ImportError as exc:  # pragma: no cover
    raise ImportError(
        "XGBoost is required for Stage 1 models. Install with: pip install xgboost"
    ) from exc

logger = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).resolve().parents[2]
TARGET_KEYS: Tuple[str, ...] = ("household", "logistic", "facility")

XGB_HYPERPARAMETERS: Dict[str, Any] = {
    "n_estimators": 400,
    "max_depth": 6,
    "learning_rate": 0.08,
    "subsample": 0.8,
    "colsample_bytree": 0.8,
    "tree_method": "hist",
    "eval_metric": "auc",
    "random_state": 42,
    "n_jobs": -1,
}


def _target_col(target_name: str) -> str:
    """Return the canonical target column name for a barrier key."""
    return f"target_{target_name}"


def compute_scale_pos_weight(y_train: Union[pd.Series, np.ndarray]) -> float:
    """
    Compute XGBoost ``scale_pos_weight`` as negative / positive sample count.

    Parameters
    ----------
    y_train:
        Binary training labels (0 = low barrier, 1 = high barrier).

    Returns
    -------
    float
        Ratio of negative to positive samples.
    """
    y_array = np.asarray(y_train)
    negative_samples = int(np.sum(y_array == 0))
    positive_samples = int(np.sum(y_array == 1))

    if positive_samples == 0:
        raise ValueError("Cannot compute scale_pos_weight: no positive samples in y_train.")
    if negative_samples == 0:
        raise ValueError("Cannot compute scale_pos_weight: no negative samples in y_train.")

    scale_pos_weight = negative_samples / positive_samples
    logger.info(
        "Class balance — negatives: %s, positives: %s, scale_pos_weight: %.4f",
        negative_samples,
        positive_samples,
        scale_pos_weight,
    )
    return scale_pos_weight


def build_xgb_classifier(scale_pos_weight: float) -> XGBClassifier:
    """
    Instantiate ``XGBClassifier`` with Stage 1 v5 hyperparameters.

    Parameters
    ----------
    scale_pos_weight:
        Per-target imbalance weight (negatives / positives).

    Returns
    -------
    XGBClassifier
        Configured but unfitted classifier.
    """
    return XGBClassifier(
        **XGB_HYPERPARAMETERS,
        scale_pos_weight=scale_pos_weight,
    )


def train_xgboost(
    X_train: np.ndarray,
    y_train: Union[pd.Series, np.ndarray],
    target_name: str,
    save_path: Optional[Path] = None,
) -> XGBClassifier:
    """
    Train one XGBoost model for a single barrier target.

    Parameters
    ----------
    X_train:
        Scaled training feature matrix.
    y_train:
        Training labels.
    target_name:
        Barrier key (``household``, ``logistic``, or ``facility``).
    save_path:
        Optional path to persist the fitted model via joblib.

    Returns
    -------
    XGBClassifier
        Fitted model.
    """
    if target_name not in TARGET_KEYS:
        raise ValueError(f"Unknown target_name '{target_name}'. Expected one of {TARGET_KEYS}.")

    try:
        scale_pos_weight = compute_scale_pos_weight(y_train)
        model = build_xgb_classifier(scale_pos_weight)
        logger.info("Training XGBoost for target_%s ...", target_name)
        model.fit(X_train, y_train)
        logger.info("Finished training XGBoost for target_%s.", target_name)

        if save_path is not None:
            save_path = Path(save_path)
            save_path.parent.mkdir(parents=True, exist_ok=True)
            joblib.dump(model, save_path)
            logger.info("Saved model to %s", save_path)

        return model
    except Exception:
        logger.exception("Failed to train XGBoost for target_%s.", target_name)
        raise


def load_processed_data(
    processed_dir: Optional[Path] = None,
) -> Tuple[pd.DataFrame, Dict[str, pd.Series]]:
    """
    Load processed feature matrix and target vectors from CSV files.

    Parameters
    ----------
    processed_dir:
        Directory containing ``X_features.csv`` and ``y_*.csv`` files.

    Returns
    -------
    tuple
        ``(X_features, targets)`` where ``targets`` maps barrier keys to label Series.
    """
    processed_dir = Path(processed_dir or PROJECT_ROOT / "data" / "processed")
    required_files = [
        "X_features.csv",
        "y_household.csv",
        "y_logistic.csv",
        "y_facility.csv",
    ]
    for filename in required_files:
        path = processed_dir / filename
        if not path.exists():
            raise FileNotFoundError(
                f"Missing processed file: {path}. Run preprocessing first."
            )

    try:
        X = pd.read_csv(processed_dir / "X_features.csv")
        targets = {
            key: pd.read_csv(processed_dir / f"y_{key}.csv").squeeze("columns")
            for key in TARGET_KEYS
        }
        logger.info("Loaded processed data — X shape: %s", X.shape)
        return X, targets
    except Exception:
        logger.exception("Failed to load processed data from %s", processed_dir)
        raise


def split_target_data(
    X: pd.DataFrame,
    y: pd.Series,
    target_name: str,
    apply_scaling: bool = True,
) -> Dict[str, Any]:
    """
    Stratified train/test split and scaling for one target via ``split_and_scale``.

    Parameters
    ----------
    X:
        Feature DataFrame.
    y:
        Target Series.
    target_name:
        Barrier key.
    apply_scaling:
        Whether to apply ``StandardScaler`` (default True).

    Returns
    -------
    dict
        Keys: ``X_train``, ``X_test``, ``y_train``, ``y_test``, ``scaler``,
        ``target_col``, ``scale_pos_weight``.
    """
    target_col = _target_col(target_name)
    combo = pd.concat([X, y.rename(target_col)], axis=1)

    X_train, X_test, y_train, y_test, scaler = split_and_scale(
        combo,
        target_col,
        apply_scaling=apply_scaling,
    )
    scale_pos_weight = compute_scale_pos_weight(y_train)

    return {
        "X_train": X_train,
        "X_test": X_test,
        "y_train": y_train,
        "y_test": y_test,
        "scaler": scaler,
        "target_col": target_col,
        "scale_pos_weight": scale_pos_weight,
    }


def train_all_xgboost_models(
    processed_dir: Optional[Path] = None,
    models_dir: Optional[Path] = None,
) -> Dict[str, Any]:
    """
    End-to-end training for all three Stage 1 XGBoost targets.

    Parameters
    ----------
    processed_dir:
        Location of processed CSV inputs.
    models_dir:
        Directory for saved ``xgb_*.pkl`` model files.

    Returns
    -------
    dict
        ``feature_names``, ``splits``, ``models``, ``hyperparameters``,
        ``dataset_stats``, and output directory paths.
    """
    processed_dir = Path(processed_dir or PROJECT_ROOT / "data" / "processed")
    models_dir = Path(models_dir or PROJECT_ROOT / "models")
    models_dir.mkdir(parents=True, exist_ok=True)

    X, targets = load_processed_data(processed_dir)
    feature_names: List[str] = X.columns.tolist()

    splits: Dict[str, Dict[str, Any]] = {}
    models: Dict[str, XGBClassifier] = {}

    dataset_stats: Dict[str, Any] = {
        "n_samples": len(X),
        "n_features": X.shape[1],
        "targets": {},
    }

    for target_name in TARGET_KEYS:
        split_data = split_target_data(X, targets[target_name], target_name)
        splits[target_name] = split_data

        y_full = targets[target_name]
        neg = int((y_full == 0).sum())
        pos = int((y_full == 1).sum())
        dataset_stats["targets"][target_name] = {
            "negative": neg,
            "positive": pos,
            "positive_rate": round(pos / len(y_full), 4),
            "scale_pos_weight": split_data["scale_pos_weight"],
            "train_size": len(split_data["y_train"]),
            "test_size": len(split_data["y_test"]),
        }

        model_path = models_dir / f"xgb_{target_name}.pkl"
        models[target_name] = train_xgboost(
            split_data["X_train"],
            split_data["y_train"],
            target_name,
            save_path=model_path,
        )

    return {
        "feature_names": feature_names,
        "splits": splits,
        "models": models,
        "hyperparameters": dict(XGB_HYPERPARAMETERS),
        "dataset_stats": dataset_stats,
        "models_dir": models_dir,
        "processed_dir": processed_dir,
    }


def configure_logging(level: int = logging.INFO) -> None:
    """Configure root logging for CLI and notebook use."""
    logging.basicConfig(
        level=level,
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    )


if __name__ == "__main__":
    configure_logging()
    from src.results.xgboost_results import save_all_xgboost_outputs

    training_bundle = train_all_xgboost_models()
    save_all_xgboost_outputs(training_bundle)
    logger.info("XGBoost Stage 1 pipeline completed successfully.")
