from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from authentication.container import authentication_service
from authentication.serializers import LoginSerializer
from authentication.views.responses import token_response


class LoginView(APIView):
    permission_classes = (AllowAny,)
    authentication_classes = ()
    throttle_classes = (ScopedRateThrottle,)
    throttle_scope = "login"

    def post(self, request):
        serializer = LoginSerializer(
            data=request.data,
            context={"request": request, "authentication_service": authentication_service},
        )
        serializer.is_valid(raise_exception=True)
        return token_response(serializer.validated_data["user"], status.HTTP_200_OK)