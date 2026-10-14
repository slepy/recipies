from authentication.ports.refresh_token_rotator import RefreshTokenRotator
from authentication.ports.token_pair import TokenPair


class RefreshTokenRotationService:
    def __init__(self, token_rotator: RefreshTokenRotator):
        self.token_rotator = token_rotator

    def rotate(self, refresh_token: str) -> TokenPair:
        return self.token_rotator.rotate(refresh_token)