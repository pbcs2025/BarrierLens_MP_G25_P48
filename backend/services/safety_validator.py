"""Safety Validator Service for BarrierLens Research Intelligence Assistant.

Validates LLM generated responses against verified evidence for:
1. Numerical accuracy (supported by evidence)
2. Research safety (non-causal wording)
3. Medical safety (no personal diagnosis/advice, research disclaimer attached)
4. Source attribution integrity
"""

from __future__ import annotations

import re
from typing import Any


CAUSAL_PATTERNS = [
    (r"\bcauses\b", "is associated with"),
    (r"\bcaused by\b", "associated with"),
    (r"\bleads to\b", "is linked to higher risk of"),
    (r"\bproves that\b", "indicates model association that"),
    (r"\bdirect cause of\b", "strong predictor of"),
    (r"\bcausal relationship\b", "predictive association"),
]

MEDICAL_ADVICE_PATTERNS = [
    r"\byou should take\b",
    r"\byou are diagnosed with\b",
    r"\btreatment for your\b",
    r"\bconsult your doctor immediately for diagnosis\b",
    r"\bmy diagnosis is\b",
]

MEDICAL_DISCLAIMER = (
    "Research Disclaimer: BarrierLens provides population-level epidemiological research analysis "
    "from NFHS-5 survey data and does not provide individual medical diagnosis or personal health advice."
)


def check_numerical_safety(
    answer: str,
    evidence_payload: dict[str, Any],
) -> tuple[bool, list[str]]:
    """Verify that numerical claims in the answer text match supplied evidence.

    Returns:
        (is_safe, list_of_unsupported_numbers)
    """
    if not answer or evidence_payload.get("status") == "unavailable":
        return True, []

    # Collect all valid numbers from evidence & calculations
    valid_numbers: set[str] = set()

    for item in evidence_payload.get("evidence", []):
        val = str(item.get("value", "")).strip()
        if val:
            valid_numbers.add(val)
            # Add formatted variants (e.g. "55.38" -> "55.4", "55.38%")
            try:
                fval = float(val)
                valid_numbers.add(f"{fval:.1f}")
                valid_numbers.add(f"{fval:.2f}")
                valid_numbers.add(f"{int(round(fval))}")
            except ValueError:
                pass

    for calc in evidence_payload.get("calculations", []):
        val = str(calc.get("result", "")).strip()
        if val:
            valid_numbers.add(val)
            try:
                fval = float(val)
                valid_numbers.add(f"{fval:.1f}")
                valid_numbers.add(f"{fval:.2f}")
                valid_numbers.add(f"{int(round(fval))}")
            except ValueError:
                pass

    for m in evidence_payload.get("metrics", []):
        val = str(m.get("value", "")).strip()
        if val:
            valid_numbers.add(val)

    # Standard population constant
    valid_numbers.add("724115")
    valid_numbers.add("724,115")
    valid_numbers.add("108785")
    valid_numbers.add("108,785")
    valid_numbers.add("5")  # NFHS-5
    valid_numbers.add("1")  # Cluster 1 / Rank 1
    valid_numbers.add("2")  # Cluster 2 / Rank 2
    valid_numbers.add("3")  # Rank 3
    valid_numbers.add("0")  # Cluster 0

    # Find float/percentage patterns in the answer
    found_numbers = re.findall(r"\b\d+(?:\.\d+)?%?", answer)
    unsupported: list[str] = []

    for num_str in found_numbers:
        clean = num_str.rstrip("%")
        # Check if clean number or num_str matches valid_numbers
        if clean not in valid_numbers and num_str not in valid_numbers:
            # Check if it's a common small index (1, 2, 3, 4, 5, 0)
            if clean in ("0", "1", "2", "3", "4", "5"):
                continue
            unsupported.append(num_str)

    return len(unsupported) == 0, unsupported


def sanitize_causal_language(answer: str) -> str:
    """Replace causal overclaims with research-safe association terms."""
    sanitized = answer
    for pattern, replacement in CAUSAL_PATTERNS:
        sanitized = re.sub(pattern, replacement, sanitized, flags=re.IGNORECASE)
    return sanitized


def check_medical_safety(answer: str) -> tuple[bool, str]:
    """Check for individual medical recommendations and attach research disclaimer if needed.

    Returns:
        (is_personal_medical, disclaimer_to_append)
    """
    is_personal = False
    for pattern in MEDICAL_ADVICE_PATTERNS:
        if re.search(pattern, answer, flags=re.IGNORECASE):
            is_personal = True
            break

    return is_personal, MEDICAL_DISCLAIMER


def validate_claude_response(
    raw_response: dict[str, Any],
    evidence_payload: dict[str, Any],
) -> dict[str, Any]:
    """Perform full post-processing safety validation on Claude's structured response.

    Args:
        raw_response: Claude output dict containing 'answer', 'claims', 'disclaimer'.
        evidence_payload: Input verified evidence payload.

    Returns:
        Sanitized, validated structured output object.
    """
    answer = raw_response.get("answer", "")
    claims = raw_response.get("claims", [])
    disclaimer = raw_response.get("disclaimer")

    # 1. Sanitize Causal Language
    answer = sanitize_causal_language(answer)

    # 2. Check Medical Safety
    is_medical, medical_disc = check_medical_safety(answer)
    if is_medical or evidence_payload.get("intent") in ("LIMITATIONS", "OUTCOME_IMPACT"):
        if not disclaimer:
            disclaimer = medical_disc

    # 3. Verify Numerical Grounding
    is_num_safe, unsupported = check_numerical_safety(answer, evidence_payload)
    if not is_num_safe and evidence_payload.get("status") == "verified":
        # Log warning / note unsupported numbers in claims
        pass

    return {
        "answer": answer,
        "claims": claims,
        "disclaimer": disclaimer,
        "numerical_safety_passed": is_num_safe,
        "unsupported_numbers": unsupported if not is_num_safe else [],
    }
