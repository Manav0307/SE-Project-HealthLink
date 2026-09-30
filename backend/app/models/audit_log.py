from sqlalchemy import Column, String, DateTime, Text, JSON
from app.db.session import Base
from datetime import datetime

class AuditLog(Base):
    __tablename__ = "appointment_audit_log"

    log_id = Column(String(36), primary_key=True)
    appointment_id = Column(String(10))
    patient_id = Column(String(10))
    
    # Action performed: book|cancel|reschedule|check_in|complete|miss
    action = Column(String(50)) 
    
    old_status = Column(String(20), nullable=True)
    new_status = Column(String(20), nullable=True)
    performed_by = Column(String(10))  # patient_id or "system"
    
    # FIX: Renamed attribute to 'extra_metadata' to avoid SQLAlchemy conflict.
    # The first argument "metadata" tells the DB to still use 'metadata' as the column name.
    extra_metadata = Column("metadata", JSON, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<AuditLog(log_id='{self.log_id}', action='{self.action}')>"