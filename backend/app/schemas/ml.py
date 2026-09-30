from pydantic import BaseModel
from typing import List, Optional


class WaitTimePredictionOut(BaseModel):
    slot_id: str
    predicted_wait_min: float
    confidence_interval_min: float
    traffic_level: str


class NoShowPredictionOut(BaseModel):
    slot_id: str
    no_show_probability: float
    risk_level: str   # low|medium|high


class RescheduleOption(BaseModel):
    slot_id: str
    date_label: str
    time_label: str
    predicted_wait_min: float
    wait_reduction_pct: float
    traffic_level: str
    description: str
    is_best_choice: bool


class RescheduleOptionsOut(BaseModel):
    current_slot_wait_min: float
    current_traffic_level: str
    alternatives: List[RescheduleOption]
