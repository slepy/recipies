from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from recipe_sets.models import RecipeSet
from recipe_sets.serializers import RecipeSetDetailSerializer, RecipeSetRecipeAddSerializer
from recipe_sets.services import RecipeSetUpdater


class SetRecipeCollectionView(APIView):
    """Adds one recipe to a set, for "Dodaj do zestawu" on a recipe. Adding it again is not an error."""

    permission_classes = (IsAuthenticated,)

    def post(self, request, set_id):
        recipe_set = get_object_or_404(RecipeSet, pk=set_id, owner=request.user)
        serializer = RecipeSetRecipeAddSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        recipe_set, added = RecipeSetUpdater().add_recipe(recipe_set, serializer.validated_data["recipe"])
        return Response(
            RecipeSetDetailSerializer(recipe_set).data,
            status=status.HTTP_201_CREATED if added else status.HTTP_200_OK,
        )
