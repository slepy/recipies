from django.urls import path

from recipes.views import RecipeCollectionView


urlpatterns = [
    path("", RecipeCollectionView.as_view(), name="recipe-collection"),
]