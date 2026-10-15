from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import User
from recipes.models import Recipe


def create_user(email="cook@example.com"):
    return User.objects.create_user(email, "a-long-unique-password-48")


def client_for(user):
    client = APIClient()
    access_token = str(RefreshToken.for_user(user).access_token)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
    return client


def create_recipe(owner, title="Spaghetti", servings=2, ingredients=None):
    if ingredients is None:
        ingredients = [
            {"name": "makaron", "amount": "200", "unit": "g", "metric_amount": 200, "metric_unit": "g"},
            {"name": "jajka", "amount": "2", "unit": "szt", "metric_amount": None, "metric_unit": ""},
        ]
    return Recipe.objects.create(owner=owner, title=title, servings=servings, ingredients=ingredients)


def create_plan(client, start="2026-11-02", end="2026-11-04"):
    """Create a plan through the API and return the id of its first default meal with the plan id."""
    from meal_plans.models import Meal

    plan_id = client.post(
        "/api/meal-plans/", {"name": "Plan", "start_date": start, "end_date": end}, format="json"
    ).data["id"]
    return plan_id, list(Meal.objects.filter(plan_id=plan_id))


def add_entry(client, plan_id, meal, recipe, servings=None):
    data = {"recipe": recipe.pk, **({"servings": servings} if servings else {})}
    return client.post(f"/api/meal-plans/{plan_id}/meals/{meal.pk}/entries/", data, format="json").data
