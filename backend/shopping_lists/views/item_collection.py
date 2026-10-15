from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from shopping_lists.models import ShoppingList, ShoppingListItem
from shopping_lists.serializers import ShoppingListItemSerializer, ShoppingListItemWriteSerializer


class ItemCollectionView(APIView):
    """Adds a custom item. Custom items are never merged with recipe items, even with the same name."""

    permission_classes = (IsAuthenticated,)

    def post(self, request, list_id):
        shopping_list = get_object_or_404(ShoppingList, pk=list_id, owner=request.user)
        serializer = ShoppingListItemWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        item = ShoppingListItem.objects.create(
            shopping_list=shopping_list,
            origin=ShoppingListItem.CUSTOM,
            name=data["name"],
            amount=data.get("amount"),
            unit=data.get("unit", ""),
        )
        return Response(ShoppingListItemSerializer(item).data, status=status.HTTP_201_CREATED)
