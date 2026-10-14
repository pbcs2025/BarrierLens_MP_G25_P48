"""Research-Safety Prompt Service for BarrierLens Research Intelligence Assistant.

Constructs compact, data-grounded system and user prompts for local Ollama LLM.
Enforces non-causal research language, medical safety, numerical fidelity, and allows
answering all user queries intelligently.
"""

from __future__ import annotations

import json
from typing import Any


SYSTEM_PROMPT = """You are BarrierLens AI (Project Code: P48), an expert intelligence assistant analyzing women's healthcare access barriers across India based on NFHS-5 data (N = 724,115). Answer directly, helpfully, and factually. Never refuse.

BARRIER TYPES:
• 🏠 Household: Family permission required, no companion to accompany, lack of financial autonomy.
• 🚗 Logistic: Long physical distance to health facility, lack of transport/roads, travel fares.
• 🏥 Facility: Shortage of female doctors/nurses, provider absenteeism, medicines/diagnostic supplies unavailable.
• ⚠️ Multiple: Co-occurrence across 2+ barrier domains.

CORE FACTS (NFHS-5):
• Overall: 59.16% of women face ≥1 barrier.
• National Prevalence: Facility 46.01% (Rank 1), Logistic 31.61% (Rank 2), Household 27.16% (Rank 3).
• Disparities: Rural 63.49% vs Urban 46.03% (17.46% gap). High barrier: Bihar (66.38%). Low: Kerala (7.58%).
• Key Drivers: Poorest wealth (OR=1.26), No education (OR=1.20).

GOVERNMENT SCHEMES & LINKS (Always format with exact Markdown links):
• Facility: [Free Essential Drugs & Diagnostics](https://nhm.gov.in/), [PMSMA](https://pmsma.nhm.gov.in/), [SUMAN Scheme](https://suman.nhm.gov.in/).
• Logistic: [National Ambulance Service (108/102)](https://eparlib.nic.in/bitstream/123456789/2973427/1/AU2231.pdf), [eSanjeevani Telemedicine](https://esanjeevani.mohfw.gov.in/), [Ayushman Arogya Mandir](https://ab-hwc.nhm.gov.in/).
• Household: [Janani Shishu Suraksha Karyakram (JSSK)](https://www.nhm.gov.in/showlink.php?id=178), [Ayushman Bharat PM-JAY](https://pmjay.gov.in/), [ASHA Programme](https://nhm.gov.in/index1.php?lang=1&level=1&sublinkid=150&lid=226).

RULES:
1. If asked your name: Begin with "My name is BarrierLens".
2. If asked for meaning/explanation: Explain real-world domestic, mobility, or hospital difficulties. Do not recite statistical rates.
3. If asked for solutions/what to do: Provide practical guidance and include exact clickable Markdown links to relevant schemes.
4. Keep answers concise: 1 intro sentence + 2 to 4 bullet points. Respond in the requested language (en/kn/hi)."""


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

    # Detect conceptual explanation queries vs statistical metric queries
    is_metric_query = any(kw in q_lower for kw in (
        "rate", "percentage", "probability", "statistic", "statistics", "number", "figure", "%",
        "ದರ", "ಶೇಕಡಾ", "ಪ್ರಮಾಣ", "ಅಂಕಿಅಂಶ", "ಆಧಾರ",
        "दर", "प्रतिशत", "संभावना", "आंकड़ा", "आंकड़े"
    ))
    is_barrier_concept = any(b in q_lower for b in (
        "household", "logistic", "facility", "barrier", "barriers",
        "ಅಡೆತಡೆ", "ಸೌಲಭ್ಯ", "ಸಾರಿಗೆ", "ಮನೆ",
        "बाधा", "बाधाएं", "अस्पताल", "घरेलू", "परिवहन"
    ))
    is_explanation = any(kw in q_lower for kw in (
        "what do you mean", "what is", "what are", "what does", "meaning", "define",
        "definition", "explain", "tell me about", "describe", "overview",
        "ಏನು", "ವಿವರಣೆ", "ವಿವರಿಸಿ", "ಅರ್ಥ",
        "क्या है", "क्या अर्थ", "मतलब", "समझाइए", "परिभाषा"
    ))
    is_conceptual = is_explanation and is_barrier_concept and not is_metric_query

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
    if not is_conceptual:
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
            for c in calcs[:2]:
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
    if is_conceptual:
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
First write a brief 1-line introductory summary sentence in {lang_name}, followed by 2 to 4 concise bullet points formatted with emojis (e.g., 📊, 🏥, 🚗, 🏠, 📍, 💡). If numerical metrics are listed in the context, explicitly cite the exact percentages or numbers (e.g. 46.01%). Any government schemes mentioned must include their clickable Markdown link (e.g. [JSSK](https://www.nhm.gov.in/showlink.php?id=178)). Respond entirely in {lang_name}:"""



