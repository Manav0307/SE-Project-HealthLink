import os
import json
from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Get the directory where THIS config.py file is located
# (usually healthlink/apps/api/app/core)
curr_dir = os.path.dirname(os.path.abspath(__file__))

# Move up 3 levels to reach the root where .env usually lives:
# 1. core -> app
# 2. app -> api
# 3. api -> healthlink (root)
# If your .env is inside the 'api' folder, use: os.path.join(curr_dir, "..", "..", ".env")
ENV_PATH = os.path.join(curr_dir, "..", "..", ".env")

class Settings(BaseSettings):
    # ── App ───────────────────────────────────────────────────
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    CORS_ORIGINS: Union[str, List[str]] = ["http://localhost:3000"]

    # ── Database ──────────────────────────────────────────────
    # These MUST exist in your .env or the app will crash on start
    DATABASE_URL: str
    TEST_DATABASE_URL: str = ""

    # ── Redis ─────────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6380/0"

    # ── JWT ───────────────────────────────────────────────────
    JWT_SECRET_KEY: str = "placeholder_change_me"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ── Kafka ─────────────────────────────────────────────────
    KAFKA_BOOTSTRAP_SERVERS: str = "localhost:9092"
    KAFKA_TOPIC_BOOKING: str = "booking_events"
    KAFKA_TOPIC_QUEUE: str = "queue_events"
    KAFKA_TOPIC_NOTIFICATIONS: str = "notification_events"

    # ── ML Model Paths ────────────────────────────────────────
    MODEL_NOSHOW_PATH: str = "./apps/ml/models/noshow_model.pkl"
    MODEL_WAITTIME_PATH: str = "./apps/ml/models/waittime_model.pkl"
    MODEL_RELIABILITY_CSV: str = "./apps/ml/models/reliability_grades.csv"

    # ── Validators ────────────────────────────────────────────
    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            if v.startswith("["):
                return json.loads(v)
            return [i.strip() for i in v.split(",") if i.strip()]
        return v

    # ── The Secret Sauce: Absolute Pathing ────────────────────
    model_config = SettingsConfigDict(
        env_file=ENV_PATH, 
        env_file_encoding='utf-8',
        case_sensitive=True, 
        extra="ignore"
    )

# Initialize settings
settings = Settings()

# 🧪 DEBUG CHECK (Delete this after it works)
if settings.DEBUG:
    print(f"🚀 CONFIG LOADED FROM: {ENV_PATH}")
    print(f"🔗 CONNECTING TO: {settings.DATABASE_URL.split('@')[-1]}")