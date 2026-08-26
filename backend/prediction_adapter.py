"""BarrierLens ML Prediction Adapter.

Deterministic inference adapter for frozen Stage 1 XGBoost models:
- models/xgb_household.pkl
- models/xgb_logistic.pkl
- models/xgb_facility.pkl

Strictly maintains internal NFHS variable codes while formatting validation,
logging, and API outputs with authoritative human-readable labels.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import joblib
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler

from src.evaluation.field_dictionary import (
    FIELD_DEFINITIONS,
    derive_v013_from_v012,
    get_combined_label,
    get_field_label,
)
from src.preprocessing.clean import handle_missing
from src.preprocessing.encode import encode_features
from src.preprocessing.engineer_features import engineer_features
from src.preprocessing.load_data import load_stage1_data
from src.preprocessing.split_scale import split_and_scale
from src.preprocessing.target_builder import build_targets

logger = logging.getLogger("barrierlens.prediction_adapter")

PROJECT_ROOT = Path(__file__).resolve().parents[1]
MODELS_DIR = PROJECT_ROOT / "models"
RAW_CSV_PATH = PROJECT_ROOT / "data" / "raw" / "NFHS5_Individual.csv"

# Global cached singletons
_MODELS: Dict[str, Any] = {}
_FEATURE_NAMES: List[str] = []
_TRAINING_SCALER: Optional[StandardScaler] = None


def load_models() -> Dict[str, Any]:
    """Load and cache frozen XGBoost model files."""
    global _MODELS
    if _MODELS:
        return _MODELS

    targets = ["household", "logistic", "facility"]
    for target in targets:
        model_path = MODELS_DIR / f"xgb_{target}.pkl"
        if not model_path.exists():
            raise FileNotFoundError(f"Frozen model file not found: {model_path}")
        _MODELS[target] = joblib.load(model_path)
        logger.info("Loaded frozen XGBoost model for target '%s'", target)

    return _MODELS


def load_training_preprocessing() -> Tuple[List[str], StandardScaler]:
    """
    Deterministically fit and cache the training-time StandardScaler and 37 feature names.

    Reconstructs exact training pipeline split (random_state=42, test_size=0.20).
    """
    global _FEATURE_NAMES, _TRAINING_SCALER
    if _FEATURE_NAMES and _TRAINING_SCALER is not None:
        return _FEATURE_NAMES, _TRAINING_SCALER

    logger.info("Reconstructing training-time StandardScaler from raw NFHS dataset...")
    df_loaded = load_stage1_data(RAW_CSV_PATH)
    df_targets = build_targets(df_loaded)
    y_household = df_targets["target_household"]

    df_cleaned = handle_missing(df_targets)
    df_engineered = engineer_features(df_cleaned)
    df_encoded = encode_features(df_engineered)

    _FEATURE_NAMES = df_encoded.columns.tolist()
    if len(_FEATURE_NAMES) != 37:
        raise ValueError(f"Expected 37 features, got {len(_FEATURE_NAMES)}")

    combo = pd.concat([df_encoded, y_household.rename("target_household")], axis=1)
    _, _, _, _, scaler = split_and_scale(
        combo,
        target_col="target_household",
        apply_scaling=True,
        random_state=42,
    )
    _TRAINING_SCALER = scaler
    logger.info("Scaler successfully fitted and cached on 37 features.")
    return _FEATURE_NAMES, _TRAINING_SCALER


def validate_raw_answers(raw_answers: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
    """
    Validate raw user answers dictionary against required NFHS fields.

    Returns:
        Tuple of (is_valid, error_message).
    """
    if not raw_answers or not isinstance(raw_answers, dict):
        return False, "Input must be a non-empty JSON object of raw answers."

    required_fields = ["v012", "v025", "v106", "v130", "v131", "v501", "v717", "v190"]
    for code in required_fields:
        if code not in raw_answers or raw_answers[code] is None or str(raw_answers[code]).strip() == "":
            label_fmt = get_combined_label(code)
            return False, f"Missing required field: '{get_field_label(code)}' ({code})."

    # Validate numeric age
    try:
        age = float(raw_answers["v012"])
        if not (15 <= age <= 49):
            return False, f"Invalid value for '{get_field_label('v012')}' (v012): must be between 15 and 49."
    except (ValueError, TypeError):
        return False, f"Invalid numeric value for '{get_field_label('v012')}' (v012)."

    # Validate residence
    res = str(raw_answers["v025"]).strip().lower()
    if res not in ["urban", "rural", "1", "2"]:
        return False, f"Invalid value for '{get_field_label('v025')}' (v025): expected 'urban' or 'rural'."

    return True, None


def prepare_raw_dataframe(raw_answers: Dict[str, Any]) -> pd.DataFrame:
    """Convert raw input dict into 1-row DataFrame, deriving v013 if missing."""
    row = dict(raw_answers)
    if "v013" not in row or not row["v013"]:
        try:
            age = float(row["v012"])
            row["v013"] = derive_v013_from_v012(age)
        except (ValueError, TypeError, KeyError):
            row["v013"] = "25-29"

    # Fill optional missing fields with standard NFHS missing values
    optional_defaults = {
        "v157": "not at all",
        "v158": "not at all",
        "v159": "not at all",
        "v169a": "no",
        "v170": "no",
        "v481": "no",
        "v743f": "missing",
    }
    for field, default_val in optional_defaults.items():
        if field not in row or row[field] is None:
            row[field] = default_val

    df = pd.DataFrame([row])
    return df


def align_feature_columns(df_encoded: pd.DataFrame, expected_features: List[str]) -> pd.DataFrame:
    """Align 1-row encoded DataFrame to exact 37 expected features in exact order."""
    out = df_encoded.reindex(columns=expected_features, fill_value=0)
    return out


def determine_primary_barrier(probabilities: Dict[str, float]) -> Tuple[str, str]:
    """
    Determine primary barrier key and human-readable label from probabilities dict.
    """
    max_key = max(probabilities, key=probabilities.get)
    labels = {
        "household": "Household Barrier",
        "logistic": "Logistic Barrier",
        "facility": "Facility Barrier",
    }
    return max_key, labels.get(max_key, "Healthcare Access Barrier")


def predict_barrier(raw_answers: Dict[str, Any]) -> Dict[str, Any]:
    """
    Master prediction entrypoint for Member 2.

    Parameters:
        raw_answers: Dictionary containing internal NFHS field codes and values.

    Returns:
        Structured prediction JSON payload.
    """
    # Step 1: Validate input answers
    is_valid, err_msg = validate_raw_answers(raw_answers)
    if not is_valid:
        return {
            "status": "validation_error",
            "error": err_msg,
            "primaryBarrier": None,
            "primaryBarrierLabel": None,
            "probabilities": {},
            "predictions": {},
        }

    try:
        # Step 2: Load models & scaler
        models = load_models()
        expected_features, scaler = load_training_preprocessing()

        # Step 3: Transform raw inputs through feature pipeline
        df_raw = prepare_raw_dataframe(raw_answers)
        df_cleaned = handle_missing(df_raw)
        df_engineered = engineer_features(df_cleaned)
        df_encoded = encode_features(df_engineered)

        # Step 4: Reindex to exact 37 feature matrix
        df_aligned = align_feature_columns(df_encoded, expected_features)

        # Step 5: Scale features using cached StandardScaler
        X_scaled = scaler.transform(df_aligned)

        # Step 6: Execute model predictions
        probs = {}
        preds = {}
        for target in ["household", "logistic", "facility"]:
            m = models[target]
            prob_val = float(m.predict_proba(X_scaled)[0, 1])
            pred_val = int(m.predict(X_scaled)[0])
            probs[target] = round(prob_val, 4)
            preds[target] = pred_val

        # Step 7: Determine primary barrier
        primary_key, primary_label = determine_primary_barrier(probs)

        return {
            "status": "success",
            "primaryBarrier": primary_key,
            "primaryBarrierLabel": primary_label,
            "probabilities": probs,
            "predictions": preds,
            "metadata": {
                "features_count": len(expected_features),
                "model_provenance": ["xgb_household.pkl", "xgb_logistic.pkl", "xgb_facility.pkl"],
            },
        }

    except Exception as exc:
        logger.exception("Error executing barrier prediction: %s", exc)
        return {
            "status": "error",
            "error": f"Internal prediction pipeline error: {str(exc)}",
            "primaryBarrier": None,
            "primaryBarrierLabel": None,
            "probabilities": {},
            "predictions": {},
        }
