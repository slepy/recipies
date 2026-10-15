from django.test import TestCase

from recipe_sets.models import RecipeSet
from shopping_lists.models import ShoppingList
from tests.support import client_for, create_recipe, create_user


class RecipeSetCollectionApiTests(TestCase):
    def setUp(self):
        self.user = create_user()
        self.client = client_for(self.user)

    def create(self, **data):
        return self.client.post("/api/recipe-sets/", {"name": "Weekend", **data}, format="json")

    def test_creates_a_set_with_its_own_list_for_the_current_user(self):
        response = self.create()

        self.assertEqual(response.status_code, 201)
        recipe_set = RecipeSet.objects.get(pk=response.data["id"])
        self.assertEqual(recipe_set.owner, self.user)
        self.assertEqual(recipe_set.shopping_list.owner, self.user)
        self.assertEqual(recipe_set.shopping_list.name, "Weekend")
        self.assertEqual(response.data["shopping_list"], recipe_set.shopping_list_id)
        self.assertEqual(response.data["recipes"], [])

    def test_names_need_not_be_unique(self):
        first, second = self.create(), self.create()

        self.assertEqual(second.status_code, 201)
        self.assertNotEqual(first.data["id"], second.data["id"])
        self.assertNotEqual(first.data["shopping_list"], second.data["shopping_list"])

    def test_blank_name_is_rejected_on_the_name_field(self):
        for name in ("", "   "):
            response = self.client.post("/api/recipe-sets/", {"name": name}, format="json")
            self.assertEqual(response.status_code, 400)
            self.assertEqual(response.data["name"], ["Podaj nazwę zestawu."])
        self.assertEqual(self.client.post("/api/recipe-sets/", {}, format="json").status_code, 400)
        self.assertEqual(RecipeSet.objects.count(), 0)
        self.assertEqual(ShoppingList.objects.count(), 0)

    def test_name_is_trimmed(self):
        self.assertEqual(self.create(name="  Grill  ").data["name"], "Grill")

    def test_lists_own_sets_with_recipe_counts(self):
        recipe = create_recipe(self.user)
        self.create(name="Z przepisem", recipes=[recipe.pk])
        self.create(name="Pusty")

        response = self.client.get("/api/recipe-sets/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual({row["name"]: row["recipe_count"] for row in response.data}, {"Z przepisem": 1, "Pusty": 0})

    def test_creating_with_recipes_fills_the_list_without_new_badges(self):
        response = self.create(recipes=[create_recipe(self.user).pk])

        items = ShoppingList.objects.get(pk=response.data["shopping_list"]).items.all()
        self.assertEqual(sorted(item.name for item in items), ["jajka", "makaron"])
        self.assertFalse(any(item.is_new for item in items))

    def test_an_empty_set_has_a_list_that_takes_custom_items(self):
        list_id = self.create().data["shopping_list"]

        response = self.client.post(f"/api/shopping-lists/{list_id}/items/", {"name": "chleb"}, format="json")

        self.assertEqual(response.status_code, 201)
        self.assertEqual(self.client.get(f"/api/shopping-lists/{list_id}/").data["items"][0]["name"], "chleb")
