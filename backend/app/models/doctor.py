"""Doctor model"""
from sqlalchemy import Column, String, Float, Integer, Text
from app.db.session import Base


class Doctor(Base):
    __tablename__ = "doctors"

    doctor_id = Column(String(10), primary_key=True)
    name = Column(String(255), nullable=False)
    specialization = Column(String(100))
    clinic_id = Column(String(10))
    avg_session_duration_min = Column(Float, default=20.0)
    rating = Column(Float, default=4.5)
    profile_image_url = Column(Text, nullable=True)
    bio = Column(Text, nullable=True)
    is_available = Column(Integer, default=1)
