# src/models/decision_tree.py

from sklearn.tree import DecisionTreeClassifier, export_text
from sklearn.model_selection import GridSearchCV
import joblib
import os

os.makedirs('saved_models/stage1', exist_ok=True)

def train_decision_tree(X_train, y_train, feature_names, target_name):
    param_grid = {
        'max_depth': [2, 3, 4, 5],
        'min_samples_leaf': [5, 10, 15]
    }
    base = DecisionTreeClassifier(criterion='gini', random_state=42)
    grid = GridSearchCV(base, param_grid, cv=5, scoring='roc_auc')
    grid.fit(X_train, y_train)
    model = grid.best_estimator_

    print(f'Best params for {target_name}: {grid.best_params_}')
    joblib.dump(model, f'saved_models/stage1/decision_tree_{target_name}.pkl')

    rules = export_text(model, feature_names=list(feature_names), max_depth=4)
    print(f'\n--- Decision Rules for {target_name} barrier ---')
    print(rules)
    return model

