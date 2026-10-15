import mimetypes

from django.http import FileResponse, Http404
from django.shortcuts import get_object_or_404
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView

from recipes.models import Recipe


class RecipePhotoView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request, recipe_id):
        recipe = get_object_or_404(Recipe, pk=recipe_id, owner=request.user)
        if not recipe.photo:
            raise Http404

        content_type = mimetypes.guess_type(recipe.photo.name)[0] or "application/octet-stream"
        response = FileResponse(recipe.photo.open("rb"), content_type=content_type)
        response["Cache-Control"] = "private, no-store"
        response["X-Content-Type-Options"] = "nosniff"
        return response