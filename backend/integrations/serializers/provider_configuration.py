from rest_framework import serializers

from integrations.models import AIProviderConfiguration


class ProviderConfigurationSerializer(serializers.Serializer):
    provider = serializers.ChoiceField(choices=AIProviderConfiguration.Provider.choices)
    api_key = serializers.CharField(
        max_length=4096,
        trim_whitespace=True,
        write_only=True,
    )
