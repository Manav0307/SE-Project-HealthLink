from celery import Celery
from celery.schedules import crontab
from app.core.config import settings

celery_app = Celery(
    "healthlink",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

celery_app.conf.beat_schedule = {
    # Release expired slot locks every 30 seconds
    "release-expired-locks": {
        "task": "app.tasks.slot_tasks.release_expired_locks",
        "schedule": 30.0,
    },
    # Detect no-shows: run 30 min after each hour
    "detect-no-shows": {
        "task": "app.tasks.queue_tasks.detect_no_shows",
        "schedule": crontab(minute="30"),
    },
    # Nightly: recompute all patient behavior scores
    "nightly-score-recompute": {
        "task": "app.tasks.ml_tasks.nightly_score_recompute",
        "schedule": crontab(hour=2, minute=0),
    },
    # Nightly: retrain ML models on new data
    "retrain-models": {
        "task": "app.tasks.ml_tasks.retrain_models",
        "schedule": crontab(hour=3, minute=0),
    },
}
