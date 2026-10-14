from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from integrations.models import AIProviderConfiguration
from integrations.views.provider_configuration import configuration_payload


class ActivateProviderView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        configuration = AIProviderConfiguration.objects.filter(user=request.user).first()
        if configuration is None:
            return Response(
                {"detail": "Najpierw skonfiguruj dostawcę AI."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        configuration.is_active = True
        configuration.save(update_fields=("is_active", "updated_at"))
        return Response(configuration_payload(configuration))
