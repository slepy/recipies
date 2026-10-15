from unittest import mock

from django.test import TestCase

from ingredients.models import IngredientUnitWeight
from recipes.models import Recipe
from tests.support import client_for, create_user


class RecipeUnitWeightLearningTests(TestCase):
    def setUp(self):
        self.user = create_user()
        self.client = client_for(self.user)

    def save_recipe(self, ingredients):
        return self.client.post("/api/recipes/", {"title": "Sałatka", "ingredients": ingredients}, format="json")

    def test_saving_a_recipe_teaches_the_knowledge_base(self):
        response = self.save_recipe(
            [
                {"name": "pomidorki koktajlowe", "amount": "12", "unit": "szt.", "metric_amount": 240, "metric_unit": "g"},
                {"name": "oliwa", "amount": "2", "unit": "łyżki", "metric_amount": 20, "metric_unit": "ml"},
            ]
        )

        self.assertEqual(response.status_code, 201)
        entry = IngredientUnitWeight.objects.get()
        self.assertEqual((entry.owner, entry.name, entry.unit, entry.grams_per_unit), (self.user, "pomidorki koktajlowe", "szt.", 20))

    def test_a_learning_failure_never_stops_the_recipe_from_saving(self):
        with mock.patch.object(IngredientUnitWeight.objects, "bulk_create", side_effect=RuntimeError("boom")):
            with self.assertLogs("ingredients.services.unit_weight_learner", "WARNING"):
                response = self.save_recipe(
                    [{"name": "jajko", "amount": "2", "unit": "szt", "metric_amount": 120, "metric_unit": "g"}]
                )

        self.assertEqual(response.status_code, 201)
        self.assertTrue(Recipe.objects.filter(pk=response.data["id"]).exists())
        self.assertFalse(IngredientUnitWeight.objects.exists())
