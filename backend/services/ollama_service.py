"""Ollama Service for BarrierLens Research Intelligence Assistant.

Handles local Ollama interactions with multi-turn conversation support,
dynamic model resolution (prioritizing fast lightweight models), graceful
offline fallback, non-causal sanitization, and research safety validation.
"""

from __future__ import annotations

import json
import logging
from typing import Any

from backend.config.settings import settings
from backend.services.prompt_service import build_system_prompt, build_user_prompt
from backend.services.safety_validator import validate_llm_response

logger = logging.getLogger("barrierlens.ollama_service")


def format_unavailable_response(
    evidence_payload: dict[str, Any],
    language: str = "en",
) -> dict[str, Any]:
    """Generate a controlled response when information is absent from evidence."""
    limitation_note = evidence_payload.get("limitationNote", "")
    intent = evidence_payload.get("intent", "UNSUPPORTED")

    lang_messages = {
        "en": "This information is not directly captured in the NFHS-5 dataset recode columns.",
        "kn": "ಈ ಮಾಹಿತಿಯು NFHS-5 ಡೇಟಾಸೆಟ್‌ನಲ್ಲಿ ನೇರವಾಗಿ ಲಭ್ಯವಿಲ್ಲ.",
        "hi": "यह जानकारी NFHS-5 डेटासेट में सीधे उपलब्ध नहीं है।",
    }

    base_msg = lang_messages.get(language, lang_messages["en"])
    answer_text = f"{base_msg} {limitation_note}".strip() if limitation_note else base_msg

    return {
        "status": "unavailable",
        "answer": answer_text,
        "response": answer_text,
        "language": language,
        "intent": intent,
        "source": evidence_payload.get("source", []),
        "metrics": [],
        "evidence_used": [],
        "relatedPage": evidence_payload.get("relatedPage"),
        "disclaimer": "Requested metric is absent from NFHS-5 survey variables.",
        "claims": [],
    }


def format_ollama_error_response(
    error_type: str,
    details: str = "",
    language: str = "en",
) -> dict[str, Any]:
    """Generate user-friendly, structured error responses for Ollama conditions."""
    if error_type == "offline":
        msg_map = {
            "en": "The AI assistant service is currently offline. Please ensure Ollama and backend are running.",
            "kn": "AI ಸಹಾಯಕ ಸೇವೆ ಪ್ರಸ್ತುತ ಆಫ್‌ಲೈನ್‌ನಲ್ಲಿದೆ. ದಯವಿಟ್ಟು Ollama ಚಾಲನೆಯಲ್ಲಿದೆ ಎಂದು ಖಚಿತಪಡಿಸಿಕೊಳ್ಳಿ.",
            "hi": "AI सहायक सेवा वर्तमान में ऑफ़लाइन है। कृपया सुनिश्चित करें कि Ollama चल रहा है।",
        }
        disclaimer = f"Service Notice: Unable to reach Ollama at {settings.OLLAMA_BASE_URL}."
    elif error_type == "timeout":
        msg_map = {
            "en": "The request timed out. Generating concise response.",
            "kn": "ವಿನಂತಿ ಸಮಯ ಮೀರಿದೆ.",
            "hi": "अनुरोध का समय समाप्त हो गया।",
        }
        disclaimer = "Service Notice: Request timed out."
    else:
        msg_map = {
            "en": "The research assistant encountered a processing issue. Please try again.",
            "kn": "ಸಂಶೋಧನಾ ಸಹಾಯಕದಲ್ಲಿ ಸಮಸ್ಯೆಯಾಗಿದೆ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.",
            "hi": "अनुसंधान सहायक में एक समस्या आई। कृपया पुनः प्रयास करें।",
        }
        disclaimer = f"Service Notice: {details}" if details else "Service Notice: Processing issue."

    ans = msg_map.get(language, msg_map["en"])
    return {
        "status": "api_error",
        "answer": ans,
        "response": ans,
        "language": language,
        "intent": "API_ERROR",
        "source": [],
        "metrics": [],
        "evidence_used": [],
        "relatedPage": None,
        "disclaimer": disclaimer,
        "claims": [],
    }


def format_api_error_response(
    error_msg: str,
    language: str = "en",
) -> dict[str, Any]:
    """Generate fallback response for general API errors."""
    return format_ollama_error_response("general", error_msg, language)


def parse_llm_json_response(response_text: str) -> dict[str, Any]:
    """Extract and parse structured JSON or clean markdown from LLM output."""
    cleaned = response_text.strip()
    try:
        if "```json" in cleaned:
            json_block = cleaned.split("```json")[1].split("```")[0].strip()
            return json.loads(json_block)
        elif "```" in cleaned:
            json_block = cleaned.split("```")[1].split("```")[0].strip()
            return json.loads(json_block)
        elif cleaned.startswith("{") and cleaned.endswith("}"):
            return json.loads(cleaned)
    except Exception:
        pass

    # Treat as direct text answer
    # Strip any enclosing quotes if model returned raw quoted string
    if cleaned.startswith('"') and cleaned.endswith('"') and len(cleaned) > 2:
        cleaned = cleaned[1:-1].strip()

    return {
        "answer": cleaned,
        "response": cleaned,
        "claims": [],
        "disclaimer": None,
    }


