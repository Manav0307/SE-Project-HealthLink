"""
BehaviorScoreService
Computes punctuality, avg wait time, and reliability grade from appointments.csv data.
Mirrors exactly what's shown on the Profile page behavior insights panel.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.appointment import Appointment
from app.models.patient import Patient


GRADE_THRESHOLDS = {
    "A+": 95, "A": 85, "B": 70, "C": 55, "D": 0
}


class BehaviorScoreService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def compute_and_save(self, patient_id: str):
        """
        Called nightly by Celery beat.
        Reads real appointment data and computes behavior insights.

        Dataset mapping:
        - status == "attended"         → on-time (if check_in_time <= appointment_time)
        - status == "did not attend"   → no-show
        - waiting_time column          → used for avg_wait_time_min
        """
        result = await self.db.execute(
            select(Appointment).where(Appointment.patient_id == patient_id)
        )
        appointments = result.scalars().all()

        if not appointments:
            return

        total = len(appointments)
        attended = [a for a in appointments if a.status == "attended"]
        no_shows = [a for a in appointments if a.status == "did not attend"]

        # Punctuality: on-time check-ins / total attended
        on_time = sum(
            1 for a in attended
            if a.check_in_time and a.appointment_time and a.check_in_time <= a.appointment_time
        )
        punctuality = (on_time / len(attended) * 100) if attended else 0.0

        # Avg wait time from actual waiting_time column
        wait_times = [a.waiting_time for a in attended if a.waiting_time is not None]
        avg_wait = sum(wait_times) / len(wait_times) if wait_times else 0.0

        # No-show rate
        no_show_rate = len(no_shows) / total * 100 if total > 0 else 0.0

        # Reliability composite: 60% punctuality + 30% no-show penalty + 10% reschedule
        avg_reschedule = sum(a.reschedule_count for a in appointments if hasattr(a, 'reschedule_count')) / total
        composite = (punctuality * 0.6) + ((100 - no_show_rate) * 0.3) - (avg_reschedule * 10 * 0.1)
        composite = max(0, min(100, composite))

        # Map composite to letter grade
        grade = "D"
        for g, threshold in GRADE_THRESHOLDS.items():
            if composite >= threshold:
                grade = g
                break

        await self.db.execute(
            Patient.__table__.update()
            .where(Patient.patient_id == patient_id)
            .values(
                punctuality_score=round(punctuality, 1),
                avg_wait_time_min=round(avg_wait / 60, 1) if avg_wait > 60 else round(avg_wait, 1),
                reliability_grade=grade,
                total_appointments=total,
                no_show_count=len(no_shows),
            )
        )
