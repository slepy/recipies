import base64

from django.core.exceptions import ImproperlyConfigured
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from integrations.models import AIProviderConfiguration
from integrations.services.api_key_encryption import decrypt_api_key
from integrations.services.provider_connection_tester import (
    InvalidProviderApiKey,
    ProviderConnectionError,
    ProviderRateLimitExceeded,
)
from integrations.services.recipe_image_recognizer import (
    InvalidRecognitionResponse,
    RecipeImageRecognizer,
)
from recipes.services import DishCropper, PhotoSanitizer
from recipes.services.photo_sanitizer import InvalidPhotoError

MAX_IMAGE_BYTES = 5 * 1024 * 1024


def failure(code, detail, http_status):
    return Response({"code": code, "detail": detail}, status=http_status)


class RecipeRecognitionView(APIView):
    """Reads a recipe image into a draft. Nothing is saved: the image only lives in this request."""

    permission_classes = (IsAuthenticated,)
    parser_classes = (MultiPartParser,)
    recognizer = RecipeImageRecognizer()

    def post(self, request):
        image = request.FILES.get("image")
        if image is None:
            raise ValidationError({"image": "Wybierz obraz do rozpoznania."})
        if image.size > MAX_IMAGE_BYTES:
            raise ValidationError({"image": "Obraz może mieć maksymalnie 5 MB."})
        try:
            normalized = PhotoSanitizer().sanitize(image)
        except InvalidPhotoError as error:
            raise ValidationError({"image": str(error)}) from error

        configuration = AIProviderConfiguration.objects.filter(user=request.user, is_active=True).first()
        if configuration is None:
            return failure(
                "provider_not_configured",
                "Skonfiguruj i aktywuj dostawcę AI w ustawieniach integracji.",
                status.HTTP_409_CONFLICT,
            )

        image_bytes = normalized.read()
        try:
            api_key = decrypt_api_key(configuration.encrypted_api_key)
            draft = self.recognizer.recognize(
                configuration.provider, api_key, image_bytes, normalized.content_type
            )
        except ImproperlyConfigured:
            return failure(
                "provider_unavailable",
                "Nie można odczytać zapisanego klucza. Zapisz klucz dostawcy ponownie.",
                status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except InvalidProviderApiKey:
            return failure(
                "provider_rejected_key",
                "Dostawca odrzucił klucz API. Sprawdź go w ustawieniach integracji.",
                status.HTTP_502_BAD_GATEWAY,
            )
        except ProviderRateLimitExceeded:
            return failure(
                "provider_rate_limited",
                "Dostawca AI ograniczył liczbę żądań. Spróbuj ponownie za chwilę.",
                status.HTTP_429_TOO_MANY_REQUESTS,
            )
        except InvalidRecognitionResponse:
            return failure(
                "invalid_recognition",
                "Nie udało się odczytać przepisu z tego obrazu. Spróbuj ponownie albo wypełnij formularz ręcznie.",
                status.HTTP_502_BAD_GATEWAY,
            )
        except ProviderConnectionError:
            return failure(
                "provider_unavailable",
                "Dostawca AI jest niedostępny lub nie odpowiedział na czas. Spróbuj ponownie.",
                status.HTTP_502_BAD_GATEWAY,
            )

        region = draft.pop("dish_region")
        dish_photo = None
        try:
            cropped = DishCropper().crop(image_bytes, region)
            if cropped is not None:
                encoded = base64.b64encode(cropped).decode("ascii")
                dish_photo = f"data:{normalized.content_type};base64,{encoded}"
        except Exception:  # a failed crop only removes the proposal, never the draft
            dish_photo = None

        return Response({**draft, "dish_photo": dish_photo})
