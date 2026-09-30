from app.tasks.celery_app import celery_app
from datetime import datetime, timezone


@celery_app.task
def release_expired_locks():
    """Release all slots where lock_expires_at < now()"""
    # Uses sync SQLAlchemy session in Celery context
    from app.db.session import AsyncSessionLocal
    import asyncio
    from sqlalchemy import update
    from app.models.slot import Slot

    async def _run():
        async with AsyncSessionLocal() as db:
            await db.execute(
                update(Slot)
                .where(Slot.status == "locked", Slot.lock_expires_at < datetime.now(timezone.utc))
                .values(status="free", lock_expires_at=None, locked_by_patient_id=None)
            )
            await db.commit()

    asyncio.run(_run())
    print("Expired slot locks released")
