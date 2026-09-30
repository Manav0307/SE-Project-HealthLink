from sqlalchemy import Column, String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.db.session import Base


class Notification(Base):
    __tablename__ = "notifications"

    notification_id = Column(String(36), primary_key=True)
    patient_id = Column(String(10), ForeignKey("patients.patient_id"))
    title = Column(String(255))
    message = Column(Text)
    channel = Column(String(20))  # email|sms|push|in_app
    is_read = Column(Boolean, default=False)
    sent_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime)

    patient = relationship("Patient", back_populates="notifications")
