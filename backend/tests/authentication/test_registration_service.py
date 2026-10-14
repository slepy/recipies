from unittest import TestCase
from unittest.mock import Mock

from authentication.services.registration_service import RegistrationService


class RegistrationServiceTests(TestCase):
    def test_service_normalizes_email_before_repository_call(self):
        repository = Mock()
        repository.email_exists.return_value = True
        service = RegistrationService(repository)

        self.assertTrue(service.email_exists("Cook@Example.COM"))
        service.register_user("Cook@Example.COM", "valid-password")

        repository.create_user.assert_called_once_with("cook@example.com", "valid-password")