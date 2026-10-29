"""
HealthLink FastAPI Application Entry Point
"""
from dotenv import load_dotenv

# Force load .env before anything else
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.db.session import engine

# Import all models so SQLAlchemy registers them before create_all
import app.models  # noqa: F401

from app.routers import (
    auth, patients, doctors, slots,
    appointments, queue, notifications,
    dashboard, intake_forms
)
from app.websocket.queue_socket import sio_app


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("HealthLink API starting up...")

    # Create DB tables if they don't exist
    from app.db.session import Base
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("  ✓ Database tables verified")

    yield
    # Shutdown
    print("HealthLink API shutting down...")


app = FastAPI(
    title="HealthLink API",
    description="Appointment Scheduling & Patient Portal System",
    version="1.0.0",
    lifespan=lifespan,
    redirect_slashes=False,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# REST Routers
app.include_router(auth.router,              prefix="/auth",          tags=["auth"])
app.include_router(patients.router,          prefix="/patients",      tags=["patients"])
app.include_router(doctors.router,           prefix="/doctors",       tags=["doctors"])
app.include_router(slots.router,             prefix="/slots",         tags=["slots"])
app.include_router(appointments.router,      prefix="/appointments",  tags=["appointments"])
app.include_router(queue.router,             prefix="/queue",         tags=["queue"])
app.include_router(notifications.router,     prefix="/notifications", tags=["notifications"])
app.include_router(dashboard.router,         prefix="/dashboard",     tags=["dashboard"])
app.include_router(intake_forms.router,      prefix="/intake",        tags=["intake"])

# Mount Socket.io for Live Queue WebSocket
app.mount("/ws", sio_app)


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "healthlink-api"}
