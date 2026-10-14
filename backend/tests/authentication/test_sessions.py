from django.test import Client, TestCase, override_settings
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import User


@override_settings(
    ALLOWED_FRONTEND_ORIGINS=["http://testserver"],
    CSRF_TRUSTED_ORIGINS=["http://testserver"],
)
class SessionApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.origin = "http://testserver"

    def test_refresh_rotates_token_and_rejects_reuse(self):
        user = User.objects.create_user("cook@example.com", "a-long-unique-password-48")
        original_refresh = str(RefreshToken.for_user(user))
        self.client.cookies["refresh_token"] = original_refresh

        rotated = self.client.post(
            "/api/auth/refresh/",
            HTTP_ORIGIN=self.origin,
            HTTP_X_CSRFTOKEN="test-token",
        )

        self.assertEqual(rotated.status_code, 200)
        self.assertIn("accessToken", rotated.data)
        rotated_refresh = rotated.cookies["refresh_token"].value
        self.assertNotEqual(rotated_refresh, original_refresh)

        self.client.cookies["refresh_token"] = original_refresh
        replay = self.client.post(
            "/api/auth/refresh/",
            HTTP_ORIGIN=self.origin,
            HTTP_X_CSRFTOKEN="test-token",
        )
        self.assertEqual(replay.status_code, 401)

    def test_refresh_requires_csrf_and_trusted_origin(self):
        user = User.objects.create_user("cook@example.com", "a-long-unique-password-48")
        client = Client(enforce_csrf_checks=True)
        client.cookies["refresh_token"] = str(RefreshToken.for_user(user))
        csrf_token = client.get("/api/auth/csrf/").json()["csrfToken"]

        missing_csrf = client.post("/api/auth/refresh/", HTTP_ORIGIN=self.origin)
        untrusted_origin = client.post(
            "/api/auth/refresh/",
            HTTP_ORIGIN="https://attacker.example",
            HTTP_X_CSRFTOKEN=csrf_token,
        )

        self.assertEqual(missing_csrf.status_code, 403)
        self.assertEqual(untrusted_origin.status_code, 403)

    def test_refresh_allows_same_origin_proxy_calls_without_origin_header(self):
        user = User.objects.create_user("cook@example.com", "a-long-unique-password-48")
        client = Client(enforce_csrf_checks=True)
        client.cookies["refresh_token"] = str(RefreshToken.for_user(user))
        csrf_token = client.get("/api/auth/csrf/").json()["csrfToken"]

        response = client.post(
            "/api/auth/refresh/",
            HTTP_REFERER="http://testserver/",
            HTTP_X_CSRFTOKEN=csrf_token,
        )

        self.assertEqual(response.status_code, 200)
        self.assertIn("accessToken", response.json())

    def test_logout_revokes_refresh_token_and_clears_cookie(self):
        user = User.objects.create_user("cook@example.com", "a-long-unique-password-48")
        refresh = str(RefreshToken.for_user(user))
        self.client.cookies["refresh_token"] = refresh

        response = self.client.post(
            "/api/auth/logout/",
            HTTP_ORIGIN=self.origin,
            HTTP_X_CSRFTOKEN="test-token",
        )

        self.assertEqual(response.status_code, 204)
        self.assertEqual(response.cookies["refresh_token"].value, "")
        self.client.cookies["refresh_token"] = refresh
        replay = self.client.post(
            "/api/auth/refresh/",
            HTTP_ORIGIN=self.origin,
            HTTP_X_CSRFTOKEN="test-token",
        )
        self.assertEqual(replay.status_code, 401)