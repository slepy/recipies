from rest_framework import serializers

from recipes.serializers.recipe import IngredientSerializer


class ShoppingListItemWriteSerializer(IngredientSerializer):
    """A custom item has the same fields (and metric rule) as a recipe ingredient, plus the bought flag."""

    name = serializers.CharField(max_length=200, error_messages={"required": "Podaj nazwę pozycji.", "blank": "Podaj nazwę pozycji."})
    bought = serializers.BooleanField(required=False)

    def validate_name(self, name):
        name = name.strip()
        if not name:
            raise serializers.ValidationError("Podaj nazwę pozycji.")
        return name

    def validate(self, item_data):
        if self.instance is None:
            return super().validate(item_data)
        # An edit sends only the changed fields, so check the metric pair against the saved one.
        saved = {"metric_amount": self.instance.metric_amount, "metric_unit": self.instance.metric_unit}
        super().validate({**saved, **item_data})
        return item_data
