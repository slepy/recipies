from rest_framework import serializers

from meal_plans.services import IngredientScaler


class MealEntrySerializer(serializers.Serializer):
    """Read-only entry with its recipe and the ingredients scaled to the chosen servings."""

    id = serializers.IntegerField()
    servings = serializers.IntegerField()
    recipe = serializers.SerializerMethodField()
    ingredients = serializers.SerializerMethodField()

    def get_recipe(self, entry):
        return {"id": entry.recipe_id, "title": entry.recipe.title, "servings": entry.recipe.servings}

    def get_ingredients(self, entry):
        scaled = IngredientScaler().scale(entry.recipe, entry.servings)
        for ingredient in scaled:
            for key in ("amount", "metric_amount"):
                if ingredient[key] is not None:
                    ingredient[key] = round(ingredient[key], 2)
        return scaled
