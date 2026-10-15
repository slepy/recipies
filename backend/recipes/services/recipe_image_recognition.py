import base64

from integrations.models import AIProviderConfiguration
from integrations.services.api_key_encryption import decrypt_api_key
from integrations.services.recipe_draft_cleaner import RecipeDraftCleaner
from integrations.services.recipe_image_recognizer import RecipeImageRecognizer
from recipes.errors import ProviderNotConfigured
from recipes.services.dish_cropper import DishCropper
from recipes.services.photo_sanitizer import PhotoSanitizer


class RecipeImageRecognition:
    """Use case: turn one uploaded image into a recipe draft. Nothing is stored.

    Raises InvalidPhotoError, ProviderNotConfigured or the provider errors from
    integrations; the view decides how each one looks over HTTP.
    """

    def __init__(self, recognizer=None, cleaner=None, cropper=None, sanitizer=None):
        self.recognizer = recognizer or RecipeImageRecognizer()
        self.cleaner = cleaner or RecipeDraftCleaner()
        self.cropper = cropper or DishCropper()
        self.sanitizer = sanitizer or PhotoSanitizer()

    def recognize(self, user, image) -> dict:
        normalized = self.sanitizer.sanitize(image)

        configuration = AIProviderConfiguration.objects.filter(user=user, is_active=True).first()
        if configuration is None:
            raise ProviderNotConfigured

        image_bytes = normalized.read()
        api_key = decrypt_api_key(configuration.encrypted_api_key)
        reply = self.recognizer.recognize(configuration.provider, api_key, image_bytes, normalized.content_type)
        draft = self.cleaner.clean(reply)

        region = draft.pop("dish_region")
        draft["dish_photo"] = self._propose_dish_photo(image_bytes, region, normalized.content_type)
        return draft

    def _propose_dish_photo(self, image_bytes, region, content_type):
        try:
            cropped = self.cropper.crop(image_bytes, region)
        except Exception:  # a failed crop only removes the proposal, never the draft
            return None
        if cropped is None:
            return None
        return f"data:{content_type};base64,{base64.b64encode(cropped).decode('ascii')}"
