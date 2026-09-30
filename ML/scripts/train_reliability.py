"""
Reliability Grade Computation
Uses appointments.csv + patients.csv to compute per-patient grades.
Saves results to reliability_grades.csv for bulk DB update.

Grade formula:
  composite = punctuality% * 0.6 + (100 - noshow_rate%) * 0.3 - avg_reschedule * 10 * 0.1
  A+ >= 95, A >= 85, B >= 70, C >= 55, D = 0+
"""
import pandas as pd
import numpy as np
import joblib, os

GRADE_MAP = [("A+", 95), ("A", 85), ("B", 70), ("C", 55), ("D", 0)]


def composite_to_grade(score: float) -> str:
    for grade, threshold in GRADE_MAP:
        if score >= threshold:
            return grade
    return "D"


def compute_reliability_grades(appointments_path: str, patients_path: str):
    appointments = pd.read_csv(appointments_path)
    patients = pd.read_csv(patients_path)

    print(f"  Processing {len(appointments)} appointments for {len(patients)} patients")

    results = []
    for patient_id in appointments["patient_id"].unique():
        pat_appts = appointments[appointments["patient_id"] == patient_id]
        total = len(pat_appts)
        attended = pat_appts[pat_appts["status"].str.lower() == "attended"]
        no_shows = pat_appts[pat_appts["status"].str.lower() == "did not attend"]

        # Punctuality: check-in <= appointment_time
        on_time = 0
        if len(attended) > 0 and "check_in_time" in attended.columns:
            valid = attended.dropna(subset=["check_in_time"])
            on_time = sum(
                valid["check_in_time"].apply(lambda x: str(x)) <=
                valid["appointment_time"].apply(lambda x: str(x))
            )
        punctuality = (on_time / len(attended) * 100) if len(attended) > 0 else 0.0

        # Avg wait time (seconds → minutes)
        wait_times = attended["waiting_time"].dropna()
        avg_wait_min = (wait_times.mean() / 60) if len(wait_times) > 0 else 0.0

        no_show_rate = len(no_shows) / total * 100

        composite = punctuality * 0.6 + (100 - no_show_rate) * 0.3
        composite = max(0, min(100, composite))
        grade = composite_to_grade(composite)

        results.append({
            "patient_id": str(patient_id).zfill(5),
            "punctuality_score": round(punctuality, 1),
            "avg_wait_time_min": round(avg_wait_min, 1),
            "reliability_grade": grade,
            "total_appointments": total,
            "no_show_count": len(no_shows),
        })

    results_df = pd.DataFrame(results)
    os.makedirs("models", exist_ok=True)
    results_df.to_csv("models/reliability_grades.csv", index=False)

    print(f"  Grade distribution:\n{results_df['reliability_grade'].value_counts().to_string()}")
    print("  ✓ Saved: models/reliability_grades.csv")
    return results_df


if __name__ == "__main__":
    import sys
    compute_reliability_grades(sys.argv[1], sys.argv[2])
