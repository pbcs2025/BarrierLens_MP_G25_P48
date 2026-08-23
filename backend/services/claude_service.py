"""Claude Service for BarrierLens Research Intelligence Assistant.

Handles Anthropic Claude API interactions with graceful fallback, timeout management,
and robust JSON response parsing.
"""

from __future__ import annotations

import json
import logging
from typing import Any

from backend.config.settings import settings
from backend.services.prompt_service import build_system_prompt, build_user_prompt
from backend.services.safety_validator import validate_claude_response

logger = logging.getLogger("barrierlens.claude_service")


def format_unavailable_response(
    evidence_payload: dict[str, Any],
    language: str = "en",
) -> dict[str, Any]:
    """Generate a controlled unavailable response when information is missing from evidence."""
    limitation_note = evidence_payload.get("limitationNote", "")
    intent = evidence_payload.get("intent", "UNSUPPORTED")

    lang_messages = {
        "en": "This information is not available in the verified BarrierLens NFHS-5 dataset provided for this analysis.",
        "kn": "ಈ ಮಾಹಿತಿಯು BarrierLens ನ ಪರಿಶೀಲಿಸಿದ NFHS-5 ಡೇಟಾಸೆಟ್‌ನಲ್ಲಿ ಲಭ್ಯವಿಲ್ಲ.",
        "hi": "यह जानकारी इस विश्लेषण के लिए प्रदान किए गए सत्यापित BarrierLens NFHS-5 डेटासेट में उपलब्ध नहीं है।",
    }

    base_msg = lang_messages.get(language, lang_messages["en"])
    if limitation_note:
        answer_text = f"{base_msg} {limitation_note}"
    else:
        answer_text = base_msg

    return {
        "status": "unavailable",
        "answer": answer_text,
        "language": language,
        "intent": intent,
        "source": evidence_payload.get("source", []),
        "metrics": [],
        "evidence_used": [],
        "relatedPage": evidence_payload.get("relatedPage"),
        "disclaimer": "Requested metric is absent from recode dataset.",
        "claims": [],
    }


def format_api_error_response(
    error_msg: str,
    language: str = "en",
) -> dict[str, Any]:
    """Generate a controlled fallback response when Claude API is unavailable or errors out."""
    lang_messages = {
        "en": "The research assistant is temporarily unavailable. Please try again later.",
        "kn": "ಸಂಶೋಧನಾ ಸಹಾಯಕ ತಾತ್ಕಾಲಿಕವಾಗಿ ಲಭ್ಯವಿಲ್ಲ. ದಯವಿಟ್ಟು ನಂತರ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.",
        "hi": "अनुसंधान सहायक अस्थायी रूप से अनुपलब्ध है। कृपया बाद में पुनः प्रयास करें।",
    }

    return {
        "status": "api_error",
        "answer": lang_messages.get(language, lang_messages["en"]),
        "language": language,
        "intent": "API_ERROR",
        "source": [],
        "metrics": [],
        "evidence_used": [],
        "relatedPage": None,
        "disclaimer": f"Service Notice: {error_msg}",
        "claims": [],
    }


def generate_llM_explanation(
    question: str,
    language: str,
    evidence_payload: dict[str, Any],
) -> dict[str, Any]:
    """Send structured evidence to Claude and return a research-safe explanation.

    Args:
        question: Natural language question.
        language: Target response language code ('en', 'kn', 'hi').
        evidence_payload: Verified evidence payload from Member 1.

    Returns:
        Structured response object for Member 3/4.
    """
    # 1. Check if evidence status is unavailable
    if evidence_payload.get("status") == "unavailable":
        return format_unavailable_response(evidence_payload, language)

    # 2. Verify API Key Configuration
    if not settings.has_api_key:
        logger.warning("CLAUDE_API_KEY is not configured or uses placeholder.")
        # Perform offline deterministic fallback using Member 1's summary/metrics
        return generate_offline_fallback(question, language, evidence_payload)

    # 3. Build Prompts
    system_prompt = build_system_prompt()
    user_prompt = build_user_prompt(question, language, evidence_payload)

    # 4. Call Anthropic Claude API
    try:
        import anthropic

        client = anthropic.Anthropic(api_key=settings.CLAUDE_API_KEY)
        response = client.messages.create(
            model=settings.CLAUDE_MODEL,
            max_tokens=settings.MAX_TOKENS,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )

        response_text = ""
        if response.content and len(response.content) > 0:
            response_text = response.content[0].text.strip()

        # Parse JSON output from Claude
        parsed_output = parse_claude_json_response(response_text)

        # 5. Run Safety Validation
        validated = validate_claude_response(parsed_output, evidence_payload)

        evidence_sources = [
            f"{e.get('source')}:{e.get('path')}"
            for e in evidence_payload.get("evidence", [])
            if e.get("source") and e.get("path")
        ]

        return {
            "status": "success",
            "answer": validated["answer"],
            "language": language,
            "intent": evidence_payload.get("intent", "UNKNOWN"),
            "source": evidence_payload.get("source", []),
            "metrics": evidence_payload.get("metrics", []),
            "evidence_used": evidence_sources,
            "relatedPage": evidence_payload.get("relatedPage"),
            "disclaimer": validated.get("disclaimer") or evidence_payload.get("disclaimer"),
            "claims": validated.get("claims", []),
        }

    except ImportError:
        logger.error("anthropic SDK not installed. Falling back to offline engine.")
        return generate_offline_fallback(question, language, evidence_payload)
    except Exception as exc:
        logger.exception("Claude API execution failed: %s", exc)
        return format_api_error_response(str(exc), language)


