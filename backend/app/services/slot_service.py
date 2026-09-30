"""
SlotService — slot reservation with optimistic locking
Uses PostgreSQL FOR UPDATE SKIP LOCKED to prevent double-booking
"""
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, text
from fastapi import HTTPException, status
import uuid

from app.models.slot import Slot
from app.models.appointment import Appointment


LOCK_DURATION_SECONDS = 15


class SlotService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_available_slots(self, date: str, doctor_id: str = None):
        query = select(Slot).where(
            Slot.appointment_date == date,
            Slot.status == "free",
            Slot.is_available == True,
        )
        if doctor_id:
            query = query.where(Slot.doctor_id == doctor_id)
        result = await self.db.execute(query)
        return result.scalars().all()

    async def reserve_slot(self, slot_id: str, patient_id: str) -> dict:
        """
        Atomically lock a slot for 15 seconds.
        Uses FOR UPDATE SKIP LOCKED — first writer wins, others get 409.
        """
        # Try to acquire lock
        result = await self.db.execute(
            select(Slot)
            .where(Slot.slot_id == slot_id, Slot.status == "free")
            .with_for_update(skip_locked=True)
        )
        slot = result.scalar_one_or_none()

        if not slot:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Slot just taken by another patient. Please select another."
            )

        lock_expires = datetime.now(timezone.utc) + timedelta(seconds=LOCK_DURATION_SECONDS)
        lock_id = str(uuid.uuid4())

        await self.db.execute(
            update(Slot)
            .where(Slot.slot_id == slot_id)
            .values(
                status="locked",
                lock_expires_at=lock_expires,
                locked_by_patient_id=patient_id,
            )
        )

        return {
            "lock_id": lock_id,
            "slot_id": slot_id,
            "expires_in_seconds": LOCK_DURATION_SECONDS,
            "lock_expires_at": lock_expires.isoformat(),
        }

    async def confirm_slot(self, slot_id: str, patient_id: str, appointment_type: str, doctor_id: str = None) -> Appointment:
        """Verify lock still valid and convert to confirmed booking"""
        result = await self.db.execute(
            select(Slot).where(
                Slot.slot_id == slot_id,
                Slot.status == "locked",
                Slot.locked_by_patient_id == patient_id,
            )
        )
        slot = result.scalar_one_or_none()
        if not slot:
            raise HTTPException(status_code=409, detail="Lock expired. Please restart booking.")

        if slot.lock_expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=409, detail="Lock expired. Please restart booking.")

        await self.db.execute(
            update(Slot).where(Slot.slot_id == slot_id).values(status="booked")
        )

        appt_id = str(uuid.uuid4())[:7].upper()
        new_appointment = Appointment(
            appointment_id=appt_id,
            slot_id=slot_id,
            patient_id=patient_id,
            appointment_date=slot.appointment_date,
            appointment_time=slot.appointment_time,
            appointment_type=appointment_type,
            portal_status="upcoming",
            doctor_id=doctor_id,
            scheduling_date=datetime.now(timezone.utc).date(),
        )
        self.db.add(new_appointment)
        return new_appointment
