from django.conf import settings
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_protect


def cookie_request_is_protected(request):
    if request.headers.get("Origin") not in settings.ALLOWED_FRONTEND_ORIGINS:
        return False
    response = csrf_protect(lambda current_request: HttpResponse(status=204))(request)
    return response.status_code == 204