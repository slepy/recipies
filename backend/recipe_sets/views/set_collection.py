from django.db.models import Count
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from recipe_sets.models import RecipeSet
from recipe_sets.serializers import RecipeSetDetailSerializer, RecipeSetSerializer, RecipeSetWriteSerializer
from recipe_sets.services import RecipeSetCreator


class SetCollectionView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        recipe_sets = RecipeSet.objects.filter(owner=request.user).annotate(recipe_count=Count("recipes"))
        return Response(RecipeSetSerializer(recipe_sets, many=True).data)

    def post(self, request):
        serializer = RecipeSetWriteSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        recipe_set = RecipeSetCreator().create(request.user, data["name"], data.get("recipes", []))
        return Response(RecipeSetDetailSerializer(recipe_set).data, status=status.HTTP_201_CREATED)
