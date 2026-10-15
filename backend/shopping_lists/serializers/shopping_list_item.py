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
            "partial",
            "sources",
            "bought",
            "bought_amount",
            "is_new",
        )
        read_only_fields = fields
