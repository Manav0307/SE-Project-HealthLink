"""
init_sqlite_db.py

Initializes backend/healthlink.db using standard Python sqlite3 (zero external dependencies).
Creates the entire database schema and inserts realistic prototype data:
- 7 Patients (Default showcase: 00001 - Alex Morgan)
- 5 Doctors
- Past completed visits & upcoming appointments
- Open appointment slots across the next 14 days
- Unread notifications
- Live clinic queue entries
"""
import sqlite3
import os
from datetime import date, time, datetime, timedelta

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "healthlink.db")


def init_db():
    print(f"Connecting to SQLite: {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # Drop existing tables
    cur.executescript("""
        DROP TABLE IF EXISTS live_queue;
        DROP TABLE IF EXISTS notifications;
        DROP TABLE IF EXISTS appointments;
        DROP TABLE IF EXISTS slots;
        DROP TABLE IF EXISTS doctors;
        DROP TABLE IF EXISTS patients;
        DROP TABLE IF EXISTS intake_forms;

        CREATE TABLE patients (
            patient_id VARCHAR(10) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            sex VARCHAR(10),
            dob DATE,
            insurance VARCHAR(255),
            email VARCHAR(255) UNIQUE,
            password_hash TEXT,
            blood_type VARCHAR(5),
            emergency_contact VARCHAR(20),
            active_status TEXT,
            portal_active BOOLEAN DEFAULT 1,
            punctuality_score FLOAT DEFAULT 0.0,
            avg_wait_time_min FLOAT DEFAULT 0.0,
            reliability_grade VARCHAR(3) DEFAULT 'A',
            total_appointments INTEGER DEFAULT 0,
            no_show_count INTEGER DEFAULT 0,
            totp_secret_encrypted TEXT,
            biometric_key_hash TEXT,
            two_fa_enabled BOOLEAN DEFAULT 0,
            biometric_enabled BOOLEAN DEFAULT 0,
            primary_doctor_id VARCHAR(10)
        );

        CREATE TABLE doctors (
            doctor_id VARCHAR(10) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            specialization VARCHAR(100),
            clinic_id VARCHAR(10),
            avg_session_duration_min FLOAT DEFAULT 20.0,
            rating FLOAT DEFAULT 4.5,
            profile_image_url TEXT,
            bio TEXT,
            is_available INTEGER DEFAULT 1
        );

        CREATE TABLE slots (
            slot_id VARCHAR(10) PRIMARY KEY,
            appointment_date DATE NOT NULL,
            appointment_time TIME NOT NULL,
            is_available BOOLEAN DEFAULT 1,
            doctor_id VARCHAR(10),
            status VARCHAR(10) DEFAULT 'free',
            lock_expires_at TIMESTAMP,
            locked_by_patient_id VARCHAR(10),
            predicted_wait_min FLOAT DEFAULT 0.0,
            no_show_probability FLOAT DEFAULT 0.0,
            traffic_level VARCHAR(10) DEFAULT 'low',
            duration_min INTEGER DEFAULT 15
        );

        CREATE TABLE appointments (
            appointment_id VARCHAR(10) PRIMARY KEY,
            slot_id VARCHAR(10) REFERENCES slots(slot_id),
            scheduling_date DATE,
            appointment_date DATE,
            appointment_time TIME,
            scheduling_interval INTEGER,
            status VARCHAR(20),
            check_in_time TIME,
            appointment_duration FLOAT,
            start_time TIME,
            end_time TIME,
            waiting_time FLOAT,
            patient_id VARCHAR(10) REFERENCES patients(patient_id),
            sex VARCHAR(10),
            age INTEGER,
            age_group VARCHAR(10),
            appointment_type VARCHAR(100) DEFAULT 'General Consultation',
            doctor_id VARCHAR(10) REFERENCES doctors(doctor_id),
            portal_status VARCHAR(20) DEFAULT 'upcoming',
            reschedule_count INTEGER DEFAULT 0,
            cancelled_at TIMESTAMP,
            cancellation_reason TEXT,
            summary_url TEXT
        );

        CREATE TABLE notifications (
            notification_id VARCHAR(36) PRIMARY KEY,
            patient_id VARCHAR(10) REFERENCES patients(patient_id),
            title VARCHAR(255),
            message TEXT,
            channel VARCHAR(20),
            is_read BOOLEAN DEFAULT 0,
            sent_at TIMESTAMP,
            created_at TIMESTAMP
        );

        CREATE TABLE live_queue (
            queue_id VARCHAR(36) PRIMARY KEY,
            appointment_id VARCHAR(10) REFERENCES appointments(appointment_id),
            patient_id VARCHAR(10) REFERENCES patients(patient_id),
            clinic_id VARCHAR(10),
            doctor_id VARCHAR(10),
            position INTEGER,
            status VARCHAR(20) DEFAULT 'waiting',
            priority_score FLOAT DEFAULT 0.0,
            checked_in_at TIMESTAMP,
            session_started_at TIMESTAMP,
            eta_seconds INTEGER DEFAULT 0
        );

        CREATE TABLE intake_forms (
            submission_id VARCHAR(36) PRIMARY KEY,
            appointment_id VARCHAR(10),
            patient_id VARCHAR(10),
            form_data TEXT,
            submitted_at TIMESTAMP,
            is_complete BOOLEAN DEFAULT 1
        );
    """)

    # 1. Insert Doctors
    doctors = [
        ("D001", "Dr. Priya Sharma", "General Medicine", "clinic_01", 15.0, 4.9, None, "Board-certified internal medicine physician with 12+ years experience.", 1),
        ("D002", "Dr. Arjun Mehta", "Cardiology", "clinic_01", 20.0, 4.8, None, "Cardiologist specializing in cardiovascular care and disease prevention.", 1),
        ("D003", "Dr. Neha Patel", "Dermatology", "clinic_01", 15.0, 4.7, None, "Consultant dermatologist specializing in comprehensive clinical skin health.", 1),
        ("D004", "Dr. Ravi Kumar", "Orthopedics", "clinic_01", 25.0, 4.9, None, "Orthopedic surgeon specializing in sports medicine and joint care.", 1),
        ("D005", "Dr. Sunita Verma", "ENT Specialist", "clinic_01", 15.0, 4.8, None, "Otolaryngologist with focus on sinus, ear, and allergy care.", 1),
    ]
    cur.executemany("INSERT INTO doctors VALUES (?,?,?,?,?,?,?,?,?)", doctors)

    # 2. Insert 7 Patients
    patients = [
        ("00001", "Alex Morgan", "M", "1998-01-15", "Blue Cross Blue Shield", "alex.morgan@healthlink.com", "hash_placeholder", "O+", "+1 555-0199", "Active", 1, 96.0, 6.5, "A", 4, 0, None, None, 0, 0, "D001"),
        ("00002", "Sarah Jenkins", "F", "1990-05-22", "Aetna Health", "sarah.j@example.com", "hash_placeholder", "A+", "+1 555-0144", "Post-Op Recovery", 1, 92.0, 8.0, "A", 6, 0, None, None, 0, 0, "D002"),
        ("00003", "David Chen", "M", "1979-11-08", "UnitedHealthcare", "dchen@example.com", "hash_placeholder", "B+", "+1 555-0182", "Active", 1, 85.0, 11.0, "B", 3, 1, None, None, 0, 0, "D004"),
        ("00004", "Maria Rodriguez", "F", "1995-03-30", "Cigna Premier", "mrodriguez@example.com", "hash_placeholder", "AB-", "+1 555-0163", "Active", 1, 98.0, 5.0, "A", 5, 0, None, None, 0, 0, "D003"),
        ("00005", "James Wilson", "M", "1972-08-14", "Medicare Part B", "jwilson@example.com", "hash_placeholder", "O-", "+1 555-0125", "Chronic Care", 1, 82.0, 14.0, "B", 8, 1, None, None, 0, 0, "D001"),
        ("00006", "Emily Taylor", "F", "2000-09-19", "Kaiser Permanente", "emily.t@example.com", "hash_placeholder", "A-", "+1 555-0177", "Active", 1, 94.0, 7.0, "A", 2, 0, None, None, 0, 0, "D005"),
        ("00007", "Robert Kumar", "M", "1985-12-03", "HealthFirst", "rkumar@example.com", "hash_placeholder", "B-", "+1 555-0158", "Active", 1, 91.0, 8.5, "A", 4, 0, None, None, 0, 0, "D004"),
    ]
    cur.executemany("INSERT INTO patients VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", patients)

    # 3. Insert Slots & Appointments
    today = date.today()
    slots = []
    appointments = []
    slot_id_seq = 1

    # Showcase Patient 00001 (Alex Morgan)
    # Upcoming appointment in 2 days
    up_date = today + timedelta(days=2)
    s_up_id = f"SLOT{str(slot_id_seq).zfill(5)}"
    slot_id_seq += 1
    slots.append((s_up_id, str(up_date), "09:30:00", 0, "D001", "booked", None, "00001", 0.0, 0.0, "low", 15))
    appointments.append((
        "APT00001", s_up_id, str(today - timedelta(days=3)), str(up_date), "09:30:00", 5,
        "upcoming", None, 15.0, None, None, None,
        "00001", "M", 28, "25-29", "General Consultation", "D001", "upcoming", 0, None, None, None
    ))

    # Past completed appointment 1 (14 days ago)
    p_date_1 = today - timedelta(days=14)
    s_p1_id = f"SLOT{str(slot_id_seq).zfill(5)}"
    slot_id_seq += 1
    slots.append((s_p1_id, str(p_date_1), "10:00:00", 0, "D001", "booked", None, "00001", 0.0, 0.0, "low", 15))
    appointments.append((
        "APT00002", s_p1_id, str(p_date_1 - timedelta(days=4)), str(p_date_1), "10:00:00", 4,
        "attended", "09:55:00", 15.0, "10:00:00", "10:15:00", 5.0,
        "00001", "M", 28, "25-29", "Routine Follow-up", "D001", "completed", 0, None, None, None
    ))

    # Past completed appointment 2 (40 days ago)
    p_date_2 = today - timedelta(days=40)
    s_p2_id = f"SLOT{str(slot_id_seq).zfill(5)}"
    slot_id_seq += 1
    slots.append((s_p2_id, str(p_date_2), "14:30:00", 0, "D002", "booked", None, "00001", 0.0, 0.0, "low", 20))
    appointments.append((
        "APT00003", s_p2_id, str(p_date_2 - timedelta(days=5)), str(p_date_2), "14:30:00", 5,
        "attended", "14:24:00", 20.0, "14:30:00", "14:50:00", 6.0,
        "00001", "M", 28, "25-29", "Cardiology Screening", "D002", "completed", 0, None, None, None
    ))

    # Additional Appointments for other patients
    other_appts = [
        ("00002", "F", 34, "30-34", "D002", "Cardiology Review", 4, 18),
        ("00003", "M", 45, "45-49", "D004", "Orthopedic Checkup", 1, 25),
        ("00004", "F", 29, "25-29", "D003", "Dermatology Session", 5, 12),
        ("00005", "M", 52, "50-54", "D001", "Blood Pressure Check", 3, 22),
        ("00006", "F", 24, "20-24", "D005", "Sinus Consultation", 6, 15),
        ("00007", "M", 39, "35-39", "D004", "Joint Pain Evaluation", 2, 30),
    ]

    for pid, sex, age, agrp, doc_id, appt_type, up_days, past_days in other_appts:
        # Upcoming
        u_d = today + timedelta(days=up_days)
        s_uid = f"SLOT{str(slot_id_seq).zfill(5)}"
        slot_id_seq += 1
        slots.append((s_uid, str(u_d), "11:00:00", 0, doc_id, "booked", None, pid, 0.0, 0.0, "low", 15))
        appointments.append((
            f"APT{str(slot_id_seq).zfill(5)}", s_uid, str(today - timedelta(days=1)), str(u_d), "11:00:00", up_days + 1,
            "upcoming", None, 15.0, None, None, None,
            pid, sex, age, agrp, appt_type, doc_id, "upcoming", 0, None, None, None
        ))

        # Past completed
        p_d = today - timedelta(days=past_days)
        s_pid = f"SLOT{str(slot_id_seq).zfill(5)}"
        slot_id_seq += 1
        slots.append((s_pid, str(p_d), "15:30:00", 0, doc_id, "booked", None, pid, 0.0, 0.0, "low", 15))
        appointments.append((
            f"APT{str(slot_id_seq).zfill(5)}", s_pid, str(p_d - timedelta(days=3)), str(p_d), "15:30:00", 3,
            "attended", "15:25:00", 15.0, "15:30:00", "15:45:00", 7.0,
            pid, sex, age, agrp, appt_type, doc_id, "completed", 0, None, None, None
        ))

    # Generate open time slots for all 5 doctors across the next 14 days
    times = [
        "09:00:00", "09:30:00", "10:00:00", "10:30:00",
        "11:00:00", "11:30:00", "14:00:00", "14:30:00",
        "15:00:00", "15:30:00", "16:00:00", "16:30:00"
    ]
    docs = ["D001", "D002", "D003", "D004", "D005"]
    booked_slots_set = {(str(s[1]), str(s[2]), s[4]) for s in slots}

    for d_offset in range(0, 14):
        target_d = str(today + timedelta(days=d_offset))
        for t in times:
            for doc in docs:
                if (target_d, t, doc) in booked_slots_set:
                    continue  # Already booked, so slot remains booked and excluded from available
                s_id = f"SLOT{str(slot_id_seq).zfill(5)}"
                slot_id_seq += 1
                slots.append((s_id, target_d, t, 1, doc, "free", None, None, 0.0, 0.0, "low", 15))

    cur.executemany("INSERT INTO slots VALUES (?,?,?,?,?,?,?,?,?,?,?,?)", slots)
    cur.executemany("INSERT INTO appointments VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", appointments)

    # 4. Insert Notifications for Alex Morgan
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    notifications = [
        ("N001", "00001", "Upcoming Appointment in 2 Days", "Your consultation with Dr. Priya Sharma is confirmed for 9:30 AM.", "in_app", 0, None, now_str),
        ("N002", "00001", "Blood Work Results Ready", "Your routine metabolic blood work results are available to review.", "in_app", 0, None, now_str),
        ("N003", "00001", "Insurance Verified", "Your Blue Cross Blue Shield policy was verified successfully.", "in_app", 1, None, now_str),
    ]
    cur.executemany("INSERT INTO notifications VALUES (?,?,?,?,?,?,?,?)", notifications)

    # 5. Insert Live Queue Entries
    queue = [
        ("Q001", "APT00002", "00003", "clinic_01", "D001", 1, "in_progress", 0.0, now_str, now_str, 0),
        ("Q002", "APT00003", "00005", "clinic_01", "D001", 2, "waiting", 0.0, now_str, None, 300),
        ("Q003", "APT00001", "00007", "clinic_01", "D001", 3, "waiting", 0.0, now_str, None, 750),
    ]
    cur.executemany("INSERT INTO live_queue VALUES (?,?,?,?,?,?,?,?,?,?,?)", queue)

    conn.commit()
    conn.close()

    print("\n✅ SQLite database populated successfully!")
    print(f"📊 Created {len(doctors)} Doctors")
    print(f"📊 Created {len(patients)} Patients (Showcase: Alex Morgan - 00001)")
    print(f"📊 Created {len(appointments)} Booked Appointments")
    print(f"📊 Created {len(slots)} Total Time Slots")
    print(f"📊 Created {len(notifications)} Notifications")
    print(f"📊 Created {len(queue)} Queue Entries")


if __name__ == "__main__":
    init_db()

