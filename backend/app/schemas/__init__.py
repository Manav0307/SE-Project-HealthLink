from app.schemas.patient import PatientOut, PatientUpdate, BehaviorInsights
from app.schemas.appointment import AppointmentOut, AppointmentCreate
from app.schemas.slot import SlotOut, SlotReserveRequest, SlotConfirmRequest
from app.schemas.auth import LoginRequest, TokenResponse, Enable2FAResponse
from app.schemas.queue import QueuePositionOut, QueueStatusOut
from app.schemas.dashboard import DashboardSummaryOut
from app.schemas.ml import WaitTimePredictionOut, NoShowPredictionOut, RescheduleOptionsOut
