from typing import Protocol

from authentication.contracts.token_pair import TokenPair


class RefreshTokenRotator(Protocol):
    def rotate(self, refresh_token: str) -> TokenPair: ...