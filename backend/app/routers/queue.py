"""Queue router — live queue position, clinic status, check-in"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timezone
from pydantic import BaseModel
import uuid

from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.models.patient import Patient
from app.models.live_queue import LiveQueue
from app.models.appointment import Appointment
from app.schemas.queue import QueuePositionOut, QueueStatusOut

router = APIRouter()


class CheckInRequest(BaseModel):
    appointment_id: str


@router.get("/position/{appointment_id}", response_model=QueuePositionOut)
async def get_queue_position(
    appointment_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Patient = Depends(get_current_user),
):
    """Get patient's current queue position and ETA"""
    result = await db.execute(
        select(LiveQueue)
        .where(LiveQueue.appointment_id == appointment_id)
        .where(LiveQueue.status.in_(["waiting", "in_progress"]))
    )
    entry = result.scalar_one_or_none()

    if not entry:
        raise HTTPException(status_code=404, detail="Not currently in queue")

    # Count total in same clinic queue
    total_result = await db.execute(
        select(func.count(LiveQueue.queue_id))
        .where(LiveQueue.clinic_id == entry.clinic_id, LiveQueue.status == "waiting")
    )
    total = total_result.scalar() or 0

    eta = entry.eta_seconds or (entry.position * 600)  # ~10 min per position
    arrival_time = datetime.now(timezone.utc)

    return QueuePositionOut(
        queue_id=entry.queue_id,
        position=entry.position or 1,
        total_in_queue=total,
        status=entry.status,
        eta_seconds=eta,
        estimated_arrival=arrival_time.strftime("%I:%M %p"),
    )


@router.get("/status/{clinic_id}", response_model=QueueStatusOut)
async def get_queue_status(
    clinic_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Patient = Depends(get_current_user),
):
    """Get clinic's overall queue status"""
    # Count waiting
    waiting_result = await db.execute(
        select(func.count(LiveQueue.queue_id))
        .where(LiveQueue.clinic_id == clinic_id, LiveQueue.status == "waiting")
    )
    total_waiting = waiting_result.scalar() or 0

    # Check active session
    active_result = await db.execute(
        select(LiveQueue)
        .where(LiveQueue.clinic_id == clinic_id, LiveQueue.status == "in_progress")
        .limit(1)
    )
    active = active_result.scalar_one_or_none()

    # Avg wait from ETAs
    avg_result = await db.execute(
        select(func.avg(LiveQueue.eta_seconds))
        .where(LiveQueue.clinic_id == clinic_id, LiveQueue.status == "waiting")
    )
    avg_eta = avg_result.scalar() or 0
    avg_wait_min = round(avg_eta / 60, 1)

    traffic = "low" if total_waiting < 5 else ("medium" if total_waiting < 10 else "peak")

    delay_reasons = []
    if total_waiting > 10:
        delay_reasons.append("High volume today — 15% increase in walk-ins")
    if active:
        delay_reasons.append("Complex procedures in progress requiring extra care")

    return QueueStatusOut(
        clinic_id=clinic_id,
        active_session=active is not None,
        total_waiting=total_waiting,
        avg_wait_min=avg_wait_min,
        delay_reasons=delay_reasons,
        traffic_level=traffic,
    )


@router.post("/checkin")
async def check_in(
    body: CheckInRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Patient = Depends(get_current_user),
):
    """Patient check-in — adds to live queue"""
    # Verify appointment
    result = await db.execute(
        select(Appointment)
        .where(
            Appointment.appointment_id == body.appointment_id,
            Appointment.patient_id == current_user.patient_id,
        )
    )
    appt = result.scalar_one_or_none()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    # Check if already in queue
    existing = await db.execute(
        select(LiveQueue).where(
            LiveQueue.appointment_id == body.appointment_id,
            LiveQueue.status.in_(["waiting", "in_progress"]),
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Already checked in")

    # Get current max position
    max_pos_result = await db.execute(
        select(func.max(LiveQueue.position))
        .where(LiveQueue.clinic_id == "clinic_01", LiveQueue.status == "waiting")
    )
    max_pos = max_pos_result.scalar() or 0

    queue_entry = LiveQueue(
        queue_id=str(uuid.uuid4()),
        appointment_id=body.appointment_id,
        patient_id=current_user.patient_id,
        clinic_id="clinic_01",
        doctor_id=appt.doctor_id or "DOC001",
        position=max_pos + 1,
        status="waiting",
        priority_score=0.0,
        checked_in_at=datetime.now(timezone.utc),
        eta_seconds=(max_pos + 1) * 600,
    )
    db.add(queue_entry)
    await db.flush()

    return {
        "queue_id": queue_entry.queue_id,
        "position": queue_entry.position,
        "eta_seconds": queue_entry.eta_seconds,
        "message": "Checked in successfully",
    }
