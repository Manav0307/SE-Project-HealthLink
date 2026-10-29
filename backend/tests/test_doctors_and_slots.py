"""
Unit tests for Doctor directory and Slot availability features used by frontend booking
"""
import unittest
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from app.main import app


class TestDoctorsAndSlots(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_list_doctors_returns_seeded_specialists(self):
        """Test GET /doctors returns the specialist doctors for the booking UI"""
        response = self.client.get("/doctors")
        self.assertEqual(response.status_code, 200)

        doctors = response.json()
        self.assertIsInstance(doctors, list)
        self.assertGreaterEqual(len(doctors), 5)

        # Check required fields used by frontend DOCTORS list
        first_doc = doctors[0]
        self.assertIn("doctor_id", first_doc)
        self.assertIn("name", first_doc)
        self.assertIn("specialization", first_doc)

    def test_get_available_slots_for_doctor(self):
        """Test GET /slots/available filters open slots by date and doctor"""
        response = self.client.get("/slots/available?date=2026-10-31&doctor_id=D001")
        self.assertEqual(response.status_code, 200)

        slots = response.json()
        self.assertIsInstance(slots, list)
        if len(slots) > 0:
            first_slot = slots[0]
            self.assertIn("slot_id", first_slot)
            self.assertIn("appointment_time", first_slot)
            self.assertEqual(first_slot["status"], "free")

    def test_reserve_slot_missing_required_fields_rejected(self):
        """Test POST /slots/reserve rejects malformed payload with 422 schema validation error"""
        response = self.client.post("/slots/reserve", json={})
        self.assertEqual(response.status_code, 422)


if __name__ == "__main__":
    unittest.main()
