from authentication.contracts.refresh_token_revoker import RefreshTokenRevoker


class RefreshTokenRevocationService:
    def __init__(self, token_revoker: RefreshTokenRevoker):
        self.token_revoker = token_revoker

    def revoke(self, refresh_token: str) -> None:
        self.token_revoker.revoke(refresh_token)