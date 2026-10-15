from datetime import date
from types import SimpleNamespace

from django.test import SimpleTestCase

from recipes.models import Recipe
from shopping_lists.services import IngredientAggregator


def entry(ingredients, servings=2, recipe_servings=2, title="Przepis", day=date(2026, 11, 2), meal="Obiad"):
    recipe = Recipe(title=title, servings=recipe_servings, ingredients=ingredients)
    return SimpleNamespace(recipe=recipe, servings=servings, meal=SimpleNamespace(date=day, name=meal))


def metric(name, amount, unit):
    return {"name": name, "amount": "", "unit": "", "metric_amount": amount, "metric_unit": unit}


def household(name, amount, unit=""):
    return {"name": name, "amount": amount, "unit": unit, "metric_amount": None, "metric_unit": ""}


class IngredientAggregatorTests(SimpleTestCase):
    def aggregate(self, *entries):
        return IngredientAggregator().aggregate(entries)

    def test_adds_litres_and_millilitres(self):
        items = self.aggregate(entry([metric("mleko", 0.5, "l")]), entry([metric("mleko", 250, "ml")]))

        self.assertEqual([(item["amount"], item["unit"]) for item in items], [(750, "ml")])

    def test_switches_to_the_larger_unit_from_one_thousand(self):
        items = self.aggregate(entry([metric("mąka", 700, "g")]), entry([metric("mąka", 0.8, "kg")]))

        self.assertEqual((items[0]["amount"], items[0]["unit"]), (1.5, "kg"))

    def test_scales_before_summing(self):
        items = self.aggregate(entry([metric("mąka", 200, "g")], servings=1), entry([metric("mąka", 200, "g")], servings=4))

        self.assertEqual(items[0]["amount"], 500)

    def test_example_from_the_specification(self):
        items = self.aggregate(entry([metric("mąka", 200, "g")], servings=2, recipe_servings=4))

        self.assertEqual(items[0]["amount"], 100)

    def test_household_amounts_add_only_within_the_same_unit(self):
        items = self.aggregate(
            entry([household("cukier", "1", "łyżka")]),
            entry([household("cukier", "2", "łyżka")]),
            entry([household("cukier", "1", "szklanka")]),
        )

        self.assertEqual(sorted((item["amount"], item["unit"]) for item in items), [(1, "szklanka"), (3, "łyżka")])
        self.assertTrue(all(item["partial"] for item in items))

    def test_mass_and_volume_are_not_converted(self):
        items = self.aggregate(entry([metric("mleko", 200, "ml")]), entry([metric("mleko", 200, "g")]))

        self.assertEqual(len(items), 2)

    def test_names_match_ignoring_case_and_extra_spaces(self):
        items = self.aggregate(entry([metric("Mąka", 100, "g")]), entry([metric(" mąka  ", 100, "g")]))

        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["amount"], 200)

    def test_ingredients_without_a_number_stay_without_quantity(self):
        items = self.aggregate(entry([household("sól", "do smaku")]), entry([household("sól", "")]))

        self.assertEqual(len(items), 1)
        self.assertIsNone(items[0]["amount"])

    def test_rounds_the_finished_sum_not_the_parts(self):
        items = self.aggregate(*[entry([household("jajko", "1", "szt")], servings=1, recipe_servings=3) for _ in range(3)])

        self.assertEqual(items[0]["amount"], 1)

    def test_records_where_each_item_comes_from(self):
        items = self.aggregate(entry([metric("mąka", 100, "g")], title="Naleśniki", meal="Śniadanie"))

        self.assertEqual(items[0]["sources"], [{"recipe": "Naleśniki", "date": "2026-11-02", "meal": "Śniadanie"}])
