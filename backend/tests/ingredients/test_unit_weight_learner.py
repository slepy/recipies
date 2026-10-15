from unittest import mock

from django.db import IntegrityError, transaction
from django.test import TestCase

from ingredients.models import IngredientUnitWeight
from ingredients.rules import MAX_ENTRIES_PER_USER
from ingredients.services import UnitWeightLearner
from tests.support import create_user


def ingredient(name, amount, unit, metric_amount, metric_unit="g"):
    return {"name": name, "amount": amount, "unit": unit, "metric_amount": metric_amount, "metric_unit": metric_unit}


class UnitWeightLearnerTests(TestCase):
    def setUp(self):
        self.user = create_user()

    def learned(self):
        return {(entry.name, entry.unit): (entry.grams_per_unit, entry.source) for entry in IngredientUnitWeight.objects.all()}

    def test_learns_grams_per_unit_from_amount_and_weight(self):
        UnitWeightLearner().learn(
            self.user,
            [
                ingredient("pomidorki koktajlowe", "12", "szt.", 240),
                ingredient("rukola", "2", "garście", 40),
                ingredient("awokado", "0,5", "", 70),
                ingredient("ser", "1/2", "kostki", 0.1, "kg"),
                ingredient("orzechy", "3", "łyżki", 25),
            ],
        )

        self.assertEqual(
            self.learned(),
            {
                ("pomidorki koktajlowe", "szt."): (20, "auto"),
                ("rukola", "garście"): (20, "auto"),
                ("awokado", ""): (140, "auto"),
                ("ser", "kostki"): (200, "auto"),
                ("orzechy", "łyżki"): (8.33, "auto"),
            },
        )

    def test_never_changes_an_existing_entry(self):
        IngredientUnitWeight.objects.create(owner=self.user, name="Rukola", unit="garść", grams_per_unit=25, source="manual")
        IngredientUnitWeight.objects.create(owner=self.user, name="szpinak", unit="garść", grams_per_unit=30, source="auto")

        UnitWeightLearner().learn(self.user, [ingredient("rukola", "1", "Garść.", 10), ingredient("Szpinak", "1", "garść", 10)])

        self.assertEqual(self.learned(), {("Rukola", "garść"): (25, "manual"), ("szpinak", "garść"): (30, "auto")})

    def test_the_first_ingredient_wins_when_a_product_repeats(self):
        UnitWeightLearner().learn(self.user, [ingredient("jajko", "2", "szt", 120), ingredient("Jajko", "1", "szt", 50)])

        self.assertEqual(self.learned(), {("jajko", "szt"): (60, "auto")})

    def test_skips_ingredients_that_cannot_give_a_weight(self):
        UnitWeightLearner().learn(
            self.user,
            [
                ingredient("sól", "do smaku", "", 5),
                ingredient("mąka", "2", "szklanki", None, ""),
                ingredient("mleko", "1", "szklanka", 250, "ml"),
                ingredient("woda", "1", "l", 1, "l"),
                ingredient("", "2", "szt", 100),
                ingredient("cukier", "0", "łyżki", 10),
                ingredient("pył", "1000", "szczypta", 1),
                ingredient("kamień", "1", "szt", 200, "kg"),
                ingredient("pieprz", "2", "szczypty", 0),
                {"name": "bez pól"},
            ],
        )

        self.assertEqual(IngredientUnitWeight.objects.count(), 0)

    def test_a_learning_failure_does_not_raise(self):
        with mock.patch.object(IngredientUnitWeight.objects, "bulk_create", side_effect=RuntimeError("boom")):
            with self.assertLogs("ingredients.services.unit_weight_learner", "WARNING"):
                UnitWeightLearner().learn(self.user, [ingredient("jajko", "2", "szt", 120)])

        self.assertEqual(IngredientUnitWeight.objects.count(), 0)

    def test_the_database_refuses_a_second_entry_with_the_same_key(self):
        IngredientUnitWeight.objects.create(owner=self.user, name="jajko", unit="szt", grams_per_unit=55, source="auto")

        with self.assertRaises(IntegrityError), transaction.atomic():
            IngredientUnitWeight.objects.create(owner=self.user, name="JAJKO", unit="szt.", grams_per_unit=60, source="auto")

    def test_learning_stops_at_the_entry_limit_without_an_error(self):
        IngredientUnitWeight.objects.bulk_create(
            IngredientUnitWeight(owner=self.user, name=f"p{index}", name_key=f"p{index}", grams_per_unit=1, source="auto")
            for index in range(MAX_ENTRIES_PER_USER - 1)
        )

        UnitWeightLearner().learn(self.user, [ingredient("jajko", "2", "szt", 120), ingredient("rukola", "1", "garść", 20)])

        self.assertEqual(IngredientUnitWeight.objects.count(), MAX_ENTRIES_PER_USER)
        self.assertTrue(IngredientUnitWeight.objects.filter(name_key="jajko").exists())
        self.assertFalse(IngredientUnitWeight.objects.filter(name_key="rukola").exists())

    def test_learns_only_for_the_given_owner(self):
        other_user = create_user("other@example.com")
        IngredientUnitWeight.objects.create(owner=other_user, name="jajko", unit="szt", grams_per_unit=55, source="auto")

        UnitWeightLearner().learn(self.user, [ingredient("jajko", "2", "szt", 120)])

        self.assertEqual(IngredientUnitWeight.objects.get(owner=self.user).grams_per_unit, 60)
