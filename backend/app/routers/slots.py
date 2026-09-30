"""
Slots router — available slots, ML recommendations, reserve/confirm
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.services.slot_service import SlotService
from app.schemas.slot import SlotOut, SlotReserveRequest, SlotConfirmRequest
from app.schemas.appointment import AppointmentOut
from app.models.patient import Patient
from app.ml.wait_time_predictor import WaitTimePredictor
from app.ml.noshow_predictor import NoShowPredictor

router = APIRouter()

wait_predictor = WaitTimePredictor()
noshow_predictor = NoShowPredictor()


@router.get("/available", response_model=List[SlotOut])
async def get_available_slots(
    date: str = Query(..., description="Date in YYYY-MM-DD format"),
    doctor_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: Patient = Depends(get_current_user),
):
    """Get available slots for a date, enriched with ML predictions"""
    service = SlotService(db)
    slots = await service.get_available_slots(date, doctor_id)

    # Enrich with ML predictions
    enriched = []
    best_wait = float("inf")
    best_idx = 0

    for i, slot in enumerate(slots):
        hour = slot.appointment_time.hour
        day_of_week = slot.appointment_date.weekday()

        wait_pred = wait_predictor.predict(
            hour_of_day=hour,
            day_of_week=day_of_week,
            age=current_user.age if hasattr(current_user, 'age') else 30,
            sex=current_user.sex or "Other",
            scheduling_interval=5,
        )

        noshow_pred = noshow_predictor.predict(
            age=30,
            sex=current_user.sex or "Other",
            scheduling_interval=5,
            age_group="25-34",
        )

        slot_out = SlotOut(
            slot_id=slot.slot_id,
            appointment_date=slot.appointment_date,
            appointment_time=slot.appointment_time,
            status=slot.status or "free",
            duration_min=slot.duration_min or 15,
            predicted_wait_min=wait_pred["predicted_wait_min"],
            no_show_probability=noshow_pred["no_show_probability"],
            traffic_level=wait_pred["traffic_level"],
            is_recommended=False,
        )
        enriched.append(slot_out)

        if wait_pred["predicted_wait_min"] < best_wait:
            best_wait = wait_pred["predicted_wait_min"]
            best_idx = i

    # Mark best slot as recommended
    if enriched:
        enriched[best_idx].is_recommended = True

    return enriched


@router.get("/recommended/{patient_id}", response_model=List[SlotOut])
async def get_recommended_slots(
    patient_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Patient = Depends(get_current_user),
):
    """Get ML-recommended slots for a patient (next 7 days)"""
    from datetime import date as dt_date, timedelta
    service = SlotService(db)

    recommended = []
    today = dt_date.today()

    for day_offset in range(1, 8):
        target_date = today + timedelta(days=day_offset)
        slots = await service.get_available_slots(target_date.isoformat())
        for slot in slots[:3]:  # top 3 per day
            hour = slot.appointment_time.hour
            wait_pred = wait_predictor.predict(
                hour_of_day=hour,
                day_of_week=target_date.weekday(),
                age=30, sex="Other", scheduling_interval=day_offset,
            )
            recommended.append(SlotOut(
                slot_id=slot.slot_id,
                appointment_date=slot.appointment_date,
                appointment_time=slot.appointment_time,
                status="free",
                duration_min=slot.duration_min or 15,
                predicted_wait_min=wait_pred["predicted_wait_min"],
                no_show_probability=0.1,
                traffic_level=wait_pred["traffic_level"],
                is_recommended=True,
            ))

    # Sort by wait time and take top 5
    recommended.sort(key=lambda s: s.predicted_wait_min)
    return recommended[:5]


@router.post("/reserve")
async def reserve_slot(
    body: SlotReserveRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Patient = Depends(get_current_user),
):
    """Reserve a slot with 15-second optimistic lock"""
    service = SlotService(db)
    return await service.reserve_slot(body.slot_id, body.patient_id)


@router.post("/confirm", response_model=AppointmentOut)
async def confirm_slot(
    body: SlotConfirmRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Patient = Depends(get_current_user),
):
    """Confirm a locked slot and create appointment"""
    service = SlotService(db)
    appt = await service.confirm_slot(
        body.slot_id, body.patient_id, body.appointment_type, body.doctor_id
    )
    return appt
