"""API Route Handler for BarrierLens ML Barrier Predictions.

Exposes `POST /api/predict-barrier` endpoint.
Consumes raw NFHS variable input dictionary and executes Member 2 prediction adapter.
"""

from __future__ import annotations

import logging
from typing import Any

from flask import Blueprint, jsonify, request
from backend.prediction_adapter import predict_barrier

logger = logging.getLogger("barrierlens.routes.predict")

predict_bp = Blueprint("predict", __name__)


@predict_bp.route("/predict-barrier", methods=["POST"])
def process_predict_barrier() -> Any:
    """Execute ML barrier prediction for a given set of respondent inputs.

    Expected JSON Request Body:
    {
      "v012": 28,
      "v025": "urban",
      "v106": "secondary",
      "v130": "hindu",
      "v131": "no caste / tribe",
      "v501": "married",
      "v717": "not working",
      "v190": "middle",
      ... (optional additional fields)
    }

    Returns:
        JSON response with status, primaryBarrier, probabilities, and predictions.
    """
    try:
        data = request.get_json(force=True, silent=True)
        if not data or not isinstance(data, dict):
            return jsonify({
                "status": "validation_error",
                "error": "Invalid request. Expected a JSON body object.",
                "primaryBarrier": None,
                "primaryBarrierLabel": None,
                "probabilities": {},
                "predictions": {},
            }), 400

        # Run Prediction Adapter
        result = predict_barrier(data)

        if result.get("status") == "validation_error":
            return jsonify(result), 400
        elif result.get("status") == "error":
            return jsonify(result), 500

        return jsonify(result), 200

    except Exception as exc:
        logger.exception("Unexpected error in /api/predict-barrier: %s", exc)
        return jsonify({
            "status": "error",
            "error": "Internal processing error occurred.",
            "primaryBarrier": None,
            "primaryBarrierLabel": None,
            "probabilities": {},
            "predictions": {},
        }), 500
