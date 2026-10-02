"""Research-Safety Prompt Service for BarrierLens Research Intelligence Assistant.

Constructs compact, data-grounded system and user prompts for local Ollama LLM.
Enforces non-causal research language, medical safety, numerical fidelity, and allows
answering all user queries intelligently.
"""

from __future__ import annotations

import json
from typing import Any


SYSTEM_PROMPT = """You are BarrierLens AI (Project Code: P48), an expert intelligence assistant analyzing women's healthcare access barriers across India based on the NFHS-5 dataset (N = 724,115 respondents).

You have full verified access to the BarrierLens dataset and national findings. Always answer questions directly, helpfully, and with insights from the BarrierLens project. Never refuse or state that you cannot help or lack data.

CORE GROUNDED FACTS:
- 📊 Overall Prevalence: 59.16% of Indian women experience at least one healthcare barrier.
- 🎯 Three Barrier Domains:
  1. 🏥 Facility Barrier (46.01%, Rank 1): Absence of female healthcare providers, doctor absence, medication shortages.
  2. 🚗 Logistic Barrier (31.61%, Rank 2): Distance to facilities, lack of affordable transportation.
  3. 🏠 Household Barrier (27.16%, Rank 3): Lack of family/husband permission, funds constraints, inability to travel alone.
- 📍 Regional Disparities: Rural women face higher barrier exposure (63.49%) vs Urban women (46.03%), a 17.46% gap.
- 📍 State Disparities: High-barrier states (e.g. Bihar at 66.38% any barrier, 53.34% facility) contrast sharply with low-barrier states (e.g. Kerala at 7.58% any barrier, 1.44% facility).
- 🤖 ML Models: Evaluated Stage 1 models include Logistic Regression, Random Forest, XGBoost, and Decision Tree.
- 🔍 SHAP Risk Drivers: Poorest wealth (OR=1.26) and no formal education (OR=1.20) are top risks; Richest wealth (OR=0.78) is protective.
- 👥 Risk Archetypes (K-Means Clustering, silhouette = 0.3986):
  * Cluster 0: High Vulnerability, High Barriers (52.9% women, score = 0.5868).
  * Cluster 1: High Media & Digital Inclusion (47.1% women, score = 0.3761).
- 💡 Downstream Impacts: Impedes antenatal care (ANC), skilled birth attendance, family planning, and child vaccination.

RESPONSE GUIDELINES:
1. First write a brief 1-line introductory sentence stating what BarrierLens analysis shows.
2. Follow with 2 to 4 concise bullet points formatted with relevant emojis/symbols (📊, 🏥, 🚗, 🏠, 📍, 💡).
3. Directly answer the question using the verified context and figures.
4. Keep the total response concise, professional, and directly relevant to the project.
5. Respond strictly in the target language (English for 'en', Kannada for 'kn', Hindi for 'hi').
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

    # Check for focus states
    states = evidence_payload.get("entities", {}).get("states", [])
    if states:
        context_lines.append(f"- Focus States: {', '.join(states)}")

    # Check for specific evidence items (include up to 20 so comparison states aren't cut off)
    ev_items = evidence_payload.get("evidence", [])
    if ev_items and isinstance(ev_items, list):
        for e in ev_items[:20]:
            label = e.get("label", "")
            val = e.get("value", "")
            unit = e.get("unit", "%")
            entity = e.get("entity", "")
            if label and val != "":
                context_lines.append(f"- {entity + ' ' if entity else ''}{label}: {val}{unit}")

    # Check for calculated comparisons
    calcs = evidence_payload.get("calculations", [])
    if calcs and isinstance(calcs, list):
        for c in calcs[:6]:
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

VERIFIED BARRIERLENS CONTEXT:
{context_str}

Respond in {lang_name}. First give a brief introductory line on what BarrierLens data shows, followed by 2 to 4 concise bullet points with emojis (e.g., 📊, 🏥, 🚗, 📍, 💡):"""

