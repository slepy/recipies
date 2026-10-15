from rest_framework import serializers

from meal_plans.models import Meal
from meal_plans.serializers.meal_entry import MealEntrySerializer


class MealSerializer(serializers.ModelSerializer):
    entries = MealEntrySerializer(many=True, read_only=True)

    class Meta:
        model = Meal
        fields = ("id", "date", "position", "name", "is_default", "entries")
        read_only_fields = ("id", "date", "position", "is_default", "entries")

    def validate_name(self, name):
        name = name.strip()
        if not name:
            raise serializers.ValidationError("Podaj nazwę posiłku.")
        return name
