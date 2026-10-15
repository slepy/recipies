from rest_framework.exceptions import ValidationError

from meal_plans.models import Meal
from meal_plans.rules import EXTRA_MEAL_NAMES, MAX_MEALS_PER_DAY


class MealAdder:
    """Adds an extra meal to one day, up to the daily limit."""

    def add(self, plan, date):
        if not plan.start_date <= date <= plan.end_date:
            raise ValidationError({"date": "Data musi mieścić się w okresie planu."})

        day_meals = list(plan.meals.filter(date=date))
        if len(day_meals) >= MAX_MEALS_PER_DAY:
            raise ValidationError({"date": f"Dzień może mieć najwyżej {MAX_MEALS_PER_DAY} posiłków."})

        used_names = {meal.name for meal in day_meals}
        name = next((candidate for candidate in EXTRA_MEAL_NAMES if candidate not in used_names), "Posiłek")
        position = max((meal.position for meal in day_meals), default=-1) + 1
        return Meal.objects.create(plan=plan, date=date, position=position, name=name, is_default=False)
