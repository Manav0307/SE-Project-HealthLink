"""
AppointmentService — core business logic
State machine: upcoming → completed|missed|cancelled
"""
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from fastapi import HTTPException, status
import uuid

from app.models.appointment import Appointment
from app.models.slot import Slot
from app.db.redis_client import delete_cache


class AppointmentService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, appointment_id: str) -> Appointment:
        result = await self.db.execute(
            select(Appointment).where(Appointment.appointment_id == appointment_id)
        )
        appt = result.scalar_one_or_none()
        if not appt:
            raise HTTPException(status_code=404, detail="Appointment not found")
        return appt

    async def list_appointments(self, patient_id: str, portal_status: str, page: int, limit: int):
        query = select(Appointment).where(Appointment.patient_id == patient_id)
        if portal_status:
            query = query.where(Appointment.portal_status == portal_status)
        query = query.offset((page - 1) * limit).limit(limit)
        result = await self.db.execute(query)
        return result.scalars().all()

    async def cancel(self, appointment_id: str, patient_id: str, reason: str = None):
        appt = await self.get_by_id(appointment_id)

        # Business rule: cannot cancel < 2h before start
        appt_datetime = datetime.combine(appt.appointment_date, appt.appointment_time)
        appt_datetime = appt_datetime.replace(tzinfo=timezone.utc)
        if appt_datetime - datetime.now(timezone.utc) < timedelta(hours=2):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Cannot cancel within 2 hours of appointment"
            )

        # Transition: upcoming → cancelled
        await self.db.execute(
            update(Appointment)
            .where(Appointment.appointment_id == appointment_id)
            .values(
                portal_status="cancelled",
                cancelled_at=datetime.now(timezone.utc),
                cancellation_reason=reason,
            )
        )

        # Release the slot
        await self.db.execute(
            update(Slot)
            .where(Slot.slot_id == appt.slot_id)
            .values(status="free", lock_expires_at=None, locked_by_patient_id=None)
        )

        # Invalidate dashboard cache
        await delete_cache(f"dashboard:{patient_id}")
        return {"message": "Appointment cancelled successfully"}

    async def reschedule(self, appointment_id: str, new_slot_id: str, patient_id: str):
        appt = await self.get_by_id(appointment_id)

        # Business rule: max 3 reschedules
        if appt.reschedule_count >= 3:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Maximum 3 reschedules reached for this appointment"
            )

        # Atomic: release old slot + book new slot in one transaction
        await self.db.execute(
            update(Slot)
            .where(Slot.slot_id == appt.slot_id)
            .values(status="free")
        )
        await self.db.execute(
            update(Slot)
            .where(Slot.slot_id == new_slot_id)
            .values(status="booked")
        )
        await self.db.execute(
            update(Appointment)
            .where(Appointment.appointment_id == appointment_id)
            .values(
                slot_id=new_slot_id,
                reschedule_count=appt.reschedule_count + 1,
            )
        )

        await delete_cache(f"dashboard:{patient_id}")
        return {"message": "Appointment rescheduled successfully", "new_slot_id": new_slot_id}

    async def get_reschedule_options(self, appointment_id: str):
        """Returns ML-ranked alternatives — delegates to MLService"""
        # TODO: integrate with ml.forecast_service.get_alternatives()
        return {"appointment_id": appointment_id, "alternatives": []}

    async def get_summary_url(self, appointment_id: str, patient_id: str):
        appt = await self.get_by_id(appointment_id)
        if not appt.summary_url:
            raise HTTPException(status_code=404, detail="No summary available")
        return {"summary_url": appt.summary_url}
