from django.conf import settings
from django.db import models


class AIProviderConfiguration(models.Model):
    class Provider(models.TextChoices):
        OPENAI = "openai", "OpenAI"
        OPENROUTER = "openrouter", "OpenRouter"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="ai_provider_configuration",
    )
    provider = models.CharField(max_length=20, choices=Provider.choices)
    encrypted_api_key = models.TextField()
    is_active = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)
