from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from recipe_sets.models import RecipeSet
from recipe_sets.serializers import RecipeSetDetailSerializer, RecipeSetWriteSerializer
from recipe_sets.services import RecipeSetUpdater


class SetDetailView(APIView):
    permission_classes = (IsAuthenticated,)

    def get_set(self, request, set_id):
        return get_object_or_404(RecipeSet, pk=set_id, owner=request.user)

    def get(self, request, set_id):
        return Response(RecipeSetDetailSerializer(self.get_set(request, set_id)).data)

    def patch(self, request, set_id):
        """Save the name and/or the full list of recipes; the set's list is recomputed."""
        recipe_set = self.get_set(request, set_id)
        serializer = RecipeSetWriteSerializer(data=request.data, partial=True, context={"request": request})
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        recipe_set = RecipeSetUpdater().update(recipe_set, name=data.get("name"), recipes=data.get("recipes"))
        return Response(RecipeSetDetailSerializer(recipe_set).data)

    def delete(self, request, set_id):
        recipe_set = self.get_set(request, set_id)
        with transaction.atomic():
            # Deleting the list deletes its items and, through RecipeSet.shopping_list, the set.
            recipe_set.shopping_list.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
