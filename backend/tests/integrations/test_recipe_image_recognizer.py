import json
from unittest.mock import patch
from urllib.error import HTTPError, URLError

from django.test import SimpleTestCase

from integrations.services.provider_connection_tester import (
    InvalidProviderApiKey,
    ProviderConnectionError,
    ProviderRateLimitExceeded,
)
from integrations.errors import InvalidRecognitionResponse
from integrations.services.recipe_draft_cleaner import RecipeDraftCleaner
from integrations.services.recipe_image_recognizer import RecipeImageRecognizer

DRAFT = {
    "title": "Zupa",
    "description": "",
    "servings": 4,
    "prep_time_minutes": None,
    "cook_time_minutes": "30",
    "ingredients": [{"name": "woda", "amount": "1", "unit": "l"}, {"name": "", "amount": "", "unit": ""}, "x"],
    "steps": ["Gotuj", "  ", 5],
    "dish_region": {"left": 0.1, "top": 0.1, "width": 0.5, "height": 0.5},
}


def provider_response(content):
    response = patch("integrations.services.recipe_image_recognizer.urlopen")
    mock = response.start()
    body = json.dumps({"choices": [{"message": {"content": content}}]}).encode()
    mock.return_value.__enter__.return_value.read.return_value = body
    return response, mock


class RecipeImageRecognizerTests(SimpleTestCase):
    def recognize(self, content):
        patcher, mock = provider_response(content)
        self.addCleanup(patcher.stop)
        reply = RecipeImageRecognizer().recognize("openai", "provider-secret", b"img", "image/png")
        return RecipeDraftCleaner().clean(reply), mock

    def test_sends_image_to_provider_and_cleans_the_draft(self):
        draft, urlopen = self.recognize(json.dumps(DRAFT))

        request = urlopen.call_args.args[0]
        body = json.loads(request.data)
        self.assertEqual(request.full_url, "https://api.openai.com/v1/chat/completions")
        self.assertEqual(request.get_header("Authorization"), "Bearer provider-secret")
        self.assertEqual(urlopen.call_args.kwargs["timeout"], 60)
        self.assertTrue(body["messages"][1]["content"][1]["image_url"]["url"].startswith("data:image/png;base64,"))
        self.assertEqual(draft["title"], "Zupa")
        self.assertIsNone(draft["prep_time_minutes"])
        self.assertIsNone(draft["cook_time_minutes"])  # a string is not trusted as a number
        self.assertEqual(draft["ingredients"], [{"name": "woda", "amount": "1", "unit": "l"}])
        self.assertEqual(draft["steps"], ["Gotuj"])

    def test_missing_fields_stay_empty(self):
        draft, _ = self.recognize("{}")

        self.assertEqual(draft["title"], "")
        self.assertEqual(draft["ingredients"], [])
        self.assertEqual(draft["steps"], [])
        self.assertIsNone(draft["servings"])
        self.assertIsNone(draft["dish_region"])

    def test_rejects_responses_that_are_not_a_json_object(self):
        for content in ("not json", "[]", "null"):
            with self.subTest(content=content):
                with self.assertRaises(InvalidRecognitionResponse):
                    self.recognize(content)

    @patch("integrations.services.recipe_image_recognizer.urlopen")
    def test_maps_provider_failures_to_safe_errors(self, urlopen):
        cases = [
            (HTTPError("u", 401, "x", {}, None), InvalidProviderApiKey),
            (HTTPError("u", 429, "x", {}, None), ProviderRateLimitExceeded),
            (HTTPError("u", 500, "x", {}, None), ProviderConnectionError),
            (TimeoutError(), ProviderConnectionError),
            (URLError("down"), ProviderConnectionError),
        ]
        for failure, expected in cases:
            with self.subTest(failure=failure):
                urlopen.side_effect = failure
                with self.assertRaises(expected) as raised:
                    RecipeImageRecognizer().recognize("openai", "provider-secret", b"img", "image/png")
                self.assertNotIn("provider-secret", str(raised.exception))
