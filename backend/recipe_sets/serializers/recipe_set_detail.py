from rest_framework import serializers

from recipe_sets.serializers.recipe_set import RecipeSetSerializer


class RecipeSetDetailSerializer(RecipeSetSerializer):
    recipes = serializers.SerializerMethodField()

    class Meta(RecipeSetSerializer.Meta):
        fields = RecipeSetSerializer.Meta.fields + ("recipes",)
        read_only_fields = fields

    def get_recipes(self, recipe_set):
        return [{"id": recipe.pk, "title": recipe.title} for recipe in recipe_set.recipes.order_by("title", "pk")]
