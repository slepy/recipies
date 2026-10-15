from django.core.exceptions import ImproperlyConfigured
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from integrations.errors import InvalidRecognitionResponse
from integrations.services.provider_connection_tester import (
    InvalidProviderApiKey,
    ProviderConnectionError,
    ProviderRateLimitExceeded,
)
from recipes.errors import InvalidPhotoError, ProviderNotConfigured
from recipes.services import RecipeImageRecognition

MAX_IMAGE_BYTES = 5 * 1024 * 1024

# Most specific first: InvalidProviderApiKey and the others are all ProviderConnectionError.
FAILURES = (
    (ProviderNotConfigured, "provider_not_configured", status.HTTP_409_CONFLICT,
     "Skonfiguruj i aktywuj dostawcę AI w ustawieniach integracji."),
    (ImproperlyConfigured, "provider_unavailable", status.HTTP_503_SERVICE_UNAVAILABLE,
     "Nie można odczytać zapisanego klucza. Zapisz klucz dostawcy ponownie."),
    (InvalidProviderApiKey, "provider_rejected_key", status.HTTP_502_BAD_GATEWAY,
     "Dostawca odrzucił klucz API. Sprawdź go w ustawieniach integracji."),
    (ProviderRateLimitExceeded, "provider_rate_limited", status.HTTP_429_TOO_MANY_REQUESTS,
     "Dostawca AI ograniczył liczbę żądań. Spróbuj ponownie za chwilę."),
    (InvalidRecognitionResponse, "invalid_recognition", status.HTTP_502_BAD_GATEWAY,
     "Nie udało się odczytać przepisu z tego obrazu. Spróbuj ponownie albo wypełnij formularz ręcznie."),
    (ProviderConnectionError, "provider_unavailable", status.HTTP_502_BAD_GATEWAY,
     "Dostawca AI jest niedostępny lub nie odpowiedział na czas. Spróbuj ponownie."),
)


class RecipeRecognitionView(APIView):
    permission_classes = (IsAuthenticated,)
    parser_classes = (MultiPartParser,)
    recognition = RecipeImageRecognition()

    def post(self, request):
        image = request.FILES.get("image")
        if image is None:
            raise ValidationError({"image": "Wybierz obraz do rozpoznania."})
        if image.size > MAX_IMAGE_BYTES:
            raise ValidationError({"image": "Obraz może mieć maksymalnie 5 MB."})

        try:
            return Response(self.recognition.recognize(request.user, image))
        except InvalidPhotoError as error:
            raise ValidationError({"image": str(error)}) from error
        except tuple(failure[0] for failure in FAILURES) as error:
            return self.failure_response(error)

    def failure_response(self, error):
        for error_type, code, http_status, detail in FAILURES:
            if isinstance(error, error_type):
                return Response({"code": code, "detail": detail}, status=http_status)
