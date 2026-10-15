from django.db import models

from meal_plans.models.meal import Meal
from recipes.models import Recipe


class MealEntry(models.Model):
    meal = models.ForeignKey(Meal, on_delete=models.CASCADE, related_name="entries")
    # Deleting a recipe removes its entries from every plan (spec AC-034).
    recipe = models.ForeignKey(Recipe, on_delete=models.CASCADE, related_name="meal_entries")
    servings = models.PositiveSmallIntegerField()
    position = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ("position", "pk")
