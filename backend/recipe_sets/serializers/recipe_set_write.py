from rest_framework import serializers

from recipes.models import Recipe


class RecipeSetWriteSerializer(serializers.Serializer):
    """Name and recipes of a set. On an edit, a missing field keeps its saved value."""

    name = serializers.CharField(max_length=200, error_messages={"required": "Podaj nazwę zestawu.", "blank": "Podaj nazwę zestawu."})
    recipes = serializers.PrimaryKeyRelatedField(
        many=True,
        required=False,
        queryset=Recipe.objects.none(),
        error_messages={"does_not_exist": "Nie znaleziono przepisu."},
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Only the owner's recipes can be chosen, so another user's recipe id is "not found".
        self.fields["recipes"].child_relation.queryset = Recipe.objects.filter(owner=self.context["request"].user)

    def validate_name(self, name):
        name = name.strip()
        if not name:
            raise serializers.ValidationError("Podaj nazwę zestawu.")
        return name

    def validate_recipes(self, recipes):
        # Sending the same id twice still adds the recipe once.
        return list(dict.fromkeys(recipes))
