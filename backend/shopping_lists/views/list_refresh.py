from django.shortcuts import get_object_or_404
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from shopping_lists.models import ShoppingList
from shopping_lists.serializers import ShoppingListDetailSerializer
from shopping_lists.services import ShoppingListRefresher


class ListRefreshView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request, list_id):
        """Summary of what a refresh would change; nothing is saved."""
        shopping_list = get_object_or_404(ShoppingList, pk=list_id, owner=request.user)
        return Response(ShoppingListRefresher().preview(shopping_list))

    def post(self, request, list_id):
        shopping_list = get_object_or_404(ShoppingList, pk=list_id, owner=request.user)
        refreshed = ShoppingListRefresher().apply(shopping_list)
        return Response(ShoppingListDetailSerializer(refreshed).data)
