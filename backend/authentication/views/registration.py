from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from authentication.container import registration_service
from authentication.serializers import RegistrationSerializer
from authentication.views.responses import token_response


class RegisterView(APIView):
    permission_classes = (AllowAny,)
    authentication_classes = ()
    throttle_classes = (ScopedRateThrottle,)
    throttle_scope = "register"

    def post(self, request):
        serializer = RegistrationSerializer(
            data=request.data,
            context={"registration_service": registration_service},
        )
        serializer.is_valid(raise_exception=True)
        return token_response(serializer.save(), status.HTTP_201_CREATED)