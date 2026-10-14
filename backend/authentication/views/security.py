from urllib.parse import urlsplit

from django.conf import settings
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_protect


def cookie_request_is_protected(request):
    origin = request.headers.get("Origin")
    referer = request.headers.get("Referer")
    allowed_origins = {value.rstrip("/") for value in settings.ALLOWED_FRONTEND_ORIGINS}

    if origin:
        is_allowed = origin.rstrip("/") in allowed_origins
    elif referer:
        parsed_referer = urlsplit(referer)
        referer_origin = f"{parsed_referer.scheme}://{parsed_referer.netloc}".rstrip("/")
        is_allowed = referer_origin in allowed_origins
    else:
        is_allowed = False

    if not is_allowed:
        return False

    response = csrf_protect(lambda current_request: HttpResponse(status=204))(request)
    return response.status_code == 204