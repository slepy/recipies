from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models.contracts import AccountUser
from authentication.ports.token_issuer import TokenIssuer
from authentication.ports.token_pair import TokenPair


class SimpleJWTIssuer(TokenIssuer):
    def issue_for_user(self, user: AccountUser) -> TokenPair:
        refresh = RefreshToken.for_user(user)
        return {"access": str(refresh.access_token), "refresh": str(refresh)}