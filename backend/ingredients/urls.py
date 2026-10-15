from django.urls import path

from ingredients.views import UnitWeightCollectionView, UnitWeightDetailView


urlpatterns = [
    path("unit-weights/", UnitWeightCollectionView.as_view(), name="unit-weight-collection"),
    path("unit-weights/<int:entry_id>/", UnitWeightDetailView.as_view(), name="unit-weight-detail"),
]