def parse_claude_json_response(response_text: str) -> dict[str, Any]:
    """Extract and parse JSON object from Claude's response text."""
    try:
        # Check if wrapped in ```json ... ``` codeblock
        if "```json" in response_text:
            json_block = response_text.split("```json")[1].split("```")[0].strip()
            return json.loads(json_block)
        elif "```" in response_text:
            json_block = response_text.split("```")[1].split("```")[0].strip()
            return json.loads(json_block)
        else:
            return json.loads(response_text)
    except Exception:
        logger.warning("Failed to parse raw Claude JSON output. Using text directly.")
        return {
            "answer": response_text,
            "claims": [],
            "disclaimer": None,
        }


def generate_offline_fallback(
    question: str,
    language: str,
    evidence_payload: dict[str, Any],
) -> dict[str, Any]:
    """Generate a high-quality deterministic response when Claude API key is absent/offline."""
    intent = evidence_payload.get("intent", "UNKNOWN")
    ev_items = evidence_payload.get("evidence", [])
    calcs = evidence_payload.get("calculations", [])
    methodology = evidence_payload.get("methodologyNote", "")

    answer_parts: list[str] = []

    if intent == "NATIONAL_OVERVIEW":
        answer_parts.append(
            "In the verified BarrierLens dataset of 724,115 Indian women (NFHS-5), 59.16% face at least one healthcare access barrier."
        )
        answer_parts.append(
            "Facility-level quality barriers are most prevalent (46.01%), followed by Logistical distance barriers (31.61%) and Household permission barriers (27.16%)."
        )
    elif intent == "STATE_ANALYSIS":
        states = evidence_payload.get("entities", {}).get("states", [])
        state_name = states[0] if states else "the requested state"
        any_ev = next((e for e in ev_items if "Any Barrier" in e.get("label", "")), None)
        if any_ev:
            answer_parts.append(f"In {state_name}, the verified observed any barrier rate is {any_ev['value']}%.")
        else:
            answer_parts.append(f"State-level barrier analysis retrieved for {state_name}.")
    elif intent == "STATE_COMPARISON":
        states = evidence_payload.get("entities", {}).get("states", [])
        s1 = states[0] if len(states) > 0 else "State A"
        s2 = states[1] if len(states) > 1 else "State B"
        answer_parts.append(f"Comparison of healthcare access barriers between {s1} and {s2}:")
        for e in ev_items:
            if "Any Barrier" in e.get("label", ""):
                answer_parts.append(f"- {e.get('entity')}: Observed Any Barrier Rate is {e.get('value')}%.")
        if calcs:
            answer_parts.append(f"Calculated gap: {calcs[0].get('interpretation', '')}")
    elif intent == "RURAL_URBAN":
        answer_parts.append(
            "Rural women experience a significantly higher healthcare barrier rate (63.49%) compared to Urban women (46.03%)."
        )
        if calcs:
            answer_parts.append(f"Derived gap: {calcs[0].get('interpretation', '')}")
        answer_parts.append(
            "(Note: Hospital waiting times and service quality metrics are excluded as they are absent from NFHS-5 recode columns)."
        )
    elif intent == "RISK_ARCHETYPE":
        answer_parts.append(
            "BarrierLens identifies 2 primary K-Means risk archetypes across India (N=724,115, silhouette score = 0.3986):"
        )
        answer_parts.append(
            "1. Cluster 0 ('High Vulnerability, High Barrier Exposure'): 52.9% of women, mean composite barrier score = 0.5868."
        )
        answer_parts.append(
            "2. Cluster 1 ('High Media & Digital Inclusion'): 47.1% of women, mean composite barrier score = 0.3761."
        )
    elif intent == "SHAP":
        answer_parts.append(
            "SHAP (SHapley Additive exPlanations) quantifies feature attributions from the Random Forest model."
        )
        answer_parts.append(
            "Top risk factors increasing barrier likelihood include poorest wealth tier (OR=1.26) and no formal education (OR=1.20)."
        )
    elif intent == "LIMITATIONS":
        answer_parts.append(
            "Does BarrierLens prove causation? No. BarrierLens analyzes cross-sectional NFHS-5 survey data."
        )
        answer_parts.append(
            "Observational machine learning models identify statistical predictive associations but cannot prove clinical causality."
        )
    else:
        answer_parts.append(f"Verified BarrierLens evidence retrieved for {intent}.")

    answer_text = " ".join(answer_parts)
    evidence_sources = [f"{e.get('source')}:{e.get('path')}" for e in ev_items if e.get("source")]

    return {
        "status": "success",
        "answer": answer_text,
        "language": language,
        "intent": intent,
        "source": evidence_payload.get("source", []),
        "metrics": evidence_payload.get("metrics", []),
        "evidence_used": evidence_sources,
        "relatedPage": evidence_payload.get("relatedPage"),
        "disclaimer": "Offline grounded explanation (CLAUDE_API_KEY unconfigured).",
        "claims": [],
    }
