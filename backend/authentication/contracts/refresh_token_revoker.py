from typing import Protocol


class RefreshTokenRevoker(Protocol):
    def revoke(self, refresh_token: str) -> None: ...