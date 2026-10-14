from django.conf import settings
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from authentication.container import refresh_token_rotation_service
from authentication.errors.invalid_refresh_token import InvalidRefreshToken
from authentication.views.cookies import clear_refresh_cookie, set_refresh_cookie
from authentication.views.security import cookie_request_is_protected


class RefreshView(APIView):
    permission_classes = (AllowAny,)
    authentication_classes = ()

    def post(self, request):
        if not cookie_request_is_protected(request):
            return Response({"detail": "Nieprawidłowe żądanie."}, status=status.HTTP_403_FORBIDDEN)

        refresh = request.COOKIES.get(settings.REFRESH_COOKIE_NAME)
        if not refresh:
            return Response({"detail": "Sesja wygasła."}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            tokens = refresh_token_rotation_service.rotate(refresh)
        except InvalidRefreshToken:
            response = Response({"detail": "Sesja wygasła."}, status=status.HTTP_401_UNAUTHORIZED)
            clear_refresh_cookie(response)
            return response

        response = Response({"accessToken": tokens["access"]})
        if tokens["refresh"]:
            set_refresh_cookie(response, tokens["refresh"])
        return response