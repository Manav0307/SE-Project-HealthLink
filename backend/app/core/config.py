import os
import json
from typing import List, Union, Optional
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

curr_dir = os.path.dirname(os.path.abspath(__file__))
ENV_PATH = os.path.join(curr_dir, "..", "..", ".env")


class Settings(BaseSettings):
    # ── App ───────────────────────────────────────────────────
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    CORS_ORIGINS: Union[str, List[str]] = ["http://localhost:3000"]

    # ── Database ──────────────────────────────────────────────
    DATABASE_URL: str = "sqlite:///./healthlink.db"
    TEST_DATABASE_URL: str = "sqlite:///./healthlink_test.db"

    # ── Cache & Events (Optional) ─────────────────────────────
    REDIS_URL: Optional[str] = None
    KAFKA_BOOTSTRAP_SERVERS: Optional[str] = None

    # ── JWT ───────────────────────────────────────────────────
    JWT_SECRET_KEY: str = "placeholder_change_me"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ── Validators ────────────────────────────────────────────
    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            if v.startswith("["):
                return json.loads(v)
            return [i.strip() for i in v.split(",") if i.strip()]
        return v

    model_config = SettingsConfigDict(
        env_file=ENV_PATH, 
        env_file_encoding='utf-8',
        case_sensitive=True, 
        extra="ignore"
    )


settings = Settings()
