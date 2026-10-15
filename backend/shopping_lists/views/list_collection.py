from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from shopping_lists.models import ShoppingList
from shopping_lists.serializers import (
    ShoppingListCreateSerializer,
    ShoppingListDetailSerializer,
    ShoppingListSerializer,
)
from shopping_lists.services import ShoppingListCreator


class ListCollectionView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        lists = ShoppingList.objects.filter(owner=request.user)
        plan_id = request.query_params.get("plan")
        if plan_id and plan_id.isdigit():
            lists = lists.filter(plan_id=plan_id)
        return Response(ShoppingListSerializer(lists, many=True).data)

    def post(self, request):
        serializer = ShoppingListCreateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        shopping_list = ShoppingListCreator().create(
            owner=request.user,
            plan=data["plan"],
            name=data["name"],
            start_date=data["start_date"],
            end_date=data["end_date"],
            excluded_entry_ids=data["excluded_entry_ids"],
        )
        return Response(ShoppingListDetailSerializer(shopping_list).data, status=status.HTTP_201_CREATED)
