import json
import tempfile
from io import BytesIO
from pathlib import Path
from unittest.mock import patch

from cryptography.fernet import Fernet
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from PIL import Image
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import User
from integrations.models import AIProviderConfiguration
from integrations.services.api_key_encryption import encrypt_api_key
from integrations.services.provider_connection_tester import InvalidProviderApiKey, ProviderConnectionError
from integrations.errors import InvalidRecognitionResponse
from recipes.models import Recipe

RECOGNIZER = "recipes.views.recipe_recognition.RecipeRecognitionView.recognition.recognizer"
DRAFT = {
    "title": "Zupa",
    "description": "",
    "servings": None,
    "prep_time_minutes": None,
    "cook_time_minutes": None,
    "ingredients": [{"name": "woda", "amount": "1", "unit": "l"}],
    "steps": ["Gotuj"],
    "dish_region": {"left": 0, "top": 0, "width": 0.5, "height": 0.5},
}


@override_settings(INTEGRATIONS_ENCRYPTION_KEY=Fernet.generate_key().decode())
class RecipeRecognitionApiTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user("cook@example.com", "a-long-unique-password-48")
        self.client = APIClient()
        self.authenticate(self.client, self.user)

    def authenticate(self, client, user):
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {RefreshToken.for_user(user).access_token}")

    def configure_provider(self, user=None, is_active=True):
        AIProviderConfiguration.objects.create(
            user=user or self.user,
            provider="openai",
            encrypted_api_key=encrypt_api_key("provider-secret"),
            is_active=is_active,
        )

    def upload(self, name="page.png", data=None, content_type="image/png"):
        if data is None:
            output = BytesIO()
            Image.new("RGB", (200, 100), "tomato").save(output, format="PNG")
            data = output.getvalue()
        return SimpleUploadedFile(name, data, content_type=content_type)

    def recognize(self, **upload_args):
        return self.client.post("/api/recipes/recognize/", {"image": self.upload(**upload_args)}, format="multipart")

    def test_requires_authentication_and_does_not_call_the_provider(self):
        self.client.credentials()
        with patch(RECOGNIZER) as recognizer:
            response = self.recognize()

        self.assertEqual(response.status_code, 401)
        recognizer.recognize.assert_not_called()

    def test_without_active_provider_the_image_is_not_sent(self):
        for configure in (lambda: None, lambda: self.configure_provider(is_active=False)):
            AIProviderConfiguration.objects.all().delete()
            configure()
            with patch(RECOGNIZER) as recognizer:
                response = self.recognize()

            self.assertEqual(response.status_code, 409)
            self.assertEqual(response.data["code"], "provider_not_configured")
            recognizer.recognize.assert_not_called()

    def test_returns_draft_with_proposed_dish_photo_and_saves_nothing(self):
        self.configure_provider()
        with tempfile.TemporaryDirectory() as media_root, override_settings(MEDIA_ROOT=media_root):
            with patch(RECOGNIZER) as recognizer:
                recognizer.recognize.return_value = dict(DRAFT)
                response = self.recognize()

            self.assertFalse(any(Path(media_root).rglob("*.*")))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["title"], "Zupa")
        self.assertEqual(response.data["ingredients"], DRAFT["ingredients"])
        self.assertTrue(response.data["dish_photo"].startswith("data:image/png;base64,"))
        self.assertNotIn("dish_region", response.data)
        self.assertFalse(Recipe.objects.exists())
        provider, api_key = recognizer.recognize.call_args.args[:2]
        self.assertEqual((provider, api_key), ("openai", "provider-secret"))

    def test_draft_without_valid_region_has_no_dish_photo(self):
        self.configure_provider()
        for region in (None, {"left": 5, "top": 5, "width": 1, "height": 1}):
            with patch(RECOGNIZER) as recognizer:
                recognizer.recognize.return_value = {**DRAFT, "dish_region": region}
                response = self.recognize()

            self.assertEqual(response.status_code, 200)
            self.assertIsNone(response.data["dish_photo"])
            self.assertEqual(response.data["title"], "Zupa")

    def test_crop_failure_keeps_the_draft(self):
        self.configure_provider()
        with patch(RECOGNIZER) as recognizer, patch("recipes.views.recipe_recognition.RecipeRecognitionView.recognition.cropper.crop", side_effect=ValueError):
            recognizer.recognize.return_value = dict(DRAFT)
            response = self.recognize()

        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.data["dish_photo"])
        self.assertEqual(response.data["steps"], ["Gotuj"])

    def test_provider_failures_become_controlled_errors_without_saving(self):
        self.configure_provider()
        cases = [
            (InvalidProviderApiKey, 502, "provider_rejected_key"),
            (ProviderConnectionError, 502, "provider_unavailable"),
            (InvalidRecognitionResponse, 502, "invalid_recognition"),
        ]
        for error, expected_status, code in cases:
            with self.subTest(error=error), patch(RECOGNIZER) as recognizer:
                recognizer.recognize.side_effect = error
                response = self.recognize()

            self.assertEqual(response.status_code, expected_status)
            self.assertEqual(response.data["code"], code)
            self.assertNotIn("provider-secret", json.dumps(response.data))
            self.assertFalse(Recipe.objects.exists())

    def test_rejects_invalid_images_before_calling_the_provider(self):
        self.configure_provider()
        too_large = self.upload(data=b"x" * (5 * 1024 * 1024 + 1))
        with patch(RECOGNIZER) as recognizer:
            responses = [
                self.client.post("/api/recipes/recognize/", {}, format="multipart"),
                self.recognize(data=b"not an image"),
                self.client.post("/api/recipes/recognize/", {"image": too_large}, format="multipart"),
            ]

        self.assertEqual([response.status_code for response in responses], [400, 400, 400])
        recognizer.recognize.assert_not_called()

    def test_sends_the_provider_an_image_without_exif(self):
        self.configure_provider()
        exif = Image.Exif()
        exif[0x010F] = "SecretCamera"
        output = BytesIO()
        Image.new("RGB", (6, 2), "tomato").save(output, format="JPEG", exif=exif)
        with patch(RECOGNIZER) as recognizer:
            recognizer.recognize.return_value = dict(DRAFT)
            self.recognize(name="p.jpg", data=output.getvalue(), content_type="image/jpeg")

        sent = recognizer.recognize.call_args.args[2]
        self.assertNotIn(b"SecretCamera", sent)
