from django.conf import settings
from django.db import models

from meal_plans.models import MealPlan


class ShoppingList(models.Model):
    """A snapshot of the ingredients of part of a meal plan, refreshed only on request."""

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="shopping_lists",
    )
    # Optional so that a list can later come from another source (a recipe set) without a schema rewrite.
    plan = models.ForeignKey(MealPlan, null=True, blank=True, on_delete=models.CASCADE, related_name="shopping_lists")
    name = models.CharField(max_length=200)
    scope_start = models.DateField(null=True, blank=True)
    scope_end = models.DateField(null=True, blank=True)
    excluded_entry_ids = models.JSONField(default=list, blank=True)
    generated_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at", "-pk")
