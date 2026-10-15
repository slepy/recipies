from django.test import TestCase

from shopping_lists.models import ShoppingListItem
from tests.support import add_entry, client_for, create_plan, create_recipe, create_user


class ShoppingListItemApiTests(TestCase):
    def setUp(self):
        self.user = create_user()
        self.client = client_for(self.user)
        plan_id, meals = create_plan(self.client)
        add_entry(self.client, plan_id, meals[0], create_recipe(self.user))
        self.list = self.client.post("/api/shopping-lists/", {"plan": plan_id, "name": "Zakupy"}, format="json").data
        self.items_url = f"/api/shopping-lists/{self.list['id']}/items/"
        self.recipe_item = next(item for item in self.list["items"] if item["name"] == "makaron")

    def add_custom(self, **data):
        return self.client.post(self.items_url, {"name": "mleko", "amount": "2", "unit": "szt", **data}, format="json")

    def test_adds_a_custom_item_and_never_merges_it_with_a_recipe_item(self):
        response = self.add_custom(name=self.recipe_item["name"])

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["origin"], "custom")
        names = list(ShoppingListItem.objects.filter(name=self.recipe_item["name"]).values_list("origin", flat=True))
        self.assertCountEqual(names, ["recipe", "custom"])

    def test_custom_item_needs_a_name_and_allows_empty_quantity(self):
        self.assertIn("name", self.add_custom(name="  ").data)
        self.assertEqual(self.add_custom(amount="", unit="").status_code, 201)

    def test_custom_item_takes_the_same_fields_as_a_recipe_ingredient(self):
        response = self.add_custom(name="śmietana", amount="1/2", unit="kubek", metric_amount=125, metric_unit="ml")

        self.assertEqual(response.status_code, 201)
        self.assertEqual(
            (response.data["amount_text"], response.data["amount"], response.data["unit"]),
            ("1/2", 0.5, "kubek"),
        )
        self.assertEqual((response.data["metric_amount"], response.data["metric_unit"]), (125, "ml"))

    def test_custom_item_needs_metric_amount_and_unit_together_and_a_known_unit(self):
        self.assertEqual(self.add_custom(metric_amount=100).status_code, 400)
        self.assertEqual(self.add_custom(metric_amount=100, metric_unit="oz").status_code, 400)
        self.assertEqual(self.add_custom(amount="szczypta").data["amount"], None)

    def test_marks_items_bought_and_restores_them(self):
        url = f"{self.items_url}{self.recipe_item['id']}/"

        bought = self.client.patch(url, {"bought": True}, format="json")
        restored = self.client.patch(url, {"bought": False}, format="json")

        self.assertTrue(bought.data["bought"])
        self.assertEqual(bought.data["bought_amount"], self.recipe_item["amount"])
        self.assertFalse(restored.data["bought"])
        self.assertIsNone(restored.data["bought_amount"])

    def test_bought_state_is_saved(self):
        self.client.patch(f"{self.items_url}{self.recipe_item['id']}/", {"bought": True}, format="json")

        detail = self.client.get(f"/api/shopping-lists/{self.list['id']}/").data

        self.assertTrue(next(item for item in detail["items"] if item["id"] == self.recipe_item["id"])["bought"])

    def test_increases_a_recipe_item_in_both_measures_and_takes_it_back(self):
        url = f"{self.items_url}{self.recipe_item['id']}/"

        increased = self.client.patch(url, {"increase_amount": 100, "increase_metric_amount": 900}, format="json")
        restored = self.client.patch(url, {"reset_increase": True}, format="json")

        self.assertEqual((increased.data["amount"], increased.data["unit"]), (300, "g"))
        self.assertEqual((increased.data["metric_amount"], increased.data["metric_unit"]), (1.1, "kg"))
        self.assertEqual((restored.data["amount"], restored.data["metric_amount"], restored.data["metric_unit"]), (200, 200, "g"))
        self.assertEqual((restored.data["extra_amount"], restored.data["extra_metric"]), (0, 0))

    def test_cannot_increase_a_measure_the_item_does_not_have(self):
        eggs = next(item for item in self.list["items"] if item["name"] == "jajka")
        url = f"{self.items_url}{eggs['id']}/"

        self.assertEqual(self.client.patch(url, {"increase_metric_amount": 5}, format="json").status_code, 400)
        self.assertEqual(self.client.patch(url, {"increase_amount": 0}, format="json").status_code, 400)
        self.assertEqual(self.client.patch(url, {"increase_amount": 2}, format="json").data["amount"], 4)

    def test_increase_after_buying_leaves_the_bought_snapshot_for_the_difference(self):
        url = f"{self.items_url}{self.recipe_item['id']}/"
        self.client.patch(url, {"bought": True}, format="json")

        response = self.client.patch(url, {"increase_amount": 100}, format="json")

        self.assertTrue(response.data["bought"])
        self.assertEqual((response.data["amount"], response.data["bought_amount"]), (300, 200))
        self.assertEqual(response.data["bought_metric_base"], 200)

    def test_custom_items_do_not_use_the_increase_action(self):
        item_id = self.add_custom().data["id"]

        response = self.client.patch(f"{self.items_url}{item_id}/", {"increase_amount": 1}, format="json")

        self.assertEqual(response.status_code, 400)

    def test_recipe_items_cannot_be_edited_or_deleted(self):
        url = f"{self.items_url}{self.recipe_item['id']}/"

        self.assertEqual(self.client.patch(url, {"name": "inne"}, format="json").status_code, 400)
        self.assertEqual(self.client.patch(url, {"amount": "9"}, format="json").status_code, 400)
        self.assertEqual(self.client.delete(url).status_code, 400)
        self.assertTrue(ShoppingListItem.objects.filter(pk=self.recipe_item["id"]).exists())

    def test_edits_and_deletes_custom_items(self):
        item_id = self.add_custom().data["id"]
        url = f"{self.items_url}{item_id}/"

        edited = self.client.patch(url, {"name": "mleko 3,2%", "amount": "1"}, format="json")

        self.assertEqual((edited.data["name"], edited.data["amount"]), ("mleko 3,2%", 1))
        self.assertEqual(self.client.delete(url).status_code, 204)

    def test_other_users_items_are_not_found(self):
        intruder = client_for(create_user("intruder@example.com"))
        url = f"{self.items_url}{self.recipe_item['id']}/"

        self.assertEqual(intruder.post(self.items_url, {"name": "x"}, format="json").status_code, 404)
        self.assertEqual(intruder.patch(url, {"bought": True}, format="json").status_code, 404)
        self.assertEqual(intruder.delete(url).status_code, 404)
