from django.db import connection
from django.test import TestCase
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APIClient

from ingredients.models import IngredientUnitWeight
from ingredients.rules import MAX_ENTRIES_PER_USER
from tests.support import client_for, create_user

URL = "/api/ingredients/unit-weights/"


def create_entry(owner, name="rukola", unit="garść", grams=20, source=IngredientUnitWeight.AUTO):
    return IngredientUnitWeight.objects.create(owner=owner, name=name, unit=unit, grams_per_unit=grams, source=source)


class UnitWeightApiTests(TestCase):
    def setUp(self):
        self.user = create_user()
        self.client = client_for(self.user)

    def test_adds_a_manual_entry(self):
        response = self.client.post(URL, {"name": " Pomidorki koktajlowe ", "unit": "szt.", "grams_per_unit": 20}, format="json")

        self.assertEqual(response.status_code, 201)
        self.assertEqual(
            (response.data["name"], response.data["unit"], response.data["grams_per_unit"], response.data["source"]),
            ("Pomidorki koktajlowe", "szt.", 20, "manual"),
        )
        entry = IngredientUnitWeight.objects.get()
        self.assertEqual((entry.owner, entry.name_key, entry.unit_key), (self.user, "pomidorki koktajlowe", "szt"))

    def test_an_entry_needs_a_name_and_a_weight_but_not_a_unit(self):
        self.assertIn("name", self.client.post(URL, {"name": " ", "grams_per_unit": 5}, format="json").data)
        self.assertIn("grams_per_unit", self.client.post(URL, {"name": "awokado"}, format="json").data)
        self.assertEqual(self.client.post(URL, {"name": "awokado", "grams_per_unit": 140}, format="json").status_code, 201)

    def test_rejects_weights_outside_the_allowed_range(self):
        for grams in (0, -5, 0.001, 100001):
            with self.subTest(grams=grams):
                response = self.client.post(URL, {"name": "sól", "grams_per_unit": grams}, format="json")
                self.assertEqual(response.status_code, 400)
        self.assertEqual(self.client.post(URL, {"name": "sól", "grams_per_unit": 0.01}, format="json").status_code, 201)
        self.assertEqual(self.client.post(URL, {"name": "worek", "grams_per_unit": 100000}, format="json").status_code, 201)

    def test_rounds_the_weight_to_two_places(self):
        response = self.client.post(URL, {"name": "pieprz", "grams_per_unit": 0.456}, format="json")

        self.assertEqual(response.data["grams_per_unit"], 0.46)

    def test_the_same_key_is_refused_and_points_at_the_existing_entry(self):
        create_entry(self.user, name="Rukola", unit="Garść", grams=20)

        response = self.client.post(URL, {"name": "rukola", "unit": "garść.", "grams_per_unit": 30}, format="json")

        self.assertEqual(response.status_code, 400)
        self.assertIn("Rukola, Garść", response.data["name"][0])
        self.assertIn("20 g", response.data["name"][0])
        self.assertEqual(IngredientUnitWeight.objects.count(), 1)

    def test_a_different_unit_is_a_different_entry(self):
        create_entry(self.user, unit="garść")

        response = self.client.post(URL, {"name": "rukola", "unit": "opakowanie", "grams_per_unit": 125}, format="json")

        self.assertEqual(response.status_code, 201)

    def test_edits_an_entry_and_makes_it_manual(self):
        entry = create_entry(self.user)

        response = self.client.patch(f"{URL}{entry.pk}/", {"grams_per_unit": 25}, format="json")

        self.assertEqual((response.data["grams_per_unit"], response.data["source"]), (25, "manual"))

    def test_edits_name_and_unit_unless_the_new_key_is_taken(self):
        entry = create_entry(self.user)
        create_entry(self.user, name="szpinak", unit="garść", grams=15)

        renamed = self.client.patch(f"{URL}{entry.pk}/", {"name": "Rukola dzika", "unit": "pęczek"}, format="json")
        clash = self.client.patch(f"{URL}{entry.pk}/", {"name": "Szpinak", "unit": "garść"}, format="json")

        self.assertEqual((renamed.data["name"], renamed.data["unit"]), ("Rukola dzika", "pęczek"))
        self.assertEqual(IngredientUnitWeight.objects.get(pk=entry.pk).name_key, "rukola dzika")
        self.assertEqual(clash.status_code, 400)

    def test_deletes_an_entry(self):
        entry = create_entry(self.user)

        self.assertEqual(self.client.delete(f"{URL}{entry.pk}/").status_code, 204)
        self.assertFalse(IngredientUnitWeight.objects.exists())

    def test_lists_entries_by_name_then_unit(self):
        create_entry(self.user, name="szpinak", unit="garść")
        create_entry(self.user, name="Rukola", unit="opakowanie", grams=125)
        create_entry(self.user, name="rukola dzika", unit="garść")
        create_entry(self.user, name="rukola", unit="garść.")

        names = [(entry["name"], entry["unit"]) for entry in self.client.get(URL).data["results"]]

        self.assertEqual(
            names, [("rukola", "garść."), ("Rukola", "opakowanie"), ("rukola dzika", "garść"), ("szpinak", "garść")]
        )

    def test_searches_by_part_of_the_name_ignoring_case(self):
        create_entry(self.user, name="Pomidorki koktajlowe", unit="szt")
        create_entry(self.user, name="ŻÓŁTY ser", unit="plaster")
        create_entry(self.user, name="rukola")

        self.assertEqual([entry["name"] for entry in self.client.get(URL, {"q": "MIDOR"}).data["results"]], ["Pomidorki koktajlowe"])
        self.assertEqual([entry["name"] for entry in self.client.get(URL, {"q": "żółty"}).data["results"]], ["ŻÓŁTY ser"])

    def test_pages_hold_fifty_entries(self):
        IngredientUnitWeight.objects.bulk_create(
            IngredientUnitWeight(owner=self.user, name=f"p{index:03}", name_key=f"p{index:03}", grams_per_unit=1, source="auto")
            for index in range(51)
        )

        first = self.client.get(URL).data
        second = self.client.get(URL, {"page": 2}).data

        self.assertEqual((first["count"], len(first["results"]), len(second["results"])), (51, 50, 1))
        self.assertIsNotNone(first["next"])

    def test_search_uses_the_same_number_of_queries_however_many_entries_there_are(self):
        def queries_for_search():
            with CaptureQueriesContext(connection) as context:
                self.assertEqual(self.client.get(URL, {"q": "p"}).status_code, 200)
            return len(context.captured_queries)

        create_entry(self.user, name="p-pierwszy")
        few = queries_for_search()
        IngredientUnitWeight.objects.bulk_create(
            IngredientUnitWeight(owner=self.user, name=f"p{index}", name_key=f"p{index}", grams_per_unit=1, source="auto")
            for index in range(200)
        )

        self.assertEqual(queries_for_search(), few)

    def test_manual_add_stops_at_the_entry_limit(self):
        IngredientUnitWeight.objects.bulk_create(
            IngredientUnitWeight(owner=self.user, name=f"p{index}", name_key=f"p{index}", grams_per_unit=1, source="auto")
            for index in range(MAX_ENTRIES_PER_USER)
        )

        response = self.client.post(URL, {"name": "jeszcze jeden", "grams_per_unit": 1}, format="json")

        self.assertEqual(response.status_code, 400)
        self.assertIn("5000", response.data["detail"])

    def test_requires_authentication(self):
        self.assertEqual(APIClient().get(URL).status_code, 401)
        self.assertEqual(APIClient().post(URL, {"name": "x", "grams_per_unit": 1}, format="json").status_code, 401)

    def test_works_only_on_the_users_own_entries(self):
        other_user = create_user("other@example.com")
        other_entry = create_entry(other_user)
        create_entry(self.user, name="mój produkt")

        self.assertEqual([entry["name"] for entry in self.client.get(URL).data["results"]], ["mój produkt"])
        self.assertEqual(self.client.patch(f"{URL}{other_entry.pk}/", {"grams_per_unit": 1}, format="json").status_code, 404)
        self.assertEqual(self.client.delete(f"{URL}{other_entry.pk}/").status_code, 404)
        self.assertEqual(IngredientUnitWeight.objects.get(pk=other_entry.pk).grams_per_unit, 20)

    def test_ignores_an_owner_sent_by_the_client(self):
        other_user = create_user("other@example.com")

        self.client.post(URL, {"name": "kasza", "grams_per_unit": 100, "owner": other_user.pk}, format="json")

        self.assertEqual(IngredientUnitWeight.objects.get().owner, self.user)
        self.assertEqual(self.client.post(URL, {"name": "rukola", "grams_per_unit": 1}, format="json").status_code, 201)
        create_entry(other_user)
        self.assertEqual(IngredientUnitWeight.objects.filter(name_key="rukola").count(), 2)
