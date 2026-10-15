from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from meal_plans.models import MealEntry
from meal_plans.serializers import MealEntrySerializer, MealEntryWriteSerializer


class EntryDetailView(APIView):
    permission_classes = (IsAuthenticated,)

    def get_entry(self, request, plan_id, entry_id):
        return get_object_or_404(
            MealEntry.objects.select_related("recipe"),
            pk=entry_id,
            meal__plan_id=plan_id,
            meal__plan__owner=request.user,
        )

    def patch(self, request, plan_id, entry_id):
        entry = self.get_entry(request, plan_id, entry_id)
        serializer = MealEntryWriteSerializer(
            data=request.data, partial=True, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        if "recipe" in serializer.validated_data:
            entry.recipe = serializer.validated_data["recipe"]
        if "servings" in serializer.validated_data:
            entry.servings = serializer.validated_data["servings"]
        entry.save()
        return Response(MealEntrySerializer(entry).data)

    def delete(self, request, plan_id, entry_id):
        self.get_entry(request, plan_id, entry_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
