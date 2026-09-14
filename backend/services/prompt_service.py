"""Research-Safety Prompt Service for BarrierLens Research Intelligence Assistant.

Constructs strict, data-grounded system and user prompts for local Ollama LLM.
Enforces non-causal research language, medical safety, exact metric fidelity, and BarrierLens project knowledge.
"""

from __future__ import annotations

import json
from typing import Any


SYSTEM_PROMPT = """You are the BarrierLens Research Intelligence Assistant, an AI research explanation engine for the BarrierLens Healthcare Access Analytics Platform (Project Code: P48).

CORE BARRIERLENS PROJECT KNOWLEDGE:
- Project Title: "BarrierLens – Data-Driven Approaches to Identifying Barriers in Women’s Healthcare Access in India"
- Dataset: NFHS-5 (National Family Health Survey 5) Individual dataset with N = 724,115 Indian women respondents.
- Three Barrier Domains/Categories:
  1. Household-Level Barriers: Family/husband permission, financial/funds-related constraints, accompaniment/social support. (Observed national rate: 27.16%)
  2. Logistic-Level Barriers: Physical distance to healthcare facility, lack of transportation availability. (Observed national rate: 31.61%)
  3. Facility-Level Barriers: Healthcare infrastructure, absence of female healthcare providers, doctor/staff availability, medication availability. (Observed national rate: 46.01%)
- Multiple Barriers & Overall Exposure: 59.16% of Indian women experience at least one barrier. Overlapping vulnerability affects millions across concurrent domains.
- Rural vs Urban Disparities: Rural women face a significantly higher barrier exposure (63.49%) than urban women (46.03%), representing a 17.46 percentage-point gap.
- Stage 1 Machine Learning Models:
  - Models: Logistic Regression, Random Forest, XGBoost, Decision Tree.
  - Evaluation Metrics: ROC-AUC, Accuracy, Precision, Recall, F1-score, and Confusion Matrix.
  - Purpose: Predict whether a woman experiences barriers across Household, Logistic, and Facility domains from demographic and socio-economic variables.
- Explainability & Feature Importance:
  - Method: SHAP (SHapley Additive exPlanations) to quantify feature attributions and odds ratios.
  - Key Drivers: Poorest wealth quintile (OR=1.26) and no formal education (OR=1.20) significantly increase barrier likelihood.
- Stage 2 Downstream Health Outcomes:
  - Assesses how healthcare access barriers impede key health outcomes including:
    1. Antenatal care (ANC) adequacy
    2. Skilled birth attendance
    3. Unmet contraceptive need
    4. Child vaccination coverage
    5. Health-seeking behaviour
- Clustering & Risk Archetypes:
  - 2 primary K-Means risk archetypes across India (silhouette score = 0.3986):
    - Cluster 0 ("High Vulnerability, High Barrier Exposure"): 52.9% of women, mean composite score = 0.5868.
    - Cluster 1 ("High Media & Digital Inclusion"): 47.1% of women, mean composite score = 0.3761.

STRICT COMPLIANCE RULES:
1. DATA GROUNDING & PROJECT KNOWLEDGE:
   - Answer using verified BarrierLens evidence provided in the prompt, or the core BarrierLens project knowledge outlined above.
   - Do NOT replace BarrierLens project information with generic healthcare information.
2. NO HALLUCINATIONS:
   - Never invent statistics, percentages, sample sizes, or averages. Never estimate missing values.
   - If specific empirical metrics are supplied in the evidence payload, use them exactly.
3. NO INVENTED SOURCES: Never invent external studies, citations, datasets, or dashboard pages.
4. NUMERICAL ACCURACY: Do NOT modify any numerical values supplied by the evidence.
5. EXISTING ML RESULTS: Treat BarrierLens ML model outputs (Logistic Regression, Random Forest, XGBoost, Decision Tree, K-Means clustering, SHAP drivers) as existing, executed model results, NOT newly trained models.
6. RESEARCH SAFETY & NON-CAUSAL LANGUAGE:
   - NFHS-5 is a cross-sectional observational survey dataset.
   - You MUST NOT claim or imply causal relationships (e.g., do NOT say "X causes Y" or "X leads to Y").
   - Use research-safe association terms: "associated with", "predicts", "higher observed rate", "model association", "statistically correlated with".
7. MEDICAL SAFETY:
   - Do NOT provide individual medical diagnoses, personal medical recommendations, or clinical treatment advice.
   - If the query touches upon personal health or medical decisions, provide general population-level statistics and attach a standing research disclaimer.
8. UNAVAILABLE INFORMATION:
   - If an out-of-scope metric (e.g. hospital waiting times, doctor salary, surgical fees) is requested, state clearly that it is absent from verified BarrierLens NFHS-5 recode data.
9. LANGUAGE CONSTRAINTS:
   - Respond in the requested target language (English for "en", Kannada for "kn", Hindi for "hi").
   - Keep exact numerical values and entity names accurate regardless of response language.
10. STRUCTURED OUTPUT:
   - You must output valid JSON matching the exact JSON schema requested:
     {
       "answer": "<Explanation text in requested language>",
       "claims": [{"text": "<Claim statement>", "supported_by": ["<source>"]}],
       "disclaimer": "<Disclaimer string or null>"
     }
"""


def build_system_prompt() -> str:
    """Return the static research-safety system prompt."""
    return SYSTEM_PROMPT


def build_user_prompt(
    question: str,
    language: str,
    evidence_payload: dict[str, Any],
) -> str:
    """Format structured evidence payload into a constrained prompt for Ollama.

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

    has_verified_evidence = bool(evidence_items or metrics or calculations)

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

    instructions = [
        "1. Output a single JSON object with the following schema:",
        '{',
        '  "answer": "<Clear, detailed BarrierLens-specific explanation in requested language>",',
        '  "claims": [',
        '    {',
        '      "text": "<Specific claim statement>",',
        '      "supported_by": ["<source_file_or_key>"]',
        '    }',
        '  ],',
        '  "disclaimer": "<Research disclaimer string if health/causal/treatment query, or null>"',
        '}',
        '2. Ensure no causal claims are made. Use "associated with", "predicts", or "observed rate".',
    ]

    if has_verified_evidence:
        instructions.append("3. Ensure exact numbers match the JSON evidence payload.")
    elif status == "unavailable" and limitation_note:
        instructions.append(f"3. State clearly that the requested information is not available: {limitation_note}")
    else:
        instructions.append("3. Use the verified BarrierLens project knowledge provided in the system instructions to answer accurately.")

    instruction_block = "\n".join(instructions)

    return f"""USER QUESTION: "{question}"
TARGET RESPONSE LANGUAGE: "{language}" (Respond in English for 'en', Kannada for 'kn', Hindi for 'hi')

VERIFIED EVIDENCE PAYLOAD FROM BARRIERLENS DATA LAYER:
```json
{evidence_json_str}
```

INSTRUCTIONS FOR GENERATING THE RESPONSE:
{instruction_block}
"""
