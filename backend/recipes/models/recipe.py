from django.conf import settings
from django.core.validators import FileExtensionValidator
from django.db import models


class Recipe(models.Model):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="recipes",
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default="")
    servings = models.PositiveSmallIntegerField(null=True, blank=True)
    prep_time_minutes = models.PositiveIntegerField(null=True, blank=True)
    cook_time_minutes = models.PositiveIntegerField(null=True, blank=True)
    ingredients = models.JSONField(default=list, blank=True)
    steps = models.JSONField(default=list, blank=True)
    photo = models.ImageField(
        upload_to="recipe_photos/%Y/%m/",
        blank=True,
        null=True,
        validators=[FileExtensionValidator(["jpg", "jpeg", "png", "webp"])],
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at", "-pk")