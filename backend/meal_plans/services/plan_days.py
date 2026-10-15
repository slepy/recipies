from datetime import timedelta

from meal_plans.models import Meal, MealEntry
from meal_plans.rules import DEFAULT_MEAL_NAMES


class PlanDays:
    """Keeps the meals of a plan in step with its date range."""

    def create_missing(self, plan):
        existing_dates = set(plan.meals.values_list("date", flat=True))
        new_meals = []
        date = plan.start_date
        while date <= plan.end_date:
            if date not in existing_dates:
                for position, name in enumerate(DEFAULT_MEAL_NAMES):
                    new_meals.append(Meal(plan=plan, date=date, position=position, name=name, is_default=True))
            date += timedelta(days=1)
        Meal.objects.bulk_create(new_meals)

    def outside_period(self, plan, start_date, end_date):
        return plan.meals.exclude(date__range=(start_date, end_date))

    def count_entries_outside_period(self, plan, start_date, end_date):
        return MealEntry.objects.filter(meal__in=self.outside_period(plan, start_date, end_date)).count()
