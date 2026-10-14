from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured


def _fernet():
    encryption_key = getattr(settings, "INTEGRATIONS_ENCRYPTION_KEY", "")
    if not encryption_key:
        raise ImproperlyConfigured("INTEGRATIONS_ENCRYPTION_KEY is not configured.")

    try:
        return Fernet(encryption_key.encode("ascii"))
    except (UnicodeEncodeError, TypeError, ValueError) as error:
        raise ImproperlyConfigured("INTEGRATIONS_ENCRYPTION_KEY is invalid.") from error


def encrypt_api_key(api_key: str) -> str:
    return _fernet().encrypt(api_key.encode("utf-8")).decode("ascii")


def decrypt_api_key(encrypted_api_key: str) -> str:
    try:
        return _fernet().decrypt(encrypted_api_key.encode("ascii")).decode("utf-8")
    except (InvalidToken, UnicodeDecodeError, UnicodeEncodeError) as error:
        raise ImproperlyConfigured("The stored AI provider key cannot be decrypted.") from error
