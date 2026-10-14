from django.contrib.auth import password_validation
from rest_framework import serializers

from accounts.errors import EmailAlreadyRegistered
from authentication.services.registration_service import RegistrationService


class RegistrationSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate_email(self, value):
        email = value.strip().casefold()
        service: RegistrationService = self.context["registration_service"]
        if service.email_exists(email):
            raise serializers.ValidationError("Konto z tym adresem e-mail już istnieje.")
        return email

    def validate_password(self, value):
        password_validation.validate_password(value)
        return value

    def create(self, validated_data):
        service: RegistrationService = self.context["registration_service"]
        try:
            return service.register_user(**validated_data)
        except EmailAlreadyRegistered as error:
            raise serializers.ValidationError(
                {"email": "Konto z tym adresem e-mail już istnieje."}
            ) from error