"""
Appointment model — maps to appointments.csv
CSV fields: appointment_id, slot_id, scheduling_date, appointment_date,
            appointment_time, scheduling_interval, status, check_in_time,
            appointment_duration, start_time, end_time, waiting_time,
            patient_id, sex, age, age_group
"""
from sqlalchemy import Column, String, Date, Time, Integer, Float, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.db.session import Base


class Appointment(Base):
    __tablename__ = "appointments"

    # From CSV
    appointment_id = Column(String(10), primary_key=True)
    slot_id = Column(String(10), ForeignKey("slots.slot_id"))
    scheduling_date = Column(Date)
    appointment_date = Column(Date)
    appointment_time = Column(Time)
    scheduling_interval = Column(Integer)              # days between booking and appt
    status = Column(String(20))                        # "attended" | "did not attend"
    check_in_time = Column(Time, nullable=True)
    appointment_duration = Column(Float, nullable=True)  # minutes
    start_time = Column(Time, nullable=True)
    end_time = Column(Time, nullable=True)
    waiting_time = Column(Float, nullable=True)        # minutes
    patient_id = Column(String(10), ForeignKey("patients.patient_id"))
    sex = Column(String(10))
    age = Column(Integer)
    age_group = Column(String(10))

    # Portal-specific fields
    appointment_type = Column(String(100), default="General Consultation")
    doctor_id = Column(String(10), ForeignKey("doctors.doctor_id"), nullable=True)
    portal_status = Column(String(20), default="upcoming")
    # portal_status: upcoming | completed | missed | cancelled
    reschedule_count = Column(Integer, default=0)
    cancelled_at = Column(DateTime, nullable=True)
    cancellation_reason = Column(Text, nullable=True)
    summary_url = Column(Text, nullable=True)         # S3/R2 presigned URL

    # Relationships
    patient = relationship("Patient", back_populates="appointments")
    slot = relationship("Slot", back_populates="appointments")
    doctor = relationship("Doctor")
