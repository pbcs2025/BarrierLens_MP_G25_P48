from pathlib import Path

import joblib
import pandas as pd
import shap
from sklearn.model_selection import GridSearchCV

from src.preprocessing.split_scale import split_and_scale

try:
    from xgboost import XGBClassifier
except ImportError as exc:  # pragma: no cover
    raise ImportError(
        "XGBoost is required to train Stage 1 models. Install with: pip install xgboost"
    ) from exc

PROJECT_ROOT = Path(__file__).resolve().parents[2]


def train_xgboost(X_train, y_train, X_test, feature_names, target_name):
    """Train and save the Stage 1 XGBoost model for one target."""
    param_grid = {
        "n_estimators": [100, 200],
        "max_depth": [3, 4],
        "learning_rate": [0.05, 0.1],
        "reg_alpha": [0.0, 0.1],
    }

    base = XGBClassifier(
        subsample=0.8,
        colsample_bytree=0.8,
        reg_lambda=1.0,
        eval_metric="auc",
        use_label_encoder=False,
        random_state=42,
        n_jobs=-1,
    )

    grid = GridSearchCV(
        estimator=base,
        param_grid=param_grid,
        cv=5,
        scoring="roc_auc",
        n_jobs=-1,
    )
    grid.fit(X_train, y_train)

    model = grid.best_estimator_
    print(f"Best params for {target_name}: {grid.best_params_}")

    save_dir = PROJECT_ROOT / "saved_models" / "stage1"
    save_dir.mkdir(parents=True, exist_ok=True)
    model_path = save_dir / f"xgboost_{target_name}.pkl"
    joblib.dump(model, model_path)

    explainer = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(X_test)

    return model, shap_values


def train_all_stage1_xgboost_models():
    """
    Rebuild Stage 1 XGBoost models for all targets using existing preprocessing.
    """
    processed_dir = PROJECT_ROOT / "data" / "processed"
    X = pd.read_csv(processed_dir / "X_features.csv")
    y_household = pd.read_csv(processed_dir / "y_household.csv").squeeze("columns")
    y_logistic = pd.read_csv(processed_dir / "y_logistic.csv").squeeze("columns")
    y_facility = pd.read_csv(processed_dir / "y_facility.csv").squeeze("columns")
    feature_names = X.columns.tolist()

    target_map = {
        "household": y_household,
        "logistic": y_logistic,
        "facility": y_facility,
    }

    for target_name, target_values in target_map.items():
        target_col = f"target_{target_name}"
        combo = pd.concat([X, target_values.rename(target_col)], axis=1)
        X_train, X_test, y_train, _y_test, _scaler = split_and_scale(
            combo, target_col, apply_scaling=True
        )
        train_xgboost(X_train, y_train, X_test, feature_names, target_name)


if __name__ == "__main__":
    train_all_stage1_xgboost_models()
