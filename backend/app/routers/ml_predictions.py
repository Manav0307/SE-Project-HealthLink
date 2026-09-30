"""ML Predictions router — no-show, wait time, traffic forecast"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional

from app.core.dependencies import get_current_user
from app.models.patient import Patient
from app.ml.noshow_predictor import NoShowPredictor
from app.ml.wait_time_predictor import WaitTimePredictor
from app.schemas.ml import NoShowPredictionOut, WaitTimePredictionOut

router = APIRouter()

wait_predictor = WaitTimePredictor()
noshow_predictor = NoShowPredictor()


class NoShowRequest(BaseModel):
    slot_id: str
    age: int = 30
    sex: str = "Other"
    scheduling_interval: int = 5
    age_group: str = "25-34"


class WaitTimeRequest(BaseModel):
    slot_id: str
    hour_of_day: int = 10
    day_of_week: int = 1
    age: int = 30
    sex: str = "Other"
    scheduling_interval: int = 5
    appointment_type: str = "general"


@router.post("/predict/noshow", response_model=NoShowPredictionOut)
async def predict_noshow(
    body: NoShowRequest,
    current_user: Patient = Depends(get_current_user),
):
    """Predict no-show probability for a patient+slot"""
    result = noshow_predictor.predict(
        age=body.age,
        sex=body.sex,
        scheduling_interval=body.scheduling_interval,
        age_group=body.age_group,
    )
    return NoShowPredictionOut(
        slot_id=body.slot_id,
        no_show_probability=result["no_show_probability"],
        risk_level=result["risk_level"],
    )


@router.post("/predict/waittime", response_model=WaitTimePredictionOut)
async def predict_waittime(
    body: WaitTimeRequest,
    current_user: Patient = Depends(get_current_user),
):
    """Predict wait time for a given slot"""
    result = wait_predictor.predict(
        hour_of_day=body.hour_of_day,
        day_of_week=body.day_of_week,
        age=body.age,
        sex=body.sex,
        scheduling_interval=body.scheduling_interval,
        appointment_type=body.appointment_type,
    )
    return WaitTimePredictionOut(
        slot_id=body.slot_id,
        predicted_wait_min=result["predicted_wait_min"],
        confidence_interval_min=result["confidence_interval_min"],
        traffic_level=result["traffic_level"],
    )


@router.get("/traffic-forecast/{clinic_id}")
async def get_traffic_forecast(
    clinic_id: str,
    current_user: Patient = Depends(get_current_user),
):
    """Get Prophet-based traffic forecast for a clinic"""
    # Generate hourly forecast for today
    forecast = []
    for hour in range(8, 18):
        pred = wait_predictor.predict(
            hour_of_day=hour,
            day_of_week=0,
            age=30, sex="Other",
            scheduling_interval=3,
        )
        forecast.append({
            "hour": f"{hour}:00",
            "predicted_wait_min": pred["predicted_wait_min"],
            "traffic_level": pred["traffic_level"],
        })

    return {
        "clinic_id": clinic_id,
        "forecast_date": "today",
        "hourly_forecast": forecast,
    }
