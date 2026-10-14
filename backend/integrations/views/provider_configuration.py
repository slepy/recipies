from django.core.exceptions import ImproperlyConfigured
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from integrations.models import AIProviderConfiguration
from integrations.serializers.provider_configuration import ProviderConfigurationSerializer
from integrations.services.api_key_encryption import encrypt_api_key
from integrations.services.provider_connection_tester import (
    InvalidProviderApiKey,
    ProviderConnectionError,
    ProviderRateLimitExceeded,
    test_provider_connection,
)


def configuration_payload(configuration):
    if configuration is None:
        return {"configured": False, "provider": None, "is_active": False}
    return {
        "configured": True,
        "provider": configuration.provider,
        "is_active": configuration.is_active,
    }


class ProviderConfigurationView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        configuration = AIProviderConfiguration.objects.filter(user=request.user).first()
        return Response(configuration_payload(configuration))

    def post(self, request):
        serializer = ProviderConfigurationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        provider = serializer.validated_data["provider"]
        api_key = serializer.validated_data["api_key"]

        try:
            encrypted_api_key = encrypt_api_key(api_key)
        except ImproperlyConfigured:
            return Response(
                {"detail": "Integracje AI nie są skonfigurowane na serwerze."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        try:
            test_provider_connection(provider, api_key)
        except InvalidProviderApiKey:
            return Response(
                {"detail": "Klucz API jest nieprawidłowy."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except ProviderRateLimitExceeded:
            return Response(
                {"detail": "Dostawca ograniczył liczbę prób. Spróbuj ponownie później."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )
        except ProviderConnectionError:
            return Response(
                {"detail": "Nie udało się sprawdzić połączenia z dostawcą."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        configuration, _ = AIProviderConfiguration.objects.update_or_create(
            user=request.user,
            defaults={
                "provider": provider,
                "encrypted_api_key": encrypted_api_key,
                "is_active": False,
            },
        )
        return Response(
            configuration_payload(configuration),
            status=status.HTTP_200_OK,
        )

    def delete(self, request):
        AIProviderConfiguration.objects.filter(user=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
