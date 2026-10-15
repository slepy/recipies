import json
import os
import tempfile
from io import BytesIO
from unittest.mock import patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from PIL import Image
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import User
from recipes.models import Recipe


class RecipeDetailApiTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user("cook@example.com", "a-long-unique-password-48")
        self.client = APIClient()
        self.authenticate(self.client, self.user)
        self.recipe = Recipe.objects.create(
            owner=self.user,
            title="Zupa pomidorowa",
            servings=2,
            ingredients=[{"name": "pomidory", "amount": "500", "unit": "g", "metric_amount": 500, "metric_unit": "g"}],
            steps=["Ugotuj"],
        )
        self.url = f"/api/recipes/{self.recipe.pk}/"

    def authenticate(self, client, user):
        access_token = str(RefreshToken.for_user(user).access_token)
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")

    def other_client(self):
        other_user = User.objects.create_user("other@example.com", "another-long-password-48")
        client = APIClient()
        self.authenticate(client, other_user)
        return client

    def png_upload(self, filename="dish.png", color="tomato"):
        image = Image.new("RGB", (4, 4), color=color)
        image_data = BytesIO()
        image.save(image_data, format="PNG")
        return SimpleUploadedFile(filename, image_data.getvalue(), content_type="image/png")

    def recipe_with_photo(self):
        response = self.client.patch(
            self.url,
            {"recipe": json.dumps({}), "photo": self.png_upload()},
            format="multipart",
        )
        self.assertEqual(response.status_code, 200)
        self.recipe.refresh_from_db()
        return self.recipe.photo.path

    def test_returns_the_owners_recipe(self):
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["id"], self.recipe.pk)
        self.assertEqual(response.data["title"], "Zupa pomidorowa")
        self.assertEqual(response.data["ingredients"][0]["name"], "pomidory")
        self.assertIsNone(response.data["photo_url"])

    def test_requires_authentication(self):
        self.client.credentials()

        self.assertEqual(self.client.get(self.url).status_code, 401)
        self.assertEqual(self.client.patch(self.url, {"title": "X"}, format="json").status_code, 401)

    def test_hides_other_users_and_missing_recipes(self):
        other_client = self.other_client()

        self.assertEqual(other_client.get(self.url).status_code, 404)
        self.assertEqual(other_client.patch(self.url, {"title": "Cudza"}, format="json").status_code, 404)
        self.assertEqual(self.client.get("/api/recipes/999999/").status_code, 404)
        self.recipe.refresh_from_db()
        self.assertEqual(self.recipe.title, "Zupa pomidorowa")

    def test_updates_fields_and_replaces_lists(self):
        response = self.client.patch(
            self.url,
            {
                "title": "Krem pomidorowy",
                "servings": 4,
                "ingredients": [{"name": "passata", "amount": "1", "unit": "l", "metric_amount": 1, "metric_unit": "l"}],
                "steps": ["Podgrzej", "Zmiksuj"],
            },
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["title"], "Krem pomidorowy")
        self.recipe.refresh_from_db()
        self.assertEqual(self.recipe.servings, 4)
        self.assertEqual([ingredient["name"] for ingredient in self.recipe.ingredients], ["passata"])
        self.assertEqual(self.recipe.steps, ["Podgrzej", "Zmiksuj"])

    def test_keeps_fields_left_out_of_the_request(self):
        response = self.client.patch(self.url, {"description": "Z bazylią"}, format="json")

        self.assertEqual(response.status_code, 200)
        self.recipe.refresh_from_db()
        self.assertEqual(self.recipe.title, "Zupa pomidorowa")
        self.assertEqual(self.recipe.description, "Z bazylią")

    def test_rejects_invalid_changes_without_saving_them(self):
        for changes in (
            {"title": ""},
            {"title": "Nowy", "ingredients": [{"name": "sól", "metric_amount": 1}]},
        ):
            response = self.client.patch(self.url, changes, format="json")

            self.assertEqual(response.status_code, 400)
        self.recipe.refresh_from_db()
        self.assertEqual(self.recipe.title, "Zupa pomidorowa")
        self.assertEqual(self.recipe.ingredients[0]["name"], "pomidory")

    def test_rejects_a_json_body_that_is_not_an_object(self):
        for body in ("null", '"Zupa"', "[1, 2]"):
            response = self.client.patch(self.url, body, content_type="application/json")

            self.assertEqual(response.status_code, 400)
            self.assertIn("recipe", response.data)

    def test_client_cannot_change_recipe_owner(self):
        other_user = User.objects.create_user("other@example.com", "another-long-password-48")

        response = self.client.patch(self.url, {"owner": other_user.pk, "title": "Nadal moja"}, format="json")

        self.assertEqual(response.status_code, 200)
        self.recipe.refresh_from_db()
        self.assertEqual(self.recipe.owner, self.user)

    def test_learns_unit_weights_from_the_saved_ingredients(self):
        with patch("recipes.views.recipe_detail.UnitWeightLearner") as learner:
            self.client.patch(self.url, {"title": "Zupa"}, format="json")

        learner.return_value.learn.assert_called_once_with(self.user, self.recipe.ingredients)

    def test_keeps_the_photo_when_no_photo_change_is_sent(self):
        with tempfile.TemporaryDirectory() as media_root, override_settings(MEDIA_ROOT=media_root):
            photo_path = self.recipe_with_photo()

            response = self.client.patch(self.url, {"title": "Zupa"}, format="json")

            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.data["photo_url"], f"/api/recipes/{self.recipe.pk}/photo/")
            self.assertTrue(os.path.exists(photo_path))

    def test_replaces_the_photo_and_deletes_the_old_file(self):
        with tempfile.TemporaryDirectory() as media_root, override_settings(MEDIA_ROOT=media_root):
            old_photo_path = self.recipe_with_photo()

            response = self.client.patch(
                self.url,
                {"recipe": json.dumps({"title": "Zupa"}), "photo": self.png_upload("new.png", "green")},
                format="multipart",
            )

            self.assertEqual(response.status_code, 200)
            self.recipe.refresh_from_db()
            self.assertTrue(os.path.exists(self.recipe.photo.path))
            self.assertNotEqual(self.recipe.photo.path, old_photo_path)
            self.assertFalse(os.path.exists(old_photo_path))

    def test_removes_the_photo_and_its_file(self):
        with tempfile.TemporaryDirectory() as media_root, override_settings(MEDIA_ROOT=media_root):
            photo_path = self.recipe_with_photo()

            response = self.client.patch(self.url, {"remove_photo": True}, format="json")

            self.assertEqual(response.status_code, 200)
            self.assertIsNone(response.data["photo_url"])
            self.recipe.refresh_from_db()
            self.assertFalse(self.recipe.photo)
            self.assertFalse(os.path.exists(photo_path))

    def test_rejects_a_new_photo_together_with_removal(self):
        with tempfile.TemporaryDirectory() as media_root, override_settings(MEDIA_ROOT=media_root):
            photo_path = self.recipe_with_photo()

            response = self.client.patch(
                self.url,
                {"recipe": json.dumps({"remove_photo": True}), "photo": self.png_upload("new.png")},
                format="multipart",
            )

            self.assertEqual(response.status_code, 400)
            self.assertTrue(os.path.exists(photo_path))

    def test_failed_photo_replacement_keeps_the_old_file(self):
        with tempfile.TemporaryDirectory() as media_root, override_settings(MEDIA_ROOT=media_root):
            photo_path = self.recipe_with_photo()
            not_an_image = SimpleUploadedFile("dish.png", b"not an image", content_type="image/png")

            response = self.client.patch(
                self.url,
                {"recipe": json.dumps({"title": "Zupa"}), "photo": not_an_image},
                format="multipart",
            )

            self.assertEqual(response.status_code, 400)
            self.recipe.refresh_from_db()
            self.assertEqual(self.recipe.photo.path, photo_path)
            self.assertTrue(os.path.exists(photo_path))
