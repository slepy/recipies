from typing import Any

from django.contrib.auth import authenticate

from accounts.models.contracts import AccountUser
from authentication.ports.authentication_provider import AuthenticationProvider


class DjangoAuthenticationProvider(AuthenticationProvider):
    def authenticate(self, email: str, password: str, request: Any = None) -> AccountUser | None:
        return authenticate(request=request, email=email, password=password)