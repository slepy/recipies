from django.test import TestCase
from rest_framework.test import APIClient

from recipe_sets.models import RecipeSet
from recipes.models import Recipe
from shopping_lists.models import ShoppingList, ShoppingListItem
from tests.support import client_for, create_recipe, create_user


class RecipeSetAccessApiTests(TestCase):
    def setUp(self):
        self.user = create_user()
        self.client = client_for(self.user)
        self.recipe = create_recipe(self.user)
        self.recipe_set = self.client.post(
            "/api/recipe-sets/", {"name": "Tydzień", "recipes": [self.recipe.pk]}, format="json"
        ).data
        self.url = f"/api/recipe-sets/{self.recipe_set['id']}/"
        self.list_url = f"/api/shopping-lists/{self.recipe_set['shopping_list']}/"

    def test_requires_authentication(self):
        anonymous = APIClient()
        invalid = APIClient()
        invalid.credentials(HTTP_AUTHORIZATION="Bearer not-a-token")

        for client in (anonymous, invalid):
            self.assertEqual(client.get("/api/recipe-sets/").status_code, 401)
            self.assertEqual(client.post("/api/recipe-sets/", {"name": "X"}, format="json").status_code, 401)
            self.assertEqual(client.get(self.url).status_code, 401)
            self.assertEqual(client.patch(self.url, {"name": "X"}, format="json").status_code, 401)
            self.assertEqual(client.post(f"{self.url}recipes/", {"recipe": self.recipe.pk}, format="json").status_code, 401)
            self.assertEqual(client.delete(self.url).status_code, 401)
        self.assertEqual(RecipeSet.objects.get().name, "Tydzień")

    def test_another_user_cannot_see_or_change_the_set_or_its_list(self):
        intruder_user = create_user("intruder@example.com")
        intruder = client_for(intruder_user)
        own_recipe = create_recipe(intruder_user)

        self.assertEqual(intruder.get("/api/recipe-sets/").data, [])
        self.assertEqual(intruder.get(self.url).status_code, 404)
        self.assertEqual(intruder.patch(self.url, {"name": "Moje"}, format="json").status_code, 404)
        self.assertEqual(intruder.post(f"{self.url}recipes/", {"recipe": own_recipe.pk}, format="json").status_code, 404)
        self.assertEqual(intruder.delete(self.url).status_code, 404)
        self.assertEqual(intruder.get(self.list_url).status_code, 404)
        self.assertEqual(intruder.post(f"{self.list_url}items/", {"name": "x"}, format="json").status_code, 404)
        self.assertEqual(RecipeSet.objects.get().name, "Tydzień")

    def test_owner_from_the_request_body_is_ignored(self):
        other = create_user("other@example.com")

        response = self.client.post("/api/recipe-sets/", {"name": "Mój", "owner": other.pk}, format="json")

        self.assertEqual(RecipeSet.objects.get(pk=response.data["id"]).owner, self.user)

    def test_deleting_a_set_deletes_its_list_and_items_but_not_recipes(self):
        self.client.post(f"{self.list_url}items/", {"name": "chleb"}, format="json")

        self.assertEqual(self.client.delete(self.url).status_code, 204)

        self.assertEqual(RecipeSet.objects.count(), 0)
        self.assertEqual(ShoppingList.objects.count(), 0)
        self.assertEqual(ShoppingListItem.objects.count(), 0)
        self.assertEqual(Recipe.objects.count(), 1)
        self.assertEqual(self.client.get(self.url).status_code, 404)
        self.assertEqual(self.client.get("/api/recipe-sets/").data, [])
