from rest_framework import serializers

from meal_plans.models import MealPlan


class ShoppingListCreateSerializer(serializers.Serializer):
    plan = serializers.PrimaryKeyRelatedField(
        queryset=MealPlan.objects.none(),
        error_messages={"does_not_exist": "Nie znaleziono planu.", "required": "Wybierz plan."},
    )
    name = serializers.CharField(max_length=200, error_messages={"required": "Podaj nazwę listy.", "blank": "Podaj nazwę listy."})
    start_date = serializers.DateField(required=False)
    end_date = serializers.DateField(required=False)
    excluded_entry_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1), required=False, max_length=5000
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Only the owner's plans can be chosen, so another user's plan id is "not found".
        self.fields["plan"].queryset = MealPlan.objects.filter(owner=self.context["request"].user)

    def validate_name(self, name):
        name = name.strip()
        if not name:
            raise serializers.ValidationError("Podaj nazwę listy.")
        return name

    def validate(self, list_data):
        plan = list_data["plan"]
        start_date = list_data.setdefault("start_date", plan.start_date)
        end_date = list_data.setdefault("end_date", plan.end_date)
        if end_date < start_date:
            raise serializers.ValidationError({"end_date": "Data końcowa nie może być wcześniejsza niż początkowa."})
        if start_date < plan.start_date or end_date > plan.end_date:
            raise serializers.ValidationError({"start_date": "Zakres musi mieścić się w okresie planu."})
        list_data.setdefault("excluded_entry_ids", [])
        return list_data
