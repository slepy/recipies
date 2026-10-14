from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction

from accounts.contracts.account_user import AccountUser
from accounts.errors.email_already_registered import EmailAlreadyRegistered
from accounts.repositories.contracts.user_repository import UserRepository


User = get_user_model()


class DjangoUserRepository(UserRepository):
    def email_exists(self, email: str) -> bool:
        return User.objects.filter(email__iexact=email).exists()

    def create_user(self, email: str, password: str) -> AccountUser:
        try:
            with transaction.atomic():
                return User.objects.create_user(email=email, password=password)
        except IntegrityError as error:
            raise EmailAlreadyRegistered from error