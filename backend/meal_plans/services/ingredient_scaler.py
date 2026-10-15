import re

_NUMBER = re.compile(r"^(?:(\d+)\s+)?(\d+)/(\d+)$|^\d+(?:[.,]\d+)?$")


def parse_amount(text):
    """Turn "2", "1,5", "1/2" or "1 1/2" into a float; return None for anything else ("do smaku", "2-3")."""
    value = str(text or "").strip()
    match = _NUMBER.match(value)
    if not match:
        return None
    if match.group(2) is None:
        return float(value.replace(",", "."))
    denominator = int(match.group(3))
    if denominator == 0:
        return None
    return int(match.group(1) or 0) + int(match.group(2)) / denominator


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
