"""
NoShowPredictor
XGBoost classifier trained on appointments.csv:
  - Target: status == "did not attend" → 1, "attended" → 0
  - Features: age, sex_encoded, scheduling_interval, age_group_encoded, appointment_hour
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

# Feature names exactly matching training order in train_noshow.py
NOSHOW_FEATURE_NAMES = [
    "age", "sex_encoded", "scheduling_interval",
    "age_group_encoded", "appointment_hour",
]


class NoShowPredictor:
    def predict(
        self,
        age: int,
        sex: str,
        scheduling_interval: int,
        age_group: str,
        appointment_hour: int = 10,
    ) -> dict:
        model = ModelLoader.get_noshow_model()

        sex_encoded = 1 if sex.lower() == "male" else 0
        age_group_encoded = AGE_GROUP_MAP.get(age_group, 5)

        if not model:
            # Heuristic fallback when model not loaded
            prob = 0.1 + (scheduling_interval > 7) * 0.15 + (age > 60) * 0.05
            prob = min(0.95, prob)
        else:
            # Build DataFrame with named columns to match training feature order
            features = pd.DataFrame(
                [[age, sex_encoded, scheduling_interval, age_group_encoded, appointment_hour]],
                columns=NOSHOW_FEATURE_NAMES,
            )
            prob = float(model.predict_proba(features)[0][1])

        risk = "low" if prob < 0.2 else ("medium" if prob < 0.4 else "high")
        return {"no_show_probability": round(prob, 3), "risk_level": risk}
