from django.db import transaction
from django.db.models import Count
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from meal_plans.models import MealPlan
from meal_plans.serializers import MealPlanDetailSerializer, MealPlanSerializer
from meal_plans.services import PlanDays


class PlanCollectionView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        plans = MealPlan.objects.filter(owner=request.user).annotate(entry_count=Count("meals__entries"))
        return Response(MealPlanSerializer(plans, many=True).data)

    def post(self, request):
        serializer = MealPlanSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            plan = serializer.save(owner=request.user)
            PlanDays().create_missing(plan)
        return Response(MealPlanDetailSerializer(plan).data, status=status.HTTP_201_CREATED)
