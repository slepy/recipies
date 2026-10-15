from rest_framework import serializers

from recipes.models import Recipe


class RecipeSetRecipeAddSerializer(serializers.Serializer):
    recipe = serializers.PrimaryKeyRelatedField(
        queryset=Recipe.objects.none(),
        error_messages={"does_not_exist": "Nie znaleziono przepisu.", "required": "Wybierz przepis."},
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["recipe"].queryset = Recipe.objects.filter(owner=self.context["request"].user)
