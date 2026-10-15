from django.urls import path

from shopping_lists.views import (
    ItemCollectionView,
    ItemDetailView,
    ListCollectionView,
    ListDetailView,
    ListRefreshView,
)


urlpatterns = [
    path("", ListCollectionView.as_view(), name="shopping-list-collection"),
    path("<int:list_id>/", ListDetailView.as_view(), name="shopping-list-detail"),
    path("<int:list_id>/refresh/", ListRefreshView.as_view(), name="shopping-list-refresh"),
    path("<int:list_id>/items/", ItemCollectionView.as_view(), name="shopping-list-item-collection"),
    path("<int:list_id>/items/<int:item_id>/", ItemDetailView.as_view(), name="shopping-list-item-detail"),
]
