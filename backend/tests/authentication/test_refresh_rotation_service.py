from unittest import TestCase
from unittest.mock import Mock

from authentication.services.refresh_token_rotation_service import RefreshTokenRotationService


class RefreshTokenRotationServiceTests(TestCase):
    def test_service_delegates_rotation_to_rotator(self):
        rotator = Mock()
        rotator.rotate.return_value = {"access": "new-access", "refresh": "new-refresh"}

        tokens = RefreshTokenRotationService(rotator).rotate("refresh")

        self.assertEqual(tokens["access"], "new-access")
        rotator.rotate.assert_called_once_with("refresh")