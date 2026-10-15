from django.conf import settings
from django.db import models

from recipes.models import Recipe
from shopping_lists.models import ShoppingList


class RecipeSet(models.Model):
    """A named choice of recipes with its own shopping list (ADR-0006)."""

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="recipe_sets",
    )
    name = models.CharField(max_length=200)
    # Django's automatic join table is unique per (set, recipe), so a recipe cannot be added twice.
    recipes = models.ManyToManyField(Recipe, blank=True, related_name="recipe_sets")
    # The set points at its list (not the other way round), so shopping_lists does not depend on this app.
    # Deleting the list deletes the set; the set's delete endpoint deletes the list for that reason.
    shopping_list = models.OneToOneField(ShoppingList, on_delete=models.CASCADE, related_name="recipe_set")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at", "-pk")
