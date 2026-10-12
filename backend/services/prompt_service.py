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

CONCEPTUAL BARRIER DEFINITIONS:
- 🏠 Household Barrier: Domestic, family, and cultural constraints within the home that restrict women's healthcare access:
  * Family Permission: Requiring explicit permission from the husband, in-laws, or family elders before visiting a clinic or doctor.
  * Companion & Escort: Cultural hesitation, safety concerns, or inability to travel to healthcare centres alone without a companion.
  * Financial Autonomy: Lack of personal money or control over household finances to pay for medical care independently.
- 🚗 Logistic Barrier: Physical, geographical, and mobility constraints in reaching health facilities:
  * Physical Distance: Long distances from the village or home to the nearest health post, dispensary, or hospital.
  * Transport Availability: Lack of reliable, timely public transit, buses, or roads.
  * Travel Expenses: High transportation costs and fares required to commute to facilities.
- 🏥 Facility Barrier: Institutional, operational, and clinical shortcomings at health centres:
  * Lack of Female Providers: Absence of female doctors or nurses, creating cultural discomfort, hesitation, or refusal of medical exams.
  * Provider Absenteeism: Doctors, nurses, or staff absent from duty during operational hours.
  * Medication & Supply Stockouts: Unavailability or shortage of essential medicines and diagnostic testing supplies.
- ⚠️ Multiple Barriers: Co-occurrence of obstacles across two or more domains simultaneously (e.g., both needing family permission and facing medicine stockouts).

CORE GROUNDED FACTS:
- 📊 Overall Prevalence: 59.16% of Indian women experience at least one healthcare barrier.
- 🎯 Barrier Ranking & Rates:
  1. 🏥 Facility Barrier (46.01%, Rank 1)
  2. 🚗 Logistic Barrier (31.61%, Rank 2)
  3. 🏠 Household Barrier (27.16%, Rank 3)
- 📍 Regional Disparities: Rural women face higher barrier exposure (63.49%) vs Urban women (46.03%), a 17.46% gap.
- 📍 State Disparities: High-barrier states (e.g. Bihar at 66.38% any barrier, 53.34% facility) contrast sharply with low-barrier states (e.g. Kerala at 7.58% any barrier, 1.44% facility).
- 🤖 ML Models: Evaluated Stage 1 models include Logistic Regression, Random Forest, XGBoost, and Decision Tree.
- 🔍 SHAP Risk Drivers: Poorest wealth (OR=1.26) and no formal education (OR=1.20) are top risks; Richest wealth (OR=0.78) is protective.
- 👥 Risk Archetypes (K-Means Clustering, silhouette = 0.3986):
  * Cluster 0: High Vulnerability, High Barriers (52.9% women, score = 0.5868).
  * Cluster 1: High Media & Digital Inclusion (47.1% women, score = 0.3761).
- 💡 Downstream Impacts: Impedes antenatal care (ANC), skilled birth attendance, family planning, and child vaccination.

