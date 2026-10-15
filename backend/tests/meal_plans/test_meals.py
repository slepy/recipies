from django.test import TestCase

from meal_plans.models import Meal
from tests.support import client_for, create_recipe, create_user


class MealApiTests(TestCase):
    def setUp(self):
        self.user = create_user()
        self.client = client_for(self.user)
        self.plan_id = self.client.post(
            "/api/meal-plans/",
            {"name": "Tydzień", "start_date": "2026-11-02", "end_date": "2026-11-03"},
            format="json",
        ).data["id"]
        self.meals_url = f"/api/meal-plans/{self.plan_id}/meals/"

    def add_meal(self, date="2026-11-02"):
        return self.client.post(self.meals_url, {"date": date}, format="json")

    def test_plus_adds_a_meal_to_that_day_only_up_to_six(self):
        names = [self.add_meal().data["name"] for _ in range(3)]

        self.assertEqual(names, ["Drugie śniadanie", "Podwieczorek", "Przekąska"])
        self.assertEqual(Meal.objects.filter(date="2026-11-02").count(), 6)
        self.assertEqual(Meal.objects.filter(date="2026-11-03").count(), 3)
        self.assertEqual(self.add_meal().status_code, 400)

    def test_rejects_a_day_outside_the_plan(self):
        self.assertEqual(self.add_meal("2026-12-01").status_code, 400)
        self.assertEqual(self.client.post(self.meals_url, {}, format="json").status_code, 400)

    def test_renames_only_added_meals(self):
        extra = self.add_meal().data
        default = Meal.objects.filter(is_default=True).first()

        renamed = self.client.patch(f"{self.meals_url}{extra['id']}/", {"name": "Brunch"}, format="json")
        blank = self.client.patch(f"{self.meals_url}{extra['id']}/", {"name": " "}, format="json")
        on_default = self.client.patch(f"{self.meals_url}{default.pk}/", {"name": "x"}, format="json")

        self.assertEqual(renamed.data["name"], "Brunch")
        self.assertEqual(blank.status_code, 400)
        self.assertEqual(on_default.status_code, 400)

    def test_deletes_added_meal_but_not_default_ones(self):
        extra = self.add_meal().data
        default = Meal.objects.filter(is_default=True).first()

        self.assertEqual(self.client.delete(f"{self.meals_url}{extra['id']}/").status_code, 204)
        self.assertEqual(self.client.delete(f"{self.meals_url}{default.pk}/").status_code, 400)

    def test_deleting_a_meal_with_entries_needs_confirmation(self):
        extra = self.add_meal().data
        recipe = create_recipe(self.user)
        self.client.post(f"{self.meals_url}{extra['id']}/entries/", {"recipe": recipe.pk}, format="json")

        unconfirmed = self.client.delete(f"{self.meals_url}{extra['id']}/")
        confirmed = self.client.delete(f"{self.meals_url}{extra['id']}/?confirm=true")

        self.assertEqual(unconfirmed.status_code, 409)
        self.assertEqual(unconfirmed.data["entry_count"], 1)
        self.assertEqual(confirmed.status_code, 204)

    def test_other_users_meals_are_not_found(self):
        extra = self.add_meal().data
        intruder = client_for(create_user("intruder@example.com"))

        self.assertEqual(intruder.post(self.meals_url, {"date": "2026-11-02"}, format="json").status_code, 404)
        self.assertEqual(intruder.delete(f"{self.meals_url}{extra['id']}/").status_code, 404)
