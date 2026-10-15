from django.db import transaction
from django.db.models import Max
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from meal_plans.models import Meal, MealEntry
from meal_plans.rules import MAX_ENTRIES_PER_MEAL
from meal_plans.serializers import MealEntrySerializer, MealEntryWriteSerializer


class EntryCollectionView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request, plan_id, meal_id):
        with transaction.atomic():
            meal = get_object_or_404(
                Meal.objects.select_for_update(), pk=meal_id, plan_id=plan_id, plan__owner=request.user
            )
            serializer = MealEntryWriteSerializer(data=request.data, context={"request": request})
            serializer.is_valid(raise_exception=True)
            recipe = serializer.validated_data["recipe"]
            servings = serializer.validated_data.get("servings") or serializer.default_servings(recipe)
            if meal.entries.count() >= MAX_ENTRIES_PER_MEAL:
                raise ValidationError({"detail": "Posiłek ma już przepis. Zmień go albo dodaj kolejny posiłek."})
            last_position = meal.entries.aggregate(last=Max("position"))["last"]
            entry = MealEntry.objects.create(
                meal=meal,
                recipe=recipe,
                servings=servings,
                position=0 if last_position is None else last_position + 1,
            )
        return Response(MealEntrySerializer(entry).data, status=status.HTTP_201_CREATED)
