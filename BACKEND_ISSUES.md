# HealthLink Backend Architectural & Integration Review

This document lists all the issues preventing the backend from connecting properly with the frontend and operating smoothly.

---

## 1. Database & Persistence Issues

### 1.1 Missing `.env` File & Database Credentials
- **Problem**: `backend/app/core/config.py` defines `DATABASE_URL: str` as a mandatory setting without a default fallback. Currently, only `.env.example` exists in `backend/`, but no actual `.env` file is present.
- **Impact**: Attempting to start FastAPI causes Pydantic to raise a `ValidationError` and crash immediately due to the missing `DATABASE_URL`.

### 1.2 Unregistered SQLAlchemy Models in Application Lifespan
- **Problem**: In `backend/app/main.py`, `await conn.run_sync(Base.metadata.create_all)` is called inside the lifespan startup event. However, `app.models` (e.g., `Patient`, `Appointment`, `Slot`, `Doctor`) is **not imported** before `create_all` executes.
- **Impact**: SQLAlchemy's `Base.metadata` only registers tables for models imported in memory. Startup executes `create_all` on an empty metadata registry, leaving the database completely empty (0 tables created).

### 1.3 PostgreSQL vs SQLite Async Driver Mismatches
- **Problem**: `backend/app/db/session.py` automatically replaces `postgresql://` with `postgresql+asyncpg://`. If SQLite (e.g., `sqlite:///./healthlink.db`) is used for quick local testing, `create_async_engine` fails because SQLite requires `sqlite+aiosqlite://`.
- **Impact**: Database connection crashes depending on the database URL format used.

### 1.4 Empty Database / Missing Seed Data
- **Problem**: The frontend requests data for default demo patients (e.g., patient ID `00001`), slots, and appointments. Because the database contains no tables or initial seed data, queries to `/dashboard/summary/00001`, `/patients/00001/profile`, or `/slots/available` return 404 or server errors.

---

## 2. Infrastructure & External Dependency Hard Blockers (Redis & WebSockets)

### 2.1 Hard Redis Dependency Without Fallback Causes 500 Internal Errors
- **Problem**: In `backend/app/services/appointment_service.py`, appointment cancellation and rescheduling invoke `await delete_cache(f"dashboard:{patient_id}")`.
- **Impact**: `app/db/redis_client.py` connects to `redis://localhost:6380/0`. If Redis is not running locally (standard when developing without Docker), calling `delete_cache` throws an unhandled `redis.exceptions.ConnectionError`, crashing the API endpoint with a 500 error.

### 2.2 Socket.io Server Fails Without Redis Adapter
- **Problem**: In `backend/app/websocket/queue_socket.py`:
  ```python
  client_manager=socketio.AsyncRedisManager(settings.REDIS_URL)
  ```
- **Impact**: WebSockets crash or fail on connection handshakes if Redis is unreachable.

---

## 3. API Contract & Frontend Integration Mismatches

### 3.1 Authentication Guard Guarding Public/Demo Routes (401 Unauthorized)
- **Problem**: The frontend pages (`/dashboard`, `/appointments`, `/booking`, `/queue`) operate gracefully with a `DEMO_PATIENT` (ID `00001`) when no login session exists. However, backend routers enforce `current_user: Patient = Depends(get_current_user)` across almost all endpoints (e.g., `/dashboard/summary/{patient_id}`, `/slots/available`, `/queue/status/{clinic_id}`, `/patients/{id}/profile`).
- **Impact**: Since frontend API requests do not carry a valid JWT Bearer header when unauthenticated, FastAPI responds with `401 Unauthorized`. Frontend's Axios interceptor (`api.ts`) catches the 401 and clears auth state, breaking the UI connection.

### 3.2 Query Parameter Mismatch in Slots API (`doctorId` vs `doctor_id`)
- **Problem**: Frontend `slotsApi.getAvailable(date, doctorId)` sends `?date=...&doctorId=...`. Backend `slots.py` expects `doctor_id: Optional[str] = None`.
- **Impact**: Backend ignores the doctor filter parameter from frontend.

### 3.3 Patient Model Missing Attribute in ML Slot Enrichment
- **Problem**: In `backend/app/routers/slots.py` line 46:
  ```python
  age=current_user.age if hasattr(current_user, 'age') else 30
  ```
  `Patient` model in `models/patient.py` has a `dob` (date of birth) column, but **no `age` attribute or property**.
- **Impact**: Falls back silently to 30 or throws AttributeError if not guarded.

---

## 4. Machine Learning & File Path Connection Issues

### 4.1 ML Model Paths Incorrectly Configured in `config.py`
- **Problem**: `app/core/config.py` sets model paths as `./apps/ml/models/noshow_model.pkl` and `./apps/ml/models/waittime_model.pkl`. The project folder structure was reorganized into `ML/` and `backend/app/ml/`.
- **Impact**: `ModelLoader` logs `⚠ No-show model not found` and falls back to naive heuristics.

### 4.2 PostgreSQL-Specific Locking in SQLite Environments
- **Problem**: `app/services/slot_service.py` uses `.with_for_update(skip_locked=True)`.
- **Impact**: `FOR UPDATE SKIP LOCKED` is a PostgreSQL-specific feature. If the backend runs on SQLite, this SQL syntax will fail with a syntax error.

---

## 5. Summary Checklist of Action Items to Resolve

- [ ] **Environment Setup**: Create `backend/.env` containing valid `DATABASE_URL`, `JWT_SECRET_KEY`, and `CORS_ORIGINS`.
- [ ] **Database Setup**: Import `app.models` inside `main.py` so `Base.metadata.create_all` creates all tables (`patients`, `appointments`, `slots`, `doctors`, etc.).
- [ ] **Seed Data**: Run a seed script (`seed_from_csv.py` or `create_test_user.py`) so demo patient `00001` and sample doctors/slots exist in the DB.
- [ ] **Redis Fallback**: Add `try...except` error handling in `app/db/redis_client.py` or make Redis optional during local development so backend won't 500 when Redis is offline.
- [ ] **Auth Strategy**: Allow demo patient requests or create an optional authentication guard for public/demo endpoints.
- [ ] **API Alignment**: Align parameter names (e.g. `doctorId` vs `doctor_id`) between `frontend/src/lib/api.ts` and FastAPI router schemas.
