from shopping_lists.services import IngredientAggregator, ShoppingListRefresher


class RecipeSetListSync:
    """Recomputes the recipe items of a set's list from the recipes now in the set.

    The refresher keeps custom items untouched and keeps the bought state of every item that is
    still there; items that came only from a removed recipe disappear.
    """

    def sync(self, recipe_set):
        rows = IngredientAggregator().aggregate_recipes(recipe_set.recipes.all())
        shopping_list = ShoppingListRefresher().apply(recipe_set.shopping_list, rows)
        if shopping_list.name != recipe_set.name:
            shopping_list.name = recipe_set.name
            shopping_list.save(update_fields=["name"])
        return shopping_list
