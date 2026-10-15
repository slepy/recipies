from django.test import TestCase

from meal_plans.models import Meal, MealEntry, MealPlan
from tests.support import client_for, create_recipe, create_user


class PlanPeriodApiTests(TestCase):
    def setUp(self):
        self.user = create_user()
        self.client = client_for(self.user)
        self.plan_id = self.client.post(
            "/api/meal-plans/",
            {"name": "Tydzień", "start_date": "2026-11-02", "end_date": "2026-11-04"},
            format="json",
        ).data["id"]
        self.url = f"/api/meal-plans/{self.plan_id}/"

    def add_entry(self, date):
        meal = Meal.objects.filter(plan_id=self.plan_id, date=date).first()
        return MealEntry.objects.create(meal=meal, recipe=create_recipe(self.user), servings=2)

    def test_extending_the_period_adds_days_and_keeps_entries(self):
        self.add_entry("2026-11-02")

        response = self.client.patch(self.url, {"end_date": "2026-11-06"}, format="json")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["days"]), 5)
        self.assertEqual(MealEntry.objects.count(), 1)

    def test_shortening_with_entries_needs_confirmation(self):
        self.add_entry("2026-11-04")

        response = self.client.patch(self.url, {"end_date": "2026-11-03"}, format="json")

        self.assertEqual(response.status_code, 409)
        self.assertEqual(response.data["entry_count"], 1)
        self.assertEqual(MealPlan.objects.get().end_date.isoformat(), "2026-11-04")
        self.assertEqual(MealEntry.objects.count(), 1)

    def test_confirmed_shortening_removes_days_and_their_entries(self):
        self.add_entry("2026-11-04")

        response = self.client.patch(self.url, {"end_date": "2026-11-03", "confirm": True}, format="json")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["days"]), 2)
        self.assertEqual(MealEntry.objects.count(), 0)

    def test_shortening_empty_days_needs_no_confirmation(self):
        response = self.client.patch(self.url, {"end_date": "2026-11-03"}, format="json")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(Meal.objects.count(), 6)

    def test_renames_plan_without_touching_meals(self):
        response = self.client.patch(self.url, {"name": "Nowa nazwa"}, format="json")

        self.assertEqual(response.data["name"], "Nowa nazwa")
        self.assertEqual(Meal.objects.count(), 9)
