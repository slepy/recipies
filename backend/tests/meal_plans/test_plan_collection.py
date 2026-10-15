from django.test import TestCase
from rest_framework.test import APIClient

from meal_plans.models import MealPlan
from tests.support import client_for, create_user


class PlanCollectionApiTests(TestCase):
    def setUp(self):
        self.user = create_user()
        self.client = client_for(self.user)

    def create_plan(self, **overrides):
        data = {"name": "Tydzień", "start_date": "2026-11-02", "end_date": "2026-11-08", **overrides}
        return self.client.post("/api/meal-plans/", data, format="json")

    def test_requires_authentication(self):
        anonymous = APIClient()

        self.assertEqual(anonymous.get("/api/meal-plans/").status_code, 401)
        self.assertEqual(anonymous.post("/api/meal-plans/", {}, format="json").status_code, 401)

    def test_creates_plan_with_three_default_meals_per_day(self):
        response = self.create_plan()

        self.assertEqual(response.status_code, 201)
        plan = MealPlan.objects.get()
        self.assertEqual(plan.owner, self.user)
        self.assertEqual(len(response.data["days"]), 7)
        self.assertEqual(
            [meal["name"] for meal in response.data["days"][0]["meals"]],
            ["Śniadanie", "Obiad", "Kolacja"],
        )
        self.assertEqual(plan.meals.count(), 21)

    def test_rejects_invalid_plan_fields_next_to_the_field(self):
        self.assertIn("name", self.create_plan(name="   ").data)
        self.assertIn("start_date", self.create_plan(start_date=None).data)
        self.assertIn("end_date", self.create_plan(end_date="2026-11-01").data)
        self.assertIn("end_date", self.create_plan(start_date="2026-01-01", end_date="2026-04-03").data)
        self.assertEqual(MealPlan.objects.count(), 0)

    def test_accepts_the_longest_allowed_period(self):
        self.assertEqual(self.create_plan(start_date="2026-01-01", end_date="2026-04-02").status_code, 201)

    def test_lists_only_own_plans_with_entry_counts(self):
        self.create_plan()
        other_user = create_user("other@example.com")
        MealPlan.objects.create(owner=other_user, name="Cudzy", start_date="2026-11-02", end_date="2026-11-02")

        response = self.client.get("/api/meal-plans/")

        self.assertEqual([plan["name"] for plan in response.data], ["Tydzień"])
        self.assertEqual(response.data[0]["entry_count"], 0)

    def test_other_users_plan_is_not_found(self):
        plan_id = self.create_plan().data["id"]
        intruder = client_for(create_user("intruder@example.com"))

        self.assertEqual(intruder.get(f"/api/meal-plans/{plan_id}/").status_code, 404)
        self.assertEqual(intruder.patch(f"/api/meal-plans/{plan_id}/", {"name": "x"}, format="json").status_code, 404)
        self.assertEqual(intruder.delete(f"/api/meal-plans/{plan_id}/").status_code, 404)
        self.assertEqual(MealPlan.objects.count(), 1)
