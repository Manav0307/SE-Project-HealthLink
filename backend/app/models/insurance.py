from sqlalchemy import Column, String, Boolean, DateTime
from app.db.session import Base


class InsuranceVerification(Base):
    __tablename__ = "insurance_verifications"

    verification_id = Column(String(36), primary_key=True)
    patient_id = Column(String(10))
    insurance_provider = Column(String(255))   # from patients.csv insurance field
    is_pre_approved = Column(Boolean, default=False)
    verified_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True)
