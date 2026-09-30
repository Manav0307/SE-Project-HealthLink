from app.tasks.celery_app import celery_app


@celery_app.task
def nightly_score_recompute():
    """
    Nightly at 2 AM: recompute reliability grade for all patients.
    Uses BehaviorScoreService against appointments.csv imported data.
    """
    print("Recomputing behavior scores for all patients...")
    # TODO: iterate all patients, call BehaviorScoreService


@celery_app.task
def retrain_models():
    """
    Nightly at 3 AM: retrain no-show + wait-time models.
    Logs to MLflow. Auto-promotes if RMSE/AUC improves.
    """
    print("Retraining ML models...")
    # TODO: trigger ml/scripts/train_all.py
