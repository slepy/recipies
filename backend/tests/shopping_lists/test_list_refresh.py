from unittest import mock

from django.test import TestCase

from meal_plans.models import MealEntry
from shopping_lists.models import ShoppingListItem
from shopping_lists.services import ShoppingListRefresher
from tests.support import add_entry, client_for, create_plan, create_recipe, create_user


class ShoppingListRefreshApiTests(TestCase):
    def setUp(self):
        self.user = create_user()
        self.client = client_for(self.user)
        self.recipe = create_recipe(self.user, servings=2)
        self.plan_id, self.meals = create_plan(self.client)
        self.entry = add_entry(self.client, self.plan_id, self.meals[0], self.recipe, servings=2)
        self.list = self.client.post("/api/shopping-lists/", {"plan": self.plan_id, "name": "Zakupy"}, format="json").data
        self.url = f"/api/shopping-lists/{self.list['id']}/"

    def item(self, name):
        return next(item for item in self.client.get(self.url).data["items"] if item["name"] == name)

    def set_bought(self, name):
        self.client.patch(f"{self.url}items/{self.item(name)['id']}/", {"bought": True}, format="json")

    def test_list_is_a_snapshot_until_refreshed(self):
        add_entry(self.client, self.plan_id, self.meals[1], self.recipe, servings=2)

        detail = self.client.get(self.url).data

        self.assertTrue(detail["is_stale"])
        self.assertEqual(self.item("makaron")["amount"], 200)

    def test_preview_summarizes_changes_without_saving_them(self):
        add_entry(self.client, self.plan_id, self.meals[1], self.recipe, servings=2)
        self.client.post(f"{self.url}items/", {"name": "mleko"}, format="json")

        preview = self.client.get(f"{self.url}refresh/").data

        self.assertCountEqual(preview["changed"], ["makaron", "jajka"])
        self.assertEqual((preview["added"], preview["removed"], preview["custom_kept"]), ([], [], 1))
        self.assertEqual(self.item("makaron")["amount"], 200)

    def test_refresh_recalculates_recipe_items_and_marks_new_ones(self):
        soup = create_recipe(self.user, title="Zupa", ingredients=[
            {"name": "marchew", "amount": "3", "unit": "szt", "metric_amount": None, "metric_unit": ""}
        ])
        add_entry(self.client, self.plan_id, self.meals[1], self.recipe, servings=2)
        add_entry(self.client, self.plan_id, self.meals[2], soup)

        response = self.client.post(f"{self.url}refresh/")

        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data["is_stale"])
        self.assertEqual(self.item("makaron")["amount"], 400)
        self.assertTrue(self.item("marchew")["is_new"])
        self.assertFalse(self.item("makaron")["is_new"])

    def test_refresh_keeps_custom_items_and_bought_state(self):
        self.client.post(f"{self.url}items/", {"name": "mleko"}, format="json")
        self.set_bought("jajka")
        add_entry(self.client, self.plan_id, self.meals[1], self.recipe, servings=2)

        self.client.post(f"{self.url}refresh/")

        self.assertEqual(self.item("mleko")["origin"], "custom")
        jajka = self.item("jajka")
        self.assertTrue(jajka["bought"])
        self.assertEqual((jajka["amount"], jajka["bought_amount"]), (4, 2))

    def test_items_that_left_the_plan_disappear(self):
        self.client.delete(f"/api/meal-plans/{self.plan_id}/entries/{self.entry['id']}/")

        self.client.post(f"{self.url}refresh/")

        self.assertEqual(self.client.get(self.url).data["items"], [])

    def test_refresh_respects_the_remembered_scope(self):
        skipped = add_entry(self.client, self.plan_id, self.meals[1], self.recipe)
        scoped = self.client.post(
            "/api/shopping-lists/",
            {"plan": self.plan_id, "name": "Bez", "excluded_entry_ids": [skipped["id"]]},
            format="json",
        ).data

        refreshed = self.client.post(f"/api/shopping-lists/{scoped['id']}/refresh/").data

        self.assertFalse(scoped["is_stale"])
        self.assertEqual(next(i for i in refreshed["items"] if i["name"] == "makaron")["amount"], 200)

    def test_list_becomes_stale_after_a_recipe_change(self):
        self.recipe.ingredients = [{"name": "makaron", "amount": "300", "unit": "g", "metric_amount": 300, "metric_unit": "g"}]
        self.recipe.save()

        self.assertTrue(self.client.get(self.url).data["is_stale"])

    def test_failed_refresh_changes_nothing(self):
        add_entry(self.client, self.plan_id, self.meals[1], self.recipe, servings=2)
        with mock.patch.object(ShoppingListItem.objects, "bulk_create", side_effect=RuntimeError("boom")):
            with self.assertRaises(RuntimeError):
                ShoppingListRefresher().apply(ShoppingListItem.objects.first().shopping_list)

        self.assertEqual(self.item("makaron")["amount"], 200)
        self.assertEqual(MealEntry.objects.count(), 2)
