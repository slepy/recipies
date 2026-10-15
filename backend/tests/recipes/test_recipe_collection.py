import json
import tempfile
from io import BytesIO

from django.test import TestCase, override_settings
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from PIL import Image

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

    def png_upload(self, filename="dish.png"):
        image = Image.new("RGB", (4, 4), color="tomato")
        image_data = BytesIO()
        image.save(image_data, format="PNG")
        return SimpleUploadedFile(filename, image_data.getvalue(), content_type="image/png")

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
                "ingredients": [{"name": "pomidory", "amount": "500", "unit": "g", "metric_amount": 500, "metric_unit": "g"}],
                "steps": ["Pokrój pomidory", "Gotuj do miękkości"],
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201)
        recipe = Recipe.objects.get()
        self.assertEqual(recipe.owner, self.user)
        self.assertEqual(response.data["ingredients"][0]["name"], "pomidory")
        self.assertEqual(response.data["ingredients"][0]["metric_amount"], 500)
        self.assertEqual(response.data["ingredients"][0]["metric_unit"], "g")
        self.assertEqual(response.data["steps"], ["Pokrój pomidory", "Gotuj do miękkości"])

    def test_rejects_a_metric_unit_that_cannot_be_summed(self):
        response = self.client.post(
            "/api/recipes/",
            {"title": "Zupa", "ingredients": [{"name": "sól", "metric_amount": 1, "metric_unit": "szczypta"}]},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(Recipe.objects.exists())

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

    def test_uploads_recipe_photo_and_only_owner_can_view_it(self):
        with tempfile.TemporaryDirectory() as media_root, override_settings(MEDIA_ROOT=media_root):
            response = self.client.post(
                "/api/recipes/",
                {
                    "recipe": json.dumps({"title": "Pomidory z pieca"}),
                    "photo": self.png_upload(),
                },
                format="multipart",
            )

            self.assertEqual(response.status_code, 201)
            recipe = Recipe.objects.get()
            self.assertEqual(recipe.owner, self.user)
            self.assertEqual(response.data["photo_url"], f"/api/recipes/{recipe.pk}/photo/")

            other_user = User.objects.create_user("other@example.com", "another-long-password-48")
            other_client = APIClient()
            other_token = str(RefreshToken.for_user(other_user).access_token)
            other_client.credentials(HTTP_AUTHORIZATION=f"Bearer {other_token}")
            self.assertEqual(other_client.get(response.data["photo_url"]).status_code, 404)

            photo_response = self.client.get(response.data["photo_url"])
            self.assertEqual(photo_response.status_code, 200)
            self.assertEqual(photo_response["Content-Type"], "image/png")
            self.assertEqual(photo_response["Cache-Control"], "private, no-store")

    def test_rejects_unsupported_recipe_photo_extension(self):
        with tempfile.TemporaryDirectory() as media_root, override_settings(MEDIA_ROOT=media_root):
            response = self.client.post(
                "/api/recipes/",
                {
                    "recipe": json.dumps({"title": "Pomidory z pieca"}),
                    "photo": self.png_upload("dish.gif"),
                },
                format="multipart",
            )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(Recipe.objects.exists())

    def test_saved_photo_has_no_exif_and_keeps_its_orientation(self):
        image = Image.new("RGB", (6, 2), color="tomato")
        exif = Image.Exif()
        exif[0x0112] = 6  # orientation: rotate 90 degrees on display
        exif[0x010F] = "SecretCamera"
        image_data = BytesIO()
        image.save(image_data, format="JPEG", exif=exif)
        upload = SimpleUploadedFile("dish.jpg", image_data.getvalue(), content_type="image/jpeg")

        with tempfile.TemporaryDirectory() as media_root, override_settings(MEDIA_ROOT=media_root):
            response = self.client.post(
                "/api/recipes/",
                {"recipe": json.dumps({"title": "Zdjęcie z EXIF"}), "photo": upload},
                format="multipart",
            )

            self.assertEqual(response.status_code, 201)
            with Image.open(Recipe.objects.get().photo.path) as saved:
                self.assertEqual(len(saved.getexif()), 0)
                self.assertEqual(saved.size, (2, 6))

    def test_rejects_file_that_is_not_an_image(self):
        upload = SimpleUploadedFile("dish.png", b"not an image", content_type="image/png")

        with tempfile.TemporaryDirectory() as media_root, override_settings(MEDIA_ROOT=media_root):
            response = self.client.post(
                "/api/recipes/",
                {"recipe": json.dumps({"title": "Fałszywe zdjęcie"}), "photo": upload},
                format="multipart",
            )

        self.assertEqual(response.status_code, 400)
        self.assertFalse(Recipe.objects.exists())
