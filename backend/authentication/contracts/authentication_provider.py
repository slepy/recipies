from typing import Any, Protocol

from accounts.contracts.account_user import AccountUser


class AuthenticationProvider(Protocol):
    def authenticate(self, email: str, password: str, request: Any = None) -> AccountUser | None: ...