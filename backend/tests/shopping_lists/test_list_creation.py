from django.test import TestCase

from shopping_lists.models import ShoppingList, ShoppingListItem
from tests.support import add_entry, client_for, create_plan, create_recipe, create_user


class ShoppingListCreationApiTests(TestCase):
    def setUp(self):
        self.user = create_user()
        self.client = client_for(self.user)
        self.recipe = create_recipe(self.user, servings=2)
        self.plan_id, self.meals = create_plan(self.client)
        self.first_day = [meal for meal in self.meals if meal.date.isoformat() == "2026-11-02"]
        self.second_day = [meal for meal in self.meals if meal.date.isoformat() == "2026-11-03"]

    def create_list(self, **overrides):
        data = {"plan": self.plan_id, "name": "Zakupy", **overrides}
        return self.client.post("/api/shopping-lists/", data, format="json")

    def test_sums_scaled_ingredients_of_the_whole_plan_by_default(self):
        add_entry(self.client, self.plan_id, self.first_day[0], self.recipe, servings=4)
        add_entry(self.client, self.plan_id, self.second_day[0], self.recipe, servings=2)

        response = self.create_list()

        self.assertEqual(response.status_code, 201)
        items = {item["name"]: item for item in response.data["items"]}
        self.assertEqual((items["makaron"]["amount"], items["makaron"]["unit"]), (600, "g"))
        self.assertEqual(items["makaron"]["origin"], "recipe")
        self.assertEqual(len(items["makaron"]["sources"]), 2)
        self.assertFalse(response.data["is_stale"])

    def test_limits_the_list_to_the_chosen_dates(self):
        add_entry(self.client, self.plan_id, self.first_day[0], self.recipe)
        add_entry(self.client, self.plan_id, self.second_day[0], self.recipe)

        response = self.create_list(start_date="2026-11-03", end_date="2026-11-03")

        makaron = next(item for item in response.data["items"] if item["name"] == "makaron")
        self.assertEqual(makaron["amount"], 200)

    def test_skips_unchecked_entries(self):
        kept = add_entry(self.client, self.plan_id, self.first_day[0], self.recipe)
        skipped = add_entry(self.client, self.plan_id, self.second_day[0], create_recipe(self.user, title="Zupa", ingredients=[
            {"name": "marchew", "amount": "3", "unit": "szt", "metric_amount": None, "metric_unit": ""}
        ]))

        response = self.create_list(excluded_entry_ids=[skipped["id"]])

        self.assertNotIn("marchew", [item["name"] for item in response.data["items"]])
        self.assertIn("makaron", [item["name"] for item in response.data["items"]])
        self.assertEqual(response.data["excluded_entry_ids"], [skipped["id"]])
        self.assertIsNotNone(kept)

    def test_refuses_a_list_without_any_selected_entry(self):
        response = self.create_list()

        self.assertEqual(response.status_code, 400)
        self.assertEqual(ShoppingList.objects.count(), 0)

    def test_one_plan_can_have_many_independent_lists(self):
        add_entry(self.client, self.plan_id, self.first_day[0], self.recipe)
        first = self.create_list(name="Sobota").data
        second = self.create_list(name="Środa").data
        self.client.patch(
            f"/api/shopping-lists/{first['id']}/items/{first['items'][0]['id']}/", {"bought": True}, format="json"
        )

        lists = self.client.get(f"/api/shopping-lists/?plan={self.plan_id}").data

        self.assertEqual(len(lists), 2)
        self.assertEqual(ShoppingListItem.objects.filter(shopping_list_id=second["id"], bought=True).count(), 0)

    def test_validates_name_plan_and_dates(self):
        add_entry(self.client, self.plan_id, self.first_day[0], self.recipe)

        self.assertIn("name", self.create_list(name=" ").data)
        self.assertIn("plan", self.create_list(plan=99999).data)
        self.assertIn("end_date", self.create_list(start_date="2026-11-04", end_date="2026-11-02").data)
        self.assertIn("start_date", self.create_list(start_date="2026-10-01").data)
        self.assertEqual(ShoppingList.objects.count(), 0)

    def test_another_users_plan_cannot_be_used(self):
        add_entry(self.client, self.plan_id, self.first_day[0], self.recipe)
        intruder = client_for(create_user("intruder@example.com"))

        response = intruder.post("/api/shopping-lists/", {"plan": self.plan_id, "name": "x"}, format="json")

        self.assertEqual(response.status_code, 400)
        self.assertEqual(ShoppingList.objects.count(), 0)
