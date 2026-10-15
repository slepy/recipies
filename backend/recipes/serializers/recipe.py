from django.core.validators import FileExtensionValidator
from django.urls import reverse
from rest_framework import serializers

from recipes.models import Recipe
from recipes.errors import InvalidPhotoError
from recipes.services import PhotoSanitizer

METRIC_UNITS = ("g", "kg", "ml", "l")


class IngredientSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=200, required=False, allow_blank=True)
    amount = serializers.CharField(max_length=100, required=False, allow_blank=True)
    unit = serializers.CharField(max_length=100, required=False, allow_blank=True)
    # Metric measure used for shopping-list sums: g and kg add up, ml and l add up.
    metric_amount = serializers.FloatField(required=False, allow_null=True, min_value=0, max_value=1000000)
    metric_unit = serializers.ChoiceField(choices=METRIC_UNITS, required=False, allow_blank=True)


class RecipeSerializer(serializers.ModelSerializer):
    photo = serializers.ImageField(
        required=False,
        write_only=True,
        validators=[FileExtensionValidator(["jpg", "jpeg", "png", "webp"])],
    )
    photo_url = serializers.SerializerMethodField()
    ingredients = IngredientSerializer(many=True, required=False)
    steps = serializers.ListField(
        child=serializers.CharField(max_length=2000, allow_blank=True),
        required=False,
    )

    class Meta:
        model = Recipe
        fields = (
            "id",
            "title",
            "description",
            "servings",
            "prep_time_minutes",
            "cook_time_minutes",
            "ingredients",
            "steps",
            "photo",
            "photo_url",
            "created_at",
        )
        read_only_fields = ("id", "photo_url", "created_at")

    def validate_photo(self, photo):
        if photo.size > 5 * 1024 * 1024:
            raise serializers.ValidationError("Zdjęcie może mieć maksymalnie 5 MB.")
        try:
            return PhotoSanitizer().sanitize(photo)
        except InvalidPhotoError as error:
            raise serializers.ValidationError(str(error)) from error

    def get_photo_url(self, recipe):
        if not recipe.photo:
            return None
        return reverse("recipe-photo", kwargs={"recipe_id": recipe.pk})