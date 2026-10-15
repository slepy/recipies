from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from meal_plans.models import Meal
from meal_plans.serializers import MealSerializer
from meal_plans.views.confirmation import confirmation_required


class MealDetailView(APIView):
    permission_classes = (IsAuthenticated,)

    def get_meal(self, request, plan_id, meal_id):
        return get_object_or_404(Meal, pk=meal_id, plan_id=plan_id, plan__owner=request.user)

    def patch(self, request, plan_id, meal_id):
        meal = self.get_meal(request, plan_id, meal_id)
        if meal.is_default:
            raise ValidationError({"name": "Nazwy podstawowych posiłków nie można zmienić."})
        serializer = MealSerializer(meal, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, plan_id, meal_id):
        meal = self.get_meal(request, plan_id, meal_id)
        if meal.is_default:
            raise ValidationError({"detail": "Podstawowych posiłków nie można usunąć, można je opróżnić."})
        entry_count = meal.entries.count()
        if entry_count and request.query_params.get("confirm") != "true":
            return confirmation_required(f"Posiłek ma wpisy ({entry_count}), które zostaną usunięte.", entry_count)
        meal.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
