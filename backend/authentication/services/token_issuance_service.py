from accounts.contracts.account_user import AccountUser
from authentication.contracts.token_issuer import TokenIssuer
from authentication.contracts.token_pair import TokenPair


class TokenIssuanceService:
    def __init__(self, token_issuer: TokenIssuer):
        self.token_issuer = token_issuer

    def issue_for_user(self, user: AccountUser) -> TokenPair:
        return self.token_issuer.issue_for_user(user)