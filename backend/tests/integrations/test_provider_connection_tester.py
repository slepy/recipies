from unittest.mock import patch
from urllib.error import HTTPError

from django.test import SimpleTestCase

from integrations.services.provider_connection_tester import (
    InvalidProviderApiKey,
    ProviderConnectionError,
    ProviderRateLimitExceeded,
    test_provider_connection,
)


class ProviderConnectionTesterTests(SimpleTestCase):
    @patch("integrations.services.provider_connection_tester.urlopen")
    def test_checks_provider_models_endpoint_with_bearer_key(self, urlopen):
        urlopen.return_value.__enter__.return_value.status = 200

        test_provider_connection("openai", "provider-secret")

        request = urlopen.call_args.args[0]
        self.assertEqual(request.full_url, "https://api.openai.com/v1/models")
        self.assertEqual(request.get_header("Authorization"), "Bearer provider-secret")
        self.assertEqual(urlopen.call_args.kwargs["timeout"], 10)

    @patch("integrations.services.provider_connection_tester.urlopen")
    def test_maps_authentication_failure_without_exposing_provider_body(self, urlopen):
        urlopen.side_effect = HTTPError(
            "https://api.openai.com/v1/models",
            401,
            "Unauthorized",
            {},
            None,
        )

        with self.assertRaises(InvalidProviderApiKey) as error:
            test_provider_connection("openai", "provider-secret")

        self.assertNotIn("provider-secret", str(error.exception))

    @patch("integrations.services.provider_connection_tester.urlopen")
    def test_maps_rate_limit_and_timeout_to_safe_errors(self, urlopen):
        urlopen.side_effect = HTTPError(
            "https://openrouter.ai/api/v1/models",
            429,
            "Too Many Requests",
            {},
            None,
        )
        with self.assertRaises(ProviderRateLimitExceeded):
            test_provider_connection("openrouter", "provider-secret")

        urlopen.side_effect = TimeoutError
        with self.assertRaises(ProviderConnectionError):
            test_provider_connection("openrouter", "provider-secret")