VERIFIED GOVERNMENT SOLUTIONS & PROGRAMMES (Always include clickable Markdown links):
- 🏥 Facility Barriers:
  * [Free Essential Drugs & Diagnostics (NHM)](https://nhm.gov.in/): Free medicines and laboratory tests at public health facilities.
  * [PMSMA (Pradhan Mantri Surakshit Matritva Abhiyan)](https://pmsma.nhm.gov.in/): Free, assured antenatal care on the 9th of every month.
  * [SUMAN Scheme](https://suman.nhm.gov.in/): Assured zero-cost, respectful maternal and newborn healthcare with zero tolerance for denial of services.
  * [LaQshya Programme](https://nhm.gov.in/index1.php?lang=1&level=3&sublinkid=1307&lid=690): Quality improvement in labor rooms and maternity operation theaters.
- 🚗 Logistic Barriers (Transport & Distance):
  * [National Ambulance Service (108/102)](https://eparlib.nic.in/bitstream/123456789/2973427/1/AU2231.pdf): Free emergency ambulance network (108 for emergency, 102 for pregnant women).
  * [eSanjeevani National Telemedicine Service](https://esanjeevani.mohfw.gov.in/): Remote doctor consultations from home or Ayushman Arogya Mandirs (over 56% female patients).
  * [Ayushman Arogya Mandir](https://ab-hwc.nhm.gov.in/): Decentralized Comprehensive Primary Health Care centers closer to rural homes.
- 🏠 Household Barriers (Financial & Autonomy):
  * [Janani Shishu Suraksha Karyakram (JSSK)](https://www.nhm.gov.in/showlink.php?id=178): 100% free delivery, medicines, diagnostics, food, and transport home to facility.
  * [Ayushman Bharat PM-JAY](https://pmjay.gov.in/): Public health assurance covering secondary/tertiary hospital care for low-income families.
  * [ASHA Workers Programme](https://nhm.gov.in/index1.php?lang=1&level=1&sublinkid=150&lid=226): Community health volunteers supporting healthcare navigation and escorting women.

RESPONSE GUIDELINES:
1. If the user asks for your name or who you are (e.g. "what is your name", "who are you"), always start with: "My name is BarrierLens".
2. If the user asks for an explanation or meaning (e.g. "what is", "what do you mean by", "explain"), explain the real-life domestic, transport, or facility reasons conceptually in plain language. Do NOT recite statistical rates or probabilities.
3. When the user asks what to do, what solutions exist, or how to overcome a barrier, provide practical guidance and include relevant government schemes with their exact clickable Markdown links (e.g. [JSSK](https://www.nhm.gov.in/showlink.php?id=178), [PM-JAY](https://pmjay.gov.in/)) so users can visit the websites directly.
4. Keep the total response concise, professional, and directly relevant to the project.
5. Respond strictly in the target language (English for 'en', Kannada for 'kn', Hindi for 'hi').
"""


def build_system_prompt() -> str:
    """Return the compact research-safety system prompt."""
    return SYSTEM_PROMPT


def normalize_language_code(language_input: str | None) -> tuple[str, str]:
    """Normalize raw language inputs to standard code ('en', 'kn', 'hi') and display name."""
    raw = str(language_input or "en").strip().lower()
    if "kn" in raw or "kannada" in raw or "ಕನ್ನಡ" in raw:
        return "kn", "Kannada (ಕನ್ನಡ)"
    if "hi" in raw or "hindi" in raw or "हिंदी" in raw or "ಹಿन्दी" in raw:
        return "hi", "Hindi (हिंदी)"
    return "en", "English"


def build_user_prompt(
    question: str,
    language: str,
    evidence_payload: dict[str, Any] | None = None,
) -> str:
    """Format user query and optional verified evidence context into a focused prompt.

    Args:
        question: User query text.
        language: Target language ('en', 'kn', 'hi', 'Kannada', 'Hindi', etc.).
        evidence_payload: Optional verified evidence object from data layer.

    Returns:
        Formatted prompt string with explicit response-language instruction.
    """
    if evidence_payload is None:
        evidence_payload = {}

    lang_code, lang_name = normalize_language_code(language)
    q_lower = (question or "").lower()

    # Detect explanation queries
    is_explanation = any(kw in q_lower for kw in (
        "what do you mean", "what is", "what are", "what does", "meaning", "define",
        "definition", "explain", "tell me about", "describe", "overview",
        "ಏನು", "ವಿವರಣೆ", "ವಿವರಿಸಿ", "ಅರ್ಥ",
        "क्या है", "क्या अर्थ", "मतलब", "समझाइए", "परिभाषा"
    ))

    # Detect solution / recommendation queries
    is_solutions_request = any(kw in q_lower for kw in (
        "what should i do", "what should we do", "what to do", "what can be done",
        "what can i do", "how to solve", "how to overcome", "solutions", "solution",
        "recommendation", "recommendations", "intervention", "interventions",
        "schemes", "government scheme", "remedy", "remedies", "help",
        "ಏನು ಮಾಡಬೇಕು", "ಏನು ಮಾಡಬಹುದು", "ಪರಿಹಾರ", "ಯೋಜನೆ", "ಉಪಾಯ",
        "क्या करना चाहिए", "क्या किया जा सकता है", "समाधान", "उपाय", "योजनाएं"
    ))

    context_lines: list[str] = []

    # Check for focus states
    states = evidence_payload.get("entities", {}).get("states", [])
    if states:
        context_lines.append(f"- Focus States: {', '.join(states)}")

    # Only include raw numerical metrics if the user is NOT asking for a purely conceptual explanation
    if not is_explanation:
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

    # Check for name/identity query
    if any(p in q_lower for p in ("your name", "who are you", "what are you called", "what is your name", "what's your name", "tell me your name", "ನಿಮ್ಮ ಹೆಸರೇನು", "आपका नाम")):
        context_lines.append("- Name Directive: The user is explicitly asking for your name. You must start your answer with 'My name is BarrierLens'.")

    # Check for active barrier
    barrier_ctx = evidence_payload.get("barrierContext", {})
    active_barrier = barrier_ctx.get("barrier") or evidence_payload.get("activeBarrier")
    if active_barrier:
        context_lines.append(f"- Active Barrier Context: {active_barrier}")

    # Add specific instructions based on query intent
    if is_explanation:
        context_lines.append(
            "- EXPLANATION DIRECTIVE: The user is asking for a conceptual EXPLANATION of what the barrier means in women's healthcare access. "
            "Clearly explain the real-world obstacles (such as family permission, traveling without a companion, distance, lack of female doctors, or medicine shortages) in plain words. "
            "Do NOT output statistical rates, percentages, or probabilities (do NOT recite observed rates or predicted probabilities). "
            "If mentioning solutions or schemes, provide their clickable Markdown links (e.g. [JSSK](https://www.nhm.gov.in/showlink.php?id=178), [PM-JAY](https://pmjay.gov.in/))."
        )

    if is_solutions_request:
        context_lines.append(
            "- SOLUTIONS DIRECTIVE: The user is asking what to do or what solutions/schemes exist. "
            "Provide actionable steps and always include relevant verified government schemes formatted as clickable Markdown links with their official URLs "
            "(e.g. [Janani Shishu Suraksha Karyakram (JSSK)](https://www.nhm.gov.in/showlink.php?id=178), [Ayushman Bharat PM-JAY](https://pmjay.gov.in/), "
            "[National Ambulance Service (108/102)](https://eparlib.nic.in/bitstream/123456789/2973427/1/AU2231.pdf), [eSanjeevani Telemedicine](https://esanjeevani.mohfw.gov.in/), "
            "[SUMAN Scheme](https://suman.nhm.gov.in/), [PMSMA](https://pmsma.nhm.gov.in/), [Ayushman Arogya Mandir](https://ab-hwc.nhm.gov.in/), [ASHA Programme](https://nhm.gov.in/index1.php?lang=1&level=1&sublinkid=150&lid=226)). "
            "Every scheme mentioned must have its exact clickable link."
        )

    context_str = "\n".join(context_lines) if context_lines else "No specific numerical filter provided; use core BarrierLens facts."

    if lang_code == "kn":
        lang_instruction = "Respond entirely in Kannada (ಕನ್ನಡ). Do not translate the question only; provide the complete, detailed, actual answer in Kannada script."
    elif lang_code == "hi":
        lang_instruction = "Respond entirely in Hindi (हिंदी). Do not translate the question only; provide the complete, detailed, actual answer in Devanagari Hindi script."
    else:
        lang_instruction = "Respond entirely in English. Provide the complete, detailed, actual answer in English."

    return f"""USER QUERY: "{question}"
TARGET LANGUAGE: {lang_name} ({lang_code})

VERIFIED BARRIERLENS CONTEXT:
{context_str}

EXPLICIT LANGUAGE INSTRUCTION:
{lang_instruction}
First write a brief 1-line introductory summary sentence in {lang_name}, followed by 2 to 4 concise bullet points formatted with emojis (e.g., 📊, 🏥, 🚗, 🏠, 📍, 💡). Any government schemes mentioned must include their clickable Markdown link (e.g. [JSSK](https://www.nhm.gov.in/showlink.php?id=178)). Respond entirely in {lang_name}:"""



