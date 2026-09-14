"""Ollama Service for BarrierLens Research Intelligence Assistant.

Handles local Ollama (llama3.2:3b) interactions with multi-turn conversation support,
graceful error handling (offline, missing model, timeout), and research safety validation.
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
    """Generate a controlled unavailable response when information is missing from evidence."""
    limitation_note = evidence_payload.get("limitationNote", "")
    intent = evidence_payload.get("intent", "UNSUPPORTED")

    lang_messages = {
        "en": "This information is not available in the verified BarrierLens NFHS-5 dataset provided for this analysis.",
        "kn": "\u0c88 \u0cae\u0cbe\u0cb9\u0cbf\u0ca4\u0cbf\u0caf\u0cc1 BarrierLens \u0ca8 \u0caa\u0cb0\u0cbf\u0cb6\u0cc0\u0cb2\u0cbf\u0cb8\u0cbf\u0ca6 NFHS-5 \u0ca1\u0cc7\u0c9f\u0cbe\u0cb8\u0cc6\u0c9f\u0ccd\u200c\u0ca8\u0cb2\u0ccd\u0cb2\u0cbf \u0cb2\u0cad\u0ccd\u0caf\u0cb5\u0cbf\u0cb2\u0ccd\u0cb2.",
        "hi": "\u092f\u0939 \u091c\u093e\u0928\u0915\u093e\u0930\u0940 \u0907\u0938 \u0935\u093f\u0936\u094d\u0932\u0947\u0937\u0923 \u0915\u0947 \u0932\u093f\u090f \u092a\u094d\u0930\u0926\u093e\u0928 \u0915\u093f\u090f \u0917\u090f \u0938\u0924\u094d\u092f\u093e\u092a\u093f\u0924 BarrierLens NFHS-5 \u0921\u0947\u091f\u093e\u0938\u0947\u091f \u092e\u0947\u0902 \u0909\u092a\u0932\u092c\u094d\u0927 \u0928\u0939\u0940\u0902 \u0939\u0948\u0964",
    }

    base_msg = lang_messages.get(language, lang_messages["en"])
    if limitation_note:
        answer_text = f"{base_msg} {limitation_note}"
    else:
        answer_text = base_msg

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
        "disclaimer": "Requested metric is absent from recode dataset.",
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
            "en": "Unable to connect to the BarrierLens AI service. Please make sure the backend and Ollama are running.",
            "kn": "BarrierLens AI \u0cb8\u0cc7\u0cb5\u0cc6\u0c97\u0cc6 \u0cb8\u0c82\u0caa\u0cb0\u0ccd\u0c95\u0cbf\u0cb8\u0cb2\u0cc1 \u0cb8\u0cbe\u0ca7\u0ccd\u0caf\u0cb5\u0cbf\u0cb2\u0ccd\u0cb2. \u0ca6\u0caf\u0cb5\u0cbf\u0c9f\u0ccd\u0c9f\u0cc1 \u0cac\u0ccd\u0caf\u0cbe\u0c95\u0cc6\u0c82\u0ca1\u0ccd \u0cae\u0ca4\u0ccd\u0ca4\u0cc1 Ollama \u0c9a\u0cbe\u0cb2\u0ca8\u0cc6\u0caf\u0cb2\u0ccd\u0cb2\u0cbf\u0ca6\u0cc6 \u0c8e\u0c82\u0ca6\u0cc1 \u0c96\u0c9a\u0cbf\u0ca4\u0caa\u0ca1\u0cbf\u0cb8\u0cbf\u0c95\u0cca\u0cb3\u0ccd\u0cb3\u0cbf.",
            "hi": "BarrierLens AI \u0938\u0947\u0935\u093e \u0938\u0947 \u0915\u0928\u0947\u0915\u094d\u091f \u0915\u0930\u0928\u0947 \u092e\u0947\u0902 \u0905\u0938\u092e\u0930\u094d\u0925\u0964 \u0915\u0943\u092a\u092f\u093e \u0938\u0941\u0928\u093f\u0936\u094d\u091a\u093f\u0924 \u0915\u0930\u0947\u0902 \u0915\u093f \u092c\u0948\u0915\u090f\u0902\u0921 \u0914\u0930 Ollama \u091a\u0932 \u0930\u0939\u0947 \u0939\u0948\u0902\u0964",
        }
        disclaimer = f"Service Notice: Unable to reach Ollama at {settings.OLLAMA_BASE_URL}."
    elif error_type == "model_missing":
        msg_map = {
            "en": f"The model {settings.OLLAMA_MODEL} needs to be installed. Please run 'ollama pull {settings.OLLAMA_MODEL}'.",
            "kn": f"{settings.OLLAMA_MODEL} \u0cae\u0cbe\u0ca6\u0cb0\u0cbf\u0caf\u0ca8\u0ccd\u0ca8\u0cc1 \u0cb8\u0ccd\u0ca5\u0cbe\u0caa\u0cbf\u0cb8\u0cc1\u0cb5 \u0c85\u0c97\u0ca4\u0ccd\u0caf\u0cb5\u0cbf\u0ca6\u0cc6. \u0ca6\u0caf\u0cb5\u0cbf\u0c9f\u0ccd\u0c9f\u0cc1 'ollama pull {settings.OLLAMA_MODEL}' \u0c9a\u0cb2\u0cbe\u0caf\u0cbf\u0cb8\u0cbf.",
            "hi": f"{settings.OLLAMA_MODEL} \u092e\u094a\u0921\u0932 \u0938\u094d\u0925\u093e\u092a\u093f\u0924 \u0915\u0930\u0928\u0947 \u0915\u0940 \u0906\u0935\u0936\u094d\u092f\u0915\u0924\u093e \u0939\u0948\u0964 \u0915\u0943\u092a\u092f\u093e 'ollama pull {settings.OLLAMA_MODEL}' \u091a\u0932\u093e\u090f\u0901\u0964",
        }
        disclaimer = f"Service Notice: Model '{settings.OLLAMA_MODEL}' not found."
    elif error_type == "timeout":
        msg_map = {
            "en": "The BarrierLens AI assistant timed out while generating a response. Please try again.",
            "kn": "\u0caa\u0ccd\u0cb0\u0ca4\u0cbf\u0c95\u0ccd\u0cb0\u0cbf\u0caf\u0cc6\u0caf\u0ca8\u0ccd\u0ca8\u0cc1 \u0cb0\u0c9a\u0cbf\u0cb8\u0cc1\u0cb5\u0cbe\u0c97 BarrierLens AI \u0cb8\u0cb9\u0cbe\u0caf\u0c95\u0ca8 \u0cb8\u0cae\u0caf \u0cae\u0cc0\u0cb0\u0cbf\u0ca6\u0cc6. \u0ca6\u0caf\u0cb5\u0cbf\u0c9f\u0ccd\u0c9f\u0cc1 \u0cae\u0ca4\u0ccd\u0ca4\u0cc6 \u0caa\u0ccd\u0cb0\u0caf\u0ca4\u0ccd\u0ca8\u0cbf\u0cb8\u0cbf.",
            "hi": "\u092a\u094d\u0930\u0924\u093f\u0915\u094d\u0930\u093f\u092f\u093e \u0909\u0924\u094d\u092a\u0928\u094d\u0928 \u0915\u0930\u0924\u0947 \u0938\u092e\u092f BarrierLens AI \u0938\u0939\u093e\u092f\u0915 \u0915\u093e \u0938\u092e\u092f \u0938\u092e\u093e\u092a\u094d\u0924 \u0939\u094b \u0917\u092f\u093e\u0964 \u0915\u0943\u092a\u092f\u093e \u092a\u0941\u0928\u0903 \u092a\u094d\u0930\u092f\u093e\u0938 \u0915\u0930\u0947\u0902\u0964",
        }
        disclaimer = "Service Notice: Request timed out."
    else:
        msg_map = {
            "en": "The research assistant is temporarily unavailable. Please try again later.",
            "kn": "\u0cb8\u0c82\u0cb6\u0ccb\u0ca7\u0ca8\u0cbe \u0cb8\u0cb9\u0cbe\u0caf\u0c95 \u0ca4\u0cbe\u0ca4\u0ccd\u0c95\u0cbe\u0cb2\u0cbf\u0c95\u0cb5\u0cbe\u0c97\u0cbf \u0cb2\u0cad\u0ccd\u0caf\u0cb5\u0cbf\u0cb2\u0ccd\u0cb2. \u0ca6\u0caf\u0cb5\u0cbf\u0c9f\u0ccd\u0c9f\u0cc1 \u0ca8\u0c82\u0ca4\u0cb0 \u0cae\u0ca4\u0ccd\u0ca4\u0cc6 \u0caa\u0ccd\u0cb0\u0caf\u0ca4\u0ccd\u0ca8\u0cbf\u0cb8\u0cbf.",
            "hi": "\u0905\u0928\u0941\u0938\u0902\u0927\u093e\u0928 \u0938\u0939\u093e\u092f\u0915 \u0905\u0938\u094d\u0925\u093e\u092f\u0940 \u0930\u0942\u092a \u0938\u0947 \u0905\u0928\u0941\u092a\u0932\u092c\u094d\u0927 \u0939\u0948\u0964 \u0915\u0943\u092a\u092f\u093e \u092c\u093e\u0926 \u092e\u0947\u0902 \u092a\u0941\u0928\u0903 \u092a\u094d\u0930\u092f\u093e\u0938 \u0915\u0930\u0947\u0902\u0964",
        }
        disclaimer = f"Service Notice: {details}" if details else "Service Notice: Internal processing error."

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
    """Extract and parse JSON object from LLM response text."""
    try:
        cleaned = response_text.strip()
        if "```json" in cleaned:
            json_block = cleaned.split("```json")[1].split("```")[0].strip()
            return json.loads(json_block)
        elif "```" in cleaned:
            json_block = cleaned.split("```")[1].split("```")[0].strip()
            return json.loads(json_block)
        else:
            return json.loads(cleaned)
    except Exception:
        logger.warning("Failed to parse structured JSON from Ollama response. Using text directly.")
        ans = response_text.strip()
        return {
            "answer": ans,
            "response": ans,
            "claims": [],
            "disclaimer": None,
        }


def call_ollama(
    messages: list[dict[str, str]],
    model: str,
    timeout: int = 120,
) -> str:
    """Call Ollama chat API using the ollama SDK with fallback to direct HTTP."""
    try:
        import ollama

        client = ollama.Client(host=settings.OLLAMA_BASE_URL, timeout=timeout)
        response = client.chat(
            model=model,
            messages=messages,
            format="json",
            options={
                "temperature": 0.2,
                "num_predict": settings.MAX_TOKENS,
            },
        )
        if isinstance(response, dict):
            return response.get("message", {}).get("content", "")
        return getattr(response.message, "content", "")
    except ImportError:
        # Fallback to direct HTTP request using urllib
        import urllib.request
        import urllib.error

        url = f"{settings.OLLAMA_BASE_URL}/api/chat"
        payload = {
            "model": model,
            "messages": messages,
            "stream": False,
            "format": "json",
            "options": {
                "temperature": 0.2,
                "num_predict": settings.MAX_TOKENS,
            },
        }
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=data,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=timeout) as resp:
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

    # 1. Check if evidence status is explicitly unavailable with limitation note
    # (e.g. out-of-scope query like hospital waiting time or doctor salary)
    if evidence_payload.get("status") == "unavailable" and evidence_payload.get("limitationNote"):
        return format_unavailable_response(evidence_payload, language)

    # 2. Build system and user prompts
    system_prompt = build_system_prompt()
    user_prompt = build_user_prompt(question, language, evidence_payload)

    # 3. Assemble multi-turn conversation messages
    messages: list[dict[str, str]] = [{"role": "system", "content": system_prompt}]

    if history and isinstance(history, list):
        for turn in history:
            if not isinstance(turn, dict):
                continue
            role = turn.get("role") or turn.get("speaker") or "user"
            content = turn.get("content") or turn.get("text") or turn.get("message") or ""
            if not content:
                continue

            if role in ("user", "human", "U"):
                messages.append({"role": "user", "content": str(content)})
            elif role in ("assistant", "bot", "ai", "system_reply"):
                messages.append({"role": "assistant", "content": str(content)})

    messages.append({"role": "user", "content": user_prompt})

    # 4. Call Ollama with appropriate error handling
    try:
        response_text = call_ollama(
            messages=messages,
            model=settings.OLLAMA_MODEL,
            timeout=settings.OLLAMA_TIMEOUT,
        )

        # Parse JSON output from Ollama
        parsed_output = parse_llm_json_response(response_text)

        # 5. Run Safety Validation
        validated = validate_llm_response(parsed_output, evidence_payload)

        evidence_sources = [
            f"{e.get('source')}:{e.get('path')}"
            for e in evidence_payload.get("evidence", [])
            if e.get("source") and e.get("path")
        ]

        ans = validated.get("answer") or validated.get("response") or ""
        return {
            "status": "success",
            "answer": ans,
            "response": ans,
            "language": language,
            "intent": evidence_payload.get("intent", "GENERAL"),
            "source": evidence_payload.get("source", []),
            "metrics": evidence_payload.get("metrics", []),
            "evidence_used": evidence_sources,
            "relatedPage": evidence_payload.get("relatedPage"),
            "disclaimer": validated.get("disclaimer") or evidence_payload.get("disclaimer"),
            "claims": validated.get("claims", []),
        }

    except Exception as exc:
        exc_str = str(exc).lower()
        logger.warning("Ollama execution encountered exception: %s", exc)

        # Connection / Offline check
        if any(term in exc_str for term in ("connect", "refused", "offline", "unreachable", "11434")):
            logger.info("Ollama is unreachable. Checking offline deterministic fallback.")
            if evidence_payload.get("status") == "verified":
                return generate_offline_fallback(question, language, evidence_payload)
            return format_ollama_error_response("offline", str(exc), language)

        # Missing model check
        if any(term in exc_str for term in ("not found", "404", "model")):
            return format_ollama_error_response("model_missing", str(exc), language)

        # Timeout check
        if any(term in exc_str for term in ("timeout", "timed out")):
            if evidence_payload.get("status") == "verified":
                logger.info("Ollama timed out on verified evidence. Using deterministic fallback.")
                return generate_offline_fallback(question, language, evidence_payload)
            return format_ollama_error_response("timeout", str(exc), language)

        # General error fallback
        if evidence_payload.get("status") == "verified":
            return generate_offline_fallback(question, language, evidence_payload)
        return format_ollama_error_response("general", "LLM execution failed.", language)


def generate_offline_fallback(
    question: str,
    language: str,
    evidence_payload: dict[str, Any],
) -> dict[str, Any]:
    """Generate a high-quality deterministic response when Ollama is offline."""
    intent = evidence_payload.get("intent", "UNKNOWN")
    ev_items = evidence_payload.get("evidence", [])
    calcs = evidence_payload.get("calculations", [])

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
        "response": answer_text,
        "language": language,
        "intent": intent,
        "source": evidence_payload.get("source", []),
        "metrics": evidence_payload.get("metrics", []),
        "evidence_used": evidence_sources,
        "relatedPage": evidence_payload.get("relatedPage"),
        "disclaimer": "Offline grounded explanation (Ollama service unavailable).",
        "claims": [],
    }


# Backwards compatibility aliases
generate_llM_explanation = generate_llm_explanation
parse_claude_json_response = parse_llm_json_response
