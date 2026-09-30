"""FastAPI dependency injection — auth guards, DB sessions"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.core.security import decode_token
from app.services.patient_service import PatientService

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
):
    token = credentials.credentials
    payload = decode_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    patient_id = payload.get("sub")
    patient = await PatientService(db).get_by_id(patient_id)
    if not patient:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Patient not found")
    return patient


def require_role(role: str):
    async def role_guard(
        credentials: HTTPAuthorizationCredentials = Depends(security),
    ):
        token = credentials.credentials
        payload = decode_token(token)
        if not payload or payload.get("role") != role:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"Requires {role} role")
        return payload
    return role_guard