def call_ollama(
    messages: list[dict[str, str]],
    model: str | None = None,
    timeout: int | None = None,
) -> str:
    """Call Ollama chat API with optimized thread, context, and token options.

    Uses the official ollama Python SDK with automatic fallback to urllib.
    """
    model_name = model or settings.OLLAMA_MODEL
    timeout_sec = timeout or settings.OLLAMA_TIMEOUT

    gen_options = {
        "temperature": 0.3,
        "num_predict": settings.MAX_TOKENS,
        "num_ctx": settings.NUM_CTX,
        "num_thread": settings.NUM_THREADS,
    }

    try:
        import ollama

        client = ollama.Client(host=settings.OLLAMA_BASE_URL, timeout=timeout_sec)
        response = client.chat(
            model=model_name,
            messages=messages,
            stream=False,
            options=gen_options,
        )
        if isinstance(response, dict):
            return response.get("message", {}).get("content", "")
        return getattr(response.message, "content", "")
    except Exception as sdk_err:
        logger.debug("Ollama SDK call failed (%s), attempting urllib fallback.", sdk_err)

    # Fallback to direct HTTP request using urllib
    import urllib.error
    import urllib.request

    url = f"{settings.OLLAMA_BASE_URL}/api/chat"
    payload = {
        "model": model_name,
        "messages": messages,
        "stream": False,
        "options": gen_options,
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout_sec) as resp:
        body = json.loads(resp.read().decode("utf-8"))
        return body.get("message", {}).get("content", "")


