from django.db import transaction
from django.utils import timezone

from shopping_lists.models import ShoppingList, ShoppingListItem
from shopping_lists.services.ingredient_aggregator import IngredientAggregator
from shopping_lists.services.plan_entry_selector import PlanEntrySelector


def _shown(item):
    return (item.amount, item.unit, item.metric_amount, item.metric_unit, item.partial)


def _shown_after_refresh(item, fresh):
    shown = IngredientAggregator().present(fresh, item.extra_amount, item.extra_metric)
    return shown, (shown["amount"], shown["unit"], shown["metric_amount"], shown["metric_unit"], shown["partial"])


class ShoppingListRefresher:
    """Recomputes the recipe items of a list from its remembered scope; custom items are never touched.

    A list without a plan (a recipe set's list) has no scope to read, so its owner passes the
    freshly computed rows in.
    """

    def compare(self, shopping_list, rows=None):
        """Return the freshly computed items and which keys were added, changed or removed."""
        if rows is None:
            if shopping_list.plan_id is None:
                return {"fresh": {}, "added": [], "changed": [], "removed": []}
            entries = PlanEntrySelector().select(
                shopping_list.plan,
                shopping_list.scope_start,
                shopping_list.scope_end,
                shopping_list.excluded_entry_ids,
            )
            rows = IngredientAggregator().aggregate(entries)

        fresh = {row["key"]: row for row in rows}
        current = {
            item.key: item for item in shopping_list.items.filter(origin=ShoppingListItem.RECIPE)
        }
        return {
            "fresh": fresh,
            "current": current,
            "added": [key for key in fresh if key not in current],
            "changed": [
                key
                for key in fresh
                if key in current and _shown_after_refresh(current[key], fresh[key])[1] != _shown(current[key])
            ],
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

    def apply(self, shopping_list, rows=None):
        with transaction.atomic():
            # Lock the list so a double click on "Odśwież" cannot apply the refresh twice at once.
            locked = ShoppingList.objects.select_for_update().get(pk=shopping_list.pk)
            difference = self.compare(locked, rows)
            fresh, current = difference["fresh"], difference.get("current", {})

            ShoppingListItem.objects.filter(
                shopping_list=locked, origin=ShoppingListItem.RECIPE, key__in=difference["removed"]
            ).delete()

            for key, item in current.items():
                if key in fresh:
                    # Same product and kind of measure: keep the bought state, take the new numbers.
                    shown, _ = _shown_after_refresh(item, fresh[key])
                    item.amount = shown["amount"]
                    item.unit = shown["unit"]
                    item.metric_amount = shown["metric_amount"]
                    item.metric_unit = shown["metric_unit"]
                    item.partial = shown["partial"]
                    item.is_new = False
                    item.save()

            aggregator = IngredientAggregator()
            ShoppingListItem.objects.bulk_create(
                ShoppingListItem(
                    shopping_list=locked, origin=ShoppingListItem.RECIPE, is_new=True, **aggregator.present(fresh[key])
                )
                for key in difference["added"]
            )
            locked.generated_at = timezone.now()
            locked.save(update_fields=["generated_at"])
        return locked
