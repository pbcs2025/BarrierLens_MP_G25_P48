"""Train Stage-1 logistic regression for all three targets and save metrics."""

from __future__ import annotations

from pathlib import Path
import sys

import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.models.logistic_regression import train_logistic
from src.preprocessing.split_scale import split_and_scale


def evaluate_binary(model, X_test, y_test):
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]
    return {
        "Accuracy": round(accuracy_score(y_test, y_pred), 4),
        "ROC-AUC": round(roc_auc_score(y_test, y_prob), 4),
        "Precision": round(precision_score(y_test, y_pred), 4),
        "Recall": round(recall_score(y_test, y_pred), 4),
        "F1-Score": round(f1_score(y_test, y_pred), 4),
    }


CV_SAMPLE_SIZE = 100_000


def train_one_target(X_df, y, target_name):
    combo = pd.concat([X_df, y.rename(f"target_{target_name}")], axis=1)
    X_train, X_test, y_train, y_test, _ = split_and_scale(combo, f"target_{target_name}")
    feature_names = X_df.columns.tolist()

    model, _ = train_logistic(X_train, y_train, feature_names, target_name)
    metrics = evaluate_binary(model, X_test, y_test)

    if len(y) > CV_SAMPLE_SIZE:
        X_cv, _, y_cv, _ = train_test_split(
            X_df,
            y,
            train_size=CV_SAMPLE_SIZE,
            stratify=y,
            random_state=42,
        )
        print(f"{target_name} — 5-fold CV on {len(y_cv):,}-row stratified subsample")
    else:
        X_cv, y_cv = X_df, y

    cv_model = LogisticRegression(
        solver="lbfgs",
        max_iter=1000,
        class_weight="balanced",
        random_state=42,
        C=model.C,
    )
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_scores = cross_val_score(cv_model, X_cv, y_cv, cv=cv, scoring="roc_auc")

    return model, metrics, cv_scores


def main() -> None:
    processed = PROJECT_ROOT / "data" / "processed"
    X = pd.read_csv(processed / "X_features.csv")
    targets = {
        "household": pd.read_csv(processed / "y_household.csv").squeeze("columns"),
        "logistic": pd.read_csv(processed / "y_logistic.csv").squeeze("columns"),
        "facility": pd.read_csv(processed / "y_facility.csv").squeeze("columns"),
    }

    print("X shape:", X.shape)

    results = []
    for target_name, y in targets.items():
        print(f"\n=== {target_name.upper()} ===")
        _, holdout_metrics, cv_scores = train_one_target(X, y, target_name)
        row = {
            "Model": "Logistic Regression",
            "Target": target_name,
            **holdout_metrics,
            "CV AUC Mean": round(cv_scores.mean(), 4),
            "CV AUC Std": round(cv_scores.std(), 4),
        }
        results.append(row)
        print(row)

    results_df = pd.DataFrame(results)
    out_dir = PROJECT_ROOT / "outputs" / "stage1_results"
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "logistic_results.csv"
    results_df.to_csv(out_path, index=False)
    print("\nSaved:", out_path)
    print(results_df.to_string(index=False))


if __name__ == "__main__":
    main()
