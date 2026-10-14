from authentication.errors.invalid_credentials import InvalidCredentials
from authentication.contracts.authentication_provider import AuthenticationProvider


class AuthenticationService:
    def __init__(self, authentication_provider: AuthenticationProvider):
        self.authentication_provider = authentication_provider

    def authenticate_user(self, email: str, password: str, request=None):
        user = self.authentication_provider.authenticate(email.strip().casefold(), password, request)
        if user is None or not user.is_active:
            raise InvalidCredentials
        return user