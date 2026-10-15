from django.test import TestCase

from meal_plans.models import Meal, MealEntry
from tests.support import client_for, create_recipe, create_user


class MealEntryApiTests(TestCase):
    def setUp(self):
        self.user = create_user()
        self.client = client_for(self.user)
        self.plan_id = self.client.post(
            "/api/meal-plans/",
            {"name": "Dzień", "start_date": "2026-11-02", "end_date": "2026-11-02"},
            format="json",
        ).data["id"]
        self.meal = Meal.objects.filter(plan_id=self.plan_id).first()
        self.url = f"/api/meal-plans/{self.plan_id}/meals/{self.meal.pk}/entries/"

    def test_servings_default_to_the_recipe_servings(self):
        recipe = create_recipe(self.user, servings=4)

        response = self.client.post(self.url, {"recipe": recipe.pk}, format="json")

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["servings"], 4)

    def test_missing_recipe_servings_default_to_one(self):
        recipe = create_recipe(self.user, servings=None)

        self.assertEqual(self.client.post(self.url, {"recipe": recipe.pk}, format="json").data["servings"], 1)

    def test_the_same_recipe_can_be_used_in_many_meals(self):
        recipe = create_recipe(self.user)
        second_meal = self.client.post(
            f"/api/meal-plans/{self.plan_id}/meals/", {"date": "2026-11-02"}, format="json"
        ).data

        self.client.post(self.url, {"recipe": recipe.pk, "servings": 3}, format="json")
        self.client.post(f"{self.url[: self.url.index('meals/') + 6]}{second_meal['id']}/entries/", {"recipe": recipe.pk}, format="json")

        self.assertEqual(MealEntry.objects.filter(recipe=recipe).count(), 2)

    def test_rejects_servings_outside_one_to_ninety_nine(self):
        recipe = create_recipe(self.user)

        for servings in (0, 100, "x", 1.5):
            response = self.client.post(self.url, {"recipe": recipe.pk, "servings": servings}, format="json")
            self.assertEqual(response.status_code, 400, servings)
            self.assertIn("servings", response.data)

    def test_another_users_recipe_cannot_be_added(self):
        foreign = create_recipe(create_user("other@example.com"))

        response = self.client.post(self.url, {"recipe": foreign.pk}, format="json")

        self.assertEqual(response.status_code, 400)
        self.assertEqual(MealEntry.objects.count(), 0)

    def test_a_meal_holds_one_recipe(self):
        recipe = create_recipe(self.user)
        self.client.post(self.url, {"recipe": recipe.pk, "servings": 4}, format="json")

        response = self.client.post(self.url, {"recipe": recipe.pk}, format="json")

        self.assertEqual(response.status_code, 400)
        self.assertEqual(MealEntry.objects.filter(meal=self.meal).count(), 1)

    def test_plan_shows_ingredients_scaled_to_the_entry_servings(self):
        recipe = create_recipe(self.user, servings=2)
        self.client.post(self.url, {"recipe": recipe.pk, "servings": 4}, format="json")

        plan = self.client.get(f"/api/meal-plans/{self.plan_id}/").data
        entry = plan["days"][0]["meals"][0]["entries"][0]

        self.assertEqual(entry["recipe"]["title"], "Spaghetti")
        self.assertEqual(entry["ingredients"][0]["metric_amount"], 400)
        self.assertEqual(entry["ingredients"][1]["amount"], 4)

    def test_changes_servings_swaps_recipe_and_deletes(self):
        recipe = create_recipe(self.user, servings=2)
        other = create_recipe(self.user, title="Zupa", servings=2)
        entry_id = self.client.post(self.url, {"recipe": recipe.pk}, format="json").data["id"]
        entry_url = f"/api/meal-plans/{self.plan_id}/entries/{entry_id}/"

        changed = self.client.patch(entry_url, {"servings": 6, "recipe": other.pk}, format="json")

        self.assertEqual(changed.data["servings"], 6)
        self.assertEqual(changed.data["recipe"]["title"], "Zupa")
        self.assertEqual(self.client.delete(entry_url).status_code, 204)
        self.assertEqual(MealEntry.objects.count(), 0)

    def test_other_users_entries_are_not_found(self):
        recipe = create_recipe(self.user)
        entry_id = self.client.post(self.url, {"recipe": recipe.pk}, format="json").data["id"]
        intruder = client_for(create_user("intruder@example.com"))

        self.assertEqual(intruder.post(self.url, {"recipe": recipe.pk}, format="json").status_code, 404)
        self.assertEqual(intruder.delete(f"/api/meal-plans/{self.plan_id}/entries/{entry_id}/").status_code, 404)

    def test_plan_with_many_entries_uses_a_fixed_number_of_queries(self):
        recipe = create_recipe(self.user)
        for _ in range(3):
            MealEntry.objects.bulk_create([MealEntry(meal=meal, recipe=recipe, servings=2) for meal in Meal.objects.all()])
        with self.assertNumQueries(6):
            self.client.get(f"/api/meal-plans/{self.plan_id}/")
        for _ in range(5):
            MealEntry.objects.bulk_create([MealEntry(meal=meal, recipe=recipe, servings=2) for meal in Meal.objects.all()])
        with self.assertNumQueries(6):
            self.client.get(f"/api/meal-plans/{self.plan_id}/")
