"""FastAPI dependency injection — auth guards, DB sessions"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.db.session import get_db
from app.core.security import decode_token
from app.services.patient_service import PatientService
from app.models.patient import Patient

# auto_error=False allows public/demo mode fallback without 401 crashing
security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> Patient:
    # 1. If valid Bearer token provided, decode and authenticate
    if credentials:
        token = credentials.credentials
        payload = decode_token(token)
        if payload:
            patient_id = payload.get("sub")
            patient = await PatientService(db).get_by_id(patient_id)
            if patient:
                return patient

    # 2. Fallback to default showcase patient (00001) for prototype presentation
    patient = await PatientService(db).get_by_id("00001")
    if patient:
        return patient

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No authenticated user or default patient found")


def require_role(role: str):
    async def role_guard(
        credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    ):
        if not credentials:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
        token = credentials.credentials
        payload = decode_token(token)
        if not payload or payload.get("role") != role:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"Requires {role} role")
        return payload
    return role_guard
