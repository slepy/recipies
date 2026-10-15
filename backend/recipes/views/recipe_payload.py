import json

from rest_framework.exceptions import ValidationError


def read_recipe_payload(request):
    """Returns the recipe fields as a dict, from a JSON body or from a multipart form with a photo.

    A multipart form carries the fields as JSON text in "recipe" and the file in "photo".
    """
    if not request.content_type.startswith("multipart/form-data"):
        # A JSON body can also be a list, a string or null, which dict() cannot turn into fields.
        if not isinstance(request.data, dict):
            raise ValidationError({"recipe": "Dane przepisu muszą być obiektem JSON."})
        # A copy, so callers can pop keys without changing request.data.
        return dict(request.data)

    try:
        recipe_data = json.loads(request.data.get("recipe", ""))
    except (TypeError, ValueError) as error:
        raise ValidationError({"recipe": "Nieprawidłowe dane przepisu."}) from error

    if not isinstance(recipe_data, dict):
        raise ValidationError({"recipe": "Dane przepisu muszą być obiektem JSON."})
    photo = request.FILES.get("photo")
    if photo:
        recipe_data["photo"] = photo
    return recipe_data
