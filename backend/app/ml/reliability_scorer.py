"""
ReliabilityScorer — computes A+/A/B/C/D grade
Nightly Celery task calls this for every patient
"""

GRADE_MAP = [("A+", 95), ("A", 85), ("B", 70), ("C", 55), ("D", 0)]


class ReliabilityScorer:
    def compute_grade(
        self,
        punctuality_pct: float,
        no_show_rate_pct: float,
        avg_reschedule_count: float,
    ) -> str:
        composite = (
            punctuality_pct * 0.6
            + (100 - no_show_rate_pct) * 0.3
            - avg_reschedule_count * 10 * 0.1
        )
        composite = max(0, min(100, composite))
        for grade, threshold in GRADE_MAP:
            if composite >= threshold:
                return grade
        return "D"
