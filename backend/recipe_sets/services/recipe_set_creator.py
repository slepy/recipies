from django.db import transaction
from django.utils import timezone

from recipe_sets.models import RecipeSet
from recipe_sets.services.recipe_set_list_sync import RecipeSetListSync
from shopping_lists.models import ShoppingList


class RecipeSetCreator:
    def create(self, owner, name, recipes):
        # One transaction: a set never exists without its list, or the other way round.
        with transaction.atomic():
            shopping_list = ShoppingList.objects.create(owner=owner, name=name, generated_at=timezone.now())
            recipe_set = RecipeSet.objects.create(owner=owner, name=name, shopping_list=shopping_list)
            recipe_set.recipes.set(recipes)
            RecipeSetListSync().sync(recipe_set)
            # Nothing on a brand-new list is "new" compared with an earlier version.
            shopping_list.items.update(is_new=False)
        return recipe_set
