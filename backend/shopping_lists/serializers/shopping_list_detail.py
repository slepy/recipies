from rest_framework import serializers

from ingredients.services import UnitWeightLookup
from shopping_lists.serializers.shopping_list import ShoppingListSerializer
from shopping_lists.serializers.shopping_list_item import ShoppingListItemSerializer
from shopping_lists.services import ShoppingListRefresher


class ShoppingListDetailSerializer(ShoppingListSerializer):
    items = serializers.SerializerMethodField()
    is_stale = serializers.SerializerMethodField()

    class Meta(ShoppingListSerializer.Meta):
        fields = ShoppingListSerializer.Meta.fields + ("excluded_entry_ids", "items", "is_stale")
        read_only_fields = fields

    def get_items(self, shopping_list):
        items = list(shopping_list.items.all())
        lookup = UnitWeightLookup(shopping_list.owner_id, [item.name for item in items])
        return ShoppingListItemSerializer(items, many=True, context={"unit_weights": lookup}).data

    def get_is_stale(self, shopping_list):
        return ShoppingListRefresher().is_stale(shopping_list)
