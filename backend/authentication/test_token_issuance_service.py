from unittest import TestCase
from unittest.mock import Mock

from authentication.services.token_issuance_service import TokenIssuanceService


class TokenIssuanceServiceTests(TestCase):
    def test_service_delegates_issuance_to_issuer(self):
        user = object()
        issuer = Mock()
        issuer.issue_for_user.return_value = {"access": "access", "refresh": "refresh"}

        tokens = TokenIssuanceService(issuer).issue_for_user(user)

        self.assertEqual(tokens["access"], "access")
        issuer.issue_for_user.assert_called_once_with(user)