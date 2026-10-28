# 🎓 HealthLink — Project Architecture & Viva Defense Guide

> **A comprehensive reference guide explaining the purpose, architecture, and key files of HealthLink to help answer teacher questions, viva exams, and project presentations.**

---

## 🌟 1. Project Elevator Pitch (What to say when asked: "What is your project?")

> **"HealthLink is an AI-powered smart appointment scheduling and real-time queue management system for clinics and hospitals.**  
> Standard clinic systems suffer from long physical waiting times and high patient no-show rates. HealthLink solves this by:
> 1. **Predicting No-Shows**: Using machine learning to estimate if a patient will miss an appointment before it happens.
> 2. **Real-Time Live Queue**: Using **WebSockets** so patients can track their live token and wait time on their phones without crowding the waiting room.
> 3. **Smart Slot Locking**: Using **Redis** to prevent double-booking when multiple patients select the same time slot."

---

## 🏗️ 2. High-Level Technology Architecture

```plaintext
┌─────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (Next.js 14)                         │
│  • Pages (Booking, Live Queue, Doctor Dashboard)                        │
│  • Zustand Global State + Tailwind CSS UI + Socket.IO Client            │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ (HTTP REST / WebSockets)
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           BACKEND (FastAPI)                             │
│  • Routers (Endpoints) -> Services (Logic) -> Models (ORM)              │
│  • Socket.IO Live Queue Broadcaster                                     │
│  • Celery Background Workers                                            │
└──────────────┬─────────────────────┬────────────────────┬───────────────┘
               │                     │                    │
               ▼                     ▼                    ▼
     ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
     │  PostgreSQL 15   │  │     Redis 7      │  │    ML Engine     │
     │  (Permanent DB)  │  │  (Cache & Locks  │  │  (XGBoost /     │
     │  Users, Slots,   │  │   & Pub/Sub)     │  │   River Scorer)  │
     │  Appointments    │  │                  │  │                  │
     └──────────────────┘  └──────────────────┘  └──────────────────┘
```

---

## 📂 3. Directory & File Explanation Guide

---

### 🎨 A. Frontend (`/frontend`) — *Built with Next.js 14 (React & TypeScript)*

| Folder / File | Purpose & What to Tell Your Teacher |
| :--- | :--- |
| **`src/app/`** | **Page Routing (Next.js App Router)**: Each subfolder with a `page.tsx` represents a URL route on the website. |
| **`src/app/booking/page.tsx`** | The **Doctor & Slot Booking Page**: Allows patients to pick a specialty, select a doctor, and choose an available time slot. |
| **`src/app/queue/page.tsx`** | The **Live Queue Page**: Displays current token number, patient position, and real-time estimated wait time using live WebSocket streaming. |
| **`src/app/dashboard/page.tsx`** | The **Doctor Portal**: Visualizes daily appointments, clinic KPIs, patient risk alerts, and queue controls. |
| **`src/app/appointments/page.tsx`** | The **Patient History Page**: Displays past visits and allows rescheduling or cancelling upcoming bookings. |
| **`src/components/`** | **Visual UI Elements**: Contains reusable visual building blocks (e.g., `Sidebar.tsx`, `Topbar.tsx`, `AppShell.tsx`, `AuthGuard.tsx`). Returns HTML/JSX. |
| **`src/hooks/`** | **Reusable Logic & State**: Non-visual functions that handle background logic. Example: `useQueueSocket.ts` manages WebSocket connectivity, and `useSlotReservation.ts` manages temporary lock timers. |
| **`src/store/`** | **Zustand Global State**: Client-side state stores (`auth-store.ts`, `booking-store.ts`, `queue-store.ts`) that keep track of logged-in users and current selections across multiple pages without prop drilling. |
| **`src/lib/api.ts`** | **Axios HTTP Client**: Centralized API instance configured with base URLs and automatic JWT authentication header attachments. |

---

### ⚙️ B. Backend (`/backend`) — *Built with FastAPI (Python)*

