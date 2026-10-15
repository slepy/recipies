from django.db import transaction
from django.shortcuts import get_object_or_404

from recipe_sets.models import RecipeSet
from recipe_sets.services.recipe_set_list_sync import RecipeSetListSync


class RecipeSetUpdater:
    """Saves a change of name or recipes and recomputes the set's list in the same transaction.

    If anything fails, the transaction rolls back, so the saved set and its list stay as they were.
    """

    def lock(self, recipe_set):
        # Lock the set so two saves at once cannot mix their recipes. A set deleted since the view
        # read it is "not found", not a server error.
        return get_object_or_404(RecipeSet.objects.select_for_update(), pk=recipe_set.pk)

    def update(self, recipe_set, name=None, recipes=None):
        with transaction.atomic():
            locked = self.lock(recipe_set)
            if name is not None:
                locked.name = name
            if recipes is not None:
                locked.recipes.set(recipes)
            locked.save()
            RecipeSetListSync().sync(locked)
        return locked

    def add_recipe(self, recipe_set, recipe):
        """Add one recipe; adding a recipe that is already in the set changes nothing."""
        with transaction.atomic():
            locked = self.lock(recipe_set)
            if locked.recipes.filter(pk=recipe.pk).exists():
                return locked, False
            locked.recipes.add(recipe)
            locked.save()
            RecipeSetListSync().sync(locked)
        return locked, True
