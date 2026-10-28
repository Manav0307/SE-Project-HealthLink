"""
Slots router — available slots, slot reservation, and confirmation.
Cleaned: ML dependencies removed, returns pure database slots.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from datetime import date as dt_date, timedelta

from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.services.slot_service import SlotService
from app.schemas.slot import SlotOut, SlotReserveRequest, SlotConfirmRequest
from app.schemas.appointment import AppointmentOut
from app.models.patient import Patient

router = APIRouter()


@router.get("/available", response_model=List[SlotOut])
async def get_available_slots(
    date: str = Query(..., description="Date in YYYY-MM-DD format"),
    doctor_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: Patient = Depends(get_current_user),
):
    """Get available slots for a date directly from the database"""
    service = SlotService(db)
    slots = await service.get_available_slots(date, doctor_id)

    return [
        SlotOut(
            slot_id=slot.slot_id,
            appointment_date=slot.appointment_date,
            appointment_time=slot.appointment_time,
            status=slot.status or "free",
            duration_min=getattr(slot, "duration_min", 15) or 15,
            predicted_wait_min=0.0,
            no_show_probability=0.0,
            traffic_level="normal",
            is_recommended=False,
        )
        for slot in slots
    ]


@router.get("/recommended/{patient_id}", response_model=List[SlotOut])
async def get_recommended_slots(
    patient_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Patient = Depends(get_current_user),
):
    """Get earliest available slots for the upcoming week"""
    service = SlotService(db)
    recommended = []
    today = dt_date.today()

    for day_offset in range(1, 8):
        target_date = today + timedelta(days=day_offset)
        slots = await service.get_available_slots(target_date.isoformat())
        for slot in slots[:2]:
            recommended.append(SlotOut(
                slot_id=slot.slot_id,
                appointment_date=slot.appointment_date,
                appointment_time=slot.appointment_time,
                status=slot.status or "free",
                duration_min=getattr(slot, "duration_min", 15) or 15,
                predicted_wait_min=0.0,
                no_show_probability=0.0,
                traffic_level="normal",
                is_recommended=True,
            ))
        if len(recommended) >= 5:
            break

    return recommended[:5]


@router.post("/reserve")
async def reserve_slot(
    body: SlotReserveRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Patient = Depends(get_current_user),
):
    """Reserve a slot with optimistic lock"""
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
