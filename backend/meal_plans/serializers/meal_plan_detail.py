from itertools import groupby

from rest_framework import serializers

from meal_plans.serializers.meal import MealSerializer
from meal_plans.serializers.meal_plan import MealPlanSerializer


class MealPlanDetailSerializer(MealPlanSerializer):
    """A plan with its meals grouped into days (dates in order)."""

    days = serializers.SerializerMethodField()

    class Meta(MealPlanSerializer.Meta):
        fields = MealPlanSerializer.Meta.fields + ("days",)

    def get_days(self, plan):
        meals = plan.meals.prefetch_related("entries__recipe")
        return [
            {"date": date, "meals": MealSerializer(list(day_meals), many=True).data}
            for date, day_meals in groupby(meals, key=lambda meal: meal.date)
        ]
