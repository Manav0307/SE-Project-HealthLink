"""
Slot model — maps to slots.csv
CSV fields: slot_id, appointment_date, appointment_time, is_available
"""
from sqlalchemy import Column, String, Date, Time, Boolean, DateTime, Float, Integer, ForeignKey, Enum as PgEnum
from sqlalchemy.orm import relationship
from app.db.session import Base
import enum


class SlotStatus(str, enum.Enum):
    FREE = "free"
    LOCKED = "locked"
    BOOKED = "booked"


class Slot(Base):
    __tablename__ = "slots"

    # From CSV
    slot_id = Column(String(10), primary_key=True)     # e.g. "0000001"
    appointment_date = Column(Date, nullable=False)
    appointment_time = Column(Time, nullable=False)
    is_available = Column(Boolean, default=True)       # from CSV

    # Portal fields
    doctor_id = Column(String(10), nullable=True)
    status = Column(String(10), default="free")        # free | locked | booked
    lock_expires_at = Column(DateTime, nullable=True)
    locked_by_patient_id = Column(String(10), nullable=True)

    # ML predictions (populated at booking time)
    predicted_wait_min = Column(Float, default=0.0)
    no_show_probability = Column(Float, default=0.0)
    traffic_level = Column(String(10), default="low")  # low|medium|peak

    # Duration
    duration_min = Column(Integer, default=15)

    # Relationships
    appointments = relationship("Appointment", back_populates="slot")