from rest_framework import serializers

from shopping_lists.models import ShoppingList


class ShoppingListSerializer(serializers.ModelSerializer):
    item_count = serializers.SerializerMethodField()
    bought_count = serializers.SerializerMethodField()

    class Meta:
        model = ShoppingList
        fields = ("id", "name", "plan", "scope_start", "scope_end", "generated_at", "item_count", "bought_count")
        read_only_fields = fields

    def get_item_count(self, shopping_list):
        return shopping_list.items.count()

    def get_bought_count(self, shopping_list):
        return shopping_list.items.filter(bought=True).count()
