from rest_framework import serializers

from shopping_lists.models import ShoppingListItem


class ShoppingListItemSerializer(serializers.ModelSerializer):
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
            "partial",
            "bought",
            "bought_amount",
            "bought_metric_base",
            "extra_amount",
            "extra_metric",
            "is_new",
        )
        read_only_fields = fields
