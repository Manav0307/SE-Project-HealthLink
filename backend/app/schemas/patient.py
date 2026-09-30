from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import date


class PatientOut(BaseModel):
    patient_id: str
    name: str
    sex: Optional[str]
    dob: Optional[date]
    insurance: Optional[str]
    email: Optional[str]
    blood_type: Optional[str]
    emergency_contact: Optional[str]
    active_status: Optional[str]
    reliability_grade: str
    punctuality_score: float
    avg_wait_time_min: float
    two_fa_enabled: bool
    biometric_enabled: bool
    primary_doctor_id: Optional[str]

    class Config:
        from_attributes = True


class PatientUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    emergency_contact: Optional[str] = None
    blood_type: Optional[str] = None


class BehaviorInsights(BaseModel):
    avg_wait_time_min: float
    punctuality_score: float
    reliability_grade: str
    reliability_percentile: int
    total_appointments: int
    no_show_count: int
