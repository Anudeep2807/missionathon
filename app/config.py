import os
from pathlib import Path
from typing import List
from dotenv import load_dotenv

# Load .env file from the server directory or parent directories
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)


class Settings:
    """Application configuration loaded from environment variables."""

    def __init__(self) -> None:
        self.groq_api_key: str = os.getenv("GROQ_API_KEY", "").strip()
        model_env = os.getenv("GROQ_MODEL", "qwen/qwen3.8-27b").strip()
        # Aliasing for Groq catalog: map qwen3.6-27b to served qwen3.8-27b
        if model_env == "qwen/qwen3.6-27b":
            model_env = "qwen/qwen3.8-27b"
        self.groq_model: str = model_env

        # Parse FRONTEND_ORIGINS: comma-separated list of allowed origins.
        # Strict security rule: when allow_credentials=True is enabled in CORS,
        # wildcard '*' is disallowed by the browser specification.
        origins_env = os.getenv("FRONTEND_ORIGINS", "http://localhost:5173")
        configured_origins = [
            origin.strip()
            for origin in origins_env.split(",")
            if origin.strip() and origin.strip() != "*"
        ]

        # Always include standard local development hosts
        default_dev_origins = [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ]
        for dev_origin in default_dev_origins:
            if dev_origin not in configured_origins:
                configured_origins.append(dev_origin)

        self.frontend_origins: List[str] = configured_origins

        # Image upload limits (defaults: 10 MB per image, 5 images per request)
        try:
            self.max_image_mb: float = float(os.getenv("MAX_IMAGE_MB", "10.0"))
        except ValueError:
            self.max_image_mb = 10.0

        try:
            self.max_images: int = int(os.getenv("MAX_IMAGES", "5"))
        except ValueError:
            self.max_images = 5

        # Max dimension to preserve readability without hitting token limits
        self.max_image_dimension: int = int(os.getenv("MAX_IMAGE_DIMENSION", "2048"))

        # Output token cap for Groq models to comply with free tier OTPM limits (e.g. 1000 OTPM)
        try:
            self.groq_max_tokens: int = int(os.getenv("GROQ_MAX_TOKENS", "800"))
        except ValueError:
            self.groq_max_tokens = 800


settings = Settings()


def get_settings() -> Settings:
    """Dependency helper to return application settings."""
    return settings
