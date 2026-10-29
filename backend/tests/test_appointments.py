"""
Unit tests for Appointments features used by the frontend
"""
import unittest
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from app.main import app


class TestAppointments(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_list_upcoming_appointments(self):
        """Test GET /appointments?status=upcoming returns active bookings"""
        response = self.client.get("/appointments?status=upcoming")
        self.assertEqual(response.status_code, 200)

        appointments = response.json()
        self.assertIsInstance(appointments, list)
        self.assertGreaterEqual(len(appointments), 1)

        first = appointments[0]
        self.assertIn("appointment_id", first)
        self.assertIn("appointment_date", first)
        self.assertIn("appointment_time", first)
        self.assertEqual(first["portal_status"], "upcoming")

    def test_list_completed_appointments(self):
        """Test GET /appointments?status=completed returns consultation history"""
        response = self.client.get("/appointments?status=completed")
        self.assertEqual(response.status_code, 200)

        appointments = response.json()
        self.assertIsInstance(appointments, list)
        for appt in appointments:
            self.assertEqual(appt["portal_status"], "completed")

    def test_filter_appointments_by_patient_id(self):
        """Test passing patient_id explicitly returns only that patient's bookings"""
        response = self.client.get("/appointments?patient_id=00001")
        self.assertEqual(response.status_code, 200)

        appointments = response.json()
        self.assertIsInstance(appointments, list)
        self.assertGreaterEqual(len(appointments), 1)

    def test_cancel_nonexistent_appointment_returns_404(self):
        """Test cancelling an unknown appointment ID returns 404 error"""
        response = self.client.patch(
            "/appointments/APT_DOES_NOT_EXIST/cancel",
            json={"reason": "Testing error handling"},
        )
        self.assertEqual(response.status_code, 404)


if __name__ == "__main__":
    unittest.main()

