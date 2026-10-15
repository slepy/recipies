from django.db import transaction
from django.utils import timezone

from shopping_lists.models import ShoppingList, ShoppingListItem
from shopping_lists.services.ingredient_aggregator import IngredientAggregator
from shopping_lists.services.plan_entry_selector import PlanEntrySelector


def _same(item, fresh):
    return (item.amount, item.unit, item.partial, item.sources) == (
        fresh["amount"],
        fresh["unit"],
        fresh["partial"],
        fresh["sources"],
    )


class ShoppingListRefresher:
    """Recomputes the recipe items of a list from its remembered scope; custom items are never touched."""

    def compare(self, shopping_list):
        """Return the freshly computed items and which keys were added, changed or removed."""
        if shopping_list.plan_id is None:
            return {"fresh": {}, "added": [], "changed": [], "removed": []}

        entries = PlanEntrySelector().select(
            shopping_list.plan,
            shopping_list.scope_start,
            shopping_list.scope_end,
            shopping_list.excluded_entry_ids,
        )
        fresh = {item["key"]: item for item in IngredientAggregator().aggregate(entries)}
        current = {
            item.key: item for item in shopping_list.items.filter(origin=ShoppingListItem.RECIPE)
        }
        return {
            "fresh": fresh,
            "current": current,
            "added": [key for key in fresh if key not in current],
            "changed": [key for key in fresh if key in current and not _same(current[key], fresh[key])],
            "removed": [key for key in current if key not in fresh],
        }

    def is_stale(self, shopping_list):
        difference = self.compare(shopping_list)
        return bool(difference["added"] or difference["changed"] or difference["removed"])

    def preview(self, shopping_list):
        difference = self.compare(shopping_list)
        return {
            "added": [difference["fresh"][key]["name"] for key in difference["added"]],
            "changed": [difference["fresh"][key]["name"] for key in difference["changed"]],
            "removed": [difference["current"][key].name for key in difference["removed"]],
            "custom_kept": shopping_list.items.filter(origin=ShoppingListItem.CUSTOM).count(),
        }

    def apply(self, shopping_list):
        with transaction.atomic():
            # Lock the list so a double click on "Odśwież" cannot apply the refresh twice at once.
            locked = ShoppingList.objects.select_for_update().get(pk=shopping_list.pk)
            difference = self.compare(locked)
            fresh, current = difference["fresh"], difference.get("current", {})

            ShoppingListItem.objects.filter(
                shopping_list=locked, origin=ShoppingListItem.RECIPE, key__in=difference["removed"]
            ).delete()

            for key, item in current.items():
                if key in fresh:
                    # Same product and kind of measure: keep the bought state, take the new numbers.
                    item.amount = fresh[key]["amount"]
                    item.unit = fresh[key]["unit"]
                    item.partial = fresh[key]["partial"]
                    item.sources = fresh[key]["sources"]
                    item.is_new = False
                    item.save()

            ShoppingListItem.objects.bulk_create(
                ShoppingListItem(shopping_list=locked, origin=ShoppingListItem.RECIPE, is_new=True, **fresh[key])
                for key in difference["added"]
            )
            locked.generated_at = timezone.now()
            locked.save(update_fields=["generated_at"])
        return locked
