"""Singleton model loader — loads all .pkl files once at startup"""
import joblib
import logging
from pathlib import Path
from app.core.config import settings

logger = logging.getLogger(__name__)

# Resolve paths relative to this file's parent package (apps/api/app/ml/)
# so they work regardless of the working directory.
_BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent  # → apps/


class ModelLoader:
    _noshow_model = None
    _waittime_model = None

    @classmethod
    def load_all(cls):
        noshow_path = cls._resolve_path(settings.MODEL_NOSHOW_PATH)
        waittime_path = cls._resolve_path(settings.MODEL_WAITTIME_PATH)

        try:
            cls._noshow_model = joblib.load(noshow_path)
            logger.info(f"No-show model loaded from {noshow_path}")
            print(f"    No-show model loaded from {noshow_path}")
        except Exception as e:
            logger.warning(f"No-show model not found at {noshow_path}: {e}")
            print(f"    ⚠ No-show model not found at {noshow_path}: {e}")

        try:
            cls._waittime_model = joblib.load(waittime_path)
            logger.info(f"Wait-time model loaded from {waittime_path}")
            print(f"    Wait-time model loaded from {waittime_path}")
        except Exception as e:
            logger.warning(f"Wait-time model not found at {waittime_path}: {e}")
            print(f"    ⚠ Wait-time model not found at {waittime_path}: {e}")

    @classmethod
    def _resolve_path(cls, path_str: str) -> Path:
        """Resolve a model path. If relative, resolve relative to apps/ directory."""
        p = Path(path_str)
        if p.is_absolute():
            return p
        # Try resolving relative to the apps/ directory first
        resolved = (_BASE_DIR / path_str).resolve()
        if resolved.exists():
            return resolved
        # Fall back to the original path (relative to cwd)
        return p.resolve()

    @classmethod
    def get_noshow_model(cls):
        return cls._noshow_model

    @classmethod
    def get_waittime_model(cls):
        return cls._waittime_model
