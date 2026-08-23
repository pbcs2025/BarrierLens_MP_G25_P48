"""BarrierLens Research Intelligence Assistant — Claude Backend Server.

WSGI Application entry point exposing POST /api/chat.
"""

from __future__ import annotations

import logging
import sys
from pathlib import Path

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from flask import Flask, jsonify

from backend.config.settings import settings
from backend.routes.chat import chat_bp

logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("barrierlens.app")


def create_app() -> Flask:
    """Application factory for BarrierLens Claude Backend."""
    app = Flask(__name__)

    # Configure CORS
    try:
        from flask_cors import CORS
        CORS(app, resources={r"/api/*": {"origins": settings.CORS_ORIGINS}})
    except ImportError:
        @app.after_request
        def add_cors_headers(response):
            response.headers["Access-Control-Allow-Origin"] = settings.CORS_ORIGINS
            response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
            return response

    # Register Blueprints
    app.register_blueprint(chat_bp, url_prefix="/api")

    @app.errorhandler(404)
    def not_found(error):
        return jsonify({
            "status": "validation_error",
            "answer": "Endpoint not found.",
            "language": "en",
            "intent": "UNKNOWN",
            "source": [],
            "metrics": [],
            "evidence_used": [],
            "relatedPage": None,
            "disclaimer": None,
        }), 404

    @app.errorhandler(500)
    def server_error(error):
        return jsonify({
            "status": "api_error",
            "answer": "The research assistant is temporarily unavailable. Please try again later.",
            "language": "en",
            "intent": "UNKNOWN",
            "source": [],
            "metrics": [],
            "evidence_used": [],
            "relatedPage": None,
            "disclaimer": None,
        }), 500

    return app


app = create_app()

if __name__ == "__main__":
    logger.info("Starting BarrierLens Claude Backend on %s:%d", settings.HOST, settings.PORT)
    app.run(host=settings.HOST, port=settings.PORT, debug=settings.DEBUG)
