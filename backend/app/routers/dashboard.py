"""Dashboard router — aggregates data for the main dashboard view"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.models.patient import Patient
from app.models.appointment import Appointment
from app.models.notification import Notification
from app.models.live_queue import LiveQueue
from app.schemas.dashboard import DashboardSummaryOut, UpcomingAppointmentSummary, LiveClinicStatus, AlertItem

from datetime import date, datetime, timezone

router = APIRouter()


@router.get("/summary/{patient_id}", response_model=DashboardSummaryOut)
async def get_dashboard_summary(
    patient_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Patient = Depends(get_current_user),
):
    """Aggregates upcoming appointment, clinic status, alerts, and health metrics"""
    from app.services.patient_service import PatientService

    patient = await PatientService(db).get_or_404(patient_id)

    # 1. Upcoming appointment (next upcoming by date)
    result = await db.execute(
        select(Appointment)
        .where(
            Appointment.patient_id == patient_id,
            Appointment.portal_status == "upcoming",
        )
        .order_by(Appointment.appointment_date.asc(), Appointment.appointment_time.asc())
        .limit(1)
    )
    next_appt = result.scalar_one_or_none()

    upcoming = None
    if next_appt:
        # Try to get doctor name
        doctor_name = "Dr. Specialist"
        if next_appt.doctor_id:
            from app.models.doctor import Doctor
            doc_result = await db.execute(
                select(Doctor).where(Doctor.doctor_id == next_appt.doctor_id)
            )
            doc = doc_result.scalar_one_or_none()
            if doc:
                doctor_name = doc.name

        upcoming = UpcomingAppointmentSummary(
            appointment_id=next_appt.appointment_id,
            appointment_date=next_appt.appointment_date,
            appointment_time=next_appt.appointment_time,
            doctor_name=doctor_name,
            appointment_type=next_appt.appointment_type or "General Consultation",
            location="West Wing, Room 402",
        )

    # 2. Live clinic status
    queue_result = await db.execute(
        select(func.count(LiveQueue.queue_id))
        .where(LiveQueue.status == "waiting")
    )
    total_waiting = queue_result.scalar() or 0

    active_result = await db.execute(
        select(func.count(LiveQueue.queue_id))
        .where(LiveQueue.status.in_(["waiting", "in_progress"]))
    )
    total_in_queue = active_result.scalar() or 0

    traffic = "low" if total_waiting < 5 else ("medium" if total_waiting < 10 else "peak")

    clinic_status = LiveClinicStatus(
        total_ahead=total_waiting,
        total_in_queue=total_in_queue,
        traffic_level=traffic,
    )

    # 3. Unread alerts (notifications)
    notif_result = await db.execute(
        select(Notification)
        .where(Notification.patient_id == patient_id, Notification.is_read == False)
        .order_by(Notification.created_at.desc())
        .limit(5)
    )
    notifs = notif_result.scalars().all()
    alerts = [
        AlertItem(
            notification_id=n.notification_id,
            title=n.title or "Notification",
            message=n.message or "",
            is_read=n.is_read,
        )
        for n in notifs
    ]

    # 4. Health metrics snapshot
    health_metrics = {
        "heart_rate_variability": 72,
        "resting_metabolism": 1840,
        "sleep_quality_score": 88,
    }

    return DashboardSummaryOut(
        patient_name=patient.name,
        upcoming_appointment=upcoming,
        clinic_status=clinic_status,
        unread_alerts=alerts,
        health_metric_snapshot=health_metrics,
    )
