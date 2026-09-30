from pydantic import BaseModel
from typing import Optional
from datetime import date, time


class SlotOut(BaseModel):
    slot_id: str
    appointment_date: date
    appointment_time: time
    status: str
    duration_min: int
    predicted_wait_min: float
    no_show_probability: float
    traffic_level: str
    is_recommended: bool = False

    class Config:
        from_attributes = True


class SlotReserveRequest(BaseModel):
    slot_id: str
    patient_id: str


class SlotConfirmRequest(BaseModel):
    lock_id: str
    slot_id: str
    patient_id: str
    appointment_type: str = "General Consultation"
    doctor_id: Optional[str] = None
