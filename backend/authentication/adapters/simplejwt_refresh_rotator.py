from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.serializers import TokenRefreshSerializer

from authentication.errors.invalid_refresh_token import InvalidRefreshToken
from authentication.ports.refresh_token_rotator import RefreshTokenRotator
from authentication.ports.token_pair import TokenPair


class SimpleJWTRefreshTokenRotator(RefreshTokenRotator):
    def rotate(self, refresh_token: str) -> TokenPair:
        serializer = TokenRefreshSerializer(data={"refresh": refresh_token})
        try:
            serializer.is_valid(raise_exception=True)
        except (AuthenticationFailed, TokenError) as error:
            raise InvalidRefreshToken from error
        return {
            "access": serializer.validated_data["access"],
            "refresh": serializer.validated_data.get("refresh"),
        }