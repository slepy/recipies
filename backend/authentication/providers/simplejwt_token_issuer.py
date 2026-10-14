from rest_framework_simplejwt.tokens import RefreshToken

from accounts.contracts.account_user import AccountUser
from authentication.contracts.token_issuer import TokenIssuer
from authentication.contracts.token_pair import TokenPair


class SimpleJWTTokenIssuer(TokenIssuer):
    def issue_for_user(self, user: AccountUser) -> TokenPair:
        refresh = RefreshToken.for_user(user)
        return {"access": str(refresh.access_token), "refresh": str(refresh)}