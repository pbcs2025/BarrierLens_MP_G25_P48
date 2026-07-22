"""Compare Stage 2 Logistic Regression, Random Forest, and XGBoost models."""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

import joblib
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pandas as pd
import seaborn as sns
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import StratifiedKFold, train_test_split
from sklearn.preprocessing import StandardScaler

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.evaluation.stage2_metrics import compute_barrier_uplift
from src.models.stage2_xgboost import (
    STAGE2_TARGETS,
    TARGET_DISPLAY,
    build_xgb_classifier,
    compute_scale_pos_weight,
    filter_target_sample,
    load_stage2_data,
    split_feature_sets,
    tune_xgboost_hyperparameters,
)
from src.preprocessing.stage2_integration import _sanitize_feature_names

STAGE2_OUTPUT_DIR = PROJECT_ROOT / "outputs" / "stage2_results"
STAGE2_MODELS_DIR = PROJECT_ROOT / "saved_models" / "stage2"


def _holdout_metrics(model, X_test, y_test, model_name: str, target_name: str) -> Dict[str, Any]:
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]
    return {
        "Model": model_name,
        "Target": target_name,
        "Accuracy": round(float(accuracy_score(y_test, y_pred)), 4),
        "ROC-AUC": round(float(roc_auc_score(y_test, y_prob)), 4),
        "Precision": round(float(precision_score(y_test, y_pred, zero_division=0)), 4),
        "Recall": round(float(recall_score(y_test, y_pred, zero_division=0)), 4),
        "F1-Score": round(float(f1_score(y_test, y_pred, zero_division=0)), 4),
    }


def _save_comparison_chart(comparison_df: pd.DataFrame, output_path: Path) -> None:
    targets = comparison_df["Target"].unique()
    fig, axes = plt.subplots(1, len(targets), figsize=(6 * len(targets), 5), squeeze=False)
    for ax, target in zip(axes.flat, targets):
        subset = comparison_df[comparison_df["Target"] == target]
        sns.barplot(data=subset, x="Model", y="ROC-AUC", hue="Model", ax=ax, palette="viridis", legend=False)
        ax.set_title(TARGET_DISPLAY.get(target, target))
        for label in ax.get_xticklabels():
            label.set_rotation(20)
            label.set_ha("right")
        ax.set_ylim(0.5, 1.0)
    plt.tight_layout()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    plt.savefig(output_path, dpi=200, bbox_inches="tight")
    plt.close()
    print(f"Saved ROC-AUC chart -> {output_path}")


