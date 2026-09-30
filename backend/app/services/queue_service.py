"""
QueueService — real-time queue management
Priority ordering: emergency > pre-approved insurance > appointment_type weight > FIFO
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
import json

from app.models.live_queue import LiveQueue
from app.db.redis_client import publish


class QueueService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_position(self, patient_id: str, clinic_id: str) -> dict:
        result = await self.db.execute(
            select(LiveQueue)
            .where(LiveQueue.patient_id == patient_id, LiveQueue.clinic_id == clinic_id)
            .where(LiveQueue.status.in_(["waiting", "in_progress"]))
        )
        entry = result.scalar_one_or_none()
        if not entry:
            return {"position": 0, "status": "not_in_queue"}

        # Count total in queue
        total_result = await self.db.execute(
            select(LiveQueue).where(
                LiveQueue.clinic_id == clinic_id,
                LiveQueue.status == "waiting"
            )
        )
        total = len(total_result.scalars().all())

        return {
            "queue_id": entry.queue_id,
            "position": entry.position,
            "total_in_queue": total,
            "status": entry.status,
            "eta_seconds": entry.eta_seconds,
        }

    async def recalculate_queue(self, clinic_id: str):
        """
        Recompute all positions after any queue event.
        Called on: check-in, session start/end, emergency injection.
        Publishes update to Redis for all WS subscribers.
        """
        result = await self.db.execute(
            select(LiveQueue)
            .where(LiveQueue.clinic_id == clinic_id, LiveQueue.status == "waiting")
            .order_by(LiveQueue.priority_score.desc(), LiveQueue.checked_in_at.asc())
        )
        entries = result.scalars().all()

        for idx, entry in enumerate(entries, start=1):
            await self.db.execute(
                update(LiveQueue)
                .where(LiveQueue.queue_id == entry.queue_id)
                .values(position=idx)
            )

        # Publish to Redis pub/sub → all WS clients get updated positions
        await publish(
            f"queue:{clinic_id}",
            json.dumps({"event": "queue_updated", "clinic_id": clinic_id})
        )
