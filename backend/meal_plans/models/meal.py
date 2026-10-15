from django.db import models

from meal_plans.models.meal_plan import MealPlan


class Meal(models.Model):
    """One meal slot on one day. A day is simply the set of meals sharing a date."""

    plan = models.ForeignKey(MealPlan, on_delete=models.CASCADE, related_name="meals")
    date = models.DateField()
    position = models.PositiveSmallIntegerField()
    name = models.CharField(max_length=100)
    is_default = models.BooleanField(default=False)

    class Meta:
        ordering = ("date", "position", "pk")
