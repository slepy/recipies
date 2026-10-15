from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from meal_plans.models import MealPlan
from meal_plans.serializers import MealSerializer
from meal_plans.services import MealAdder


class MealCollectionView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request, plan_id):
        try:
            date = serializers.DateField().to_internal_value(request.data.get("date"))
        except serializers.ValidationError as error:
            raise serializers.ValidationError({"date": "Podaj dzień planu."}) from error

        with transaction.atomic():
            # Lock the plan so two quick clicks on "+" cannot exceed the daily limit.
            plan = get_object_or_404(MealPlan.objects.select_for_update(), pk=plan_id, owner=request.user)
            meal = MealAdder().add(plan, date)
        return Response(MealSerializer(meal).data, status=status.HTTP_201_CREATED)
