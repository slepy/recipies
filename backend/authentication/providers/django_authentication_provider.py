from typing import Any

from django.contrib.auth import authenticate

from accounts.contracts.account_user import AccountUser
from authentication.contracts.authentication_provider import AuthenticationProvider


class DjangoAuthenticationProvider(AuthenticationProvider):
    def authenticate(self, email: str, password: str, request: Any = None) -> AccountUser | None:
        return authenticate(request=request, email=email, password=password)