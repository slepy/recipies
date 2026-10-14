from typing import Protocol


class AccountUser(Protocol):
    pk: int
    email: str
    is_active: bool