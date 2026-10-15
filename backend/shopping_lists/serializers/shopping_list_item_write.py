from rest_framework import serializers


class ShoppingListItemWriteSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=200, error_messages={"required": "Podaj nazwę pozycji.", "blank": "Podaj nazwę pozycji."})
    amount = serializers.FloatField(required=False, allow_null=True, min_value=0, max_value=1000000)
    unit = serializers.CharField(max_length=100, required=False, allow_blank=True)
    bought = serializers.BooleanField(required=False)

    def validate_name(self, name):
        name = name.strip()
        if not name:
            raise serializers.ValidationError("Podaj nazwę pozycji.")
        return name
