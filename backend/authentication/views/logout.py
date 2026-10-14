from django.conf import settings
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from authentication.container import refresh_token_revocation_service
from authentication.views.cookies import clear_refresh_cookie
from authentication.views.security import cookie_request_is_protected


class LogoutView(APIView):
    permission_classes = (AllowAny,)
    authentication_classes = ()

    def post(self, request):
        if not cookie_request_is_protected(request):
            return Response({"detail": "Nieprawidłowe żądanie."}, status=status.HTTP_403_FORBIDDEN)

        refresh = request.COOKIES.get(settings.REFRESH_COOKIE_NAME)
        if refresh:
            refresh_token_revocation_service.revoke(refresh)

        response = Response(status=status.HTTP_204_NO_CONTENT)
        clear_refresh_cookie(response)
        return response