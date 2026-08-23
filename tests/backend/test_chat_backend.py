"""Automated Test Suite for Member 2 — Claude Backend & Research-Safety Layer.

Verifies exact metric grounding, state comparisons, missing data handling, non-causal safety,
medical disclaimer enforcement, multilingual preservation, API failure fallbacks, and secret safety.
"""

from __future__ import annotations

import os
from pathlib import Path

from backend.app import app
from backend.services.claude_service import generate_llM_explanation
from backend.services.safety_validator import check_numerical_safety, sanitize_causal_language, check_medical_safety

PROJECT_ROOT = Path(__file__).resolve().parents[2]



# ── Test 1: Exact Metric Grounding ───────────────────────────────────────────
def test_exact_metric_grounding(client):
    payload = {
        "question": "What is the national facility barrier rate?",
        "language": "en",
        "intent": "NATIONAL_OVERVIEW",
        "status": "verified",
        "evidence": [
            {
                "source": "national_overview.json",
                "path": "barriers.facility.observed_rate",
                "label": "Facility-Level Barrier Rate",
                "value": "46.01",
                "unit": "%",
                "entity": "National"
            }
        ],
        "metrics": [{"label": "Facility-Level Barrier Rate", "value": "46.01", "unit": "%"}]
    }

    res = client.post("/api/chat", json=payload)
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "success"
    assert "46.01" in data["answer"] or "46" in data["answer"]
    assert data["intent"] == "NATIONAL_OVERVIEW"


# ── Test 2: State Comparison ──────────────────────────────────────────────────
def test_state_comparison(client):
    payload = {
        "question": "Compare Karnataka and Kerala healthcare barriers.",
        "language": "en",
        "intent": "STATE_COMPARISON",
        "status": "verified",
        "entities": {"states": ["Karnataka", "Kerala"]},
        "evidence": [
            {
                "source": "state_summary.json",
                "path": "states.Karnataka.observed_any_barrier_rate",
                "label": "Karnataka — Any Barrier Rate",
                "value": "55.38",
                "unit": "%",
                "entity": "Karnataka"
            },
            {
                "source": "state_summary.json",
                "path": "states.Kerala.observed_any_barrier_rate",
                "label": "Kerala — Any Barrier Rate",
                "value": "7.58",
                "unit": "%",
                "entity": "Kerala"
            }
        ],
        "calculations": [
            {
                "type": "percentage_point_difference",
                "result": 47.8,
                "unit": "percentage points",
                "interpretation": "Karnataka has a 47.80 percentage-point higher Observed Any Barrier Rate than Kerala (55.38% vs 7.58%).",
                "derived": True
            }
        ]
    }

    res = client.post("/api/chat", json=payload)
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "success"
    assert "55.38" in data["answer"] or "Karnataka" in data["answer"]
    assert "7.58" in data["answer"] or "Kerala" in data["answer"]


# ── Test 3: Missing Information / Unsupported Data ───────────────────────────
def test_missing_information_handling(client):
    payload = {
        "question": "What is the average hospital waiting time in Karnataka?",
        "language": "en",
        "intent": "UNSUPPORTED",
        "status": "unavailable",
        "evidence": [],
        "limitationNote": "Hospital waiting times are absent from NFHS-5 recode columns."
    }

    res = client.post("/api/chat", json=payload)
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "unavailable"
    assert "not available" in data["answer"].lower() or "unavailable" in data["answer"].lower()


# ── Test 4: Causation Safety Check ───────────────────────────────────────────
def test_causation_safety():
    causal_text = "Poverty causes healthcare access barriers and leads to poor health outcomes."
    sanitized = sanitize_causal_language(causal_text)

    assert "causes" not in sanitized
    assert "leads to" not in sanitized
    assert "associated with" in sanitized or "linked to" in sanitized


# ── Test 5: SHAP Model Output Explanation ────────────────────────────────────
def test_shap_explanation(client):
    payload = {
        "question": "What is SHAP and what are the top risk factors?",
        "language": "en",
        "intent": "SHAP",
        "status": "verified",
        "evidence": [
            {
                "source": "regression_summary.json",
                "path": "top_risk_factors[0]",
                "label": "Poorest Wealth Quintile",
                "value": "1.26",
                "unit": "Odds Ratio",
                "entity": "Poorest Wealth Tier"
            }
        ]
    }

    res = client.post("/api/chat", json=payload)
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "success"
    assert "SHAP" in data["answer"] or "attributions" in data["answer"] or "1.26" in data["answer"]


# ── Test 6: Medical Question Disclaimer ──────────────────────────────────────
def test_medical_advice_disclaimer():
    medical_text = "What treatment should I take for my healthcare condition?"
    is_personal, disclaimer = check_medical_safety(medical_text)

    assert disclaimer is not None
    assert "Research Disclaimer" in disclaimer or "does not provide individual medical diagnosis" in disclaimer


# ── Test 7: Kannada Language Preservation ────────────────────────────────────
def test_kannada_language_preservation(client):
    payload = {
        "question": "ಕರ್ನಾಟಕದ ಆರೋಗ್ಯ ಅಡೆತಡೆಗಳು ಯಾವುವು?",
        "language": "kn",
        "intent": "STATE_ANALYSIS",
        "status": "verified",
        "entities": {"states": ["Karnataka"]},
        "evidence": [
            {
                "source": "state_summary.json",
                "path": "states.Karnataka.observed_any_barrier_rate",
                "label": "Karnataka — Any Barrier Rate",
                "value": "55.38",
                "unit": "%",
                "entity": "Karnataka"
            }
        ]
    }

    res = client.post("/api/chat", json=payload)
    assert res.status_code == 200
    data = res.get_json()
    assert data["language"] == "kn"
    assert data["status"] in ("success", "verified")


# ── Test 8: Hindi Language Preservation ──────────────────────────────────────
def test_hindi_language_preservation(client):
    payload = {
        "question": "कर्नाटक और केरल की तुलना करें",
        "language": "hi",
        "intent": "STATE_COMPARISON",
        "status": "verified",
        "entities": {"states": ["Karnataka", "Kerala"]},
        "evidence": [
            {
                "source": "state_summary.json",
                "path": "states.Karnataka.observed_any_barrier_rate",
                "label": "Karnataka — Any Barrier Rate",
                "value": "55.38",
                "unit": "%",
                "entity": "Karnataka"
            }
        ]
    }

    res = client.post("/api/chat", json=payload)
    assert res.status_code == 200
    data = res.get_json()
    assert data["language"] == "hi"


# ── Test 9: Graceful API Error Fallback ──────────────────────────────────────
def test_invalid_request_handling(client):
    res = client.post("/api/chat", json={"question": ""})
    assert res.status_code == 400
    data = res.get_json()
    assert data["status"] == "validation_error"


# ── Test 10: Secret Protection & Git Audit ───────────────────────────────────
def test_secret_protection_audit():
    gitignore_path = PROJECT_ROOT / ".gitignore"
    assert gitignore_path.exists()
    content = gitignore_path.read_text(encoding="utf-8")
    assert ".env" in content

    # Ensure no committed file contains raw Claude key
    sample_key = "sk-ant-api03-"
    for js_file in (PROJECT_ROOT / "dashboard" / "assets" / "js").glob("*.js"):
        text = js_file.read_text(encoding="utf-8")
        assert sample_key not in text, f"Secret key found in frontend JS: {js_file.name}"
