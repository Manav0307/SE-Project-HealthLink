"""Intake Forms router — digital pre-visit form submission"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime, timezone
import uuid

from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.models.patient import Patient
from app.models.intake_form import IntakeFormSubmission

router = APIRouter()


class IntakeFormRequest(BaseModel):
    appointment_id: str
    form_data: Dict[str, Any]


@router.post("/submit")
async def submit_intake_form(
    body: IntakeFormRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Patient = Depends(get_current_user),
):
    """Submit a digital intake form for an appointment"""
    # Check for existing submission
    result = await db.execute(
        select(IntakeFormSubmission).where(
            IntakeFormSubmission.appointment_id == body.appointment_id,
            IntakeFormSubmission.patient_id == current_user.patient_id,
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        # Update existing
        existing.form_data = body.form_data
        existing.submitted_at = datetime.now(timezone.utc)
        existing.is_complete = True
        await db.flush()
        return {"submission_id": existing.submission_id, "message": "Form updated"}

    submission = IntakeFormSubmission(
        submission_id=str(uuid.uuid4()),
        appointment_id=body.appointment_id,
        patient_id=current_user.patient_id,
        form_data=body.form_data,
        submitted_at=datetime.now(timezone.utc),
        is_complete=True,
    )
    db.add(submission)
    await db.flush()

    return {"submission_id": submission.submission_id, "message": "Form submitted successfully"}


@router.get("/{appointment_id}")
async def get_intake_form(
    appointment_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Patient = Depends(get_current_user),
):
    """Get intake form submission for an appointment"""
    result = await db.execute(
        select(IntakeFormSubmission).where(
            IntakeFormSubmission.appointment_id == appointment_id,
            IntakeFormSubmission.patient_id == current_user.patient_id,
        )
    )
    submission = result.scalar_one_or_none()
    if not submission:
        raise HTTPException(status_code=404, detail="No intake form found")

    return {
        "submission_id": submission.submission_id,
        "appointment_id": submission.appointment_id,
        "form_data": submission.form_data,
        "submitted_at": submission.submitted_at.isoformat() if submission.submitted_at else None,
        "is_complete": submission.is_complete,
    }
