from rest_framework.response import Response

from authentication.container import token_issuance_service
from authentication.views.cookies import set_refresh_cookie


def token_response(user, status_code):
    tokens = token_issuance_service.issue_for_user(user)
    response = Response({"accessToken": tokens["access"]}, status=status_code)
    set_refresh_cookie(response, tokens["refresh"])
    return response