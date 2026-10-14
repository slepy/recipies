from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient

from accounts.models import User


class LoginApiTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()

    def test_bad_credentials_use_a_neutral_error(self):
        User.objects.create_user("cook@example.com", "a-long-unique-password-48")

        unknown_email = self.client.post(
            "/api/auth/login/",
            {"email": "missing@example.com", "password": "a-long-unique-password-48"},
            format="json",
        )
        wrong_password = self.client.post(
            "/api/auth/login/",
            {"email": "cook@example.com", "password": "wrong-password-value"},
            format="json",
        )

        self.assertEqual(unknown_email.status_code, 400)
        self.assertEqual(unknown_email.data, wrong_password.data)
        self.assertNotIn("missing@example.com", str(unknown_email.data))

    def test_successful_login_issues_access_token_and_refresh_cookie(self):
        User.objects.create_user("cook@example.com", "a-long-unique-password-48")

        response = self.client.post(
            "/api/auth/login/",
            {"email": "COOK@EXAMPLE.COM", "password": "a-long-unique-password-48"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn("accessToken", response.data)
        self.assertTrue(response.cookies["refresh_token"]["httponly"])

    def test_repeated_login_attempts_are_rate_limited(self):
        cache.clear()
        payload = {"email": "missing@example.com", "password": "incorrect-password"}
        attempts = [
            self.client.post("/api/auth/login/", payload, format="json")
            for _ in range(6)
        ]

        self.assertTrue(all(response.status_code == 400 for response in attempts[:5]))
        self.assertEqual(attempts[5].status_code, 429)