from rest_framework import serializers

from shopping_lists.serializers.shopping_list import ShoppingListSerializer
from shopping_lists.serializers.shopping_list_item import ShoppingListItemSerializer
from shopping_lists.services import ShoppingListRefresher


class ShoppingListDetailSerializer(ShoppingListSerializer):
    items = ShoppingListItemSerializer(many=True, read_only=True)
    is_stale = serializers.SerializerMethodField()

    class Meta(ShoppingListSerializer.Meta):
        fields = ShoppingListSerializer.Meta.fields + ("excluded_entry_ids", "items", "is_stale")
        read_only_fields = fields

    def get_is_stale(self, shopping_list):
        return ShoppingListRefresher().is_stale(shopping_list)
