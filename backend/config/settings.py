"""Configuration loader for BarrierLens Ollama backend.

Loads environment variables securely for local Ollama service.
"""

from __future__ import annotations

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
        self.OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "llama3.2:3b").strip()
        self.OLLAMA_TIMEOUT: int = int(os.getenv("OLLAMA_TIMEOUT", "120"))
        self.MAX_TOKENS: int = int(os.getenv("MAX_TOKENS", "384"))
        self.PORT: int = int(os.getenv("PORT", "5000"))
        self.HOST: str = os.getenv("HOST", "0.0.0.0").strip()
        self.DEBUG: bool = os.getenv("DEBUG", "False").lower() in ("true", "1", "yes")
        self.CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "*").strip()

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
