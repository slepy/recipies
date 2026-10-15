from django.urls import path

from recipe_sets.views import SetCollectionView, SetDetailView, SetRecipeCollectionView


urlpatterns = [
    path("", SetCollectionView.as_view(), name="recipe-set-collection"),
    path("<int:set_id>/", SetDetailView.as_view(), name="recipe-set-detail"),
    path("<int:set_id>/recipes/", SetRecipeCollectionView.as_view(), name="recipe-set-recipe-collection"),
]
