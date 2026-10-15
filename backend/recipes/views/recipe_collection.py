import json

from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from recipes.models import Recipe
from recipes.serializers import RecipeSerializer


class RecipeCollectionView(APIView):
    permission_classes = (IsAuthenticated,)
    parser_classes = (JSONParser, MultiPartParser)

    def get(self, request):
        recipes = Recipe.objects.filter(owner=request.user)
        return Response(RecipeSerializer(recipes, many=True).data)

    def post(self, request):
        recipe_data = request.data
        if request.content_type.startswith("multipart/form-data"):
            try:
                recipe_data = json.loads(request.data.get("recipe", ""))
            except (TypeError, ValueError) as error:
                raise ValidationError({"recipe": "Nieprawidłowe dane przepisu."}) from error

            if not isinstance(recipe_data, dict):
                raise ValidationError({"recipe": "Dane przepisu muszą być obiektem JSON."})
            photo = request.FILES.get("photo")
            if photo:
                recipe_data["photo"] = photo

        serializer = RecipeSerializer(data=recipe_data)
        serializer.is_valid(raise_exception=True)
        recipe = serializer.save(owner=request.user)
        return Response(RecipeSerializer(recipe).data, status=status.HTTP_201_CREATED)