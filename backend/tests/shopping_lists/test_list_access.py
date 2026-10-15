from django.test import TestCase
from rest_framework.test import APIClient

from meal_plans.models import MealPlan
from shopping_lists.models import ShoppingList, ShoppingListItem
from tests.support import add_entry, client_for, create_plan, create_recipe, create_user


class ShoppingListAccessApiTests(TestCase):
    def setUp(self):
        self.user = create_user()
        self.client = client_for(self.user)
        plan_id, meals = create_plan(self.client)
        add_entry(self.client, plan_id, meals[0], create_recipe(self.user))
        self.plan_id = plan_id
        self.list = self.client.post("/api/shopping-lists/", {"plan": plan_id, "name": "Zakupy"}, format="json").data
        self.url = f"/api/shopping-lists/{self.list['id']}/"

    def test_requires_authentication(self):
        anonymous = APIClient()

        for url in ("/api/shopping-lists/", self.url, f"{self.url}refresh/", f"{self.url}items/"):
            self.assertEqual(anonymous.get(url).status_code, 401, url)
        self.assertEqual(anonymous.post("/api/shopping-lists/", {}, format="json").status_code, 401)

    def test_other_users_list_is_not_found_or_listed(self):
        intruder = client_for(create_user("intruder@example.com"))

        self.assertEqual(intruder.get("/api/shopping-lists/").data, [])
        self.assertEqual(intruder.get(self.url).status_code, 404)
        self.assertEqual(intruder.get(f"{self.url}refresh/").status_code, 404)
        self.assertEqual(intruder.post(f"{self.url}refresh/").status_code, 404)
        self.assertEqual(intruder.delete(self.url).status_code, 404)
        self.assertEqual(ShoppingList.objects.count(), 1)

    def test_deleting_a_list_leaves_the_plan(self):
        self.assertEqual(self.client.delete(self.url).status_code, 204)

        self.assertEqual(ShoppingList.objects.count(), 0)
        self.assertEqual(ShoppingListItem.objects.count(), 0)
        self.assertEqual(MealPlan.objects.count(), 1)

    def test_deleting_a_plan_deletes_its_lists_and_items(self):
        self.assertEqual(self.client.delete(f"/api/meal-plans/{self.plan_id}/").status_code, 204)

        self.assertEqual(ShoppingList.objects.count(), 0)
        self.assertEqual(ShoppingListItem.objects.count(), 0)
