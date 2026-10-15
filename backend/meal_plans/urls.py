from django.urls import path

from meal_plans.views import (
    EntryCollectionView,
    EntryDetailView,
    MealCollectionView,
    MealDetailView,
    PlanCollectionView,
    PlanDetailView,
)


urlpatterns = [
    path("", PlanCollectionView.as_view(), name="meal-plan-collection"),
    path("<int:plan_id>/", PlanDetailView.as_view(), name="meal-plan-detail"),
    path("<int:plan_id>/meals/", MealCollectionView.as_view(), name="meal-collection"),
    path("<int:plan_id>/meals/<int:meal_id>/", MealDetailView.as_view(), name="meal-detail"),
    path("<int:plan_id>/meals/<int:meal_id>/entries/", EntryCollectionView.as_view(), name="entry-collection"),
    path("<int:plan_id>/entries/<int:entry_id>/", EntryDetailView.as_view(), name="entry-detail"),
]
