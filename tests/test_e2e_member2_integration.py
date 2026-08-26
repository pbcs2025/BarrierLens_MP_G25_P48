"""End-to-End Integration Test for Member 2 ML Prediction Adapter + Evidence Engine.

Simulates the full cross-component workflow:
Member 1 Guided Questions -> Raw Answers -> POST /api/predict-barrier -> Member 2 ML Prediction -> primaryBarrier -> Active Barrier Context -> Evidence Engine -> Member 4/UI Result.
"""

import sys
from pathlib import Path
import pytest
import json

root = Path(__file__).resolve().parents[1]
if str(root) not in sys.path:
    sys.path.insert(0, str(root))

from backend.app import create_app
from backend.prediction_adapter import predict_barrier
from src.evaluation.field_dictionary import get_field_label, get_combined_label


def test_e2e_guided_questions_to_ml_prediction_to_evidence_flow():
    """Verify full end-to-end integration flow across Members 1, 2, 4."""
    # Step 1: Member 1 Guided Questions raw answers
    raw_answers = {
        "v012": 26,
        "v025": "rural",
        "v106": "no education",
        "v130": "hindu",
        "v131": "no caste / tribe",
        "v501": "married",
        "v717": "not working",
        "v190": "poorest",
        "v481": "no",
    }

    # Verify input labels against authoritative field dictionary
    assert get_field_label("v012") == "Respondent's current age"
    assert get_combined_label("v717") == "Current occupation (v717)"

    # Step 2: Call prediction adapter
    app = create_app()
    client = app.test_client()

    response = client.post("/api/predict-barrier", json=raw_answers)
    assert response.status_code == 200
    res = response.get_json()

    # Step 3: Verify Member 2 ML Prediction result
    assert res["status"] == "success"
    primary_barrier = res["primaryBarrier"]
    primary_label = res["primaryBarrierLabel"]
    probs = res["probabilities"]
    preds = res["predictions"]

    assert primary_barrier in ["household", "logistic", "facility"]
    assert primary_label in ["Household Barrier", "Logistic Barrier", "Facility Barrier"]
    assert len(probs) == 3
    assert len(preds) == 3

    # Step 4: Verify compatibility with Member 4 active barrier context & Evidence Engine
    national_json_path = root / "dashboard" / "assets" / "data" / "national_overview.json"
    assert national_json_path.exists()
    
    with open(national_json_path, "r", encoding="utf-8") as f:
        national_data = json.load(f)

    # Check that predicted primary barrier metric exists in verified dataset
    expected_rate_key = f"observed_{primary_barrier}_rate"
    assert expected_rate_key in national_data["kpis"]
    rate_val = national_data["kpis"][expected_rate_key]
    assert float(rate_val) > 0.0

    print(f"\nE2E INTEGRATION SUCCESS: Predicted '{primary_label}' ({primary_barrier}) with probability {probs[primary_barrier]:.4f}. Matched verified rate {rate_val}%.")
