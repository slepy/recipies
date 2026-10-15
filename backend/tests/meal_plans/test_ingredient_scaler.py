from django.test import SimpleTestCase

from meal_plans.services import IngredientScaler, parse_amount
from recipes.models import Recipe


class IngredientScalerTests(SimpleTestCase):
    def recipe(self, servings, **ingredient):
        return Recipe(servings=servings, ingredients=[{"name": "mąka", "unit": "g", **ingredient}])

    def test_parses_plain_decimal_and_fraction_amounts(self):
        self.assertEqual(parse_amount("2"), 2)
        self.assertEqual(parse_amount("1,5"), 1.5)
        self.assertEqual(parse_amount("1/2"), 0.5)
        self.assertEqual(parse_amount("1 1/2"), 1.5)
        self.assertIsNone(parse_amount("2-3"))
        self.assertIsNone(parse_amount("do smaku"))
        self.assertIsNone(parse_amount(""))

    def test_halves_and_doubles_by_servings(self):
        recipe = self.recipe(2, amount="200", metric_amount=200, metric_unit="g")

        double = IngredientScaler().scale(recipe, 4)[0]
        half = IngredientScaler().scale(recipe, 1)[0]

        self.assertEqual((double["amount"], double["metric_amount"]), (400, 400))
        self.assertEqual((half["amount"], half["metric_amount"]), (100, 100))

    def test_missing_recipe_servings_count_as_one(self):
        self.assertEqual(IngredientScaler().scale(self.recipe(None, amount="100"), 3)[0]["amount"], 300)
        self.assertEqual(IngredientScaler().scale(self.recipe(0, amount="100"), 3)[0]["amount"], 300)

    def test_text_without_a_number_is_kept_unscaled(self):
        scaled = IngredientScaler().scale(self.recipe(2, amount="szczypta", unit=""), 6)[0]

        self.assertIsNone(scaled["amount"])
        self.assertEqual(scaled["amount_text"], "szczypta")
