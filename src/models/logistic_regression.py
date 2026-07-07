from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import GridSearchCV

PROJECT_ROOT = Path(__file__).resolve().parents[2]


def train_logistic(
    X_train, y_train, feature_names, target_name, save_dir="saved_models/stage1"
):
    """Train Logistic Regression with C tuning and save model."""
    param_grid = {"C": [0.01, 0.1, 1.0, 10.0]}
    base = LogisticRegression(solver="saga", max_iter=3000, 
                          class_weight="balanced", random_state=42, n_jobs=-1)
    grid = GridSearchCV(base, param_grid, cv=5, scoring="roc_auc")
    grid.fit(X_train, y_train)

    model = grid.best_estimator_
    print(f"Best C for {target_name}: {grid.best_params_}")

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
