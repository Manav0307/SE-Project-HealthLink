"""
Unit tests for Patient Profile, Dashboard Summary, and Live Queue features
"""
import unittest
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from app.main import app


class TestDashboardAndQueue(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_dashboard_summary_for_default_patient(self):
        """Test GET /dashboard/summary/00001 returns active data for Alex Morgan"""
        response = self.client.get("/dashboard/summary/00001")
        self.assertEqual(response.status_code, 200)

        data = response.json()
        self.assertEqual(data["patient_name"], "Alex Morgan")
        self.assertIn("clinic_status", data)
        self.assertIn("upcoming_appointment", data)
        self.assertIn("health_metric_snapshot", data)

    def test_patient_profile_retrieval(self):
        """Test GET /patients/00001/profile returns Alex Morgan demographics"""
        response = self.client.get("/patients/00001/profile")
        self.assertEqual(response.status_code, 200)

        profile = response.json()
        self.assertEqual(profile["patient_id"], "00001")
        self.assertEqual(profile["name"], "Alex Morgan")
        self.assertEqual(profile["sex"], "M")
        self.assertIn("insurance", profile)

    def test_patient_behavior_insights(self):
        """Test GET /patients/00001/behavior-insights returns reliability metrics"""
        response = self.client.get("/patients/00001/behavior-insights")
        self.assertEqual(response.status_code, 200)

        insights = response.json()
        self.assertIn("reliability_grade", insights)
        self.assertIn("punctuality_score", insights)
        self.assertIn("avg_wait_time_min", insights)
        self.assertEqual(insights["reliability_grade"], "A")

    def test_queue_status_retrieval(self):
        """Test GET /queue/status/clinic_01 returns live queue info"""
        response = self.client.get("/queue/status/clinic_01")
        self.assertEqual(response.status_code, 200)

        queue = response.json()
        self.assertIn("clinic_id", queue)
        self.assertIn("total_waiting", queue)
        self.assertIn("avg_wait_min", queue)
        self.assertIn("traffic_level", queue)


if __name__ == "__main__":
    unittest.main()
