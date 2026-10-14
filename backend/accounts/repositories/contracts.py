from typing import Protocol

from accounts.models.contracts import AccountUser


class UserRepository(Protocol):
    def email_exists(self, email: str) -> bool: ...

    def create_user(self, email: str, password: str) -> AccountUser: ...