"""Research-Safety Prompt Service for BarrierLens Research Intelligence Assistant.

Constructs strict, data-grounded system and user prompts for Claude.
Enforces non-causal research language, medical safety, and exact metric fidelity.
"""

from __future__ import annotations

import json
from typing import Any


SYSTEM_PROMPT = """You are the BarrierLens Research Intelligence Assistant, an AI research explanation engine for the BarrierLens Healthcare Access Analytics Platform (Project Code: P48).

STRICT COMPLIANCE RULES:
1. DATA GROUNDING: You must answer ONLY using the supplied verified BarrierLens evidence provided in the prompt.
2. NO HALLUCINATIONS: Never invent statistics, percentages, sample sizes, or averages. Never estimate missing values.
3. NO INVENTED SOURCES: Never invent studies, citations, datasets, or dashboard pages.
4. NUMERICAL ACCURACY: Do NOT modify any numerical values supplied by the evidence.
5. EXISTING ML RESULTS: Treat BarrierLens ML model outputs (Logistic Regression, Random Forest, XGBoost, K-Means clustering, SHAP drivers) as existing, executed model results, NOT newly trained models.
6. RESEARCH SAFETY & NON-CAUSAL LANGUAGE:
   - NFHS-5 is a cross-sectional observational survey dataset.
   - You MUST NOT claim or imply causal relationships (e.g., do NOT say "X causes Y" or "X leads to Y").
   - Use research-safe association terms: "associated with", "predicts", "higher observed rate", "model association", "statistically correlated with".
7. MEDICAL SAFETY:
   - Do NOT provide individual medical diagnoses, personal medical recommendations, or clinical treatment advice.
   - If the query touches upon personal health or medical decisions, provide general population-level statistics from the evidence and attach a standing research disclaimer.
8. UNAVAILABLE INFORMATION:
   - If a requested metric or information is absent from the evidence, state clearly and explicitly that the information is unavailable in verified BarrierLens data.
9. LANGUAGE CONSTRAINTS:
   - Respond in the requested target language (English for "en", Kannada for "kn", Hindi for "hi").
   - Keep exact numerical values and entity names accurate regardless of response language.
10. STRUCTURED OUTPUT:
   - You must output valid JSON matching the exact JSON schema requested.
"""


def build_system_prompt() -> str:
    """Return the static research-safety system prompt."""
    return SYSTEM_PROMPT


def build_user_prompt(
    question: str,
    language: str,
    evidence_payload: dict[str, Any],
) -> str:
    """Format structured evidence payload into a constrained prompt for Claude.

    Args:
        question: User query text.
        language: Target language ('en', 'kn', 'hi').
        evidence_payload: Verified evidence object from Member 1.

    Returns:
        Formatted prompt string.
    """
    intent = evidence_payload.get("intent", "UNKNOWN")
    status = evidence_payload.get("status", "verified")
    evidence_items = evidence_payload.get("evidence", [])
    calculations = evidence_payload.get("calculations", [])
    metrics = evidence_payload.get("metrics", [])
    entities = evidence_payload.get("entities", {})
    methodology_note = evidence_payload.get("methodologyNote", "")
    limitation_note = evidence_payload.get("limitationNote", "")
    sources = evidence_payload.get("source", [])

    prompt_data = {
        "user_question": question,
        "target_language": language,
        "intent": intent,
        "evidence_status": status,
        "entities_extracted": entities,
        "verified_evidence_items": evidence_items,
        "derived_calculations": calculations,
        "summary_metrics": metrics,
        "sources_used": sources,
        "methodology_note": methodology_note,
        "limitation_note": limitation_note,
    }

    evidence_json_str = json.dumps(prompt_data, indent=2, ensure_ascii=False)

    return f"""USER QUESTION: "{question}"
TARGET RESPONSE LANGUAGE: "{language}" (Respond in English for 'en', Kannada for 'kn', Hindi for 'hi')

VERIFIED EVIDENCE PAYLOAD FROM BARRIERLENS DATA LAYER:
```json
{evidence_json_str}
```

INSTRUCTIONS FOR GENERATING THE RESPONSE:
1. Output a single JSON object with the following schema:
{{
  "answer": "<Explanation text in requested language>",
  "claims": [
    {{
      "text": "<Claim statement>",
      "supported_by": ["<source_file_or_key>"]
    }}
  ],
  "disclaimer": "<Disclaimer string if health/causal query, or null>"
}}

2. If evidence_status is "unavailable" or verified_evidence_items is empty, state clearly that the requested information is not available in the verified BarrierLens data.
3. Ensure no causal claims are made. Use "associated with", "predicts", or "observed rate".
4. Ensure exact numbers match the JSON evidence payload.
"""
