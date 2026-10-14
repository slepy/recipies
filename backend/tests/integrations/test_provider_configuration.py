from cryptography.fernet import Fernet
from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from unittest.mock import patch

from accounts.models import User
from integrations.models import AIProviderConfiguration
from integrations.services.api_key_encryption import decrypt_api_key, encrypt_api_key
from integrations.services.provider_connection_tester import InvalidProviderApiKey


@override_settings(INTEGRATIONS_ENCRYPTION_KEY=Fernet.generate_key().decode("ascii"))
class ProviderConfigurationApiTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user("cook@example.com", "a-long-unique-password-48")
        self.client = APIClient()
        self.authenticate(self.user)

    def authenticate(self, user):
        access_token = str(RefreshToken.for_user(user).access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")

    def test_configuration_requires_authentication(self):
        self.client.credentials()

        self.assertEqual(self.client.get("/api/integrations/ai/").status_code, 401)
        self.assertEqual(
            self.client.post(
                "/api/integrations/ai/",
                {"provider": "openai", "api_key": "secret"},
                format="json",
            ).status_code,
            401,
        )

    def test_get_returns_status_without_the_api_key(self):
        response = self.client.get("/api/integrations/ai/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.data,
            {"configured": False, "provider": None, "is_active": False},
        )

    @patch("integrations.views.provider_configuration.test_provider_connection")
    def test_valid_key_is_checked_then_stored_encrypted_without_returning_it(self, test_connection):
        api_key = "provider-secret-key"
        response = self.client.post(
            "/api/integrations/ai/",
            {"provider": "openrouter", "api_key": api_key},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.data,
            {"configured": True, "provider": "openrouter", "is_active": False},
        )
        self.assertNotIn(api_key, str(response.data))
        test_connection.assert_called_once_with("openrouter", api_key)
        configuration = AIProviderConfiguration.objects.get(user=self.user)
        self.assertNotEqual(configuration.encrypted_api_key, api_key)
        self.assertEqual(decrypt_api_key(configuration.encrypted_api_key), api_key)

    @patch("integrations.views.provider_configuration.test_provider_connection")
    def test_failed_replacement_keeps_existing_configuration(self, test_connection):
        existing_key = "existing-provider-secret"
        configuration = AIProviderConfiguration.objects.create(
            user=self.user,
            provider=AIProviderConfiguration.Provider.OPENAI,
            encrypted_api_key=encrypt_api_key(existing_key),
            is_active=True,
        )
        test_connection.side_effect = InvalidProviderApiKey

        response = self.client.post(
            "/api/integrations/ai/",
            {"provider": "openrouter", "api_key": "invalid-key"},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertNotIn("invalid-key", str(response.data))
        configuration.refresh_from_db()
        self.assertEqual(configuration.provider, AIProviderConfiguration.Provider.OPENAI)
        self.assertEqual(decrypt_api_key(configuration.encrypted_api_key), existing_key)
        self.assertTrue(configuration.is_active)

    @override_settings(INTEGRATIONS_ENCRYPTION_KEY="")
    @patch("integrations.views.provider_configuration.test_provider_connection")
    def test_missing_encryption_key_does_not_store_plaintext(self, test_connection):
        response = self.client.post(
            "/api/integrations/ai/",
            {"provider": "openai", "api_key": "provider-secret"},
            format="json",
        )

        self.assertEqual(response.status_code, 503)
        self.assertNotIn("provider-secret", str(response.data))
        self.assertFalse(AIProviderConfiguration.objects.filter(user=self.user).exists())
        test_connection.assert_not_called()

    @patch("integrations.views.provider_configuration.test_provider_connection")
    def test_successful_replacement_deactivates_and_replaces_existing_provider(self, test_connection):
        AIProviderConfiguration.objects.create(
            user=self.user,
            provider=AIProviderConfiguration.Provider.OPENAI,
            encrypted_api_key=encrypt_api_key("existing-key"),
            is_active=True,
        )

        response = self.client.post(
            "/api/integrations/ai/",
            {"provider": "openrouter", "api_key": "replacement-key"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(AIProviderConfiguration.objects.filter(user=self.user).count(), 1)
        configuration = AIProviderConfiguration.objects.get(user=self.user)
        self.assertEqual(configuration.provider, AIProviderConfiguration.Provider.OPENROUTER)
        self.assertFalse(configuration.is_active)
        self.assertEqual(decrypt_api_key(configuration.encrypted_api_key), "replacement-key")

    def test_activation_and_removal_only_affect_the_authenticated_user(self):
        other_user = User.objects.create_user("other@example.com", "another-long-password-48")
        current_configuration = AIProviderConfiguration.objects.create(
            user=self.user,
            provider=AIProviderConfiguration.Provider.OPENAI,
            encrypted_api_key=encrypt_api_key("current-key"),
        )
        other_configuration = AIProviderConfiguration.objects.create(
            user=other_user,
            provider=AIProviderConfiguration.Provider.OPENROUTER,
            encrypted_api_key=encrypt_api_key("other-key"),
        )

        activation = self.client.post("/api/integrations/ai/activate/", format="json")
        self.assertEqual(activation.status_code, 200)
        current_configuration.refresh_from_db()
        other_configuration.refresh_from_db()
        self.assertTrue(current_configuration.is_active)
        self.assertFalse(other_configuration.is_active)

        self.client.delete("/api/integrations/ai/")
        self.assertFalse(AIProviderConfiguration.objects.filter(pk=current_configuration.pk).exists())
        self.assertTrue(AIProviderConfiguration.objects.filter(pk=other_configuration.pk).exists())
