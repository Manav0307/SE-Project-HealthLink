from pydantic import BaseModel
from typing import Optional, List


class QueuePositionOut(BaseModel):
    queue_id: str
    position: int
    total_in_queue: int
    status: str
    eta_seconds: int
    estimated_arrival: str


class QueueStatusOut(BaseModel):
    clinic_id: str
    active_session: bool
    total_waiting: int
    avg_wait_min: float
    delay_reasons: List[str]
    traffic_level: str
