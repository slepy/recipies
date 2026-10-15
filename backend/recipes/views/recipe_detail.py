from django.shortcuts import get_object_or_404
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from ingredients.services import UnitWeightLearner
from recipes.models import Recipe
from recipes.serializers import RecipeSerializer
from recipes.views.recipe_payload import read_recipe_payload


class RecipeDetailView(APIView):
    permission_classes = (IsAuthenticated,)
    parser_classes = (JSONParser, MultiPartParser)

    def get(self, request, recipe_id):
        # Filtering by owner turns someone else's recipe into a plain 404, so its existence is not revealed.
        recipe = get_object_or_404(Recipe, pk=recipe_id, owner=request.user)
        return Response(RecipeSerializer(recipe).data)

    def patch(self, request, recipe_id):
        recipe = get_object_or_404(Recipe, pk=recipe_id, owner=request.user)
        recipe_data = read_recipe_payload(request)

        # No file means "keep the photo", so removing it needs its own flag.
        remove_photo = recipe_data.pop("remove_photo", False)
        if not isinstance(remove_photo, bool):
            raise ValidationError({"remove_photo": "Podaj true albo false."})
        if remove_photo and "photo" in recipe_data:
            raise ValidationError({"photo": "Wybierz nowe zdjęcie albo usuń obecne, nie oba naraz."})

        old_photo_name = recipe.photo.name if recipe.photo else ""
        # partial=True: fields left out of the request keep their saved values.
        serializer = RecipeSerializer(recipe, data=recipe_data, partial=True)
        serializer.is_valid(raise_exception=True)
        recipe = serializer.save(photo=None) if remove_photo else serializer.save()

        # Delete the replaced or removed file only after the new state is saved.
        if old_photo_name and recipe.photo.name != old_photo_name:
            recipe.photo.storage.delete(old_photo_name)

        UnitWeightLearner().learn(request.user, recipe.ingredients)
        return Response(RecipeSerializer(recipe).data)