def compare_models_for_target(
    X_full: pd.DataFrame,
    y: pd.DataFrame,
    target_col: str,
) -> List[Dict[str, Any]]:
    """Train/evaluate LR, RF, XGB for one target; return metric rows + uplift."""
    try:
        X_t, y_t = filter_target_sample(X_full, y, target_col)
    except ValueError:
        print(f"Skipping {target_col} — no analytic sample.")
        return []

    X_t = _sanitize_feature_names(X_t)
    socio_cols, full_cols = split_feature_sets(X_t.columns.tolist())
    X_train, X_test, y_train, y_test = train_test_split(
        X_t[full_cols], y_t, test_size=0.20, random_state=42, stratify=y_t
    )

    rows: List[Dict[str, Any]] = []
    cv = StratifiedKFold(n_splits=3, shuffle=True, random_state=42)

    # Logistic Regression — same 80/20 hold-out as tree models
    scaler = StandardScaler()
    X_lr_tr = scaler.fit_transform(X_train)
    X_lr_te = scaler.transform(X_test)
    lr = LogisticRegression(solver="lbfgs", max_iter=1000, C=1.0, class_weight="balanced", random_state=42)
    lr.fit(X_lr_tr, y_train)
    STAGE2_MODELS_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump({"model": lr, "scaler": scaler}, STAGE2_MODELS_DIR / f"stage2_logistic_{target_col}.pkl")
    lr_metrics = _holdout_metrics(lr, X_lr_te, y_test, "Logistic Regression", target_col)
    lr_uplift = compute_barrier_uplift(
        lambda: LogisticRegression(solver="lbfgs", max_iter=1000, class_weight="balanced", random_state=42),
        _sanitize_feature_names(X_t[socio_cols]),
        _sanitize_feature_names(X_t[full_cols]),
        y_t,
        target_col,
        cv,
    )
    lr_metrics.update(
        {
            "Baseline_ROC-AUC": round(lr_uplift["auc_socioeconomic_only"], 4),
            "Full_ROC-AUC": round(lr_uplift["auc_with_barriers"], 4),
            "Barrier_Uplift": round(lr_uplift["uplift"], 4),
        }
    )
    rows.append(lr_metrics)

    # Random Forest
    rf = RandomForestClassifier(
        n_estimators=300,
        max_depth=15,
        min_samples_leaf=50,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1,
    )
    rf.fit(X_train, y_train)
    joblib.dump(rf, STAGE2_MODELS_DIR / f"stage2_random_forest_{target_col}.pkl")
    rf_metrics = _holdout_metrics(rf, X_test, y_test, "Random Forest", target_col)
    rf_uplift = compute_barrier_uplift(
        lambda: RandomForestClassifier(
            n_estimators=300, max_depth=15, class_weight="balanced", random_state=42, n_jobs=-1
        ),
        X_t[socio_cols],
        X_t[full_cols],
        y_t,
        target_col,
        cv,
    )
    rf_metrics.update(
        {
            "Baseline_ROC-AUC": round(rf_uplift["auc_socioeconomic_only"], 4),
            "Full_ROC-AUC": round(rf_uplift["auc_with_barriers"], 4),
            "Barrier_Uplift": round(rf_uplift["uplift"], 4),
        }
    )
    rows.append(rf_metrics)

    # XGBoost — load if saved, else train
    xgb_path = STAGE2_MODELS_DIR / f"stage2_xgboost_{target_col}.pkl"
    hyperparams = {"n_estimators": 350, "max_depth": 6}
    if xgb_path.exists():
        xgb = joblib.load(xgb_path)
    else:
        hyperparams = tune_xgboost_hyperparameters(X_train, y_train)
        xgb = build_xgb_classifier(compute_scale_pos_weight(y_train), **hyperparams)
        xgb.fit(X_train, y_train)
        joblib.dump(xgb, xgb_path)

    xgb_metrics = _holdout_metrics(xgb, X_test, y_test, "XGBoost", target_col)
    xgb_uplift = compute_barrier_uplift(
        lambda: build_xgb_classifier(compute_scale_pos_weight(y_train), **hyperparams),
        X_t[socio_cols],
        X_t[full_cols],
        y_t,
        target_col,
        cv,
    )
    xgb_metrics.update(
        {
            "Baseline_ROC-AUC": round(xgb_uplift["auc_socioeconomic_only"], 4),
            "Full_ROC-AUC": round(xgb_uplift["auc_with_barriers"], 4),
            "Barrier_Uplift": round(xgb_uplift["uplift"], 4),
        }
    )
    rows.append(xgb_metrics)

    return rows


def run_model_comparison(output_path: Optional[Path] = None) -> pd.DataFrame:
    X_full, y = load_stage2_data()
    all_rows: List[Dict[str, Any]] = []

    for target_col in STAGE2_TARGETS:
        print(f"\n{'=' * 60}\nComparing models for {TARGET_DISPLAY.get(target_col, target_col)}\n{'=' * 60}")
        all_rows.extend(compare_models_for_target(X_full, y, target_col))

    comparison_df = pd.DataFrame(all_rows)
    output_path = Path(output_path or STAGE2_OUTPUT_DIR / "model_comparison_table.csv")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    comparison_df.to_csv(output_path, index=False)
    print(f"\nSaved model comparison -> {output_path}")

    if not comparison_df.empty:
        _save_comparison_chart(
            comparison_df,
            STAGE2_OUTPUT_DIR / "model_comparison_roc_auc.png",
        )

    for target_col in comparison_df["Target"].unique():
        subset = comparison_df[comparison_df["Target"] == target_col]
        best = subset.sort_values("ROC-AUC", ascending=False).iloc[0]
        print(
            f"Best model for {TARGET_DISPLAY.get(target_col, target_col)}: "
            f"{best['Model']} (ROC-AUC={best['ROC-AUC']:.4f})"
        )

    return comparison_df


if __name__ == "__main__":
    run_model_comparison()
