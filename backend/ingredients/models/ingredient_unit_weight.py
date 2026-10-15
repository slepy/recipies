from django.conf import settings
from django.db import models

from ingredients.normalization import name_key, unit_key


class IngredientUnitWeight(models.Model):
    """How many grams one unit of a product weighs, e.g. "pomidorki koktajlowe / szt. = 20 g"."""

    AUTO = "auto"
    MANUAL = "manual"
    SOURCES = ((AUTO, "Automatycznie"), (MANUAL, "Ręcznie"))

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="ingredient_unit_weights",
    )
    # Name and unit keep the spelling of the first save; the keys are what makes two entries the same.
    name = models.CharField(max_length=200)
    name_key = models.CharField(max_length=200, editable=False)
    unit = models.CharField(max_length=100, blank=True, default="")
    unit_key = models.CharField(max_length=100, blank=True, default="", editable=False)
    grams_per_unit = models.FloatField()
    source = models.CharField(max_length=10, choices=SOURCES)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("name_key", "unit_key", "pk")
        constraints = [
            models.UniqueConstraint(fields=("owner", "name_key", "unit_key"), name="unique_unit_weight_per_owner"),
        ]

    def save(self, *args, **kwargs):
        self.name_key = name_key(self.name)
        self.unit_key = unit_key(self.unit)
        super().save(*args, **kwargs)
