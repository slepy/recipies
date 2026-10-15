from django.db import models

from shopping_lists.models.shopping_list import ShoppingList


class ShoppingListItem(models.Model):
    RECIPE = "recipe"
    CUSTOM = "custom"
    ORIGINS = ((RECIPE, "Z przepisów"), (CUSTOM, "Własna"))

    shopping_list = models.ForeignKey(ShoppingList, on_delete=models.CASCADE, related_name="items")
    name = models.CharField(max_length=200)
    origin = models.CharField(max_length=10, choices=ORIGINS)
    # Identifies a recipe item across refreshes: normalized name plus kind of measure. Empty for custom items.
    key = models.CharField(max_length=300, blank=True, default="")
    amount = models.FloatField(null=True, blank=True)
    unit = models.CharField(max_length=100, blank=True, default="")
    # Custom items take the same fields as a recipe ingredient: free-text amount plus a metric measure.
    amount_text = models.CharField(max_length=100, blank=True, default="")
    metric_amount = models.FloatField(null=True, blank=True)
    metric_unit = models.CharField(max_length=2, blank=True, default="")
    # True when the same ingredient also appears in a different measure, so this sum covers only part of it.
    partial = models.BooleanField(default=False)
    sources = models.JSONField(default=list, blank=True)
    bought = models.BooleanField(default=False)
    # The amount at the moment the item was marked as bought, to spot later increases.
    bought_amount = models.FloatField(null=True, blank=True)
    is_new = models.BooleanField(default=False)

    class Meta:
        ordering = ("name", "pk")
