from authentication.contracts.refresh_token_rotator import RefreshTokenRotator
from authentication.contracts.token_pair import TokenPair


class RefreshTokenRotationService:
    def __init__(self, token_rotator: RefreshTokenRotator):
        self.token_rotator = token_rotator

    def rotate(self, refresh_token: str) -> TokenPair:
        return self.token_rotator.rotate(refresh_token)