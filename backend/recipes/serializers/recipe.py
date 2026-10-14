from rest_framework import serializers

from recipes.models import Recipe


class IngredientSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=200, required=False, allow_blank=True)
    amount = serializers.CharField(max_length=100, required=False, allow_blank=True)
    unit = serializers.CharField(max_length=100, required=False, allow_blank=True)


class RecipeSerializer(serializers.ModelSerializer):
    ingredients = IngredientSerializer(many=True, required=False)
    steps = serializers.ListField(
        child=serializers.CharField(max_length=2000, allow_blank=True),
        required=False,
    )

    class Meta:
        model = Recipe
        fields = (
            "id",
            "title",
            "description",
            "servings",
            "prep_time_minutes",
            "cook_time_minutes",
            "ingredients",
            "steps",
            "created_at",
        )
        read_only_fields = ("id", "created_at")