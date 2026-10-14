from django.test import TestCase

from accounts.models import User
from accounts.repositories.django_user_repository import DjangoUserRepository


class DjangoUserRepositoryTests(TestCase):
    def test_email_exists_ignores_case(self):
        User.objects.create_user("cook@example.com", "a-very-long-password")

        self.assertTrue(DjangoUserRepository().email_exists("COOK@EXAMPLE.COM"))