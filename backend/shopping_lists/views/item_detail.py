from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from meal_plans.services import parse_amount
from shopping_lists.models import ShoppingListItem
from shopping_lists.serializers import (
    ShoppingListItemIncreaseSerializer,
    ShoppingListItemSerializer,
    ShoppingListItemWriteSerializer,
)
from shopping_lists.services.ingredient_aggregator import format_metric, metric_base


class ItemDetailView(APIView):
    permission_classes = (IsAuthenticated,)

    def get_item(self, request, list_id, item_id):
        return get_object_or_404(
            ShoppingListItem, pk=item_id, shopping_list_id=list_id, shopping_list__owner=request.user
        )

    def increase(self, request, item):
        """Add to a recipe item's amount, or take the manual increase back."""
        serializer = ShoppingListItemIncreaseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        if item.origin != ShoppingListItem.RECIPE:
            raise ValidationError({"detail": "Ilość własnej pozycji zmieniasz, edytując ją."})

        base = metric_base(item.metric_amount, item.metric_unit)
        dimension = "mass" if item.metric_unit in ("g", "kg") else "volume"
        if data.get("reset_increase"):
            if item.amount is not None:
                item.amount = round(item.amount - item.extra_amount, 2)
            if base is not None:
                base -= item.extra_metric
            item.extra_amount = item.extra_metric = 0
        if "increase_amount" in data:
            if item.amount is None:
                raise ValidationError({"increase_amount": "Ta pozycja nie ma ilości do zwiększenia."})
            item.amount = round(item.amount + data["increase_amount"], 2)
            item.extra_amount += data["increase_amount"]
        if "increase_metric_amount" in data:
            if base is None:
                raise ValidationError({"increase_metric_amount": "Ta pozycja nie ma wagi ani objętości do zwiększenia."})
            added = metric_base(data["increase_metric_amount"], item.metric_unit)
            base += added
            item.extra_metric += added
        if base is not None:
            item.metric_amount, item.metric_unit = format_metric(dimension, base)
        item.save()
        return Response(ShoppingListItemSerializer(item).data)

    def patch(self, request, list_id, item_id):
        item = self.get_item(request, list_id, item_id)
        if any(key in request.data for key in ("increase_amount", "increase_metric_amount", "reset_increase")):
            return self.increase(request, item)
        serializer = ShoppingListItemWriteSerializer(item, data=request.data, partial=True)
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
            item.bought_metric_base = metric_base(item.metric_amount, item.metric_unit) if item.bought else None
        item.save()
        return Response(ShoppingListItemSerializer(item).data)

    def delete(self, request, list_id, item_id):
        item = self.get_item(request, list_id, item_id)
        if item.origin == ShoppingListItem.RECIPE:
            raise ValidationError({"detail": "Pozycji z przepisów nie można usunąć. Oznacz ją jako kupioną."})
        item.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
