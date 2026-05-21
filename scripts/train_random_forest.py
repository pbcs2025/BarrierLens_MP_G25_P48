"""Preprocess NFHS5_Individual.csv (if needed) and train Random Forest for all three targets."""

from __future__ import annotations

from pathlib import Path
import sys

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, roc_auc_score

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.preprocessing.clean import handle_missing
from src.preprocessing.encode import encode_features
from src.preprocessing.engineer_features import engineer_features
from src.preprocessing.load_data import RAW_PATH, load_stage1_data
from src.preprocessing.split_scale import split_and_scale
from src.preprocessing.target_builder import build_targets

TARGET_KEYS = ("household", "logistic", "facility")


def run_preprocessing() -> pd.DataFrame:
    raw = Path(RAW_PATH)
    if not raw.exists():
        raise FileNotFoundError(
            f"Place your NFHS-5 file at:\n  {raw}\n"
            "Rename it to NFHS5_Individual.csv if needed."
        )

    df = load_stage1_data()
    df = handle_missing(df)
    df = build_targets(df)
    df = engineer_features(df)
    encoded = encode_features(df)

    processed_dir = PROJECT_ROOT / "data" / "processed"
    processed_dir.mkdir(parents=True, exist_ok=True)

    target_cols = [c for c in df.columns if c.startswith("target_")]
    encoded.to_csv(processed_dir / "X_features.csv", index=False)
    for t in target_cols:
        df[t].to_csv(processed_dir / f"y_{t.replace('target_', '')}.csv", index=False)

    print("Saved processed files to:", processed_dir)
    print("X_features shape:", encoded.shape)
    return pd.concat([encoded, df[target_cols]], axis=1)


def load_processed() -> pd.DataFrame:
    processed_dir = PROJECT_ROOT / "data" / "processed"
    X = pd.read_csv(processed_dir / "X_features.csv")
    targets = {}
    for key in TARGET_KEYS:
        targets[f"target_{key}"] = pd.read_csv(
            processed_dir / f"y_{key}.csv"
        ).squeeze("columns")
    return pd.concat([X, pd.DataFrame(targets)], axis=1)


def train_random_forests(df: pd.DataFrame) -> pd.DataFrame:
    target_cols = [c for c in df.columns if c.startswith("target_")]
    X = df[[c for c in df.columns if c not in target_cols]]
    model_dir = PROJECT_ROOT / "saved_models" / "stage1"
    model_dir.mkdir(parents=True, exist_ok=True)

    rows = []
    for key in TARGET_KEYS:
        col = f"target_{key}"
        combo = pd.concat([X, df[col].rename(col)], axis=1)
        X_train, X_test, y_train, y_test, _ = split_and_scale(combo, col, apply_scaling=True)

        model = RandomForestClassifier(
            n_estimators=100,
            max_depth=12,
            min_samples_leaf=20,
            random_state=42,
            n_jobs=-1,
        )
        model.fit(X_train, y_train)
        joblib.dump(model, model_dir / f"random_forest_{key}.pkl")

        y_pred = model.predict(X_test)
        y_prob = model.predict_proba(X_test)[:, 1]
        train_acc = accuracy_score(y_train, model.predict(X_train))
        test_acc = accuracy_score(y_test, y_pred)
        roc = roc_auc_score(y_test, y_prob)

        print(f"\n===== Random Forest | {key} =====")
        print(f"Train accuracy: {train_acc:.4f}")
        print(f"Test accuracy:  {test_acc:.4f}")
        print(f"ROC-AUC:        {roc:.4f}")
        print("Confusion matrix (test):")
        print(confusion_matrix(y_test, y_pred))
        print(classification_report(y_test, y_pred))

        rows.append(
            {
                "Target": key,
                "Train Accuracy": round(train_acc, 4),
                "Test Accuracy": round(test_acc, 4),
                "ROC-AUC": round(roc, 4),
            }
        )

    results = pd.DataFrame(rows)
    out_dir = PROJECT_ROOT / "outputs" / "stage1_results"
    out_dir.mkdir(parents=True, exist_ok=True)
    results.to_csv(out_dir / "random_forest_results.csv", index=False)
    print("\nModels saved to:", model_dir)
    print("Results saved to:", out_dir / "random_forest_results.csv")
    return results


def main(preprocess: bool = True) -> None:
    if preprocess:
        df = run_preprocessing()
    else:
        df = load_processed()
        print("Loaded processed data. X shape:", df.drop(columns=[c for c in df.columns if c.startswith("target_")]).shape)
    print("\n=== Random Forest training ===")
    print(train_random_forests(df).to_string(index=False))


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--skip-preprocess",
        action="store_true",
        help="Use existing data/processed/*.csv (must match Individual pipeline, ~724k rows)",
    )
    args = parser.parse_args()
    main(preprocess=not args.skip_preprocess)
