from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from shopping_lists.models import ShoppingList
from shopping_lists.serializers import ShoppingListDetailSerializer


class ListDetailView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request, list_id):
        shopping_list = get_object_or_404(ShoppingList, pk=list_id, owner=request.user)
        return Response(ShoppingListDetailSerializer(shopping_list).data)

    def delete(self, request, list_id):
        get_object_or_404(ShoppingList, pk=list_id, owner=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
