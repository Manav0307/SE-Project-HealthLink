"""
Master training script — runs all 5 model training pipelines
Uses the 3 provided CSV files as source of truth.

Usage:
  python scripts/train_all.py \
    --patients ../../data/patients.csv \
    --slots ../../data/slots.csv \
    --appointments ../../data/appointments.csv
"""
import argparse
from train_noshow import train_noshow_model
from train_waittime import train_waittime_model
from train_reliability import compute_reliability_grades


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--patients", required=True)
    parser.add_argument("--slots", required=True)
    parser.add_argument("--appointments", required=True)
    args = parser.parse_args()

    print("\n========================================")
    print("  HealthLink ML Training Pipeline")
    print("========================================\n")

    print("[1/3] Training no-show predictor...")
    train_noshow_model(args.appointments)

    print("\n[2/3] Training wait-time predictor...")
    train_waittime_model(args.appointments)

    print("\n[3/3] Computing reliability grades...")
    compute_reliability_grades(args.appointments, args.patients)

    print("\n✓ All models trained and saved to ./models/")


if __name__ == "__main__":
    main()
