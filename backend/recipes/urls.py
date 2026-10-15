from django.urls import path

from recipes.views import RecipeCollectionView
from recipes.views.recipe_photo import RecipePhotoView


urlpatterns = [
    path("", RecipeCollectionView.as_view(), name="recipe-collection"),
    path("<int:recipe_id>/photo/", RecipePhotoView.as_view(), name="recipe-photo"),
]