from rest_framework import serializers

from meal_plans.models import MealEntry, MealPlan
from meal_plans.rules import MAX_PLAN_DAYS


class MealPlanSerializer(serializers.ModelSerializer):
    entry_count = serializers.SerializerMethodField()

    class Meta:
        model = MealPlan
        fields = ("id", "name", "start_date", "end_date", "entry_count")
        read_only_fields = ("id",)

    def validate_name(self, name):
        name = name.strip()
        if not name:
            raise serializers.ValidationError("Podaj nazwę planu.")
        return name

    def validate(self, plan_data):
        start_date = plan_data.get("start_date", getattr(self.instance, "start_date", None))
        end_date = plan_data.get("end_date", getattr(self.instance, "end_date", None))
        if start_date and end_date:
            if end_date < start_date:
                raise serializers.ValidationError({"end_date": "Data końcowa nie może być wcześniejsza niż początkowa."})
            if (end_date - start_date).days + 1 > MAX_PLAN_DAYS:
                raise serializers.ValidationError({"end_date": f"Plan może trwać najwyżej {MAX_PLAN_DAYS} dni."})
        return plan_data

    def get_entry_count(self, plan):
        # The collection view annotates this to avoid one query per plan.
        count = getattr(plan, "entry_count", None)
        return MealEntry.objects.filter(meal__plan=plan).count() if count is None else count
