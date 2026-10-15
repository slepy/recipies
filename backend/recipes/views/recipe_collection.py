from rest_framework import status
from rest_framework.parsers import JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from ingredients.services import UnitWeightLearner
from recipes.models import Recipe
from recipes.serializers import RecipeSerializer
from recipes.views.recipe_payload import read_recipe_payload


class RecipeCollectionView(APIView):
    permission_classes = (IsAuthenticated,)
    parser_classes = (JSONParser, MultiPartParser)

    def get(self, request):
        recipes = Recipe.objects.filter(owner=request.user)
        return Response(RecipeSerializer(recipes, many=True).data)

    def post(self, request):
        serializer = RecipeSerializer(data=read_recipe_payload(request))
        serializer.is_valid(raise_exception=True)
        recipe = serializer.save(owner=request.user)
        UnitWeightLearner().learn(request.user, recipe.ingredients)
        return Response(RecipeSerializer(recipe).data, status=status.HTTP_201_CREATED)
