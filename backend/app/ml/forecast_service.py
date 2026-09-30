"""
ForecastService — Prophet traffic forecast + reschedule alternatives
Used by the Reschedule page to generate AI-ranked alternatives
"""
import json
from app.db.redis_client import get_cache, set_cache


class ForecastService:
    async def get_reschedule_alternatives(self, appointment_id: str, current_wait_min: float) -> list:
        """
        Returns 3 ranked alternatives with predicted wait times.
        In production: uses Prophet forecast per clinic+hour.
        Cache key: reschedule_alts:{appointment_id}
        """
        cache_key = f"reschedule_alts:{appointment_id}"
        cached = await get_cache(cache_key)
        if cached:
            return json.loads(cached)

        # Fallback static alternatives — replace with Prophet output in production
        alternatives = [
            {
                "slot_id": "ALT001",
                "date_label": "Wed, Jan 25",
                "time_label": "9:15 AM",
                "predicted_wait_min": current_wait_min * 0.15,
                "wait_reduction_pct": 85,
                "traffic_level": "low",
                "description": "Predicted wait is 85% lower than your current slot.",
                "is_best_choice": True,
            },
            {
                "slot_id": "ALT002",
                "date_label": "Thu, Jan 26",
                "time_label": "11:30 AM",
                "predicted_wait_min": current_wait_min * 0.4,
                "wait_reduction_pct": 60,
                "traffic_level": "medium",
                "description": "Standard morning flow. Consistent and predictable.",
                "is_best_choice": False,
            },
            {
                "slot_id": "ALT003",
                "date_label": "Mon, Jan 30",
                "time_label": "3:45 PM",
                "predicted_wait_min": current_wait_min * 0.5,
                "wait_reduction_pct": 50,
                "traffic_level": "medium",
                "description": "End of day slot. Reduced likelihood of clinical delays.",
                "is_best_choice": False,
            },
        ]

        await set_cache(cache_key, json.dumps(alternatives), ttl=3600)
        return alternatives
