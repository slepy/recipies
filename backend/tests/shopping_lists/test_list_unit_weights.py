from django.test import TestCase

from ingredients.models import IngredientUnitWeight
from tests.support import add_entry, client_for, create_plan, create_recipe, create_user


class ShoppingListUnitWeightTests(TestCase):
    """How a list uses and feeds the ingredient knowledge base (2026-10-15-ingredient-knowledge-base.md)."""

    def setUp(self):
        self.user = create_user()
        self.client = client_for(self.user)
        plan_id, meals = create_plan(self.client)
        recipe = create_recipe(
            self.user,
            ingredients=[
                {"name": "pomidorki koktajlowe", "amount": "12", "unit": "szt.", "metric_amount": 240, "metric_unit": "g"},
                {"name": "jajka", "amount": "2", "unit": "szt", "metric_amount": None, "metric_unit": ""},
                {"name": "mleko", "amount": "1", "unit": "szklanka", "metric_amount": 250, "metric_unit": "ml"},
            ],
        )
        add_entry(self.client, plan_id, meals[0], recipe, servings=2)
        self.list = self.client.post("/api/shopping-lists/", {"plan": plan_id, "name": "Zakupy"}, format="json").data
        self.items_url = f"/api/shopping-lists/{self.list['id']}/items/"

    def remember(self, name, unit, grams, owner=None):
        IngredientUnitWeight.objects.create(
            owner=owner or self.user, name=name, unit=unit, grams_per_unit=grams, source=IngredientUnitWeight.MANUAL
        )

    def recipe_item(self, name):
        return next(item for item in self.list["items"] if item["name"] == name)

    def increase(self, name, **data):
        return self.client.patch(f"{self.items_url}{self.recipe_item(name)['id']}/", data, format="json")

    def add_custom(self, **data):
        return self.client.post(self.items_url, data, format="json")

    def test_increasing_pieces_raises_the_weight_by_the_known_unit_weight(self):
        self.remember("Pomidorki koktajlowe", "szt", 20)

        response = self.increase("pomidorki koktajlowe", increase_amount=6)

        self.assertEqual((response.data["amount"], response.data["metric_amount"], response.data["metric_unit"]), (18, 360, "g"))
        self.assertEqual((response.data["extra_amount"], response.data["extra_metric"]), (6, 120))
        self.assertEqual(response.data["unit_weight"], 20)

    def test_a_weight_sent_by_the_client_wins_over_the_calculation(self):
        self.remember("pomidorki koktajlowe", "szt.", 20)

        response = self.increase("pomidorki koktajlowe", increase_amount=6, increase_metric_amount=100)

        self.assertEqual((response.data["amount"], response.data["metric_amount"]), (18, 340))

    def test_without_an_entry_only_the_pieces_grow(self):
        response = self.increase("pomidorki koktajlowe", increase_amount=6)

        self.assertEqual((response.data["amount"], response.data["metric_amount"]), (18, 240))
        self.assertIsNone(response.data["unit_weight"])

    def test_without_a_mass_measure_only_the_pieces_grow(self):
        self.remember("jajka", "szt", 60)
        self.remember("mleko", "szklanka", 250)

        eggs = self.increase("jajka", increase_amount=2)
        milk = self.increase("mleko", increase_amount=1)

        self.assertEqual((eggs.data["amount"], eggs.data["metric_amount"], eggs.data["unit_weight"]), (4, None, 60))
        self.assertEqual((milk.data["amount"], milk.data["metric_amount"], milk.data["metric_unit"]), (2, 250, "ml"))

    def test_reset_takes_back_both_calculated_increases(self):
        self.remember("pomidorki koktajlowe", "szt", 20)
        self.increase("pomidorki koktajlowe", increase_amount=6)

        response = self.increase("pomidorki koktajlowe", reset_increase=True)

        self.assertEqual((response.data["amount"], response.data["metric_amount"]), (12, 240))
        self.assertEqual((response.data["extra_amount"], response.data["extra_metric"]), (0, 0))

    def test_list_items_carry_their_unit_weight(self):
        self.remember("pomidorki koktajlowe", "szt", 20)
        self.remember("pomidorki koktajlowe", "szt", 99, owner=create_user("other@example.com"))

        items = self.client.get(f"/api/shopping-lists/{self.list['id']}/").data["items"]

        weights = {item["name"]: item["unit_weight"] for item in items}
        self.assertEqual(weights, {"pomidorki koktajlowe": 20, "jajka": None, "mleko": None})
        self.assertTrue(all(item["metric_estimated"] is False for item in items))

    def test_a_custom_item_with_a_typed_weight_teaches_the_knowledge_base(self):
        response = self.add_custom(name="Awokado", amount="2", unit="", metric_amount=280, metric_unit="g")

        self.assertFalse(response.data["metric_estimated"])
        entry = IngredientUnitWeight.objects.get()
        self.assertEqual((entry.name, entry.unit, entry.grams_per_unit, entry.source), ("Awokado", "", 140, "auto"))

    def test_a_custom_item_without_a_weight_gets_one_estimated_from_the_base(self):
        self.remember("awokado", "", 140)

        response = self.add_custom(name="awokado", amount="3", unit="")

        self.assertEqual((response.data["metric_amount"], response.data["metric_unit"]), (420, "g"))
        self.assertTrue(response.data["metric_estimated"])
        self.assertEqual(response.data["unit_weight"], 140)

    def test_large_estimates_are_shown_in_kilograms(self):
        self.remember("ziemniaki", "szt", 150)

        response = self.add_custom(name="ziemniaki", amount="10", unit="szt")

        self.assertEqual((response.data["metric_amount"], response.data["metric_unit"]), (1.5, "kg"))

    def test_an_estimated_weight_does_not_teach_the_base(self):
        self.remember("awokado", "", 140)

        self.add_custom(name="awokado", amount="3", unit="")

        self.assertEqual(list(IngredientUnitWeight.objects.values_list("name", "grams_per_unit")), [("awokado", 140)])

    def test_changing_the_amount_recalculates_an_estimated_weight(self):
        self.remember("awokado", "", 140)
        item_id = self.add_custom(name="awokado", amount="3", unit="").data["id"]

        response = self.client.patch(f"{self.items_url}{item_id}/", {"amount": "1,5"}, format="json")

        self.assertEqual((response.data["metric_amount"], response.data["metric_estimated"]), (210, True))

    def test_a_typed_weight_ends_the_estimate(self):
        self.remember("awokado", "", 140)
        item_id = self.add_custom(name="awokado", amount="3", unit="").data["id"]
        url = f"{self.items_url}{item_id}/"

        typed = self.client.patch(url, {"metric_amount": 500, "metric_unit": "g"}, format="json")
        later = self.client.patch(url, {"amount": "4"}, format="json")

        self.assertEqual((typed.data["metric_amount"], typed.data["metric_estimated"]), (500, False))
        self.assertEqual((later.data["metric_amount"], later.data["metric_estimated"]), (500, False))

    def test_a_non_numeric_amount_drops_an_estimate(self):
        self.remember("awokado", "", 140)
        item_id = self.add_custom(name="awokado", amount="3", unit="").data["id"]

        response = self.client.patch(f"{self.items_url}{item_id}/", {"amount": "kilka"}, format="json")

        self.assertEqual((response.data["metric_amount"], response.data["metric_unit"], response.data["metric_estimated"]), (None, "", False))

    def test_unknown_or_non_numeric_custom_items_behave_as_before(self):
        self.remember("awokado", "", 140)

        unknown = self.add_custom(name="chleb", amount="1", unit="bochenek")
        non_numeric = self.add_custom(name="awokado", amount="kilka", unit="")

        for response in (unknown, non_numeric):
            self.assertEqual((response.data["metric_amount"], response.data["metric_estimated"]), (None, False))

    def test_another_users_base_is_never_used(self):
        self.remember("awokado", "", 140, owner=create_user("other@example.com"))

        response = self.add_custom(name="awokado", amount="3", unit="")

        self.assertIsNone(response.data["metric_amount"])
