from sqlalchemy import Column, String, DateTime, JSON, Boolean
from app.db.session import Base


class IntakeFormSubmission(Base):
    __tablename__ = "intake_form_submissions"

    submission_id = Column(String(36), primary_key=True)
    appointment_id = Column(String(10))
    patient_id = Column(String(10))
    form_data = Column(JSON)        # dynamic form fields
    submitted_at = Column(DateTime)
    is_complete = Column(Boolean, default=False)
