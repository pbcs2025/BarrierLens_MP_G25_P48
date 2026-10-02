"""Research-Safety Prompt Service for BarrierLens Research Intelligence Assistant.

Constructs compact, data-grounded system and user prompts for local Ollama LLM.
Enforces non-causal research language, medical safety, numerical fidelity, and allows
answering all user queries intelligently.
"""

from __future__ import annotations

import json
from typing import Any


SYSTEM_PROMPT = """You are the BarrierLens AI Research Assistant (Project Code: P48), an expert intelligence assistant analyzing women's healthcare access barriers across India based on the NFHS-5 dataset (N = 724,115 respondents).

CORE GROUNDED FACTS:
- Prevalence: 59.16% of Indian women experience at least one healthcare barrier.
- Three Barrier Domains:
  1. Facility Barrier (46.01%, Rank 1): Absence of female healthcare providers, doctor absence, medication shortages, infrastructure deficits.
  2. Logistic Barrier (31.61%, Rank 2): Distance to healthcare facilities, lack of affordable transportation.
  3. Household Barrier (27.16%, Rank 3): Lack of family/husband permission, financial/funds constraints, inability to travel alone.
- Disparities: Rural women face a significantly higher barrier exposure (63.49%) compared to Urban women (46.03%), representing a 17.46 percentage-point gap.
- Machine Learning Models: Evaluated Stage 1 models include Logistic Regression, Random Forest, XGBoost, and Decision Tree.
- SHAP Feature Drivers: Poorest wealth tier (OR=1.26) and no formal education (OR=1.20) are the top predictive risk factors. Richest wealth tier (OR=0.78) is the strongest protective factor.
- Risk Archetypes (K-Means Clustering, silhouette = 0.3986):
  * Cluster 0 ("High Vulnerability, High Barrier Exposure"): 52.9% of women, mean score = 0.5868.
  * Cluster 1 ("High Media & Digital Inclusion"): 47.1% of women, mean score = 0.3761.
- Downstream Impacts: Healthcare access barriers significantly impede antenatal care (ANC) adequacy, skilled birth attendance, family planning / contraceptive needs, and child vaccination.

RULES:
1. Answer ANY user query helpfully, accurately, and informatively using the core project facts above, any supplied evidence, and domain healthcare knowledge.
2. Provide a clear, well-structured response in 2 to 4 sentences or concise bullet points.
3. Use observational research terms ("associated with", "linked to", "observed rate", "predictive association") rather than causal overclaims ("causes", "caused by").
4. If personal medical diagnosis or treatment advice is requested, clarify that BarrierLens provides population-level research and attach a brief medical disclaimer.
5. Respond in the requested target language (English for 'en', Kannada for 'kn', Hindi for 'hi').
"""


def build_system_prompt() -> str:
    """Return the compact research-safety system prompt."""
    return SYSTEM_PROMPT


def build_user_prompt(
    question: str,
    language: str,
    evidence_payload: dict[str, Any] | None = None,
) -> str:
    """Format user query and optional verified evidence context into a focused prompt.

    Args:
        question: User query text.
        language: Target language ('en', 'kn', 'hi').
        evidence_payload: Optional verified evidence object from data layer.

    Returns:
        Formatted prompt string.
    """
    if evidence_payload is None:
        evidence_payload = {}

    lang_map = {
        "en": "English",
        "kn": "Kannada (ಕನ್ನಡ)",
        "hi": "Hindi (हिंदी)",
    }
    lang_name = lang_map.get(language, "English")

    context_lines: list[str] = []

    # Check for specific evidence items
    ev_items = evidence_payload.get("evidence", [])
    if ev_items and isinstance(ev_items, list):
        for e in ev_items[:5]:
            label = e.get("label", "")
            val = e.get("value", "")
            unit = e.get("unit", "%")
            entity = e.get("entity", "")
            if label and val != "":
                context_lines.append(f"- {entity + ' ' if entity else ''}{label}: {val}{unit}")

    # Check for calculated comparisons
    calcs = evidence_payload.get("calculations", [])
    if calcs and isinstance(calcs, list):
        for c in calcs[:3]:
            interp = c.get("interpretation", "")
            if interp:
                context_lines.append(f"- Derived comparison: {interp}")

    # Check for active barrier
    barrier_ctx = evidence_payload.get("barrierContext", {})
    active_barrier = barrier_ctx.get("barrier") or evidence_payload.get("activeBarrier")
    if active_barrier:
        context_lines.append(f"- Active Barrier Context: {active_barrier}")

    context_str = "\n".join(context_lines) if context_lines else "No specific numerical filter provided; use core BarrierLens facts."

    return f"""USER QUERY: "{question}"
TARGET LANGUAGE: {lang_name}

VERIFIED CONTEXT FROM DATA LAYER:
{context_str}

Please answer the user's query clearly and concisely in {lang_name} in 2-4 sentences or bullet points:"""
