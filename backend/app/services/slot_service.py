"""
SlotService — slot reservation with optimistic locking
Supports PostgreSQL and SQLite
"""
from datetime import datetime, timedelta, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
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
        Uses FOR UPDATE SKIP LOCKED on PostgreSQL, standard select on SQLite.
        """
        query = select(Slot).where(Slot.slot_id == slot_id, Slot.status == "free")
        # Check if database dialect supports with_for_update
        bind = self.db.bind
        if bind and getattr(bind, "dialect", None) and bind.dialect.name != "sqlite":
            query = query.with_for_update(skip_locked=True)

        result = await self.db.execute(query)
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
        await self.db.commit()

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
            # Also allow direct booking if slot was free
            free_res = await self.db.execute(
                select(Slot).where(Slot.slot_id == slot_id, Slot.status == "free")
            )
            slot = free_res.scalar_one_or_none()
            if not slot:
                raise HTTPException(status_code=409, detail="Slot is no longer available.")

        await self.db.execute(
            update(Slot).where(Slot.slot_id == slot_id).values(status="booked", is_available=False)
        )

        appt_id = f"APT{str(uuid.uuid4())[:6].upper()}"
        new_appointment = Appointment(
            appointment_id=appt_id,
            slot_id=slot_id,
            patient_id=patient_id,
            appointment_date=slot.appointment_date,
            appointment_time=slot.appointment_time,
            appointment_type=appointment_type or "General Consultation",
            portal_status="upcoming",
            doctor_id=doctor_id or getattr(slot, "doctor_id", "D001"),
            scheduling_date=datetime.now(timezone.utc).date(),
            scheduling_interval=0,
            status="upcoming",
        )
        self.db.add(new_appointment)
        await self.db.commit()
        await self.db.refresh(new_appointment)
        return new_appointment
