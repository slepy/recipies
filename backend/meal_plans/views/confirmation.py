from rest_framework import status
from rest_framework.response import Response


def confirmation_required(message, entry_count):
    """409 telling the client that a destructive change needs an explicit confirmation."""
    return Response(
        {"detail": message, "code": "confirmation_required", "entry_count": entry_count},
        status=status.HTTP_409_CONFLICT,
    )
