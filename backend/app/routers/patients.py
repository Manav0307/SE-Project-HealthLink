"""Patients router — profile, behavior insights, updates"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.services.patient_service import PatientService
from app.services.behavior_score_service import BehaviorScoreService
from app.schemas.patient import PatientOut, PatientUpdate, BehaviorInsights
from app.models.patient import Patient

router = APIRouter()


@router.get("/{patient_id}/profile", response_model=PatientOut)
async def get_patient_profile(
    patient_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Patient = Depends(get_current_user),
):
    patient = await PatientService(db).get_or_404(patient_id)
    return patient


@router.get("/{patient_id}/behavior-insights", response_model=BehaviorInsights)
async def get_behavior_insights(
    patient_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Patient = Depends(get_current_user),
):
    patient = await PatientService(db).get_or_404(patient_id)
    total = patient.total_appointments or 0
    no_shows = patient.no_show_count or 0
    pct_score = patient.punctuality_score or 0.0
    grade = patient.reliability_grade or "B"
    # Compute percentile (simplified)
    percentile = 95 if grade == "A+" else 80 if grade == "A" else 60 if grade == "B" else 40
    return BehaviorInsights(
        avg_wait_time_min=patient.avg_wait_time_min or 0.0,
        punctuality_score=pct_score,
        reliability_grade=grade,
        reliability_percentile=percentile,
        total_appointments=total,
        no_show_count=no_shows,
    )


@router.patch("/{patient_id}/personal-info", response_model=PatientOut)
async def update_personal_info(
    patient_id: str,
    body: PatientUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Patient = Depends(get_current_user),
):
    service = PatientService(db)
    updates = body.model_dump(exclude_unset=True)
    patient = await service.update_patient(patient_id, **updates)
    return patient
