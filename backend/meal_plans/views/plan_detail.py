from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from meal_plans.models import MealPlan
from meal_plans.serializers import MealPlanDetailSerializer, MealPlanSerializer
from meal_plans.services import PlanDays
from meal_plans.views.confirmation import confirmation_required


class PlanDetailView(APIView):
    permission_classes = (IsAuthenticated,)

    def get_plan(self, request, plan_id):
        return get_object_or_404(MealPlan, pk=plan_id, owner=request.user)

    def get(self, request, plan_id):
        return Response(MealPlanDetailSerializer(self.get_plan(request, plan_id)).data)

    def patch(self, request, plan_id):
        plan = self.get_plan(request, plan_id)
        serializer = MealPlanSerializer(plan, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        days = PlanDays()
        start_date = serializer.validated_data.get("start_date", plan.start_date)
        end_date = serializer.validated_data.get("end_date", plan.end_date)
        with transaction.atomic():
            # Lock the plan (adding a meal locks it) and the meals to remove (adding an entry locks
            # its meal), so nothing added meanwhile is deleted without being counted.
            MealPlan.objects.select_for_update().get(pk=plan.pk)
            list(days.outside_period(plan, start_date, end_date).select_for_update())
            removed_entries = days.count_entries_outside_period(plan, start_date, end_date)
            if removed_entries and request.data.get("confirm") is not True:
                return confirmation_required(
                    f"Skrócenie okresu usunie {removed_entries} wpisów z planu.", removed_entries
                )
            days.outside_period(plan, start_date, end_date).delete()
            plan = serializer.save()
            days.create_missing(plan)
        return Response(MealPlanDetailSerializer(plan).data)

    def delete(self, request, plan_id):
        # Lists made from the plan are removed with it by the database (ShoppingList.plan is CASCADE).
        self.get_plan(request, plan_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
