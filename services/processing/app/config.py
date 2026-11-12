from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Environment-driven configuration. Never hardcode secrets."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    supabase_url: str = "http://127.0.0.1:54321"
    supabase_service_role_key: str = ""
    processing_service_token: str = ""
    app_env: str = "development"

    worker_enabled: bool = True
    worker_poll_seconds: float = 5.0
    max_file_mb: int = 50

    # OCR: Tesseract language packs. No siSwati/isiZulu traineddata ships with
    # Tesseract; Latin-script "eng" works reasonably for Latin-script African
    # languages but diacritics (e.g. Tshivenda ḓ ṅ ṱ) need a custom model.
    ocr_lang: str = "eng"
    ocr_min_text_chars: int = 40  # pages with less embedded text are OCR'd
    ocr_dpi: int = 300

    # Optional Whisper-compatible transcription (requires faster-whisper).
    whisper_model: str = ""
    whisper_device: str = "cpu"

    # Optional HF tokenizer for token statistics (requires transformers).
    tokenizer_name: str = ""

    cors_origins: str = "http://localhost:3000"


@lru_cache
def get_settings() -> Settings:
    return Settings()
