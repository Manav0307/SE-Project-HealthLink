"""
Seed database from the 3 provided CSV files:
  - 1775247958607_patients.csv    → patients table (36,697 rows)
  - 1775247958611_slots.csv       → slots table (104,360 rows)
  - 1775247958612_appointments.csv → appointments table (111,488 rows)

Run: python scripts/seed_from_csv.py --patients PATH --slots PATH --appointments PATH
"""
import pandas as pd
import asyncio
import argparse
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.models.patient import Patient
from app.models.slot import Slot
from app.models.appointment import Appointment
from app.core.config import settings


async def seed(patients_path: str, slots_path: str, appointments_path: str):
    engine = create_async_engine(
        settings.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")
    )
    SessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with SessionLocal() as db:
        # ── Seed patients ──────────────────────────────────────────────────
        print("Seeding patients...")
        patients_df = pd.read_csv(patients_path)
        # CSV cols: patient_id,name,sex,dob,insurance
        for _, row in patients_df.iterrows():
            p = Patient(
                patient_id=str(row["patient_id"]).zfill(5),
                name=row["name"],
                sex=row.get("sex"),
                dob=pd.to_datetime(row["dob"]).date() if pd.notna(row.get("dob")) else None,
                insurance=row.get("insurance"),
            )
            await db.merge(p)
        await db.commit()
        print(f"  ✓ {len(patients_df)} patients seeded")

        # ── Seed slots ────────────────────────────────────────────────────
        print("Seeding slots...")
        slots_df = pd.read_csv(slots_path)
        # CSV cols: slot_id,appointment_date,appointment_time,is_available
        for _, row in slots_df.iterrows():
            s = Slot(
                slot_id=str(row["slot_id"]).zfill(7),
                appointment_date=pd.to_datetime(row["appointment_date"]).date(),
                appointment_time=pd.to_datetime(row["appointment_time"], format="%H:%M:%S").time(),
                is_available=bool(row["is_available"]),
                status="free" if row["is_available"] else "booked",
            )
            await db.merge(s)
        await db.commit()
        print(f"  ✓ {len(slots_df)} slots seeded")

        # ── Seed appointments ─────────────────────────────────────────────
        print("Seeding appointments...")
        appts_df = pd.read_csv(appointments_path)
        # CSV cols: appointment_id,slot_id,scheduling_date,appointment_date,
        #           appointment_time,scheduling_interval,status,check_in_time,
        #           appointment_duration,start_time,end_time,waiting_time,
        #           patient_id,sex,age,age_group
        chunk_size = 5000
        for i in range(0, len(appts_df), chunk_size):
            chunk = appts_df.iloc[i:i+chunk_size]
            for _, row in chunk.iterrows():
                # Map CSV status to portal_status
                csv_status = str(row.get("status", "")).lower()
                if csv_status == "attended":
                    portal_status = "completed"
                elif csv_status == "did not attend":
                    portal_status = "missed"
                else:
                    portal_status = "upcoming"

                a = Appointment(
                    appointment_id=str(row["appointment_id"]).zfill(7),
                    slot_id=str(row["slot_id"]).zfill(7),
                    scheduling_date=pd.to_datetime(row["scheduling_date"]).date() if pd.notna(row.get("scheduling_date")) else None,
                    appointment_date=pd.to_datetime(row["appointment_date"]).date(),
                    appointment_time=pd.to_datetime(str(row["appointment_time"]), format="%H:%M:%S").time(),
                    scheduling_interval=int(row["scheduling_interval"]) if pd.notna(row.get("scheduling_interval")) else 0,
                    status=csv_status,
                    check_in_time=pd.to_datetime(str(row["check_in_time"]), format="%H:%M:%S").time() if pd.notna(row.get("check_in_time")) else None,
                    appointment_duration=float(row["appointment_duration"]) if pd.notna(row.get("appointment_duration")) else None,
                    waiting_time=float(row["waiting_time"]) if pd.notna(row.get("waiting_time")) else None,
                    patient_id=str(row["patient_id"]).zfill(5),
                    sex=row.get("sex"),
                    age=int(row["age"]) if pd.notna(row.get("age")) else None,
                    age_group=row.get("age_group"),
                    portal_status=portal_status,
                )
                await db.merge(a)
            await db.commit()
            print(f"  ... {min(i+chunk_size, len(appts_df))} / {len(appts_df)} appointments")

        print(f"  ✓ {len(appts_df)} appointments seeded")
        print("\nDatabase seeding complete!")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--patients", required=True)
    parser.add_argument("--slots", required=True)
    parser.add_argument("--appointments", required=True)
    args = parser.parse_args()
    asyncio.run(seed(args.patients, args.slots, args.appointments))
