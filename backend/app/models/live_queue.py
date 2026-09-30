"""Live Queue model — real-time waiting room state"""
from sqlalchemy import Column, String, Integer, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.db.session import Base


class LiveQueue(Base):
    __tablename__ = "live_queue"

    queue_id = Column(String(36), primary_key=True)
    appointment_id = Column(String(10), ForeignKey("appointments.appointment_id"))
    patient_id = Column(String(10), ForeignKey("patients.patient_id"))
    clinic_id = Column(String(10))
    doctor_id = Column(String(10))

    position = Column(Integer)
    status = Column(String(20), default="waiting")  # waiting|in_progress|called|done
    priority_score = Column(Float, default=0.0)
    checked_in_at = Column(DateTime, nullable=True)
    session_started_at = Column(DateTime, nullable=True)
    eta_seconds = Column(Integer, default=0)

    # Relationships
    appointment = relationship("Appointment")
    patient = relationship("Patient")
