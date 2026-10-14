from django.conf import settings


def set_refresh_cookie(response, token):
    response.set_cookie(
        settings.REFRESH_COOKIE_NAME,
        str(token),
        max_age=int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds()),
        httponly=True,
        secure=settings.REFRESH_COOKIE_SECURE,
        samesite="Lax",
        path="/api/auth/",
    )


def clear_refresh_cookie(response):
    response.delete_cookie(settings.REFRESH_COOKIE_NAME, path="/api/auth/", samesite="Lax")