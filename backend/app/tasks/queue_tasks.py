from app.tasks.celery_app import celery_app
from datetime import datetime, timedelta, timezone


@celery_app.task
def detect_no_shows():
    """
    Runs every 30 min.
    Appointments where start_time passed > 30 min ago and no check_in_time → mark missed.
    Updates patient no_show_count and triggers reliability score recompute.
    Reads from appointments.csv data (status: "did not attend").
    """
    print("Running no-show detection...")
    # TODO: implement with async session
