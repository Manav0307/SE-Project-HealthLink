"""Notifications router — list and mark-read"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from typing import List

from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.models.patient import Patient
from app.models.notification import Notification
from app.schemas.dashboard import AlertItem

router = APIRouter()


@router.get("/", response_model=List[AlertItem])
async def list_notifications(
    unread_only: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: Patient = Depends(get_current_user),
):
    """List patient's notifications"""
    query = select(Notification).where(
        Notification.patient_id == current_user.patient_id
    )
    if unread_only:
        query = query.where(Notification.is_read == False)
    query = query.order_by(Notification.created_at.desc()).limit(20)

    result = await db.execute(query)
    notifs = result.scalars().all()

    return [
        AlertItem(
            notification_id=n.notification_id,
            title=n.title or "Notification",
            message=n.message or "",
            is_read=n.is_read,
        )
        for n in notifs
    ]


@router.patch("/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Patient = Depends(get_current_user),
):
    """Mark a notification as read"""
    result = await db.execute(
        select(Notification).where(
            Notification.notification_id == notification_id,
            Notification.patient_id == current_user.patient_id,
        )
    )
    notif = result.scalar_one_or_none()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")

    await db.execute(
        update(Notification)
        .where(Notification.notification_id == notification_id)
        .values(is_read=True)
    )
    return {"message": "Marked as read"}


@router.patch("/mark-all-read")
async def mark_all_read(
    db: AsyncSession = Depends(get_db),
    current_user: Patient = Depends(get_current_user),
):
    """Mark all notifications as read"""
    await db.execute(
        update(Notification)
        .where(
            Notification.patient_id == current_user.patient_id,
            Notification.is_read == False,
        )
        .values(is_read=True)
    )
    return {"message": "All notifications marked as read"}
