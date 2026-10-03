# 🏥 HealthLink — Smart Appointment Scheduling & Queue Management System

> **An AI-powered healthcare management platform built to minimize clinic wait times, predict patient no-shows, and provide real-time queue tracking.**

---

## 📌 Overview

**HealthLink** addresses critical operational inefficiencies in outpatient clinics and hospitals. By combining machine learning risk models, modern web technologies, and persistent real-time communication, HealthLink optimizes patient flow from booking to consultation.

### 🌟 Key Capabilities
* **🧠 No-Show Prediction**: Uses machine learning to evaluate historical booking patterns, demographics, and lead times to calculate the probability of a patient missing their appointment.
* **⏱️ Dynamic Wait-Time Estimation**: Predicts expected waiting delays based on active queue loads, doctor pacing, and real-time clinic velocity.
* **📱 Real-Time Live Queue**: WebSocket-powered live queue dashboard (`/queue`) that pushes real-time position updates to patients' devices without manual browser refreshing.
* **📅 Slot Reservation System**: Multi-doctor scheduling system with conflict prevention and temporary reservation locks.
* **📊 Doctor & Clinic Analytics**: Comprehensive dashboard (`/dashboard`) displaying attendance trends, daily patient schedules, and operational KPIs.

---

## 🛠️ Tech Stack

| Domain | Technology / Framework | Description |
| :--- | :--- | :--- |
| **Frontend** | **Next.js 14** (App Router) | Server-side rendering, React 18, modern routing |
| **Styling & UI** | **Tailwind CSS** + **Radix UI** | Modern design system, Lucide icons, responsive layouts |
| **State & Data Fetching** | **Zustand** + **TanStack Query** | Client-side state & server state caching |
| **Backend API** | **FastAPI** (Python 3.10+) | High-performance asynchronous REST API |
| **Realtime WebSockets** | **python-socketio** / **Socket.IO** | Bi-directional pub/sub live queue streaming |
| **Database & ORM** | **PostgreSQL 15** + **SQLAlchemy 2.0** | Relational data persistence & migrations via **Alembic** |
| **Cache & Message Broker** | **Redis 7** | Slot locking, WebSocket pub/sub, task queue broker |
| **Async Tasks** | **Celery** | Background job execution & heavy computations |
| **Machine Learning** | **XGBoost**, **Prophet**, **River**, **Scikit-learn** | Predictive classification, time-series regression & online learning |

---

## 📂 Project Structure

```plaintext
SE-Project-HealthLink/
├── backend/                        # FastAPI Backend Application
│   ├── app/
│   │   ├── core/                   # Config, security (JWT/Bcrypt), dependencies
│   │   ├── db/                     # PostgreSQL sessions & Redis client
│   │   ├── ml/                     # ML inference services (No-show, wait-time)
│   │   ├── models/                 # SQLAlchemy DB models (Patient, Slot, Appointment, Queue)
│   │   ├── routers/                # REST API endpoints (auth, slots, appointments, queue, etc.)
│   │   ├── schemas/                # Pydantic validation schemas
│   │   ├── services/               # Business logic & domain services
│   │   ├── tasks/                  # Celery background workers
│   │   ├── websocket/              # Socket.IO live queue handlers
│   │   └── main.py                 # FastAPI application entry point
│   ├── migrations/                 # Alembic database migration scripts
│   ├── requirements.txt            # Python dependencies
│   └── .env.example                # Backend environment variables template
│
├── frontend/                       # Next.js 14 Frontend Application
│   ├── src/
│   │   ├── app/                    # App Router pages
│   │   │   ├── booking/            # Doctor & appointment slot booking page
│   │   │   ├── queue/              # Real-time live queue tracking page
│   │   │   ├── dashboard/          # Doctor / clinic analytics dashboard
│   │   │   ├── appointments/       # Patient appointments & rescheduling
│   │   │   └── profile/            # User profile and settings
│   │   ├── components/             # Reusable UI components & layouts
│   │   ├── hooks/                  # Custom React hooks (useQueueSocket, etc.)
│   │   ├── store/                  # Zustand global stores (auth, queue, booking)
│   │   ├── lib/                    # Axios API client, utils, constants
│   │   └── types/                  # TypeScript data interfaces
│   ├── package.json                # Frontend dependencies and npm scripts
│   └── tailwind.config.ts          # Tailwind CSS configuration
│
└── ML/                             # Machine Learning Training Pipelines
    ├── notebooks/                  # Exploratory data analysis (EDA) notebooks
    ├── scripts/
    │   ├── train_noshow.py         # XGBoost classifier for no-show risk prediction
    │   ├── train_waittime.py       # Wait-time regression / Prophet forecasting
    │   ├── train_reliability.py    # Online patient reliability grading (River)
    │   └── train_all.py            # Master script to execute full training pipeline
    ├── requirements.txt            # ML Python dependencies
    └── _model_check.txt            # Feature validation & test logs
```

---

## 🚀 Getting Started (Local Development)

### 1. Prerequisites
Ensure you have the following installed on your machine:
* **Node.js** (v18.x or higher) & **npm**
* **Python** (v3.10 to v3.12 recommended)
* **PostgreSQL** (running locally or via container)
* **Redis** (running locally or via container)

---

### 2. Backend Setup

1. **Navigate to the backend directory**:
   ```bash
   cd backend
   ```

2. **Create and activate a virtual environment**:
   ```bash
   # Windows (PowerShell)
   python -m venv venv
   .\venv\Scripts\Activate.ps1

   # Linux / macOS
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables**:
   ```bash
   cp .env.example .env
   ```
   *Edit `.env` to supply your database credentials and secret keys.*

5. **Run database migrations**:
   ```bash
   alembic upgrade head
   ```

6. **Start the FastAPI server**:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   * API docs available at: `http://localhost:8000/docs`
   * Health check endpoint: `http://localhost:8000/health`

---

### 3. Frontend Setup

1. **Navigate to the frontend directory**:
   ```bash
   cd ../frontend
   ```

2. **Install Node dependencies**:
   ```bash
   npm install
   ```

3. **Start the Next.js development server**:
   ```bash
   npm run dev
   ```
   * Open your browser and navigate to `http://localhost:3000`

---

### 4. Machine Learning Pipeline (Optional / Model Training)

To train or update the predictive models:

1. **Navigate to the ML directory**:
   ```bash
   cd ../ML
   ```

2. **Install ML dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the master training script**:
   ```bash
   python scripts/train_all.py \
     --patients ../data/patients.csv \
     --slots ../data/slots.csv \
     --appointments ../data/appointments.csv
   ```
   *Trained artifacts (`.pkl`) will be exported to the models directory for backend inference.*

---

## 🔗 Key API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/auth/login` | Authenticate patient and obtain JWT tokens |
| `GET` | `/slots/available` | Fetch available doctor slots with filters |
| `POST` | `/slots/reserve` | Temporarily hold a slot with Redis lock |
| `POST` | `/appointments/book` | Confirm and create an appointment booking |
| `GET` | `/queue/status/{token_id}` | Retrieve current queue status and wait time |
| `POST` | `/queue/checkin` | Check in a patient upon arrival |
| `POST` | `/queue/next` | Advance the active queue to the next patient |
| `GET` | `/ml/predict-noshow` | Calculate no-show probability for an appointment |
| `GET` | `/dashboard/stats` | Aggregate clinic attendance and revenue metrics |
| `WS` | `/ws` | Socket.IO endpoint for live real-time queue streaming |

---

## 👥 Contributors
* Developed as part of the **HealthLink** initiative.
