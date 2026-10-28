from pydantic import BaseModel
from typing import Optional
from datetime import date, time


class SlotOut(BaseModel):
    slot_id: str
    appointment_date: date
    appointment_time: time
    status: str = "free"
    duration_min: int = 15
    predicted_wait_min: Optional[float] = 0.0
    no_show_probability: Optional[float] = 0.0
    traffic_level: Optional[str] = "normal"
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
