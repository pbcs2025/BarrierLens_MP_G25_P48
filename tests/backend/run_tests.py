"""Standard Python Test Runner for Member 2 Chatbot Backend."""

import sys
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from tests.backend.test_chat_backend import (
    test_exact_metric_grounding,
    test_state_comparison,
    test_missing_information_handling,
    test_causation_safety,
    test_shap_explanation,
    test_medical_advice_disclaimer,
    test_kannada_language_preservation,
    test_hindi_language_preservation,
    test_invalid_request_handling,
    test_secret_protection_audit,
)
from backend.app import app


def run_all_tests():
    print("=========================================================================")
    print("BARRIERLENS MEMBER 2 - CLAUDE BACKEND & SAFETY SUITE TEST RUNNER")
    print("=========================================================================\n")

    app.config["TESTING"] = True
    pass_count = 0
    fail_count = 0

    tests = [
        ("Test 1: Exact Metric Grounding", lambda c: test_exact_metric_grounding(c)),
        ("Test 2: State Comparison", lambda c: test_state_comparison(c)),
        ("Test 3: Missing Information / Unsupported Data", lambda c: test_missing_information_handling(c)),
        ("Test 4: Causation Safety Check", lambda c: test_causation_safety()),
        ("Test 5: SHAP Model Output Explanation", lambda c: test_shap_explanation(c)),
        ("Test 6: Medical Advice Disclaimer", lambda c: test_medical_advice_disclaimer()),
        ("Test 7: Kannada Language Preservation", lambda c: test_kannada_language_preservation(c)),
        ("Test 8: Hindi Language Preservation", lambda c: test_hindi_language_preservation(c)),
        ("Test 9: Graceful API Error / Invalid Request", lambda c: test_invalid_request_handling(c)),
        ("Test 10: Secret Protection & Git Audit", lambda c: test_secret_protection_audit()),
    ]

    with app.test_client() as client:
        for name, test_func in tests:
            try:
                if test_func.__code__.co_argcount == 1:
                    test_func(client)
                else:
                    test_func()
                print(f"  [PASS] {name}")
                pass_count += 1
            except Exception as exc:
                print(f"  [FAIL] {name} -> {exc}")
                fail_count += 1

    print("\n=========================================================================")
    print(f"MEMBER 2 BACKEND TEST SUMMARY: {pass_count} PASSED, {fail_count} FAILED out of {len(tests)} tests.")
    print("=========================================================================")

    if fail_count > 0:
        sys.exit(1)


if __name__ == "__main__":
    run_all_tests()
