from django.db import IntegrityError, transaction
from django.test import TestCase

from accounts.models import User


class UserModelTests(TestCase):
    def test_user_normalizes_email_and_hashes_password(self):
        user = User.objects.create_user("Cook.Example@Example.COM", "a-very-long-password")

        self.assertEqual(user.email, "cook.example@example.com")
        self.assertTrue(user.check_password("a-very-long-password"))
        self.assertNotEqual(user.password, "a-very-long-password")

    def test_database_rejects_email_with_different_case(self):
        User.objects.create_user("cook@example.com", "a-very-long-password")

        with transaction.atomic():
            with self.assertRaises(IntegrityError):
                User.objects.create_user("COOK@EXAMPLE.COM", "another-very-long-password")