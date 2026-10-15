from unittest.mock import patch

from django.test import TestCase

from shopping_lists.models import ShoppingListItem
from tests.support import client_for, create_recipe, create_user


def ingredient(name, amount="", unit="", metric_amount=None, metric_unit=""):
    return {"name": name, "amount": amount, "unit": unit, "metric_amount": metric_amount, "metric_unit": metric_unit}


class RecipeSetShoppingListApiTests(TestCase):
    def setUp(self):
        self.user = create_user()
        self.client = client_for(self.user)
        self.soup = create_recipe(
            self.user,
            title="Zupa",
            servings=4,
            ingredients=[
                ingredient("Mleko", metric_amount=0.5, metric_unit="l"),
                ingredient("marchew", "2", "szt"),
                ingredient("sól", "szczypta"),
            ],
        )
        self.cake = create_recipe(
            self.user,
            title="Ciasto",
            servings=1,
            ingredients=[ingredient("mleko", metric_amount=250, metric_unit="ml"), ingredient("mąka", "1", "szklanka")],
        )
        self.recipe_set = self.client.post("/api/recipe-sets/", {"name": "Tydzień"}, format="json").data
        self.url = f"/api/recipe-sets/{self.recipe_set['id']}/"
        self.list_url = f"/api/shopping-lists/{self.recipe_set['shopping_list']}/"

    def save_recipes(self, *recipes):
        return self.client.patch(self.url, {"recipes": [recipe.pk for recipe in recipes]}, format="json")

    def items(self):
        return {item["name"].casefold(): item for item in self.client.get(self.list_url).data["items"]}

    def test_every_ingredient_is_listed_and_same_names_are_summed_without_scaling(self):
        self.save_recipes(self.soup, self.cake)

        items = self.items()

        self.assertEqual(sorted(items), ["marchew", "mleko", "mąka", "sól"])
        # 0.5 l + 250 ml, as written in the recipes whatever their servings.
        self.assertEqual((items["mleko"]["metric_amount"], items["mleko"]["metric_unit"]), (750, "ml"))
        self.assertEqual((items["marchew"]["amount"], items["marchew"]["unit"]), (2, "szt"))
        # An ingredient without a usable amount is still on the list.
        self.assertIsNone(items["sól"]["amount"])
        self.assertTrue(all(item["origin"] == "recipe" for item in items.values()))

    def test_sets_with_the_same_recipe_have_independent_lists(self):
        other = self.client.post("/api/recipe-sets/", {"name": "Inny", "recipes": [self.soup.pk]}, format="json").data
        self.save_recipes(self.soup)

        marchew = self.items()["marchew"]
        self.client.patch(f"{self.list_url}items/{marchew['id']}/", {"bought": True}, format="json")

        other_items = self.client.get(f"/api/shopping-lists/{other['shopping_list']}/").data["items"]
        self.assertFalse(next(item for item in other_items if item["name"] == "marchew")["bought"])

    def test_saving_recomputes_recipe_items_and_keeps_custom_items_and_bought_state(self):
        self.save_recipes(self.soup, self.cake)
        items = self.items()
        self.client.patch(f"{self.list_url}items/{items['marchew']['id']}/", {"bought": True}, format="json")
        self.client.patch(f"{self.list_url}items/{items['mleko']['id']}/", {"bought": True}, format="json")
        custom = self.client.post(f"{self.list_url}items/", {"name": "mąka", "amount": "1", "unit": "kg"}, format="json").data

        self.save_recipes(self.soup)

        rows = self.client.get(self.list_url).data["items"]
        recipe_items = {item["name"].casefold(): item for item in rows if item["origin"] == "recipe"}
        # "mąka" came only from the removed cake: its recipe item is gone, the custom one stays.
        self.assertEqual(sorted(recipe_items), ["marchew", "mleko", "sól"])
        self.assertTrue(recipe_items["marchew"]["bought"])
        self.assertTrue(recipe_items["mleko"]["bought"])
        self.assertEqual((recipe_items["mleko"]["metric_amount"], recipe_items["mleko"]["metric_unit"]), (500, "ml"))
        kept = next(item for item in rows if item["id"] == custom["id"])
        self.assertEqual((kept["name"], kept["amount_text"], kept["unit"], kept["origin"]), ("mąka", "1", "kg", "custom"))

    def test_items_added_by_a_later_save_are_not_bought(self):
        self.save_recipes(self.soup)

        self.save_recipes(self.soup, self.cake)

        maka = self.items()["mąka"]
        self.assertFalse(maka["bought"])
        self.assertTrue(maka["is_new"])

    def test_a_failed_save_leaves_the_set_and_list_unchanged(self):
        self.save_recipes(self.soup)
        before = sorted(ShoppingListItem.objects.values_list("name", "amount", "metric_amount", "bought"))
        self.client.raise_request_exception = False

        with patch(
            "recipe_sets.services.recipe_set_list_sync.IngredientAggregator.aggregate_recipes",
            side_effect=RuntimeError("boom"),
        ):
            response = self.client.patch(self.url, {"name": "Nowa", "recipes": [self.cake.pk]}, format="json")

        self.assertEqual(response.status_code, 500)
        recipe_set = self.client.get(self.url).data
        self.assertEqual(recipe_set["name"], "Tydzień")
        self.assertEqual([recipe["id"] for recipe in recipe_set["recipes"]], [self.soup.pk])
        self.assertEqual(sorted(ShoppingListItem.objects.values_list("name", "amount", "metric_amount", "bought")), before)

    def test_the_plan_refresh_does_not_touch_a_set_list(self):
        self.save_recipes(self.soup)

        detail = self.client.get(self.list_url).data
        refreshed = self.client.post(f"{self.list_url}refresh/").data

        self.assertFalse(detail["is_stale"])
        self.assertEqual(len(refreshed["items"]), len(detail["items"]))
