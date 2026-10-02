"""API Chat Route Handler for BarrierLens Ollama Backend.

Exposes `POST /api/chat` and `GET /api/health` endpoints.
Accepts queries, conversation history, and evidence payloads to return research-safe explanations.
"""

from __future__ import annotations

import logging
from typing import Any

from flask import Blueprint, jsonify, request

from backend.services.ollama_service import (
    format_api_error_response,
    generate_llm_explanation,
)

logger = logging.getLogger("barrierlens.routes.chat")

chat_bp = Blueprint("chat", __name__)


@chat_bp.route("/health", methods=["GET"])
def health_check() -> Any:
    """Return backend health status and active Ollama model info."""
    from backend.config.settings import settings
    return jsonify({
        "status": "healthy",
        "service": "BarrierLens Research Intelligence Assistant Backend",
        "version": "1.0.0",
        "ollama_available": settings.is_ollama_available,
        "model": settings.OLLAMA_MODEL,
        "max_tokens": settings.MAX_TOKENS,
    }), 200


@chat_bp.route("/chat", methods=["POST"])
def process_chat_request() -> Any:
    """Process a research query with optional history and evidence payload.

    Expected JSON Body:
    {
      "question": "What is BarrierLens?",     (or "message")
      "language": "en",
      "history": [...],                       (optional multi-turn history)
      "intent": "NATIONAL_OVERVIEW",          (optional)
      "evidence": { ... }                     (optional Member 1 evidence payload)
    }

    Returns:
        JSON response adhering to stable response schema.
    """
    try:
        data = request.get_json(force=True, silent=True)
        if not data or not isinstance(data, dict):
            return jsonify({
                "status": "validation_error",
                "answer": "Invalid request. Expected a JSON body.",
                "language": "en",
                "intent": "UNKNOWN",
                "source": [],
                "metrics": [],
                "evidence_used": [],
                "relatedPage": None,
                "disclaimer": None,
            }), 400

        # Extract parameters (supports both "question" and "message")
        question = str(data.get("question") or data.get("message") or "").strip()
        language = str(data.get("language", "en")).strip()
        history = data.get("history") or data.get("messages") or []

        if not question:
            return jsonify({
                "status": "validation_error",
                "answer": "Question parameter is required and cannot be empty.",
                "language": language,
                "intent": "UNKNOWN",
                "source": [],
                "metrics": [],
                "evidence_used": [],
                "relatedPage": None,
                "disclaimer": None,
            }), 400

        # Extract evidence payload
        # Supports passing evidence payload nested as data["evidence"] or top-level payload object
        if "evidence" in data and isinstance(data["evidence"], dict) and "status" in data["evidence"]:
            evidence_payload = data["evidence"]
        elif "status" in data and ("evidence" in data or "intent" in data):
            evidence_payload = data
        elif "evidence" in data and isinstance(data["evidence"], list):
            evidence_payload = {
                "status": "verified",
                "intent": data.get("intent", "GENERAL"),
                "evidence": data["evidence"],
                "calculations": data.get("calculations", []),
                "metrics": data.get("metrics", []),
                "source": data.get("source", []),
                "relatedPage": data.get("relatedPage"),
            }
        else:
            # General query without explicit evidence object
            evidence_payload = {
                "status": "general_query",
                "intent": data.get("intent", "GENERAL"),
                "evidence": [],
                "calculations": [],
                "metrics": [],
                "source": [],
                "relatedPage": None,
            }

        # Check if requested information is unavailable in NFHS-5 dataset
        if evidence_payload.get("status") == "unavailable":
            from backend.services.ollama_service import format_unavailable_response
            unavailable_resp = format_unavailable_response(evidence_payload, language)
            return jsonify(unavailable_resp), 200

        # Execute Ollama Explanation Service
        response_data = generate_llm_explanation(
            question=question,
            language=language,
            evidence_payload=evidence_payload,
            history=history,
        )
        return jsonify(response_data), 200

    except Exception as exc:
        logger.exception("Unexpected error in /api/chat endpoint: %s", exc)
        fallback = format_api_error_response("An internal processing error occurred.")
        return jsonify(fallback), 500



