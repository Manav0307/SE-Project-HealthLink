from pydantic import BaseModel
from typing import Optional, List
from datetime import date, time


class UpcomingAppointmentSummary(BaseModel):
    appointment_id: str
    appointment_date: date
    appointment_time: time
    doctor_name: str
    appointment_type: str
    location: str


class LiveClinicStatus(BaseModel):
    total_ahead: int
    total_in_queue: int
    traffic_level: str


class AlertItem(BaseModel):
    notification_id: str
    title: str
    message: str
    is_read: bool


class DashboardSummaryOut(BaseModel):
    patient_name: str
    upcoming_appointment: Optional[UpcomingAppointmentSummary]
    clinic_status: LiveClinicStatus
    unread_alerts: List[AlertItem]
    health_metric_snapshot: dict
