from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import User


class CurrentUserApiTests(TestCase):
    def test_current_user_requires_access_token_and_returns_identity(self):
        client = APIClient()
        self.assertEqual(client.get("/api/auth/me/").status_code, 401)

        user = User.objects.create_user("cook@example.com", "a-long-unique-password-48")
        access = str(RefreshToken.for_user(user).access_token)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        response = client.get("/api/auth/me/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["email"], "cook@example.com")