| Folder / File | Purpose & What to Tell Your Teacher |
| :--- | :--- |
| **`app/main.py`** | **Application Entry Point**: Initializes FastAPI, configures CORS middleware, mounts WebSocket routes (`/ws`), registers all REST routers, and loads ML models on startup. |
| **`app/core/config.py`** | **Central Settings**: Reads environment variables (`DATABASE_URL`, `JWT_SECRET_KEY`, `REDIS_URL`, model filepaths) using Pydantic Settings. |
| **`app/core/security.py`** | **Auth Security**: Handles password hashing using `bcrypt` and creates/decodes JSON Web Tokens (`JWT`) for authenticated user sessions. |
| **`app/db/session.py`** | **PostgreSQL Connection**: Creates the asynchronous SQLAlchemy database engine and provides `get_db` dependency for endpoints. |
| **`app/db/redis_client.py`** | **Redis Connection**: Manages the Redis client pool for in-memory temporary slot locks and pub/sub message distribution. |
| **`app/models/`** | **Database Tables (SQLAlchemy ORM)**: Defines the SQL database schema as Python classes (`Patient`, `Doctor`, `Slot`, `Appointment`, `LiveQueue`, `IntakeForm`). |
| **`app/schemas/`** | **Data Validation (Pydantic)**: Defines the exact JSON format that API requests must send and responses must return. Prevents invalid data inputs. |
| **`app/routers/`** | **HTTP Endpoints**: Maps URL paths to controller functions (`/appointments`, `/slots`, `/queue`, `/auth`, `/dashboard`, `/ml`). |
| **`app/services/`** | **Business Logic Layer**: Keeps business logic separate from API routes. Example: `appointment_service.py` handles slot conflict verification, and `behavior_score_service.py` calculates patient attendance ratings. |
| **`app/tasks/`** | **Celery Background Workers**: Runs heavy asynchronous background tasks (e.g., sending emails, background ML recalculations) without blocking the user's browser. |
| **`app/websocket/queue_socket.py`** | **Real-Time WebSocket Handler**: Uses `python-socketio` to broadcast live queue updates to connected patient devices whenever doctor calls "Next". |
| **`app/ml/`** | **ML Inference Services**: Wrappers that load trained models and expose prediction functions (`noshow_predictor.py`, `wait_time_predictor.py`). |

---

### 🤖 C. Machine Learning Pipeline (`/ML`) — *Data Science & Predictive AI*

| Folder / File | Purpose & What to Tell Your Teacher |
| :--- | :--- |
| **`scripts/train_noshow.py`** | **No-Show Classifier**: Trains an **XGBoost Classifier** on historical patient appointments (age, gender, scheduling lead-time interval, appointment hour) to predict the probability of a missed visit. |
| **`scripts/train_waittime.py`** | **Wait-Time Regressor**: Trains a regression model to estimate actual clinic wait times based on queue size, time of day, and past doctor speed. |
| **`scripts/train_reliability.py`** | **Online Reliability Scorer**: Uses **River** (an online stream learning library) to continuously grade patients (A/B/C/D) based on attendance history. |
| **`scripts/train_all.py`** | **Master Pipeline**: Single execution script that runs all training jobs and exports serialized `.pkl` models for the backend API. |
| **`notebooks/01_eda.ipynb`** | **Exploratory Data Analysis (EDA)**: Jupyter notebook exploring data distributions, correlation heatmaps, and attendance statistics. |

---

## 💡 4. Top 6 Viva / Teacher Questions & Best Answers

### Q1: "Why did you use WebSockets instead of regular HTTP requests for the Live Queue?"
> **Answer:**  
> *"With regular HTTP, the patient's phone would need to send requests every 2 seconds (polling) to check if their turn arrived, which wastes server bandwidth and mobile battery. With WebSockets, a persistent connection is opened once; when the doctor clicks 'Next Patient', the backend immediately pushes the new queue position to all waiting patients simultaneously."*

---

### Q2: "Why do you need both PostgreSQL AND Redis?"
> **Answer:**  
> *"They serve two completely different purposes:*
> * **PostgreSQL** is our permanent disk database for relational records that must never be lost (patients, doctors, medical forms, appointment history).
> * **Redis** is an ultra-fast in-memory database (lives in RAM). We use it for **temporary slot locks** (e.g., holding a slot for 2 minutes while a user types their details) and for **WebSocket pub/sub message routing**.*"

---

### Q3: "What is the difference between the `components` folder and the `hooks` folder in frontend?"
> **Answer:**  
> *"**Components** represent the visual UI (Buttons, Sidebars, Modals) and return HTML/JSX.  
> **Hooks** represent reusable non-visual logic and state (e.g., `useQueueSocket` manages the WebSocket network connection) and return data and functions."*

---

### Q4: "How do you prevent two patients from booking the exact same time slot at the same time (Race Condition)?"
> **Answer:**  
> *"We implement a 2-stage reservation mechanism using Redis: when a user clicks a slot, Redis places an atomic temporary lock with a 2-minute expiration key (`SET key value NX EX 120`). If another user clicks the same slot, Redis rejects it. Once the booking is confirmed, PostgreSQL sets the slot status to `booked`."*

---

### Q5: "What machine learning models did you use and what are the features?"
> **Answer:**  
> *"1. **No-Show Predictor**: Uses an **XGBoost Classifier**. Features include: `age`, `sex_encoded`, `scheduling_interval` (days between booking and visit date), `age_group_encoded`, and `appointment_hour`.  
> 2. **Wait-Time Estimator**: Uses regression models to predict waiting duration.  
> 3. **Patient Reliability**: Uses **River** for stream-based dynamic scoring."*

---

### Q6: "Why did you choose FastAPI for the backend instead of Flask or Django?"
> **Answer:**  
> *"FastAPI natively supports Python's modern `async/await` asynchronous programming, which is crucial for high-concurrency real-time WebSocket traffic. Additionally, it provides built-in Pydantic data validation and auto-generates interactive OpenAPI documentation (`/docs`)."*
