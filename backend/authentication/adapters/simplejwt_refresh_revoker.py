from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from authentication.ports.refresh_token_revoker import RefreshTokenRevoker


class SimpleJWTRefreshTokenRevoker(RefreshTokenRevoker):
    def revoke(self, refresh_token: str) -> None:
        try:
            RefreshToken(refresh_token).blacklist()
        except TokenError:
            pass