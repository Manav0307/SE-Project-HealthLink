"""
Wait-Time Predictor Training
Dataset: appointments.csv
Target: waiting_time (seconds in CSV → predict in minutes)
Features: age, sex, scheduling_interval, appointment_hour, age_group_encoded
"""
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error
from xgboost import XGBRegressor
import joblib, os, mlflow


def train_waittime_model(appointments_path: str):
    mlflow.set_experiment("waittime_predictor")

    with mlflow.start_run(run_name="xgboost_waittime"):
        df = pd.read_csv(appointments_path)

        # Only attended appointments have waiting_time
        df = df[df["status"].str.lower() == "attended"]
        df = df.dropna(subset=["waiting_time", "age"])
        print(f"  Using {len(df)} attended appointments with wait time data")

        df["sex_encoded"] = (df["sex"].str.lower() == "male").astype(int)
        df["appointment_hour"] = pd.to_datetime(df["appointment_time"], format="%H:%M:%S").dt.hour
        df["scheduling_interval"] = df["scheduling_interval"].fillna(0)

        age_group_map = {
            "0-4": 0, "5-9": 1, "10-14": 2, "15-19": 3, "20-24": 4,
            "25-29": 5, "30-34": 6, "35-39": 7, "40-44": 8, "45-49": 9,
            "50-54": 10, "55-59": 11, "60-64": 12, "65-69": 13,
            "70-74": 14, "75-79": 15, "80-84": 16, "85+": 17,
        }
        df["age_group_encoded"] = df["age_group"].map(age_group_map).fillna(5)

        FEATURES = ["age", "sex_encoded", "scheduling_interval", "appointment_hour", "age_group_encoded"]
        TARGET = "waiting_time"   # seconds in the CSV

        X = df[FEATURES]
        y = df[TARGET]

        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

        model = XGBRegressor(n_estimators=200, max_depth=6, learning_rate=0.1, random_state=42)
        model.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=False)

        y_pred = model.predict(X_test)
        rmse_seconds = np.sqrt(mean_squared_error(y_test, y_pred))
        rmse_minutes = rmse_seconds / 60

        print(f"  RMSE: {rmse_seconds:.1f}s ({rmse_minutes:.1f} minutes)")
        mlflow.log_metric("rmse_seconds", rmse_seconds)
        mlflow.log_metric("rmse_minutes", rmse_minutes)

        os.makedirs("models", exist_ok=True)
        joblib.dump(model, "models/waittime_model.pkl")
        mlflow.sklearn.log_model(model, "waittime_model")
        print("  ✓ Saved: models/waittime_model.pkl")
        return model


if __name__ == "__main__":
    import sys
    train_waittime_model(sys.argv[1])
