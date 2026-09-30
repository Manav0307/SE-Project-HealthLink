"""Auth router — login, refresh, and current user"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.core.security import verify_password, create_access_token, create_refresh_token, decode_token
from app.services.patient_service import PatientService
from app.schemas.auth import LoginRequest, TokenResponse
from app.schemas.patient import PatientOut
from app.models.patient import Patient

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Authenticate patient with email + password"""
    service = PatientService(db)
    patient = await service.get_by_email(body.email)

    if not patient:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No account found with this email",
        )

    if not patient.password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account not activated. Please contact support.",
        )

    if not verify_password(body.password, patient.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid security key. Please try again.",
        )

    access_token = create_access_token(patient.patient_id, role="patient")
    refresh_token = create_refresh_token(patient.patient_id)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(refresh: str, db: AsyncSession = Depends(get_db)):
    """Refresh access token"""
    payload = decode_token(refresh)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    patient_id = payload.get("sub")
    patient = await PatientService(db).get_by_id(patient_id)
    if not patient:
        raise HTTPException(status_code=401, detail="Patient not found")

    access_token = create_access_token(patient.patient_id, role="patient")
    new_refresh = create_refresh_token(patient.patient_id)

    return TokenResponse(access_token=access_token, refresh_token=new_refresh)


@router.get("/me", response_model=PatientOut)
async def get_current_user_profile(
    current_user: Patient = Depends(get_current_user),
):
    """Returns the authenticated patient's profile"""
    return current_user
