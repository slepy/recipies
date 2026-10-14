from typing import Protocol

from accounts.models.contracts import AccountUser
from authentication.ports.token_pair import TokenPair


class TokenIssuer(Protocol):
    def issue_for_user(self, user: AccountUser) -> TokenPair: ...