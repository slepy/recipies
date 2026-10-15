from django.db import IntegrityError, transaction
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from ingredients.models import IngredientUnitWeight
from ingredients.normalization import name_key
from ingredients.rules import MAX_ENTRIES_PER_USER, PAGE_SIZE
from ingredients.serializers import IngredientUnitWeightSerializer

DUPLICATE_MESSAGE = "Taki wpis już istnieje."


class UnitWeightCollectionView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        """Entries in name, then unit order; ?q= keeps those whose name contains the phrase."""
        entries = IngredientUnitWeight.objects.filter(owner=request.user)
        query = name_key(request.query_params.get("q", ""))
        if query:
            entries = entries.filter(name_key__contains=query)
        paginator = PageNumberPagination()
        paginator.page_size = PAGE_SIZE
        page = paginator.paginate_queryset(entries, request, view=self)
        return paginator.get_paginated_response(IngredientUnitWeightSerializer(page, many=True).data)

    def post(self, request):
        if IngredientUnitWeight.objects.filter(owner=request.user).count() >= MAX_ENTRIES_PER_USER:
            raise ValidationError({"detail": f"Baza ma już {MAX_ENTRIES_PER_USER} wpisów. Usuń niepotrzebne, aby dodać nowy."})
        serializer = IngredientUnitWeightSerializer(data=request.data, context={"owner": request.user})
        serializer.is_valid(raise_exception=True)
        try:
            with transaction.atomic():
                entry = serializer.save(owner=request.user, source=IngredientUnitWeight.MANUAL)
        except IntegrityError as error:
            # The same key was saved in parallel between the check and the insert.
            raise ValidationError({"name": DUPLICATE_MESSAGE}) from error
        return Response(IngredientUnitWeightSerializer(entry).data, status=status.HTTP_201_CREATED)
