from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from recipes.models import Recipe
from recipes.serializers import RecipeSerializer


class RecipeCollectionView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        recipes = Recipe.objects.filter(owner=request.user)
        return Response(RecipeSerializer(recipes, many=True).data)

    def post(self, request):
        serializer = RecipeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        recipe = serializer.save(owner=request.user)
        return Response(RecipeSerializer(recipe).data, status=status.HTTP_201_CREATED)