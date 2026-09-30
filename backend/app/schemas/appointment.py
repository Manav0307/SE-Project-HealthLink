from pydantic import BaseModel
from typing import Optional
from datetime import date, time, datetime


class AppointmentOut(BaseModel):
    appointment_id: str
    slot_id: str
    appointment_date: date
    appointment_time: time
    portal_status: str
    appointment_type: str
    reschedule_count: int
    waiting_time: Optional[float]
    appointment_duration: Optional[float]
    doctor_id: Optional[str]
    summary_url: Optional[str]

    class Config:
        from_attributes = True


class AppointmentCreate(BaseModel):
    slot_id: str
    patient_id: str
    appointment_type: str
    doctor_id: Optional[str] = None


class CancelRequest(BaseModel):
    reason: Optional[str] = None


class RescheduleRequest(BaseModel):
    new_slot_id: str
