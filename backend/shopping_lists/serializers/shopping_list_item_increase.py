from rest_framework import serializers


class ShoppingListItemIncreaseSerializer(serializers.Serializer):
    """Raise the amount of a recipe item by hand; the metric increase is in the item's own metric unit."""

    increase_amount = serializers.FloatField(required=False, min_value=0.01, max_value=1000000)
    increase_metric_amount = serializers.FloatField(required=False, min_value=0.01, max_value=1000000)
    reset_increase = serializers.BooleanField(required=False)
