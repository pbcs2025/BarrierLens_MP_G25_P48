"""Configuration loader for BarrierLens Claude backend.

Loads environment variables securely without exposing secrets.
"""

from __future__ import annotations

import os
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
        self.CLAUDE_API_KEY: str = os.getenv("CLAUDE_API_KEY", "").strip()
        self.CLAUDE_MODEL: str = os.getenv("CLAUDE_MODEL", "claude-3-5-sonnet-20241022").strip()
        self.MAX_TOKENS: int = int(os.getenv("MAX_TOKENS", "1024"))
        self.PORT: int = int(os.getenv("PORT", "5000"))
        self.HOST: str = os.getenv("HOST", "0.0.0.0").strip()
        self.DEBUG: bool = os.getenv("DEBUG", "False").lower() in ("true", "1", "yes")
        self.CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "*").strip()

    @property
    def has_api_key(self) -> bool:
        """Check whether a valid Claude API key is configured."""
        return bool(self.CLAUDE_API_KEY and self.CLAUDE_API_KEY != "your_claude_api_key_here")

settings = Settings()
