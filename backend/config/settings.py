"""Configuration loader for BarrierLens Ollama backend.

Loads environment variables securely for local Ollama service.
"""

from __future__ import annotations

import json
import os
import urllib.request
from pathlib import Path

# Try importing dotenv to load local .env file if available
try:
    from dotenv import load_dotenv
    # Load .env from project root or backend folder
    root_dir = Path(__file__).resolve().parents[2]
    backend_dir = Path(__file__).resolve().parents[1]
    if (root_dir / ".env").exists():
        load_dotenv(root_dir / ".env")
    elif (backend_dir / ".env").exists():
        load_dotenv(backend_dir / ".env")
except ImportError:
    pass

class Settings:
    """Application Settings container."""

    def __init__(self) -> None:
        self.OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").strip().rstrip("/")
        self._configured_model: str = os.getenv("OLLAMA_MODEL", "auto").strip()
        self.OLLAMA_TIMEOUT: int = int(os.getenv("OLLAMA_TIMEOUT", "60"))
        self.MAX_TOKENS: int = int(os.getenv("MAX_TOKENS", "160"))
        self.NUM_CTX: int = int(os.getenv("NUM_CTX", "1024"))
        self.NUM_THREADS: int = int(os.getenv("NUM_THREADS", str(min(8, os.cpu_count() or 4))))
        self.PORT: int = int(os.getenv("PORT", "5000"))
        self.HOST: str = os.getenv("HOST", "0.0.0.0").strip()
        self.DEBUG: bool = os.getenv("DEBUG", "False").lower() in ("true", "1", "yes")
        self.CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "*").strip()

    @property
    def OLLAMA_MODEL(self) -> str:
        """Resolve model name dynamically: prefers llama3.2:1b for speed if available, else llama3.2:3b."""
        if self._configured_model and self._configured_model.lower() != "auto":
            return self._configured_model

        # Auto-detect best installed model
        try:
            req = urllib.request.Request(f"{self.OLLAMA_BASE_URL}/api/tags", method="GET")
            with urllib.request.urlopen(req, timeout=2) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                models = [m.get("name", "") for m in data.get("models", [])]
                # If llama3.2:1b or 1b model is installed, use it for 3-5x faster responses on CPU
                for m in models:
                    if "1b" in m:
                        return m
                for m in models:
                    if "3b" in m or "llama" in m:
                        return m
                if models:
                    return models[0]
        except Exception:
            pass

        return "llama3.2:3b"

    @property
    def is_ollama_available(self) -> bool:
        """Check whether local Ollama service is reachable."""
        try:
            req = urllib.request.Request(f"{self.OLLAMA_BASE_URL}/", method="GET")
            with urllib.request.urlopen(req, timeout=2) as resp:
                return resp.status == 200
        except Exception:
            return False

    @property
    def has_api_key(self) -> bool:
        """Compatibility property checking if LLM provider is available."""
        return self.is_ollama_available

settings = Settings()
