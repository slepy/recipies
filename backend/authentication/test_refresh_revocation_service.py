from unittest import TestCase
from unittest.mock import Mock

from authentication.services.refresh_token_revocation_service import RefreshTokenRevocationService


class RefreshTokenRevocationServiceTests(TestCase):
    def test_service_delegates_revocation_to_revoker(self):
        revoker = Mock()

        RefreshTokenRevocationService(revoker).revoke("refresh")

        revoker.revoke.assert_called_once_with("refresh")