from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from accounts.models import User


@override_settings(
    ALLOWED_FRONTEND_ORIGINS=["http://testserver"],
    CSRF_TRUSTED_ORIGINS=["http://testserver"],
)
class RegistrationApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_registration_creates_account_and_sets_httponly_refresh_cookie(self):
        response = self.client.post(
            "/api/auth/register/",
            {"email": "Cook@Example.com", "password": "a-long-unique-password-48"},
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertIn("accessToken", response.data)
        user = User.objects.get()
        self.assertEqual(user.email, "cook@example.com")
        self.assertTrue(user.check_password("a-long-unique-password-48"))
        cookie = response.cookies["refresh_token"]
        self.assertTrue(cookie["httponly"])
        self.assertEqual(cookie["samesite"], "Lax")
        self.assertEqual(cookie["path"], "/api/auth/")

    def test_invalid_fields_do_not_create_an_account(self):
        response = self.client.post(
            "/api/auth/register/",
            {"email": "not-an-email", "password": "short"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("email", response.data)
        self.assertIn("password", response.data)
        self.assertFalse(User.objects.exists())