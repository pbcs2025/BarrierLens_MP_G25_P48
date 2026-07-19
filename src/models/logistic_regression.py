from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import GridSearchCV, train_test_split

PROJECT_ROOT = Path(__file__).resolve().parents[2]


def train_logistic(
    X_train,
    y_train,
    feature_names,
    target_name,
    save_dir="saved_models/stage1",
    tune_sample_size=50_000,
):
    """Train Logistic Regression with C tuning and save model."""
    param_grid = {"C": [0.1, 1.0, 10.0, 100.0]}
    base = LogisticRegression(
        solver="lbfgs",
        max_iter=1000,
        class_weight="balanced",
        random_state=42,
    )

    if tune_sample_size and len(y_train) > tune_sample_size:
        X_tune, _, y_tune, _ = train_test_split(
            X_train,
            y_train,
            train_size=tune_sample_size,
            stratify=y_train,
            random_state=42,
        )
        print(f"{target_name} — GridSearchCV on {len(y_tune):,}-row stratified subsample")
    else:
        X_tune, y_tune = X_train, y_train

    grid = GridSearchCV(base, param_grid, cv=5, scoring="roc_auc", n_jobs=-1)
    grid.fit(X_tune, y_tune)

    best_c = grid.best_params_["C"]
    model = LogisticRegression(
        solver="lbfgs",
        max_iter=1000,
        class_weight="balanced",
        random_state=42,
        C=best_c,
    )
    model.fit(X_train, y_train)
    print(f"Best C for {target_name}: {grid.best_params_} (refit on full train set)")

    save_path = Path(save_dir)
    if not save_path.is_absolute():
        save_path = PROJECT_ROOT / save_path
    save_path.mkdir(parents=True, exist_ok=True)
    model_path = save_path / f"logistic_regression_{target_name}.pkl"
    joblib.dump(model, model_path)

    coefs = pd.DataFrame(
        {
            "Feature": feature_names,
            "Coefficient": model.coef_[0],
            "OddsRatio": np.exp(model.coef_[0]),
        }
    )
    print(coefs.sort_values("OddsRatio", ascending=False).head(10))

    return model, coefs
