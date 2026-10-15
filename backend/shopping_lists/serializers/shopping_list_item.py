from rest_framework import serializers

from ingredients.services import UnitWeightLookup
from shopping_lists.models import ShoppingListItem


class ShoppingListItemSerializer(serializers.ModelSerializer):
    """Pass context["unit_weights"] (a UnitWeightLookup) to read the weights of many items with one query."""

    unit_weight = serializers.SerializerMethodField()

    class Meta:
        model = ShoppingListItem
        fields = (
            "id",
            "name",
            "origin",
            "amount",
            "unit",
            "amount_text",
            "metric_amount",
            "metric_unit",
            "metric_estimated",
            "unit_weight",
            "partial",
            "bought",
            "bought_amount",
            "bought_metric_base",
            "extra_amount",
            "extra_metric",
            "is_new",
        )
        read_only_fields = fields

    def get_unit_weight(self, item):
        """Grams per unit of this product from the knowledge base, or None when it is not known."""
        lookup = self.context.get("unit_weights") or UnitWeightLookup(item.shopping_list.owner_id, [item.name])
        return lookup.grams_per_unit(item.name, item.unit)
