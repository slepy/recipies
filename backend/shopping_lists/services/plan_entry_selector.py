from meal_plans.models import MealEntry


class PlanEntrySelector:
    """Picks the plan entries a shopping list is built from: a date range minus unchecked entries."""

    def select(self, plan, start_date, end_date, excluded_entry_ids):
        return (
            MealEntry.objects.filter(meal__plan=plan, meal__date__range=(start_date, end_date))
            .exclude(pk__in=excluded_entry_ids)
            .select_related("meal", "recipe")
            .order_by("meal__date", "meal__position", "position", "pk")
        )
