"""
PatientService — CRUD and lookup for Patient records.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException, status

from app.models.patient import Patient


class PatientService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, patient_id: str) -> Patient | None:
        result = await self.db.execute(
            select(Patient).where(Patient.patient_id == patient_id)
        )
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> Patient | None:
        result = await self.db.execute(
            select(Patient).where(Patient.email == email)
        )
        return result.scalar_one_or_none()

    async def get_or_404(self, patient_id: str) -> Patient:
        patient = await self.get_by_id(patient_id)
        if not patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Patient {patient_id} not found",
            )
        return patient

    async def list_patients(self, page: int = 1, limit: int = 20):
        result = await self.db.execute(
            select(Patient).offset((page - 1) * limit).limit(limit)
        )
        return result.scalars().all()

    async def update_patient(self, patient_id: str, **kwargs) -> Patient:
        patient = await self.get_or_404(patient_id)
        for key, value in kwargs.items():
            if hasattr(patient, key):
                setattr(patient, key, value)
        await self.db.flush()
        return patient