def generate_llm_explanation(
    question: str,
    language: str = "en",
    evidence_payload: dict[str, Any] | None = None,
    history: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Send question, history, and evidence to local Ollama and return research-safe explanation.

    Args:
        question: User query text.
        language: Target response language code ('en', 'kn', 'hi').
        evidence_payload: Verified evidence payload or empty dictionary.
        history: Prior conversation turns list for multi-turn follow-up context.

    Returns:
        Structured response object adhering to the BarrierLens response schema.
    """
    if evidence_payload is None:
        evidence_payload = {}

    # 1. Build prompts
    system_prompt = build_system_prompt()
    user_prompt = build_user_prompt(question, language, evidence_payload)

    # 2. Assemble multi-turn conversation messages
    messages: list[dict[str, str]] = [{"role": "system", "content": system_prompt}]

    if history and isinstance(history, list):
        for turn in history[-6:]:  # Keep recent 6 turns for optimal context
            if not isinstance(turn, dict):
                continue
            role = str(turn.get("role") or turn.get("speaker") or "user").lower()
            content = str(turn.get("content") or turn.get("text") or turn.get("message") or "").strip()
            if not content:
                continue

            if role in ("user", "human", "u"):
                messages.append({"role": "user", "content": content})
            elif role in ("assistant", "bot", "ai", "system_reply"):
                messages.append({"role": "assistant", "content": content})

    messages.append({"role": "user", "content": user_prompt})

    # 3. Call Ollama with safety & error fallback
    active_model = settings.OLLAMA_MODEL
    try:
        response_text = call_ollama(
            messages=messages,
            model=active_model,
            timeout=settings.OLLAMA_TIMEOUT,
        )

        parsed_output = parse_llm_json_response(response_text)

        # 4. Run Safety Validation (causal language sanitization & medical disclaimer)
        validated = validate_llm_response(parsed_output, evidence_payload)

        evidence_sources = [
            f"{e.get('source')}:{e.get('path')}"
            for e in evidence_payload.get("evidence", [])
            if isinstance(e, dict) and e.get("source") and e.get("path")
        ]

        ans = validated.get("answer") or validated.get("response") or response_text.strip()
        return {
            "status": "success",
            "answer": ans,
            "response": ans,
            "language": language,
            "intent": evidence_payload.get("intent", "GENERAL"),
            "source": evidence_payload.get("source", ["NFHS-5 (2019-21)"]),
            "metrics": evidence_payload.get("metrics", []),
            "evidence_used": evidence_sources,
            "relatedPage": evidence_payload.get("relatedPage"),
            "disclaimer": validated.get("disclaimer") or evidence_payload.get("disclaimer"),
            "claims": validated.get("claims", []),
            "model": active_model,
        }

    except Exception as exc:
        exc_str = str(exc).lower()
        logger.warning("Ollama execution failed (%s). Checking deterministic fallback.", exc)

        # If deterministic fallback can fulfill query, use it
        fallback = generate_offline_fallback(question, language, evidence_payload)
        if fallback.get("answer"):
            return fallback

        # Connection / Offline check
        if any(term in exc_str for term in ("connect", "refused", "offline", "unreachable", "11434")):
            return format_ollama_error_response("offline", str(exc), language)

        # Missing model check
        if any(term in exc_str for term in ("not found", "404", "model")):
            return format_ollama_error_response("model_missing", str(exc), language)

        # Timeout check
        if any(term in exc_str for term in ("timeout", "timed out")):
            return format_ollama_error_response("timeout", str(exc), language)

        return format_ollama_error_response("general", "LLM execution failed.", language)


def generate_offline_fallback(
    question: str,
    language: str,
    evidence_payload: dict[str, Any],
) -> dict[str, Any]:
    """Generate a high-quality deterministic response when Ollama is unavailable."""
    intent = evidence_payload.get("intent", "UNKNOWN")
    ev_items = evidence_payload.get("evidence", [])
    calcs = evidence_payload.get("calculations", [])
    q_lower = (question or "").lower()

    answer_parts: list[str] = []

    if intent == "NATIONAL_OVERVIEW" or "overview" in q_lower or "what is barrierlens" in q_lower:
        answer_parts.append(
            "BarrierLens analyzes NFHS-5 survey data across 724,115 Indian women. Nationwide, 59.16% of women face at least one healthcare access barrier."
        )
        answer_parts.append(
            "Facility barriers are most common (46.01%), followed by Logistic distance barriers (31.61%) and Household permission barriers (27.16%)."
        )
    elif intent == "STATE_ANALYSIS" or "state" in q_lower:
        states = evidence_payload.get("entities", {}).get("states", [])
        state_name = states[0] if states else "the requested state"
        any_ev = next((e for e in ev_items if isinstance(e, dict) and "Any Barrier" in e.get("label", "")), None)
        if any_ev:
            answer_parts.append(f"In {state_name}, the verified observed any barrier rate is {any_ev['value']}%.")
        else:
            answer_parts.append(f"State-level barrier analysis retrieved for {state_name}.")
    elif intent == "STATE_COMPARISON" or "compare" in q_lower:
        states = evidence_payload.get("entities", {}).get("states", [])
        s1 = states[0] if len(states) > 0 else "State A"
        s2 = states[1] if len(states) > 1 else "State B"
        answer_parts.append(f"Comparison of healthcare access barriers between {s1} and {s2}:")
        for e in ev_items:
            if isinstance(e, dict) and "Any Barrier" in e.get("label", ""):
                answer_parts.append(f"- {e.get('entity')}: Observed Any Barrier Rate is {e.get('value')}%.")
        if calcs:
            answer_parts.append(f"Calculated gap: {calcs[0].get('interpretation', '')}")
    elif intent == "RURAL_URBAN" or "rural" in q_lower or "urban" in q_lower:
        answer_parts.append(
            "Rural women experience a significantly higher healthcare barrier rate (63.49%) compared to Urban women (46.03%), representing a 17.46 percentage point gap."
        )
        if calcs:
            answer_parts.append(f"Derived gap: {calcs[0].get('interpretation', '')}")
    elif intent == "RISK_ARCHETYPE" or "cluster" in q_lower or "archetype" in q_lower:
        answer_parts.append(
            "BarrierLens identifies 2 primary K-Means risk archetypes across India (N=724,115, silhouette score = 0.3986):"
        )
        answer_parts.append(
            "1. Cluster 0 ('High Vulnerability, High Barrier Exposure'): 52.9% of women, mean composite score = 0.5868."
        )
        answer_parts.append(
            "2. Cluster 1 ('High Media & Digital Inclusion'): 47.1% of women, mean composite score = 0.3761."
        )
    elif intent == "SHAP" or "model" in q_lower or "feature" in q_lower or "xgboost" in q_lower:
        answer_parts.append(
            "SHAP attributions from Stage 1 Machine Learning models identify poorest wealth quintile (OR=1.26) and no formal education (OR=1.20) as top barrier risk factors."
        )
    elif intent == "LIMITATIONS" or "causation" in q_lower:
        answer_parts.append(
            "BarrierLens uses cross-sectional NFHS-5 survey data. Observational machine learning identifies strong statistical associations and predictive patterns, but does not establish clinical causality."
        )
    else:
        answer_parts.append(
            "BarrierLens provides data-driven research on women's healthcare access in India (NFHS-5, N=724,115). 59.16% of women face at least one barrier across Facility (46.01%), Logistic (31.61%), and Household (27.16%) domains."
        )

    answer_text = " ".join(answer_parts)
    evidence_sources = [
        f"{e.get('source')}:{e.get('path')}"
        for e in ev_items
        if isinstance(e, dict) and e.get("source")
    ]

    return {
        "status": "success",
        "answer": answer_text,
        "response": answer_text,
        "language": language,
        "intent": intent,
        "source": evidence_payload.get("source", ["NFHS-5 (2019-21)"]),
        "metrics": evidence_payload.get("metrics", []),
        "evidence_used": evidence_sources,
        "relatedPage": evidence_payload.get("relatedPage"),
        "disclaimer": "Offline grounded explanation (Ollama service unavailable).",
        "claims": [],
    }


# Backwards compatibility aliases
generate_llM_explanation = generate_llm_explanation
parse_claude_json_response = parse_llm_json_response
