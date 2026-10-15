from django.db import IntegrityError, transaction
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from ingredients.models import IngredientUnitWeight
from ingredients.serializers import IngredientUnitWeightSerializer
from ingredients.views.unit_weight_collection import DUPLICATE_MESSAGE


class UnitWeightDetailView(APIView):
    permission_classes = (IsAuthenticated,)

    def patch(self, request, entry_id):
        entry = get_object_or_404(IngredientUnitWeight, pk=entry_id, owner=request.user)
        serializer = IngredientUnitWeightSerializer(entry, data=request.data, partial=True, context={"owner": request.user})
        serializer.is_valid(raise_exception=True)
        try:
            with transaction.atomic():
                # A corrected value is the user's, so learning from recipes will never replace it.
                entry = serializer.save(source=IngredientUnitWeight.MANUAL)
        except IntegrityError as error:
            raise ValidationError({"name": DUPLICATE_MESSAGE}) from error
        return Response(IngredientUnitWeightSerializer(entry).data)

    def delete(self, request, entry_id):
        get_object_or_404(IngredientUnitWeight, pk=entry_id, owner=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
