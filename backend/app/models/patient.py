"""
Patient model — maps to patients.csv
CSV fields: patient_id, name, sex, dob, insurance
"""
from sqlalchemy import Column, String, Date, Float, Integer, Boolean, Text, Enum as PgEnum
from sqlalchemy.orm import relationship
from app.db.session import Base
import enum


class ReliabilityGrade(str, enum.Enum):
    A_PLUS = "A+"
    A = "A"
    B = "B"
    C = "C"
    D = "D"


class Patient(Base):
    __tablename__ = "patients"

    # From CSV
    patient_id = Column(String(10), primary_key=True)  # e.g. "00001"
    name = Column(String(255), nullable=False)
    sex = Column(String(10))
    dob = Column(Date)
    insurance = Column(String(255))

    # Portal fields
    email = Column(String(255), unique=True, nullable=True)
    password_hash = Column(Text, nullable=True)
    blood_type = Column(String(5))
    emergency_contact = Column(String(20))
    active_status = Column(Text, nullable=True)       # "Post-Op Recovery" etc.
    portal_active = Column(Boolean, default=True)

    # Behavior Insights (computed nightly)
    punctuality_score = Column(Float, default=0.0)    # 0-100 percent
    avg_wait_time_min = Column(Float, default=0.0)    # minutes
    reliability_grade = Column(String(3), default="B")  # A+, A, B, C, D
    total_appointments = Column(Integer, default=0)
    no_show_count = Column(Integer, default=0)

    # Security
    totp_secret_encrypted = Column(Text, nullable=True)
    biometric_key_hash = Column(Text, nullable=True)
    two_fa_enabled = Column(Boolean, default=False)
    biometric_enabled = Column(Boolean, default=False)

    # Primary doctor
    primary_doctor_id = Column(String(10), nullable=True)

    # Relationships
    appointments = relationship("Appointment", back_populates="patient")
    notifications = relationship("Notification", back_populates="patient")
