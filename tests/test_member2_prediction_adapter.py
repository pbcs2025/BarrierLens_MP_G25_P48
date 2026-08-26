"""Comprehensive Automated Test Suite for Member 2.

Validates:
1. Dataset structure & row/col counts
2. Preprocessing pipeline & exact 37-feature matrix
3. Scaler deterministic reconstruction & 0 NaNs
4. Frozen XGBoost models inference (predict, predict_proba)
5. Input validation & meaningful error messaging `<Label> (<Code>)`
6. Dual representation & authoritative labels
7. Flask REST API endpoint POST /api/predict-barrier
"""

import sys
from pathlib import Path

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import pytest
import pandas as pd
import numpy as np

from src.evaluation.field_dictionary import FIELD_DEFINITIONS, get_combined_label, get_field_label
from backend.prediction_adapter import (
    load_models,
    load_training_preprocessing,
    validate_raw_answers,
    predict_barrier,
)
from backend.app import create_app


def test_01_dataset_verification():
    """Verify raw dataset exists, row count, column count, and required fields."""
    csv_path = PROJECT_ROOT / "data" / "raw" / "NFHS5_Individual.csv"
    assert csv_path.exists(), "Raw NFHS5_Individual.csv file missing!"
    
    df_raw = pd.read_csv(csv_path, nrows=5)
    assert len(df_raw.columns) == 32, f"Expected 32 columns in raw CSV, got {len(df_raw.columns)}"
    
    required_codes = ["caseid", "v001", "v002", "v021", "v024", "v025", "v012", "v013", "v106", "v130", "v131", "v501", "v717", "v190"]
    for col in required_codes:
        assert col in df_raw.columns, f"Required column '{col}' missing from raw CSV dataset!"


def test_02_authoritative_labels():
    """Verify authoritative labels match Column_names.pdf specs."""
    assert FIELD_DEFINITIONS["v012"]["label"] == "Respondent's current age"
    assert FIELD_DEFINITIONS["v013"]["label"] == "Age group (5-year groups)"
    assert FIELD_DEFINITIONS["v106"]["label"] == "Highest educational level"
    assert FIELD_DEFINITIONS["v130"]["label"] == "Religion"
    assert FIELD_DEFINITIONS["v131"]["label"] == "Caste/Tribe"
    assert FIELD_DEFINITIONS["v501"]["label"] == "Current marital status"
    assert FIELD_DEFINITIONS["v717"]["label"] == "Current occupation"
    assert FIELD_DEFINITIONS["v190"]["label"] == "Wealth index quintile"
    assert FIELD_DEFINITIONS["v169a"]["label"] == "Household has a mobile phone"
    assert FIELD_DEFINITIONS["v170"]["label"] == "Household has a bank account"
    assert FIELD_DEFINITIONS["v481"]["label"] == "Covered by health insurance"
    assert FIELD_DEFINITIONS["v626a"]["label"] == "Unmet need for family planning"
    
    # Combined label check
    assert get_combined_label("v717") == "Current occupation (v717)"


def test_03_preprocessing_and_scaler_reconstruction():
    """Verify 37 feature extraction order and scaler fit with 0 NaNs."""
    feature_names, scaler = load_training_preprocessing()
    assert len(feature_names) == 37, f"Expected 37 features, got {len(feature_names)}"
    assert scaler.mean_.shape[0] == 37
    assert scaler.scale_.shape[0] == 37
    assert not np.isnan(scaler.mean_).any(), "Scaler mean_ contains NaNs!"
    assert not np.isnan(scaler.scale_).any(), "Scaler scale_ contains NaNs!"


def test_04_frozen_models_loading_and_inference():
    """Verify all 3 frozen XGBoost models load and run predict_proba."""
    models = load_models()
    assert "household" in models and "logistic" in models and "facility" in models
    
    _, scaler = load_training_preprocessing()
    dummy_x = np.zeros((1, 37))
    dummy_scaled = scaler.transform(dummy_x)
    
    for name, model in models.items():
        assert hasattr(model, "predict_proba")
        probs = model.predict_proba(dummy_scaled)
        assert probs.shape == (1, 2)
        assert 0.0 <= probs[0, 1] <= 1.0


def test_05_input_validation():
    """Verify raw answer validation and error formatting."""
    # Test valid input
    valid_input = {
        "v012": 28,
        "v025": "urban",
        "v106": "secondary",
        "v130": "hindu",
        "v131": "no caste / tribe",
        "v501": "married",
        "v717": "not working",
        "v190": "middle",
    }
    ok, err = validate_raw_answers(valid_input)
    assert ok is True and err is None

    # Test missing v717
    invalid_input = dict(valid_input)
    del invalid_input["v717"]
    ok, err = validate_raw_answers(invalid_input)
    assert ok is False
    assert "Missing required field: 'Current occupation' (v717)." in err

    # Test invalid age
    invalid_age = dict(valid_input, v012=99)
    ok, err = validate_raw_answers(invalid_age)
    assert ok is False
    assert "Invalid value for 'Respondent's current age' (v012)" in err


def test_06_prediction_adapter_flow():
    """Verify end-to-end predict_barrier execution."""
    valid_input = {
        "v012": 25,
        "v025": "rural",
        "v106": "no education",
        "v130": "muslim",
        "v131": "tribe",
        "v501": "married",
        "v717": "not working",
        "v190": "poorest",
    }
    res = predict_barrier(valid_input)
    assert res["status"] == "success"
    assert res["primaryBarrier"] in ["household", "logistic", "facility"]
    assert res["primaryBarrierLabel"] in ["Household Barrier", "Logistic Barrier", "Facility Barrier"]
    assert len(res["probabilities"]) == 3
    assert len(res["predictions"]) == 3
    for k in ["household", "logistic", "facility"]:
        assert 0.0 <= res["probabilities"][k] <= 1.0
        assert res["predictions"][k] in [0, 1]


def test_07_api_predict_barrier_endpoint():
    """Verify Flask POST /api/predict-barrier API endpoint."""
    app = create_app()
    client = app.test_client()
    
    # Test valid request
    payload = {
        "v012": 32,
        "v025": "urban",
        "v106": "higher",
        "v130": "hindu",
        "v131": "no caste / tribe",
        "v501": "married",
        "v717": "professional / technical / managerial",
        "v190": "richest",
    }
    resp = client.post("/api/predict-barrier", json=payload)
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["status"] == "success"
    assert "primaryBarrier" in data
    assert "probabilities" in data

    # Test invalid request (missing field)
    invalid_payload = dict(payload)
    del invalid_payload["v106"]
    resp_err = client.post("/api/predict-barrier", json=invalid_payload)
    assert resp_err.status_code == 400
    data_err = resp_err.get_json()
    assert data_err["status"] == "validation_error"
    assert "Missing required field: 'Highest educational level' (v106)." in data_err["error"]
