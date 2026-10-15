from rest_framework import serializers

from recipe_sets.models import RecipeSet


class RecipeSetSerializer(serializers.ModelSerializer):
    recipe_count = serializers.SerializerMethodField()

    class Meta:
        model = RecipeSet
        fields = ("id", "name", "shopping_list", "recipe_count", "created_at", "updated_at")
        read_only_fields = fields

    def get_recipe_count(self, recipe_set):
        # The collection view annotates this to avoid one query per set.
        count = getattr(recipe_set, "recipe_count", None)
        return recipe_set.recipes.count() if count is None else count
