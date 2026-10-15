from ingredients.normalization import parse_amount


class IngredientScaler:
    """Scales recipe ingredients linearly: factor = entry servings / recipe servings (missing = 1)."""

    def recipe_servings(self, recipe):
        return recipe.servings if recipe.servings and recipe.servings > 0 else 1

    def factor(self, recipe, servings):
        return servings / self.recipe_servings(recipe)

    def scale(self, recipe, servings):
        factor = self.factor(recipe, servings)
        scaled = []
        for ingredient in recipe.ingredients:
            amount = parse_amount(ingredient.get("amount"))
            metric_amount = ingredient.get("metric_amount")
            scaled.append(
                {
                    "name": ingredient.get("name", ""),
                    "amount": None if amount is None else amount * factor,
                    # Text that is not a number ("szczypta") cannot be scaled and is shown as written.
                    "amount_text": "" if amount is not None else str(ingredient.get("amount") or ""),
                    "unit": ingredient.get("unit", ""),
                    "metric_amount": None if metric_amount is None else metric_amount * factor,
                    "metric_unit": ingredient.get("metric_unit", ""),
                }
            )
        return scaled
