from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import User
from recipes.models import Recipe


class RecipeCollectionApiTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user("cook@example.com", "a-long-unique-password-48")
        self.client = APIClient()
        self.authenticate(self.user)

    def authenticate(self, user):
        access_token = str(RefreshToken.for_user(user).access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")

    def test_collection_requires_authentication(self):
        self.client.credentials()

        self.assertEqual(self.client.get("/api/recipes/").status_code, 401)
        self.assertEqual(
            self.client.post("/api/recipes/", {"title": "Soup"}, format="json").status_code,
            401,
        )

    def test_creates_recipe_with_optional_details_for_authenticated_owner(self):
        response = self.client.post(
            "/api/recipes/",
            {
                "title": "Zupa pomidorowa",
                "description": "Z ryżem",
                "servings": 4,
                "prep_time_minutes": 10,
                "cook_time_minutes": 30,
                "ingredients": [{"name": "pomidory", "amount": "500", "unit": "g"}],
                "steps": ["Pokrój pomidory", "Gotuj do miękkości"],
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        recipe = Recipe.objects.get()
        self.assertEqual(recipe.owner, self.user)
        self.assertEqual(response.data["ingredients"][0]["name"], "pomidory")
        self.assertEqual(response.data["steps"], ["Pokrój pomidory", "Gotuj do miękkości"])

    def test_title_is_required_but_other_fields_may_be_empty(self):
        empty_recipe = self.client.post("/api/recipes/", {"title": "  "}, format="json")
        self.assertEqual(empty_recipe.status_code, 400)
        self.assertFalse(Recipe.objects.exists())

        response = self.client.post("/api/recipes/", {"title": "Prosty przepis"}, format="json")

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["ingredients"], [])
        self.assertEqual(response.data["steps"], [])

    def test_collection_only_returns_current_users_recipes(self):
        own_recipe = Recipe.objects.create(owner=self.user, title="Moja zupa")
        other_user = User.objects.create_user("other@example.com", "another-long-password-48")
        Recipe.objects.create(owner=other_user, title="Cudzy przepis")

        response = self.client.get("/api/recipes/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual([recipe["id"] for recipe in response.data], [own_recipe.pk])
        self.assertEqual(response.data[0]["title"], "Moja zupa")

    def test_client_cannot_choose_recipe_owner(self):
        other_user = User.objects.create_user("other@example.com", "another-long-password-48")

        response = self.client.post(
            "/api/recipes/",
            {"title": "Własny przepis", "owner": other_user.pk},
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(Recipe.objects.get().owner, self.user)