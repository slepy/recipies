from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from meal_plans.services import parse_amount
from shopping_lists.models import ShoppingList, ShoppingListItem
from shopping_lists.serializers import ShoppingListItemSerializer, ShoppingListItemWriteSerializer
from shopping_lists.services import CustomItemMeasure


class ItemCollectionView(APIView):
    """Adds a custom item. Custom items are never merged with recipe items, even with the same name."""

    permission_classes = (IsAuthenticated,)

    def post(self, request, list_id):
        shopping_list = get_object_or_404(ShoppingList, pk=list_id, owner=request.user)
        serializer = ShoppingListItemWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        item = ShoppingListItem(
            shopping_list=shopping_list,
            origin=ShoppingListItem.CUSTOM,
            name=data["name"],
            amount=parse_amount(data.get("amount")),
            amount_text=data.get("amount", ""),
            unit=data.get("unit", ""),
            metric_amount=data.get("metric_amount"),
            metric_unit=data.get("metric_unit", ""),
        )
        measure = CustomItemMeasure()
        measure.estimate(item, request.user, metric_given=item.metric_amount is not None)
        item.save()
        measure.learn(item, request.user)
        return Response(ShoppingListItemSerializer(item).data, status=status.HTTP_201_CREATED)
