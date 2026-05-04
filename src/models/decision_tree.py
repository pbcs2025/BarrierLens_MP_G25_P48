# src/models/decision_tree.py

from pathlib import Path

import joblib
from sklearn.model_selection import GridSearchCV
from sklearn.tree import DecisionTreeClassifier, export_text

PROJECT_ROOT = Path(__file__).resolve().parents[2]


def train_decision_tree(X_train, y_train, feature_names, target_name):
    param_grid = {
        'max_depth': [2, 3, 4, 5],
        'min_samples_leaf': [5, 10, 15]
    }
    base = DecisionTreeClassifier(criterion='gini', random_state=42)
    grid = GridSearchCV(base, param_grid, cv=5, scoring='roc_auc')
    grid.fit(X_train, y_train)
    model = grid.best_estimator_

    print(f"Best params for {target_name}: {grid.best_params_}")
    save_dir = PROJECT_ROOT / "saved_models" / "stage1"
    save_dir.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, save_dir / f"decision_tree_{target_name}.pkl")

    rules = export_text(model, feature_names=list(feature_names), max_depth=4)
    print(f'\n--- Decision Rules for {target_name} barrier ---')
    print(rules)
    return model

