"""Doctors router — list and detail endpoints"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.models.doctor import Doctor
from app.models.patient import Patient

router = APIRouter()


@router.get("/")
async def list_doctors(
    specialization: str = None,
    db: AsyncSession = Depends(get_db),
    current_user: Patient = Depends(get_current_user),
):
    """List all doctors, optionally filtered by specialization"""
    query = select(Doctor)
    if specialization:
        query = query.where(Doctor.specialization == specialization)
    query = query.order_by(Doctor.rating.desc())
    result = await db.execute(query)
    doctors = result.scalars().all()
    return [
        {
            "doctor_id": d.doctor_id,
            "name": d.name,
            "specialization": d.specialization,
            "rating": d.rating,
            "profile_image_url": d.profile_image_url,
            "avg_session_duration_min": d.avg_session_duration_min,
            "bio": d.bio,
            "is_available": d.is_available,
        }
        for d in doctors
    ]


@router.get("/{doctor_id}")
async def get_doctor(
    doctor_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Patient = Depends(get_current_user),
):
    """Get a single doctor by ID"""
    result = await db.execute(
        select(Doctor).where(Doctor.doctor_id == doctor_id)
    )
    doctor = result.scalar_one_or_none()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    return {
        "doctor_id": doctor.doctor_id,
        "name": doctor.name,
        "specialization": doctor.specialization,
        "rating": doctor.rating,
        "profile_image_url": doctor.profile_image_url,
        "avg_session_duration_min": doctor.avg_session_duration_min,
        "bio": doctor.bio,
        "is_available": doctor.is_available,
    }
