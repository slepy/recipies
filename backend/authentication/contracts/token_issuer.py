from typing import Protocol

from accounts.contracts.account_user import AccountUser
from authentication.contracts.token_pair import TokenPair


class TokenIssuer(Protocol):
    def issue_for_user(self, user: AccountUser) -> TokenPair: ...