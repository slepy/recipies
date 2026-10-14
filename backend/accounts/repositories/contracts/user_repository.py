from typing import Protocol

from accounts.contracts.account_user import AccountUser


class UserRepository(Protocol):
    def email_exists(self, email: str) -> bool: ...

    def create_user(self, email: str, password: str) -> AccountUser: ...