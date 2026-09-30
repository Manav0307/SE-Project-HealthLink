"""
No-Show Predictor Training
Dataset: appointments.csv
Target: status == "did not attend" → 1 (no-show), "attended" → 0
Features derived from available columns:
  - age, sex (encoded), scheduling_interval, age_group (encoded)
"""
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import classification_report, roc_auc_score
from xgboost import XGBClassifier
import joblib, os, mlflow


def train_noshow_model(appointments_path: str):
    mlflow.set_experiment("noshow_predictor")

    with mlflow.start_run(run_name="xgboost_noshow"):
        # ── Load data ─────────────────────────────────────────────────────
        df = pd.read_csv(appointments_path)
        print(f"  Loaded {len(df)} appointment records")

        # ── Feature engineering ───────────────────────────────────────────
        df = df.dropna(subset=["status", "age"])
        df["no_show"] = (df["status"].str.lower() == "did not attend").astype(int)

        # Encode sex
        df["sex_encoded"] = (df["sex"].str.lower() == "male").astype(int)

        # Encode age_group
        age_group_map = {
            "0-4": 0, "5-9": 1, "10-14": 2, "15-19": 3, "20-24": 4,
            "25-29": 5, "30-34": 6, "35-39": 7, "40-44": 8, "45-49": 9,
            "50-54": 10, "55-59": 11, "60-64": 12, "65-69": 13,
            "70-74": 14, "75-79": 15, "80-84": 16, "85+": 17,
        }
        df["age_group_encoded"] = df["age_group"].map(age_group_map).fillna(5)

        # scheduling_interval: days between booking and appointment
        df["scheduling_interval"] = df["scheduling_interval"].fillna(0)

        # Extract hour from appointment_time
        df["appointment_hour"] = pd.to_datetime(df["appointment_time"], format="%H:%M:%S").dt.hour

        FEATURES = ["age", "sex_encoded", "scheduling_interval", "age_group_encoded", "appointment_hour"]
        TARGET = "no_show"

        X = df[FEATURES]
        y = df[TARGET]

        # ── Class imbalance ───────────────────────────────────────────────
        no_show_rate = y.mean()
        scale_pos_weight = (1 - no_show_rate) / no_show_rate
        print(f"  No-show rate: {no_show_rate:.2%} → scale_pos_weight={scale_pos_weight:.2f}")

        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)

        # ── Train ─────────────────────────────────────────────────────────
        model = XGBClassifier(
            n_estimators=200,
            max_depth=6,
            learning_rate=0.1,
            scale_pos_weight=scale_pos_weight,
            eval_metric="auc",
            random_state=42,
            use_label_encoder=False,
        )
        model.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=False)

        # ── Evaluate ──────────────────────────────────────────────────────
        y_pred = model.predict(X_test)
        y_prob = model.predict_proba(X_test)[:, 1]
        auc = roc_auc_score(y_test, y_prob)

        print(f"\n  ROC-AUC: {auc:.4f}")
        print(classification_report(y_test, y_pred, target_names=["attended", "no-show"]))

        mlflow.log_param("features", FEATURES)
        mlflow.log_param("n_estimators", 200)
        mlflow.log_metric("roc_auc", auc)
        mlflow.log_metric("no_show_rate", no_show_rate)

        # ── Save ──────────────────────────────────────────────────────────
        os.makedirs("models", exist_ok=True)
        joblib.dump(model, "models/noshow_model.pkl")
        mlflow.sklearn.log_model(model, "noshow_model")
        print("  ✓ Saved: models/noshow_model.pkl")
        return model


if __name__ == "__main__":
    import sys
    train_noshow_model(sys.argv[1])
