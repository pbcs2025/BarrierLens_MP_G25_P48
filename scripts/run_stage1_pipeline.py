"""Run Stage-1 preprocessing and train all 12 classifiers; print train/test accuracy."""

from __future__ import annotations

from pathlib import Path
import sys

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
from sklearn.model_selection import GridSearchCV
from sklearn.tree import DecisionTreeClassifier

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.preprocessing.clean import handle_missing
from src.preprocessing.encode import encode_features
from src.preprocessing.engineer_features import engineer_features
from src.preprocessing.load_data import FEATURE_COLS, load_stage1_data
from src.preprocessing.split_scale import split_and_scale
from src.preprocessing.target_builder import build_targets
from src.models.logistic_regression import train_logistic
from src.models.decision_tree import train_decision_tree

try:
    from xgboost import XGBClassifier
except ImportError as exc:
    raise ImportError("Install xgboost: pip install xgboost") from exc

TARGET_KEYS = ("household", "logistic", "facility")


def run_preprocessing() -> pd.DataFrame:
    df = load_stage1_data()
    df = handle_missing(df)
    df = build_targets(df)
    df = engineer_features(df)
    encoded = encode_features(df)

    processed_dir = PROJECT_ROOT / "data" / "processed"
    processed_dir.mkdir(parents=True, exist_ok=True)

    target_cols = [c for c in df.columns if c.startswith("target_")]
    X_full = encoded.copy()
    X_full.to_csv(processed_dir / "X_features.csv", index=False)
    for t in target_cols:
        df[t].to_csv(processed_dir / f"y_{t.replace('target_', '')}.csv", index=False)

    print("Saved processed files to:", processed_dir)
    print("X_features shape:", X_full.shape)
    print("Feature columns (first 10):", list(X_full.columns[:10]), "...")
    return pd.concat([X_full, df[target_cols]], axis=1)


def train_all_models(df: pd.DataFrame) -> pd.DataFrame:
    target_cols = [c for c in df.columns if c.startswith("target_")]
    X = df[[c for c in df.columns if c not in target_cols]]
    feature_names = X.columns.tolist()
    model_dir = PROJECT_ROOT / "saved_models" / "stage1"
    model_dir.mkdir(parents=True, exist_ok=True)

    rows = []
    for key in TARGET_KEYS:
        col = f"target_{key}"
        y = df[col]
        combo = pd.concat([X, y.rename(col)], axis=1)
        X_train, X_test, y_train, y_test, _ = split_and_scale(combo, col, apply_scaling=True)

        models = {}

        lr, _ = train_logistic(X_train, y_train, feature_names, key, save_dir=str(model_dir))
        models["Logistic Regression"] = lr

        dt = train_decision_tree(X_train, y_train, feature_names, key)
        models["Decision Tree"] = dt

        rf = RandomForestClassifier(
            n_estimators=100,
            max_depth=12,
            min_samples_leaf=20,
            random_state=42,
            n_jobs=-1,
        )
        rf.fit(X_train, y_train)
        joblib.dump(rf, model_dir / f"random_forest_{key}.pkl")
        models["Random Forest"] = rf

        xgb = XGBClassifier(
            n_estimators=100,
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
        models["XGBoost"] = xgb

        for name, model in models.items():
            train_acc = accuracy_score(y_train, model.predict(X_train))
            test_acc = accuracy_score(y_test, model.predict(X_test))
            rows.append(
                {
                    "Model": name,
                    "Target": key,
                    "Train Accuracy": round(train_acc, 4),
                    "Test Accuracy": round(test_acc, 4),
                }
            )
            print(f"{name} | {key}: train={train_acc:.4f} test={test_acc:.4f}")

    results = pd.DataFrame(rows)
    out_dir = PROJECT_ROOT / "outputs" / "stage1_results"
    out_dir.mkdir(parents=True, exist_ok=True)
    results.to_csv(out_dir / "train_test_accuracy.csv", index=False)
    return results


def main() -> None:
    df = run_preprocessing()
    results = train_all_models(df)
    print("\n=== Summary ===")
    print(results.to_string(index=False))


if __name__ == "__main__":
    main()
