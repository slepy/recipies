from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from shopping_lists.models import ShoppingList, ShoppingListItem
from shopping_lists.services.ingredient_aggregator import IngredientAggregator
from shopping_lists.services.plan_entry_selector import PlanEntrySelector


class ShoppingListCreator:
    def create(self, owner, plan, name, start_date, end_date, excluded_entry_ids):
        entries = list(PlanEntrySelector().select(plan, start_date, end_date, excluded_entry_ids))
        if not entries:
            raise ValidationError({"detail": "Wybierz co najmniej jeden wpis planu."})

        with transaction.atomic():
            shopping_list = ShoppingList.objects.create(
                owner=owner,
                plan=plan,
                name=name,
                scope_start=start_date,
                scope_end=end_date,
                excluded_entry_ids=excluded_entry_ids,
                generated_at=timezone.now(),
            )
            aggregator = IngredientAggregator()
            ShoppingListItem.objects.bulk_create(
                ShoppingListItem(shopping_list=shopping_list, origin=ShoppingListItem.RECIPE, **aggregator.present(row))
                for row in aggregator.aggregate(entries)
            )
        return shopping_list
