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


def clean_truncated_response(text: str) -> str:
    """Trim incomplete trailing sentence or bullet if cut off by token limit."""
    cleaned = text.strip()
    lines = cleaned.splitlines()
    if len(lines) <= 1:
        return cleaned

    last_line = lines[-1].strip()
    terminal_chars = ('.', '!', '?', ':', ')', '`', '*', '"', '।')
    if last_line and not last_line.endswith(terminal_chars):
        remaining = lines[:-1]
        while remaining and not remaining[-1].strip():
            remaining.pop()
        if remaining:
            return "\n".join(remaining).strip()
    return cleaned


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

    cleaned = clean_truncated_response(cleaned)

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

        ans = (validated.get("answer") or validated.get("response") or response_text).strip()

        # If LLM output is a refusal or empty, automatically fallback to verified deterministic response
        is_refusal = (
            not ans
            or any(phrase in ans.lower() for phrase in ("can't help", "cannot help", "unable to help", "violat"))
            or (len(ans.splitlines()) <= 2 and "help" in ans.lower() and "request" in ans.lower())
        )
        if is_refusal:
            logger.info("LLM returned refusal or empty response (%s). Using verified fallback.", ans)
            fallback = generate_offline_fallback(question, language, evidence_payload)
            if fallback.get("answer"):
                return fallback

        # Ensure identity response begins with "My name is BarrierLens" if user asked for name
        q_lower = (question or "").lower()
        if any(p in q_lower for p in ("your name", "who are you", "what are you called", "what is your name", "what's your name", "tell me your name", "ನಿಮ್ಮ ಹೆಸರೇನು", "आपका नाम")):
            if "my name is barrierlens" not in ans.lower() and "my name is barrier lens" not in ans.lower():
                ans = "My name is **BarrierLens** (Project Code: P48), an AI research intelligence assistant analyzing women's healthcare access barriers across India based on the NFHS-5 dataset.\n\n" + ans

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
    language: str = "en",
    evidence_payload: dict[str, Any] = None,
) -> dict[str, Any]:
    """Generate deterministic fallback answers using domain templates and evidence payload."""
    if evidence_payload is None:
        evidence_payload = {}

    intent = evidence_payload.get("intent", "GENERAL_QUERY")
    ev_items = evidence_payload.get("evidence", [])
    calcs = evidence_payload.get("calculations", [])
    q_lower = (question or "").lower()

    lang = str(language or "en").lower()
    lang_code = "kn" if ("kn" in lang or "kannada" in lang) else ("hi" if ("hi" in lang or "hindi" in lang) else "en")

    # Identity / Name queries
    if any(phrase in q_lower for phrase in ("what is your name", "what's your name", "who are you", "what are you called", "your name", "ನಿಮ್ಮ ಹೆಸರೇನು", "आपका नाम")):
        if lang_code == "kn":
            intro = "ನನ್ನ ಹೆಸರು **BarrierLens** (ಪ್ರಾಜೆಕ್ಟ್ ಕೋಡ್: P48). ನಾನು NFHS-5 ಸಮೀಕ್ಷೆಯ ಆಧಾರದ ಮೇಲೆ ಭಾರತದಾದ್ಯಂತ ಮಹಿಳೆಯರ ಆರೋಗ್ಯ ಸೇವಾ ಅಡೆತಡೆಗಳನ್ನು ವಿಶ್ಲೇಷಿಸುವ ಸಂಶೋಧನಾ AI ಸಹಾಯಕ."
        elif lang_code == "hi":
            intro = "मेरा नाम **BarrierLens** (प्रोजेक्ट कोड: P48) है। मैं NFHS-5 डेटासेट के आधार पर पूरे भारत में महिलाओं की स्वास्थ्य सेवा पहुंच बाधाओं का विश्लेषण करने वाला एक AI अनुसंधान सहायक हूँ।"
        else:
            intro = "My name is **BarrierLens** (Project Code: P48), an AI research intelligence assistant analyzing women's healthcare access barriers across India based on the NFHS-5 dataset (N = 724,115 respondents).\n\n• 🏥 **Facility Barriers (46.01%)**: Absence of providers & medication shortages\n• 🚗 **Logistic Barriers (31.61%)**: Distance & transport costs\n• 🏠 **Household Barriers (27.16%)**: Family permission & autonomy constraints"

        return {
            "status": "success",
            "answer": intro,
            "response": intro,
            "language": language,
            "intent": "IDENTITY",
            "source": ["BarrierLens Project P48"],
            "metrics": [],
            "evidence_used": [],
            "relatedPage": {"label": "National Overview Analytics", "url": "pages/national_overview.html"},
            "disclaimer": None,
            "claims": [],
        }

    answer_parts: list[str] = []

    if intent == "NATIONAL_OVERVIEW" or "overview" in q_lower or "what is barrierlens" in q_lower or "objective" in q_lower:
        if lang_code == "kn":
            answer_parts.extend([
                "📊 **ಬ್ಯಾರಿಯರ್ ಲೆನ್ಸ್ ಸಾರಾಂಶ (NFHS-5, N=7,24,115):**",
                "• 🎯 **59.16%** ಭಾರತೀಯ ಮಹಿಳೆಯರು ಕನಿಷ್ಠ ಒಂದು ಆರೋಗ್ಯ ಪಡೆಯುವ ಅಡಚಣೆಯನ್ನು ಎದುರಿಸುತ್ತಾರೆ.",
                "• 🏥 **ಸೌಲಭ್ಯ ಅಡಚಣೆ (46.01%)**: ಶ್ರೇಣಿ 1 (ವೈದ್ಯರ ಅಭಾವ ಮತ್ತು ಔಷಧಗಳ ಕೊರತೆ).",
                "• 🚗 **ಸಾರಿಗೆ ಅಡಚಣೆ (31.61%)**: ಶ್ರೇಣಿ 2 (ಆಸ್ಪತ್ರೆಯ ದೂರ ಮತ್ತು ಸಾರಿಗೆ ವೆಚ್ಚ).",
                "• 🏠 **ಮನೆ ಅಡಚಣೆ (27.16%)**: ಶ್ರೇಣಿ 3 (ಕುಟುಂಬದ ಅನುಮತಿ ಮತ್ತು ಹಣಕಾಸಿನ ಮಿತಿ).",
            ])
        elif lang_code == "hi":
            answer_parts.extend([
                "📊 **बैरियरलेंस सारांश (NFHS-5, N=7,24,115):**",
                "• 🎯 **59.16%** भारतीय महिलाएं कम से कम एक स्वास्थ्य सेवा बाधा का सामना करती हैं।",
                "• 🏥 **अस्पताल बाधा (46.01%)**: रैंक 1 (डॉक्टरों की अनुपलब्धता और दवाओं की कमी)।",
                "• 🚗 **परिवहन बाधा (31.61%)**: रैंक 2 (अस्पताल की दूरी और परिवहन लागत)।",
                "• 🏠 **घरेलू बाधा (27.16%)**: रैंक 3 (पारिवारिक अनुमति और वित्तीय सीमाएं)।",
            ])
        else:
            answer_parts.extend([
                "📊 **BarrierLens Overview (NFHS-5, N=724,115):**",
                "• 🎯 **59.16%** of Indian women experience ≥1 healthcare access barrier.",
                "• 🏥 **Facility Barrier (46.01%)**: Rank 1 (provider absence, drug shortages).",
                "• 🚗 **Logistic Barrier (31.61%)**: Rank 2 (travel distance, lack of transport).",
                "• 🏠 **Household Barrier (27.16%)**: Rank 3 (family permission, fund constraints).",
            ])
    elif intent == "STATE_ANALYSIS" or "state" in q_lower:
        states = evidence_payload.get("entities", {}).get("states", [])
        state_name = states[0] if states else "the requested state"
        any_ev = next((e for e in ev_items if isinstance(e, dict) and "Any Barrier" in e.get("label", "")), None)
        if any_ev:
            if lang_code == "kn":
                answer_parts.append(f"📍 **ರಾಜ್ಯ ವಿಶ್ಲೇಷಣೆ: {state_name} (NFHS-5):**")
                answer_parts.append(f"• 🎯 **ಒಟ್ಟು ಅಡಚಣೆ ದರ**: {any_ev['value']}% ಮಹಿಳೆಯರು ಅಡಚಣೆಗಳನ್ನು ಎದುರಿಸುತ್ತಾರೆ.")
            elif lang_code == "hi":
                answer_parts.append(f"📍 **राज्य विश्लेषण: {state_name} (NFHS-5):**")
                answer_parts.append(f"• 🎯 **कुल बाधा दर**: {any_ev['value']}% महिलाएं बाधाओं का सामना करती हैं।")
            else:
                answer_parts.append(f"📍 **State Profile: {state_name} (NFHS-5):**")
                answer_parts.append(f"• 🎯 **Overall Barrier Rate**: {any_ev['value']}% of women face healthcare access barriers.")
            for e in ev_items:
                if isinstance(e, dict) and e != any_ev and "label" in e:
                    lbl = e.get("label", "")
                    val = e.get("value", "")
                    answer_parts.append(f"• 📊 **{lbl}**: {val}%")
        else:
            if lang_code == "kn":
                answer_parts.append(f"📍 **{state_name}** ಗಾಗಿ ದತ್ತಾಂಶ ಸಾರಾಂಶ:")
            elif lang_code == "hi":
                answer_parts.append(f"📍 **{state_name}** के लिए डेटा सारांश:")
            else:
                answer_parts.append(f"📍 **State Data Summary for {state_name}:**")
            for e in ev_items[:4]:
                if isinstance(e, dict) and "label" in e:
                    answer_parts.append(f"• 📊 **{e.get('label')}**: {e.get('value')}%")
    elif intent == "STATE_COMPARISON" or "compare" in q_lower:
        states = evidence_payload.get("entities", {}).get("states", [])
        s1 = states[0] if len(states) > 0 else "State A"
        s2 = states[1] if len(states) > 1 else "State B"
        if lang_code == "kn":
            answer_parts.append(f"📊 **ರಾಜ್ಯಗಳ ಹೋಲಿಕೆ: {s1} ಮತ್ತು {s2} (NFHS-5):**")
        elif lang_code == "hi":
            answer_parts.append(f"📊 **राज्य तुलना: {s1} बनाम {s2} (NFHS-5):**")
        else:
            answer_parts.append(f"📊 **Barrier Comparison: {s1} vs {s2} (NFHS-5 Analysis):**")
        seen_domains = set()
        for e in ev_items:
            if isinstance(e, dict) and any(k in e.get("label", "") for k in ("Any Barrier", "Facility", "Logistic", "Household")):
                domain_key = f"{e.get('entity')}_{e.get('label')}"
                if domain_key not in seen_domains:
                    seen_domains.add(domain_key)
                    answer_parts.append(f"• 📍 **{e.get('entity')} ({e.get('label', '')})**: {e.get('value')}%")
        if calcs:
            for c in calcs[:3]:
                interp = c.get('interpretation', '')
                if interp:
                    answer_parts.append(f"• 📈 **Disparity Gap**: {interp}")
    elif intent == "RURAL_URBAN" or "rural" in q_lower or "urban" in q_lower:
        if lang_code == "kn":
            answer_parts.extend([
                "📍 **ಗ್ರಾಮೀಣ ಮತ್ತು ನಗರ ಅಡಚಣೆಗಳ ವ್ಯತ್ಯಾಸ (NFHS-5):**",
                "• 🏡 **ಗ್ರಾಮೀಣ ದರ**: 63.49% ಮಹಿಳೆಯರು ಆರೋಗ್ಯ ಅಡಚಣೆಗಳನ್ನು ಎದುರಿಸುತ್ತಾರೆ.",
                "• 🏙️ **ನಗರ ದರ**: 46.03% ಮಹಿಳೆಯರು ಆರೋಗ್ಯ ಅಡಚಣೆಗಳನ್ನು ಎದುರಿಸುತ್ತಾರೆ.",
                "• 📈 **ವ್ಯತ್ಯಾಸದ ಅಂತರ**: ಗ್ರಾಮೀಣ ಪ್ರದೇಶಗಳಲ್ಲಿ 17.46 ಶೇಕಡಾವಾರು ಅಂಕಗಳು ಹೆಚ್ಚು.",
            ])
        elif lang_code == "hi":
            answer_parts.extend([
                "📍 **ग्रामीण बनाम शहरी अंतर (NFHS-5):**",
                "• 🏡 **ग्रामीण दर**: 63.49% महिलाएं स्वास्थ्य बाधाओं का सामना करती हैं।",
                "• 🏙️ **शहरी दर**: 46.03% महिलाएं स्वास्थ्य बाधाओं का सामना करती हैं।",
                "• 📈 **अंतर**: ग्रामीण क्षेत्रों में 17.46 प्रतिशत अंक अधिक।",
            ])
        else:
            answer_parts.extend([
                "📍 **Rural vs Urban Disparity (NFHS-5):**",
                "• 🏡 **Rural Rate**: 63.49% face healthcare barriers.",
                "• 🏙️ **Urban Rate**: 46.03% face healthcare barriers.",
                "• 📈 **Disparity Gap**: 17.46 percentage points higher in rural areas.",
            ])
        if calcs:
            answer_parts.append(f"• 💡 **Derived**: {calcs[0].get('interpretation', '')}")
    elif intent == "RISK_ARCHETYPE" or "cluster" in q_lower or "archetype" in q_lower:
        if lang_code == "kn":
            answer_parts.extend([
                "👥 **K-Means ಅಪಾಯದ ಮಾದರಿಗಳು (silhouette = 0.3986):**",
                "• ⚠️ **ಕ್ಲಸ್ಟರ್ 0 (52.9%)**: ಹೆಚ್ಚಿನ ಹಾನಿಗೊಳಗಾಗುವಿಕೆ ಮತ್ತು ಅಡಚಣೆ (ಸ್ಕೋರ್ = 0.5868).",
                "• 📱 **ಕ್ಲಸ್ಟರ್ 1 (47.1%)**: ಮಾಧ್ಯಮ ಮತ್ತು ಡಿಜಿಟಲ್ ಒಳಗೊಳ್ಳುವಿಕೆ (ಸ್ಕೋರ್ = 0.3761).",
            ])
        elif lang_code == "hi":
            answer_parts.extend([
                "👥 **K-Means जोखिम प्रारूप (silhouette = 0.3986):**",
                "• ⚠️ **क्लस्टर 0 (52.9%)**: उच्च भेद्यता और बाधा जोखिम (स्कोर = 0.5868)।",
                "• 📱 **क्लस्टर 1 (47.1%)**: मीडिया और डिजिटल समावेशन (स्कोर = 0.3761)।",
            ])
        else:
            answer_parts.extend([
                "👥 **K-Means Risk Archetypes (silhouette = 0.3986):**",
                "• ⚠️ **Cluster 0 (52.9%)**: High Vulnerability & Barrier Exposure (score = 0.5868).",
                "• 📱 **Cluster 1 (47.1%)**: Media & Digital Inclusion (score = 0.3761).",
            ])
    elif intent == "SHAP" or "model" in q_lower or "feature" in q_lower or "xgboost" in q_lower:
        if lang_code == "kn":
            answer_parts.extend([
                "🤖 **ML ಮಾಡೆಲ್ SHAP ವಿಶ್ಲೇಷಣೆ:**",
                "• 📉 **ಅತ್ಯಂತ ಬಡ ಆರ್ಥಿಕ ಸ್ಥಿತಿ**: ಅತ್ಯಂತ ಪ್ರಮುಖ ಅಡಚಣೆ ಅಪಾಯದ ಅಂಶ (OR = 1.26).",
                "• 🎓 **ಔಪಚಾರಿಕ ಶಿಕ್ಷಣ ಇಲ್ಲದಿರುವುದು**: ಎರಡನೇ ಪ್ರಮುಖ ಅಪಾಯದ ಅಂಶ (OR = 1.20).",
                "• 🛡️ **ಅತ್ಯಂತ ಶ್ರೀಮಂತ ಸ್ಥಿತಿ**: ಪ್ರಮುಖ ರಕ್ಷಣಾತ್ಮಕ ಅಂಶ (OR = 0.78).",
            ])
        elif lang_code == "hi":
            answer_parts.extend([
                "🤖 **ML मॉडल SHAP विश्लेषण:**",
                "• 📉 **अति निर्धन वर्ग**: सबसे बड़ा जोखिम कारक (OR = 1.26)।",
                "• 🎓 **शिक्षा की कमी**: दूसरा प्रमुख जोखिम कारक (OR = 1.20)।",
                "• 🛡️ **अति धनी वर्ग**: सबसे मजबूत सुरक्षात्मक कारक (OR = 0.78)।",
            ])
        else:
            answer_parts.extend([
                "🤖 **ML Model Insights & SHAP Drivers:**",
                "• 📉 **Poorest Wealth**: Top risk factor (OR = 1.26).",
                "• 🎓 **No Formal Education**: Second leading risk driver (OR = 1.20).",
                "• 🛡️ **Richest Wealth**: Strongest protective buffer (OR = 0.78).",
            ])
    elif intent == "LIMITATIONS" or "causation" in q_lower:
        if lang_code == "kn":
            answer_parts.extend([
                "⚠️ **ಪದ್ಧತಿಗತ ಮಿತಿಗಳು:**",
                "• 📋 NFHS-5 ದತ್ತಾಂಶವು ಸಾಂಖ್ಯಿಕ ಸಂಬಂಧಗಳನ್ನು ಗುರುತಿಸುತ್ತದೆ, ಕಾರಣಾತ್ಮಕತೆಯನ್ನಲ್ಲ.",
                "• 🚫 ಕಾಯುವ ಸಮಯ ಮತ್ತು ವೈದ್ಯಕೀಯ ಶುಲ್ಕಗಳನ್ನು ಸಮೀಕ್ಷೆಯಲ್ಲಿ ಸೇರಿಸಲಾಗಿಲ್ಲ.",
            ])
        elif lang_code == "hi":
            answer_parts.extend([
                "⚠️ **पद्धतिगत सीमाएं:**",
                "• 📋 NFHS-5 डेटा सांख्यिकीय संबंधों की पहचान करता है, कारणता की नहीं।",
                "• 🚫 प्रतीक्षा समय और चिकित्सा शुल्क सर्वेक्षण में शामिल नहीं हैं।",
            ])
        else:
            answer_parts.extend([
                "⚠️ **Methodological Scope & Limitations:**",
                "• 📋 Observational NFHS-5 data identifies statistical associations, not causality.",
                "• 🚫 Waiting times and clinical fees are not surveyed.",
            ])
    elif intent == "METHODOLOGY" or "methodology" in q_lower or "sample size" in q_lower:
        if lang_code == "kn":
            answer_parts.extend([
                "🔬 **ಬ್ಯಾರಿಯರ್ ಲೆನ್ಸ್ ಅಧ್ಯಯನ ವಿಧಾನ (NFHS-5, N=7,24,115):**",
                "• 📊 36 ಭಾರತೀಯ ರಾಜ್ಯಗಳು ಮತ್ತು ಕೇಂದ್ರಾಡಳಿತ ಪ್ರದೇಶಗಳ 15-49 ವಯಸ್ಸಿನ 7,24,115 ಮಹಿಳೆಯರ ದತ್ತಾಂಶ ಸಮೀಕ್ಷೆ.",
                "• 🤖 K-Means ಕ್ಲಸ್ಟರಿಂಗ್ ಮತ್ತು ಶ್ರೇಣೀಕೃತ ಸೂಪರ್‌ವೈಸ್ಡ್ ಮೆಷಿನ್ ಲರ್ನಿಂಗ್ (Random Forest, XGBoost).",
                "• 🛡️ SHAP ಆಧಾರಿತ ಮಾದರಿ ವಿವರಣೆಗಳು ಮತ್ತು ಸಾಂಖ್ಯಿಕ ಪರಿಶೀಲನೆ.",
            ])
        elif lang_code == "hi":
            answer_parts.extend([
                "🔬 **बैरियरलेंस अध्ययन पद्धति (NFHS-5, N=7,24,115):**",
                "• 📊 36 भारतीय राज्यों और केंद्र शासित प्रदेशों की 15-49 आयु वर्ग की 7,24,115 महिलाओं का राष्ट्रीय सर्वेक्षण।",
                "• 🤖 K-Means क्लस्टरिंग और वर्गीकृत सुपरवाइज्ड मशीन लर्निंग (Random Forest, XGBoost)।",
                "• 🛡️ SHAP आधारित मॉडल व्याख्याएं और सांख्यिकीय सत्यापन।",
            ])
        else:
            answer_parts.extend([
                "🔬 **BarrierLens Research Methodology (NFHS-5, N=724,115):**",
                "• 📊 National survey data of 724,115 women aged 15-49 across 36 Indian States/UTs.",
                "• 🤖 K-Means clustering and supervised ML classifiers (Random Forest, XGBoost).",
                "• 🛡️ SHAP explainability drivers and statistical validation.",
            ])
    elif intent == "DEMOGRAPHIC_ANALYSIS" or "demographic" in q_lower or "wealth" in q_lower or "education" in q_lower:
        if lang_code == "kn":
            answer_parts.extend([
                "📊 **ಸಾಮಾಜಿಕ-ಜನಸಂಖ್ಯಾ ವಿಶ್ಲೇಷಣೆ (NFHS-5):**",
                "• 💰 **ಸಂಪತ್ತಿನ ಶ್ರೇಣಿ**: ಅತ್ಯಂತ ಬಡ ಮಹಿಳೆಯರು 68.42% ಅಡಚಣೆ ಎದುರಿಸಿದರೆ, ಶ್ರೀಮಂತ ಮಹಿಳೆಯರು 41.15% ಎದುರಿಸುತ್ತಾರೆ.",
                "• 🎓 **ಶಿಕ್ಷಣದ ಮಟ್ಟ**: ಶಿಕ್ಷಣವಿಲ್ಲದ ಮಹಿಳೆಯರಲ್ಲಿ ಅಡಚಣೆ ದರ ಗಮನಾರ್ಹವಾಗಿ ಹೆಚ್ಚಾಗಿದೆ.",
            ])
        elif lang_code == "hi":
            answer_parts.extend([
                "📊 **सामाजिक-जनसांख्यिकी विश्लेषण (NFHS-5):**",
                "• 💰 **संपत्ति वर्ग**: अति निर्धन महिलाएं 68.42% बाधा का सामना करती हैं, जबकि अति धनी 41.15%।",
                "• 🎓 **शिक्षा का स्तर**: अशिक्षित महिलाओं में बाधा दर काफी अधिक है।",
            ])
        else:
            answer_parts.extend([
                "📊 **Socio-Demographic Disparities (NFHS-5):**",
                "• 💰 **Wealth Tier**: Poorest women face 68.42% barrier rate vs 41.15% among Richest.",
                "• 🎓 **Education**: No formal education significantly increases vulnerability.",
            ])
    elif intent == "MULTIPLE_BARRIER" or "multiple" in q_lower:
        if lang_code == "kn":
            answer_parts.extend([
                "⚠️ **ಅನೇಕ ಸಮಾವೇಶಗೊಳ್ಳುವ ಅಡಚಣೆಗಳು (NFHS-5):**",
                "• 📊 **31.55%** ಭಾರತೀಯ ಮಹಿಳೆಯರು 2 ಅಥವಾ ಹೆಚ್ಚಿನ ಅಡಚಣೆಗಳನ್ನು ಏಕಕಾಲದಲ್ಲಿ ಎದುರಿಸುತ್ತಾರೆ.",
                "• 📈 ಒಬ್ಬ ಮಹಿಳೆಯ ಸರಾಸರಿ ಅಡಚಣೆಗಳ ಸಂಖ್ಯೆ: 1.05.",
            ])
        elif lang_code == "hi":
            answer_parts.extend([
                "⚠️ **अनेक समवर्ती बाधाएं (NFHS-5):**",
                "• 📊 **31.55%** भारतीय महिलाएं एक साथ 2 या अधिक बाधाओं का सामना करती हैं।",
                "• 📈 प्रति महिला औसत बाधा संख्या: 1.05।",
            ])
        else:
            answer_parts.extend([
                "⚠️ **Multiple Overlapping Barriers (NFHS-5):**",
                "• 📊 **31.55%** of Indian women face 2 or more healthcare barriers simultaneously.",
                "• 📈 Mean barrier count per woman: 1.05 barriers.",
            ])
    else:
        if lang_code == "kn":
            answer_parts.extend([
                "📊 **ಬ್ಯಾರಿಯರ್ ಲೆನ್ಸ್ ಸಾರಾಂಶ (NFHS-5, N=7,24,115):**",
                "• 🎯 **59.16%** ಮಹಿಳೆಯರು ಆರೋಗ್ಯ ಅಡಚಣೆಗಳನ್ನು ಎದುರಿಸುತ್ತಾರೆ.",
                "• 🏥 **ಶ್ರೇಣಿ 1**: ಸೌಲಭ್ಯ ಅಡಚಣೆಗಳು (46.01%).",
                "• 🚗 **ಶ್ರೇಣಿ 2**: ಸಾರಿಗೆ ಅಡಚಣೆಗಳು (31.61%).",
                "• 🏠 **ಶ್ರೇಣಿ 3**: ಮನೆ ಅಡಚಣೆಗಳು (27.16%).",
            ])
        elif lang_code == "hi":
            answer_parts.extend([
                "📊 **बैरियरलेंस सारांश (NFHS-5, N=7,24,115):**",
                "• 🎯 **59.16%** महिलाएं स्वास्थ्य बाधाओं का सामना करती हैं।",
                "• 🏥 **रैंक 1**: अस्पताल बाधाएं (46.01%)।",
                "• 🚗 **रैंक 2**: परिवहन बाधाएं (31.61%)।",
                "• 🏠 **रैंक 3**: घरेलू बाधाएं (27.16%)।",
            ])
        else:
            answer_parts.extend([
                "📊 **BarrierLens Summary (NFHS-5, N=724,115):**",
                "• 🎯 **59.16%** of women face healthcare access barriers.",
                "• 🏥 **Rank 1**: Facility Barriers (46.01%).",
                "• 🚗 **Rank 2**: Logistic Barriers (31.61%).",
                "• 🏠 **Rank 3**: Household Barriers (27.16%).",
            ])

    answer_text = "\n".join(answer_parts)
    evidence_sources = [
        f"{e.get('source')}:{e.get('path')}"
        for e in ev_items
        if isinstance(e, dict) and e.get("source") and e.get("path")
    ]

    return {
        "status": "success",
        "answer": answer_text,
        "response": answer_text,
        "language": language,
        "intent": intent,
        "source": evidence_payload.get("source", ["NFHS-5 (2019-21)"]),
        "metrics": evidence_payload.get("metrics", []),
        "evidence_used": ev_items,
        "relatedPage": evidence_payload.get("relatedPage"),
        "disclaimer": "Observational study based on NFHS-5 cross-sectional survey data (N=724,115).",
        "claims": [],
    }