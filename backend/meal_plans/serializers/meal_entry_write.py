from rest_framework import serializers

from meal_plans.rules import MAX_SERVINGS, MIN_SERVINGS
from recipes.models import Recipe


class MealEntryWriteSerializer(serializers.Serializer):
    recipe = serializers.PrimaryKeyRelatedField(
        queryset=Recipe.objects.none(),
        error_messages={"does_not_exist": "Nie znaleziono przepisu.", "required": "Wybierz przepis."},
    )
    servings = serializers.IntegerField(
        required=False,
        min_value=MIN_SERVINGS,
        max_value=MAX_SERVINGS,
        error_messages={
            "min_value": f"Liczba porcji musi wynosić co najmniej {MIN_SERVINGS}.",
            "max_value": f"Liczba porcji może wynosić najwyżej {MAX_SERVINGS}.",
            "invalid": "Podaj liczbę porcji jako liczbę całkowitą.",
        },
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Only the owner's recipes can be chosen, so another user's recipe id is "not found".
        self.fields["recipe"].queryset = Recipe.objects.filter(owner=self.context["request"].user)

    @staticmethod
    def default_servings(recipe):
        if recipe.servings and recipe.servings > 0:
            return min(recipe.servings, MAX_SERVINGS)
        return 1
