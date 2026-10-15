from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from meal_plans.services import parse_amount
from shopping_lists.models import ShoppingListItem
from shopping_lists.serializers import ShoppingListItemSerializer, ShoppingListItemWriteSerializer


class ItemDetailView(APIView):
    permission_classes = (IsAuthenticated,)

    def get_item(self, request, list_id, item_id):
        return get_object_or_404(
            ShoppingListItem, pk=item_id, shopping_list_id=list_id, shopping_list__owner=request.user
        )

    def patch(self, request, list_id, item_id):
        item = self.get_item(request, list_id, item_id)
        serializer = ShoppingListItemWriteSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # Recipe items change through the plan or recipe, so only their bought state is editable.
        if item.origin == ShoppingListItem.RECIPE and set(data) - {"bought"}:
            raise ValidationError({"detail": "Pozycji z przepisów nie można edytować."})

        for field in ("name", "unit", "metric_amount", "metric_unit"):
            if field in data:
                setattr(item, field, data[field])
        if "amount" in data:
            item.amount_text = data["amount"]
            item.amount = parse_amount(data["amount"])
        if "bought" in data:
            item.bought = data["bought"]
            item.bought_amount = item.amount if item.bought else None
        item.save()
        return Response(ShoppingListItemSerializer(item).data)

    def delete(self, request, list_id, item_id):
        item = self.get_item(request, list_id, item_id)
        if item.origin == ShoppingListItem.RECIPE:
            raise ValidationError({"detail": "Pozycji z przepisów nie można usunąć. Oznacz ją jako kupioną."})
        item.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
