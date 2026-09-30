"""
Appointments router
Endpoints: list, cancel, reschedule, history, summary
Business rules enforced server-side
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List

from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.services.appointment_service import AppointmentService
from app.schemas.appointment import AppointmentOut, CancelRequest, RescheduleRequest
from app.models.patient import Patient

router = APIRouter()


@router.get("/", response_model=List[AppointmentOut])
async def list_appointments(
    appt_status: Optional[str] = Query(None, alias="status"),
    patient_id: Optional[str] = None,
    page: int = 1,
    limit: int = 10,
    db: AsyncSession = Depends(get_db),
    current_user: Patient = Depends(get_current_user),
):
    """List appointments filtered by portal_status (upcoming|completed|missed|cancelled)"""
    service = AppointmentService(db)
    pid = patient_id or current_user.patient_id
    return await service.list_appointments(pid, appt_status, page, limit)


@router.patch("/{appointment_id}/cancel")
async def cancel_appointment(
    appointment_id: str,
    body: CancelRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Patient = Depends(get_current_user),
):
    """Cancel appointment — enforces 2h cancellation window"""
    service = AppointmentService(db)
    return await service.cancel(appointment_id, current_user.patient_id, body.reason)


@router.post("/{appointment_id}/reschedule")
async def reschedule_appointment(
    appointment_id: str,
    body: RescheduleRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Patient = Depends(get_current_user),
):
    """Reschedule — atomic slot swap, max 3 reschedules enforced"""
    service = AppointmentService(db)
    return await service.reschedule(appointment_id, body.new_slot_id, current_user.patient_id)


@router.get("/{appointment_id}/reschedule-options")
async def get_reschedule_options(
    appointment_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Patient = Depends(get_current_user),
):
    """ML-powered reschedule alternatives with traffic forecast"""
    service = AppointmentService(db)
    return await service.get_reschedule_options(appointment_id)


@router.get("/{appointment_id}/summary")
async def get_appointment_summary(
    appointment_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Patient = Depends(get_current_user),
):
    """Get pre-signed PDF summary URL"""
    service = AppointmentService(db)
    return await service.get_summary_url(appointment_id, current_user.patient_id)
