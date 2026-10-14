from rest_framework import serializers

from authentication.errors import InvalidCredentials
from authentication.services.authentication_service import AuthenticationService


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    default_error_messages = {"invalid_credentials": "Nieprawidłowy e-mail lub hasło."}

    def validate(self, attrs):
        service: AuthenticationService = self.context["authentication_service"]
        try:
            user = service.authenticate_user(
                email=attrs["email"],
                password=attrs["password"],
                request=self.context.get("request"),
            )
        except InvalidCredentials as error:
            raise serializers.ValidationError(
                self.error_messages["invalid_credentials"], code="authorization"
            ) from error
        attrs["user"] = user
        return attrs