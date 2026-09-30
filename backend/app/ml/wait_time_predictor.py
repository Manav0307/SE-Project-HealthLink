"""
WaitTimePredictor
Uses XGBoost model trained on appointments.csv:
  - waiting_time (target, in seconds from data → convert to minutes)
  - Training features: age, sex_encoded, scheduling_interval, appointment_hour, age_group_encoded
"""
import numpy as np
import pandas as pd
from app.ml.model_loader import ModelLoader

# Full age-group encoding map matching the training script
AGE_GROUP_MAP = {
    "0-4": 0, "5-9": 1, "10-14": 2, "15-19": 3, "20-24": 4,
    "25-29": 5, "30-34": 6, "35-39": 7, "40-44": 8, "45-49": 9,
    "50-54": 10, "55-59": 11, "60-64": 12, "65-69": 13,
    "70-74": 14, "75-79": 15, "80-84": 16, "85+": 17,
}

# Feature names exactly matching training order in train_waittime.py
WAITTIME_FEATURE_NAMES = [
    "age", "sex_encoded", "scheduling_interval",
    "appointment_hour", "age_group_encoded",
]


class WaitTimePredictor:
    def predict(
        self,
        hour_of_day: int,
        day_of_week: int,
        age: int,
        sex: str,
        scheduling_interval: int,
        appointment_type: str = "general",
        age_group: str = "25-29",
    ) -> dict:
        model = ModelLoader.get_waittime_model()
        if not model:
            # Fallback heuristic when model not loaded
            base = 12 + (hour_of_day - 9) * 1.5 + (day_of_week == 0) * 5
            return {
                "predicted_wait_min": round(max(3, min(60, base)), 1),
                "confidence_interval_min": 5.0,
                "traffic_level": "low" if base < 15 else ("medium" if base < 30 else "peak"),
            }

        sex_encoded = 1 if sex.lower() == "male" else 0
        age_group_encoded = AGE_GROUP_MAP.get(age_group, 5)

        # Build DataFrame with named columns to match training feature order
        features = pd.DataFrame(
            [[age, sex_encoded, scheduling_interval, hour_of_day, age_group_encoded]],
            columns=WAITTIME_FEATURE_NAMES,
        )
        pred = model.predict(features)[0]
        wait_min = max(1, round(float(pred) / 60, 1))  # convert seconds → minutes

        return {
            "predicted_wait_min": wait_min,
            "confidence_interval_min": round(wait_min * 0.3, 1),
            "traffic_level": "low" if wait_min < 15 else ("medium" if wait_min < 30 else "peak"),
        }
