"""
Unit tests for Authentication & Security features
Equivalent to JUnit test style in Python using unittest.TestCase
"""
import unittest
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from app.main import app
from app.core.security import hash_password, verify_password, create_access_token, decode_token


class TestAuthAndSecurity(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_password_hashing_and_verification(self):
        """Test password hashing via Argon2 and verification"""
        password = "healthlink123"
        hashed = hash_password(password)

        self.assertNotEqual(password, hashed)
        self.assertTrue(verify_password("healthlink123", hashed))
        self.assertFalse(verify_password("wrongpassword", hashed))

    def test_jwt_token_generation_and_decoding(self):
        """Test JWT creation with patient_id and decoding claims"""
        patient_id = "00001"
        token = create_access_token(subject=patient_id, role="patient")

        self.assertIsInstance(token, str)
        payload = decode_token(token)
        self.assertIsNotNone(payload)
        self.assertEqual(payload["sub"], patient_id)
        self.assertEqual(payload["role"], "patient")

    def test_login_successful_with_valid_credentials(self):
        """Test POST /auth/login with valid patient credentials"""
        response = self.client.post(
            "/auth/login",
            json={"email": "alex.morgan@healthlink.com", "password": "healthlink123"},
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("access_token", data)
        self.assertIn("token_type", data)
        self.assertEqual(data["token_type"], "bearer")

    def test_login_rejected_with_invalid_password(self):
        """Test POST /auth/login rejection on incorrect credentials"""
        response = self.client.post(
            "/auth/login",
            json={"email": "alex.morgan@healthlink.com", "password": "incorrect_password"},
        )
        self.assertEqual(response.status_code, 401)


if __name__ == "__main__":
    unittest.main()
