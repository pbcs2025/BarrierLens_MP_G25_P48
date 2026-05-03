"""Train and persist all 12 Stage-1 classifiers (same split_and_scale as comparison notebook)."""

from __future__ import annotations

from pathlib import Path

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier

from src.models.decision_tree import train_decision_tree
from src.models.logistic_regression import train_logistic
from src.preprocessing.split_scale import split_and_scale

try:
    from xgboost import XGBClassifier
except ImportError as exc:  # pragma: no cover
    raise ImportError(
        "XGBoost is required to build xgboost_*.pkl. Install with: pip install xgboost"
    ) from exc

TARGET_KEYS = ("household", "logistic", "facility")


def _target_col(key: str) -> str:
    return f"target_{key}"


def build_all_stage1_models(project_root: Path | str) -> None:
    """
    For each barrier target: stratified 80/20 split + StandardScaler (fit on train only),
    then fit Logistic Regression, Decision Tree, Random Forest, and XGBoost and save under
    ``<project_root>/saved_models/stage1/``.
    """
    project_root = Path(project_root).resolve()
    processed = project_root / "data" / "processed"
    model_dir = project_root / "saved_models" / "stage1"
    model_dir.mkdir(parents=True, exist_ok=True)

    X = pd.read_csv(processed / "X_features.csv")
    y_map = {
        "household": pd.read_csv(processed / "y_household.csv").squeeze("columns"),
        "logistic": pd.read_csv(processed / "y_logistic.csv").squeeze("columns"),
        "facility": pd.read_csv(processed / "y_facility.csv").squeeze("columns"),
    }
    feature_names = X.columns.tolist()

    for key in TARGET_KEYS:
        col = _target_col(key)
        combo = pd.concat([X, y_map[key].rename(col)], axis=1)
        X_train, _X_test, y_train, _y_test, _scaler = split_and_scale(
            combo, col, apply_scaling=True
        )

        train_logistic(X_train, y_train, feature_names, key, save_dir=str(model_dir))
        train_decision_tree(X_train, y_train, feature_names, key)

        rf = RandomForestClassifier(
            n_estimators=200,
            max_depth=10,
            random_state=42,
            n_jobs=-1,
        )
        rf.fit(X_train, y_train)
        joblib.dump(rf, model_dir / f"random_forest_{key}.pkl")

        xgb = XGBClassifier(
            n_estimators=200,
            max_depth=6,
            learning_rate=0.1,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=42,
            n_jobs=-1,
            eval_metric="logloss",
        )
        xgb.fit(X_train, y_train)
        joblib.dump(xgb, model_dir / f"xgboost_{key}.pkl")

        print(f"Saved all four model types for target={key} -> {model_dir}")
