"""API Chat Route Handler for BarrierLens Claude Backend.

Exposes `POST /api/chat` and `GET /api/health` endpoints.
Accepts structured evidence from Member 1 and returns research-safe explanations.
"""

from __future__ import annotations

import logging
from typing import Any

from flask import Blueprint, jsonify, request

from backend.services.claude_service import (
    format_api_error_response,
    generate_llM_explanation,
)

logger = logging.getLogger("barrierlens.routes.chat")

chat_bp = Blueprint("chat", __name__)


@chat_bp.route("/health", methods=["GET"])
def health_check() -> Any:
    """Return backend health status."""
    return jsonify({
        "status": "healthy",
        "service": "BarrierLens Research Intelligence Assistant Backend",
        "version": "1.0.0",
    }), 200


@chat_bp.route("/chat", methods=["POST"])
def process_chat_request() -> Any:
    """Process a research query with structured Member 1 evidence payload.

    Expected JSON Body:
    {
      "question": "What is the most common barrier?",
      "language": "en",
      "intent": "NATIONAL_OVERVIEW",          (optional)
      "evidence": { ... }                     (Member 1 evidence payload or full object)
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

        # Extract parameters
        question = data.get("question", "").strip()
        language = data.get("language", "en").strip()

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
            # Missing or empty evidence
            evidence_payload = {
                "status": "unavailable",
                "intent": data.get("intent", "UNSUPPORTED"),
                "evidence": [],
                "limitationNote": "No verified evidence object provided in request payload.",
            }

        # Execute Claude Explanation Service
        response_data = generate_llM_explanation(question, language, evidence_payload)
        return jsonify(response_data), 200

    except Exception as exc:
        logger.exception("Unexpected error in /api/chat endpoint: %s", exc)
        fallback = format_api_error_response("An internal processing error occurred.")
        return jsonify(fallback), 500
