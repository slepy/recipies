from django.test import TestCase

from tests.support import client_for, create_recipe, create_user


class RecipeSetRecipesApiTests(TestCase):
    def setUp(self):
        self.user = create_user()
        self.client = client_for(self.user)
        self.soup = create_recipe(self.user, title="Zupa")
        self.salad = create_recipe(self.user, title="Sałatka")
        self.recipe_set = self.client.post("/api/recipe-sets/", {"name": "Tydzień"}, format="json").data
        self.url = f"/api/recipe-sets/{self.recipe_set['id']}/"

    def recipe_ids(self):
        return [recipe["id"] for recipe in self.client.get(self.url).data["recipes"]]

    def test_saving_the_recipes_is_kept_after_reopening(self):
        response = self.client.patch(self.url, {"recipes": [self.soup.pk, self.salad.pk]}, format="json")

        self.assertEqual(response.status_code, 200)
        self.assertCountEqual(self.recipe_ids(), [self.soup.pk, self.salad.pk])
        self.assertEqual([recipe["title"] for recipe in response.data["recipes"]], ["Sałatka", "Zupa"])

    def test_the_same_recipe_twice_is_saved_once(self):
        self.client.patch(self.url, {"recipes": [self.soup.pk, self.soup.pk]}, format="json")

        self.assertEqual(self.recipe_ids(), [self.soup.pk])

    def test_removing_a_recipe_and_renaming(self):
        self.client.patch(self.url, {"recipes": [self.soup.pk, self.salad.pk]}, format="json")

        response = self.client.patch(self.url, {"name": "Nowa nazwa", "recipes": [self.salad.pk]}, format="json")

        self.assertEqual(response.data["name"], "Nowa nazwa")
        self.assertEqual(self.recipe_ids(), [self.salad.pk])
        list_id = self.recipe_set["shopping_list"]
        self.assertEqual(self.client.get(f"/api/shopping-lists/{list_id}/").data["name"], "Nowa nazwa")

    def test_renaming_alone_keeps_the_recipes(self):
        self.client.patch(self.url, {"recipes": [self.soup.pk]}, format="json")

        self.client.patch(self.url, {"name": "Inna"}, format="json")

        self.assertEqual(self.recipe_ids(), [self.soup.pk])

    def test_blank_name_on_edit_is_rejected(self):
        response = self.client.patch(self.url, {"name": " "}, format="json")

        self.assertEqual(response.status_code, 400)
        self.assertIn("name", response.data)

    def test_adding_one_recipe_from_the_recipe_view_is_idempotent(self):
        add_url = f"{self.url}recipes/"

        first = self.client.post(add_url, {"recipe": self.soup.pk}, format="json")
        again = self.client.post(add_url, {"recipe": self.soup.pk}, format="json")

        self.assertEqual(first.status_code, 201)
        self.assertEqual(again.status_code, 200)
        self.assertEqual(self.recipe_ids(), [self.soup.pk])

    def test_both_ways_of_adding_lead_to_the_same_set(self):
        self.client.post(f"{self.url}recipes/", {"recipe": self.soup.pk}, format="json")
        self.client.patch(self.url, {"recipes": [self.soup.pk, self.salad.pk]}, format="json")

        self.assertCountEqual(self.recipe_ids(), [self.soup.pk, self.salad.pk])

    def test_another_users_recipe_cannot_be_added(self):
        foreign = create_recipe(create_user("other@example.com"), title="Cudzy")

        patched = self.client.patch(self.url, {"recipes": [foreign.pk]}, format="json")
        added = self.client.post(f"{self.url}recipes/", {"recipe": foreign.pk}, format="json")

        self.assertEqual(patched.status_code, 400)
        self.assertEqual(added.status_code, 400)
        self.assertEqual(self.recipe_ids(), [])
