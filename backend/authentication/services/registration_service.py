from accounts.repositories.contracts.user_repository import UserRepository


class RegistrationService:
    def __init__(self, user_repository: UserRepository):
        self.user_repository = user_repository

    def email_exists(self, email: str) -> bool:
        return self.user_repository.email_exists(email.strip().casefold())

    def register_user(self, email: str, password: str):
        return self.user_repository.create_user(email.strip().casefold(), password)