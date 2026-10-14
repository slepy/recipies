from types import SimpleNamespace
from unittest import TestCase
from unittest.mock import Mock

from authentication.errors.invalid_credentials import InvalidCredentials
from authentication.services.authentication_service import AuthenticationService


class AuthenticationServiceTests(TestCase):
    def test_service_normalizes_email_and_maps_failed_authentication(self):
        user = SimpleNamespace(is_active=True)
        provider = Mock()
        provider.authenticate.return_value = user
        service = AuthenticationService(provider)

        self.assertIs(service.authenticate_user("Cook@Example.COM", "valid-password"), user)
        provider.authenticate.assert_called_once_with("cook@example.com", "valid-password", None)

        provider.authenticate.return_value = None
        with self.assertRaises(InvalidCredentials):
            service.authenticate_user("cook@example.com", "invalid-password")