"""
seed_prototype.py

Creates realistic, interconnected prototype data in the database:
- 7 realistic patients (including default showcase patient 00001 - Alex Morgan)
- 5 specialist doctors
- Past appointments (completed/attended) with history
- Upcoming booked appointments
- Open time slots across the next 14 days for booking
- In-app patient notifications
- Live clinic queue entries

Run from backend directory:
    python scripts/seed_prototype.py
"""
import asyncio
import os
import sys
from datetime import date, time, datetime, timedelta, timezone

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import delete
from app.db.session import engine, AsyncSessionLocal, Base
import app.models  # Register all models with Base.metadata

from app.models.patient import Patient
from app.models.doctor import Doctor
from app.models.slot import Slot
from app.models.appointment import Appointment
from app.models.notification import Notification
from app.models.live_queue import LiveQueue
from app.core.security import hash_password


async def seed():
    print("🌱 Connecting to database and creating tables...")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        print("🧹 Cleaning old records...")
        await db.execute(delete(LiveQueue))
        await db.execute(delete(Notification))
        await db.execute(delete(Appointment))
        await db.execute(delete(Slot))
        await db.execute(delete(Doctor))
        await db.execute(delete(Patient))
        await db.commit()

        # ── 1. Seed Doctors ───────────────────────────────────────────
        print("👨‍⚕️ Seeding doctors...")
        doctors_data = [
            Doctor(
                doctor_id="D001",
                name="Dr. Priya Sharma",
                specialization="General Medicine",
                clinic_id="clinic_01",
                avg_session_duration_min=15.0,
                rating=4.9,
                bio="Board-certified internal medicine physician with over 12 years of experience.",
                is_available=1,
            ),
            Doctor(
                doctor_id="D002",
                name="Dr. Arjun Mehta",
                specialization="Cardiology",
                clinic_id="clinic_01",
                avg_session_duration_min=20.0,
                rating=4.8,
                bio="Senior cardiologist specializing in preventive cardiovascular care and rehabilitation.",
                is_available=1,
            ),
            Doctor(
                doctor_id="D003",
                name="Dr. Neha Patel",
                specialization="Dermatology",
                clinic_id="clinic_01",
                avg_session_duration_min=15.0,
                rating=4.7,
                bio="Specialist in clinical and cosmetic dermatology with expertise in skin health.",
                is_available=1,
            ),
            Doctor(
                doctor_id="D004",
                name="Dr. Ravi Kumar",
                specialization="Orthopedics",
                clinic_id="clinic_01",
                avg_session_duration_min=25.0,
                rating=4.9,
                bio="Orthopedic surgeon with extensive clinical background in sports medicine and joint health.",
                is_available=1,
            ),
            Doctor(
                doctor_id="D005",
                name="Dr. Sunita Verma",
                specialization="ENT Specialist",
                clinic_id="clinic_01",
                avg_session_duration_min=15.0,
                rating=4.8,
                bio="Consultant Otolaryngologist treating ear, nose, throat, and related head & neck conditions.",
                is_available=1,
            ),
        ]
        db.add_all(doctors_data)
        await db.commit()
        print(f"  ✓ {len(doctors_data)} doctors created")

        # ── 2. Seed 7 Patients ─────────────────────────────────────────
        print("👥 Seeding 7 patients...")
        default_pwd = hash_password("health123")
        patients_data = [
            Patient(
                patient_id="00001",
                name="Alex Morgan",
                sex="M",
                dob=date(1998, 1, 15),
                insurance="Blue Cross Blue Shield",
                email="alex.morgan@healthlink.com",
                password_hash=default_pwd,
                blood_type="O+",
                emergency_contact="+1 555-0199",
                active_status="Active",
                portal_active=True,
                reliability_grade="A",
                punctuality_score=96.0,
                avg_wait_time_min=6.5,
                total_appointments=4,
                no_show_count=0,
                primary_doctor_id="D001",
            ),
            Patient(
                patient_id="00002",
                name="Sarah Jenkins",
                sex="F",
                dob=date(1990, 5, 22),
                insurance="Aetna Health",
                email="sarah.j@example.com",
                password_hash=default_pwd,
                blood_type="A+",
                emergency_contact="+1 555-0144",
                active_status="Post-Op Recovery",
                portal_active=True,
                reliability_grade="A",
                punctuality_score=92.0,
                avg_wait_time_min=8.0,
                total_appointments=6,
                no_show_count=0,
                primary_doctor_id="D002",
            ),
            Patient(
                patient_id="00003",
                name="David Chen",
                sex="M",
                dob=date(1979, 11, 8),
                insurance="UnitedHealthcare",
                email="dchen@example.com",
                password_hash=default_pwd,
                blood_type="B+",
                emergency_contact="+1 555-0182",
                active_status="Active",
                portal_active=True,
                reliability_grade="B",
                punctuality_score=85.0,
                avg_wait_time_min=11.0,
                total_appointments=3,
                no_show_count=1,
                primary_doctor_id="D004",
            ),
            Patient(
                patient_id="00004",
                name="Maria Rodriguez",
                sex="F",
                dob=date(1995, 3, 30),
                insurance="Cigna Premier",
                email="mrodriguez@example.com",
                password_hash=default_pwd,
                blood_type="AB-",
                emergency_contact="+1 555-0163",
                active_status="Active",
                portal_active=True,
                reliability_grade="A",
                punctuality_score=98.0,
                avg_wait_time_min=5.0,
                total_appointments=5,
                no_show_count=0,
                primary_doctor_id="D003",
            ),
            Patient(
                patient_id="00005",
                name="James Wilson",
                sex="M",
                dob=date(1972, 8, 14),
                insurance="Medicare Part B",
                email="jwilson@example.com",
                password_hash=default_pwd,
                blood_type="O-",
                emergency_contact="+1 555-0125",
                active_status="Chronic Care",
                portal_active=True,
                reliability_grade="B",
                punctuality_score=82.0,
                avg_wait_time_min=14.0,
                total_appointments=8,
                no_show_count=1,
                primary_doctor_id="D001",
            ),
            Patient(
                patient_id="00006",
                name="Emily Taylor",
                sex="F",
                dob=date(2000, 9, 19),
                insurance="Kaiser Permanente",
                email="emily.t@example.com",
                password_hash=default_pwd,
                blood_type="A-",
                emergency_contact="+1 555-0177",
                active_status="Active",
                portal_active=True,
                reliability_grade="A",
                punctuality_score=94.0,
                avg_wait_time_min=7.0,
                total_appointments=2,
                no_show_count=0,
                primary_doctor_id="D005",
            ),
            Patient(
                patient_id="00007",
                name="Robert Kumar",
                sex="M",
                dob=date(1985, 12, 3),
                insurance="HealthFirst",
                email="rkumar@example.com",
                password_hash=default_pwd,
                blood_type="B-",
                emergency_contact="+1 555-0158",
                active_status="Active",
                portal_active=True,
                reliability_grade="A",
                punctuality_score=91.0,
                avg_wait_time_min=8.5,
                total_appointments=4,
                no_show_count=0,
                primary_doctor_id="D004",
            ),
        ]
        db.add_all(patients_data)
        await db.commit()
        print(f"  ✓ {len(patients_data)} patients created")

        # ── 3. Seed Slots & Appointments (Past + Upcoming) ────────────
        print("📅 Seeding appointments & slots...")
        today = date.today()
        slots_list = []
        appts_list = []
        slot_counter = 1

        # A. Appointments for Alex Morgan (00001 - Default Showcase Patient)
        # Upcoming appointment in 2 days at 09:30 AM
        upcoming_date = today + timedelta(days=2)
        s_up = Slot(
            slot_id=f"SLOT{str(slot_counter).zfill(5)}",
            appointment_date=upcoming_date,
            appointment_time=time(9, 30),
            is_available=False,
            doctor_id="D001",
            status="booked",
            duration_min=15,
        )
        slot_counter += 1
        slots_list.append(s_up)

        appts_list.append(Appointment(
            appointment_id="APT00001",
            slot_id=s_up.slot_id,
            scheduling_date=today - timedelta(days=5),
            appointment_date=upcoming_date,
            appointment_time=time(9, 30),
            scheduling_interval=7,
            status="upcoming",
            appointment_duration=15.0,
            patient_id="00001",
            sex="M",
            age=28,
            age_group="25-29",
            appointment_type="General Consultation",
            doctor_id="D001",
            portal_status="upcoming",
        ))

        # Past completed appointment 1 (12 days ago)
        past_date_1 = today - timedelta(days=12)
        s_p1 = Slot(
            slot_id=f"SLOT{str(slot_counter).zfill(5)}",
            appointment_date=past_date_1,
            appointment_time=time(10, 0),
            is_available=False,
            doctor_id="D001",
            status="booked",
            duration_min=15,
        )
        slot_counter += 1
        slots_list.append(s_p1)

        appts_list.append(Appointment(
            appointment_id="APT00002",
            slot_id=s_p1.slot_id,
            scheduling_date=past_date_1 - timedelta(days=3),
            appointment_date=past_date_1,
            appointment_time=time(10, 0),
            scheduling_interval=3,
            status="attended",
            check_in_time=time(9, 55),
            appointment_duration=15.0,
            waiting_time=6.0,
            patient_id="00001",
            sex="M",
            age=28,
            age_group="25-29",
            appointment_type="Routine Follow-up",
            doctor_id="D001",
            portal_status="completed",
        ))

        # Past completed appointment 2 (38 days ago)
        past_date_2 = today - timedelta(days=38)
        s_p2 = Slot(
            slot_id=f"SLOT{str(slot_counter).zfill(5)}",
            appointment_date=past_date_2,
            appointment_time=time(14, 30),
            is_available=False,
            doctor_id="D002",
            status="booked",
            duration_min=20,
        )
        slot_counter += 1
        slots_list.append(s_p2)

        appts_list.append(Appointment(
            appointment_id="APT00003",
            slot_id=s_p2.slot_id,
            scheduling_date=past_date_2 - timedelta(days=6),
            appointment_date=past_date_2,
            appointment_time=time(14, 30),
            scheduling_interval=6,
            status="attended",
            check_in_time=time(14, 25),
            appointment_duration=20.0,
            waiting_time=7.0,
            patient_id="00001",
            sex="M",
            age=28,
            age_group="25-29",
            appointment_type="Cardiovascular Health Screening",
            doctor_id="D002",
            portal_status="completed",
        ))

        # B. Appointments for Patients 00002 through 00007
        other_patients_specs = [
            ("00002", "Sarah Jenkins", "F", 34, "30-34", "D002", "Cardiology Follow-up", 4, 18),
            ("00003", "David Chen", "M", 45, "45-49", "D004", "Orthopedic Evaluation", 1, 25),
            ("00004", "Maria Rodriguez", "F", 29, "25-29", "D003", "Skin Check & Biopsy Review", 5, 14),
            ("00005", "James Wilson", "M", 52, "50-54", "D001", "Blood Pressure Monitoring", 3, 21),
            ("00006", "Emily Taylor", "F", 24, "20-24", "D005", "Allergy & Sinus Consultation", 6, 16),
            ("00007", "Robert Kumar", "M", 39, "35-39", "D004", "Joint Pain Follow-up", 2, 28),
        ]

        for pid, name, sex, age, agrp, doc_id, appt_type, up_days, past_days in other_patients_specs:
            # Upcoming
            u_date = today + timedelta(days=up_days)
            s_u = Slot(
                slot_id=f"SLOT{str(slot_counter).zfill(5)}",
                appointment_date=u_date,
                appointment_time=time(11, 0),
                is_available=False,
                doctor_id=doc_id,
                status="booked",
                duration_min=15,
            )
            slot_counter += 1
            slots_list.append(s_u)

            appts_list.append(Appointment(
                appointment_id=f"APT{str(slot_counter).zfill(5)}",
                slot_id=s_u.slot_id,
                scheduling_date=today - timedelta(days=2),
                appointment_date=u_date,
                appointment_time=time(11, 0),
                scheduling_interval=up_days + 2,
                status="upcoming",
                appointment_duration=15.0,
                patient_id=pid,
                sex=sex,
                age=age,
                age_group=agrp,
                appointment_type=appt_type,
                doctor_id=doc_id,
                portal_status="upcoming",
            ))

            # Past completed
            p_date = today - timedelta(days=past_days)
            s_p = Slot(
                slot_id=f"SLOT{str(slot_counter).zfill(5)}",
                appointment_date=p_date,
                appointment_time=time(15, 0),
                is_available=False,
                doctor_id=doc_id,
                status="booked",
                duration_min=15,
            )
            slot_counter += 1
            slots_list.append(s_p)

            appts_list.append(Appointment(
                appointment_id=f"APT{str(slot_counter).zfill(5)}",
                slot_id=s_p.slot_id,
                scheduling_date=p_date - timedelta(days=4),
                appointment_date=p_date,
                appointment_time=time(15, 0),
                scheduling_interval=4,
                status="attended",
                check_in_time=time(14, 52),
                appointment_duration=15.0,
                waiting_time=8.0,
                patient_id=pid,
                sex=sex,
                age=age,
                age_group=agrp,
                appointment_type=appt_type,
                doctor_id=doc_id,
                portal_status="completed",
            ))

        # C. Generate 100+ Free Slots across the next 14 days
        print("⏰ Generating open slots for booking across next 14 days...")
        slot_hours = [
            time(9, 0), time(9, 30), time(10, 0), time(10, 30),
            time(11, 0), time(11, 30), time(14, 0), time(14, 30),
            time(15, 0), time(15, 30), time(16, 0), time(16, 30),
        ]
        doc_ids = ["D001", "D002", "D003", "D004", "D005"]

        for day_offset in range(0, 14):
            slot_date = today + timedelta(days=day_offset)
            for t in slot_hours:
                for doc_id in doc_ids[:2]:  # 2 doctors available per time
                    s = Slot(
                        slot_id=f"SLOT{str(slot_counter).zfill(5)}",
                        appointment_date=slot_date,
                        appointment_time=t,
                        is_available=True,
                        doctor_id=doc_id,
                        status="free",
                        duration_min=15,
                    )
                    slot_counter += 1
                    slots_list.append(s)

        db.add_all(slots_list)
        await db.commit()
        db.add_all(appts_list)
        await db.commit()
        print(f"  ✓ {len(slots_list)} slots created ({len(appts_list)} booked appointments)")

        # ── 4. Seed In-App Notifications for Alex Morgan ──────────────
        print("🔔 Seeding notifications...")
        notifications_data = [
            Notification(
                notification_id="NOTIF-001",
                patient_id="00001",
                title="Upcoming Appointment in 2 Days",
                message="Your General Consultation with Dr. Priya Sharma is scheduled for 9:30 AM in Room 204.",
                channel="in_app",
                is_read=False,
                created_at=datetime.now(timezone.utc) - timedelta(hours=3),
            ),
            Notification(
                notification_id="NOTIF-002",
                patient_id="00001",
                title="Lab Results Ready",
                message="Your annual comprehensive metabolic blood panel results are now available for review.",
                channel="in_app",
                is_read=False,
                created_at=datetime.now(timezone.utc) - timedelta(days=1),
            ),
            Notification(
                notification_id="NOTIF-003",
                patient_id="00001",
                title="Insurance Coverage Verified",
                message="Your Blue Cross Blue Shield policy coverage was verified for upcoming clinic consultations.",
                channel="in_app",
                is_read=True,
                created_at=datetime.now(timezone.utc) - timedelta(days=3),
            ),
        ]
        db.add_all(notifications_data)
        await db.commit()
        print(f"  ✓ {len(notifications_data)} notifications created")

        # ── 5. Seed Live Queue Entries ────────────────────────────────
        print("🚶 Seeding live clinic queue...")
        queue_data = [
            LiveQueue(
                queue_id="Q-001",
                appointment_id="APT00002",
                patient_id="00003",
                clinic_id="clinic_01",
                doctor_id="D001",
                position=1,
                status="in_progress",
                priority_score=0.0,
                checked_in_at=datetime.now(timezone.utc) - timedelta(minutes=20),
                session_started_at=datetime.now(timezone.utc) - timedelta(minutes=5),
                eta_seconds=0,
            ),
            LiveQueue(
                queue_id="Q-002",
                appointment_id="APT00003",
                patient_id="00005",
                clinic_id="clinic_01",
                doctor_id="D001",
                position=2,
                status="waiting",
                priority_score=0.0,
                checked_in_at=datetime.now(timezone.utc) - timedelta(minutes=10),
                eta_seconds=300,
            ),
            LiveQueue(
                queue_id="Q-003",
                appointment_id="APT00001",
                patient_id="00007",
                clinic_id="clinic_01",
                doctor_id="D001",
                position=3,
                status="waiting",
                priority_score=0.0,
                checked_in_at=datetime.now(timezone.utc) - timedelta(minutes=5),
                eta_seconds=750,
            ),
        ]
        db.add_all(queue_data)
        await db.commit()
        print(f"  ✓ {len(queue_data)} active patients in live queue")

    print("\n🎉 Database seeding completed successfully!")
    print(f"📍 Database File: backend/healthlink.db")
    print(f"👤 Showcase User : Alex Morgan (ID: 00001)")
    print(f"🔑 Password      : health123")


if __name__ == "__main__":
    asyncio.run(seed())

