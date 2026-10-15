from rest_framework import serializers

from ingredients.models import IngredientUnitWeight
from ingredients.normalization import name_key, unit_key
from ingredients.rules import MAX_GRAMS_PER_UNIT, MIN_GRAMS_PER_UNIT

RANGE_MESSAGE = "Waga jednostki musi mieścić się w przedziale 0,01–100 000 g."


class IngredientUnitWeightSerializer(serializers.ModelSerializer):
    """An entry as the user adds or edits it; the owner comes from context["owner"], never from the body."""

    name = serializers.CharField(max_length=200, error_messages={"required": "Podaj nazwę produktu.", "blank": "Podaj nazwę produktu."})
    unit = serializers.CharField(max_length=100, required=False, allow_blank=True)
    grams_per_unit = serializers.FloatField(
        min_value=MIN_GRAMS_PER_UNIT,
        max_value=MAX_GRAMS_PER_UNIT,
        error_messages={
            "required": "Podaj wagę jednostki.",
            "invalid": "Podaj wagę jednostki jako liczbę.",
            "min_value": RANGE_MESSAGE,
            "max_value": RANGE_MESSAGE,
        },
    )

    class Meta:
        model = IngredientUnitWeight
        fields = ("id", "name", "unit", "grams_per_unit", "source", "created_at", "updated_at")
        read_only_fields = ("id", "source", "created_at", "updated_at")

    def validate_name(self, name):
        name = name.strip()
        if not name:
            raise serializers.ValidationError("Podaj nazwę produktu.")
        return name

    def validate_unit(self, unit):
        return unit.strip()

    def validate_grams_per_unit(self, grams):
        return round(grams, 2)

    def validate(self, entry):
        name = entry.get("name", getattr(self.instance, "name", ""))
        unit = entry.get("unit", getattr(self.instance, "unit", ""))
        existing = IngredientUnitWeight.objects.filter(
            owner=self.context["owner"], name_key=name_key(name), unit_key=unit_key(unit)
        )
        if self.instance is not None:
            existing = existing.exclude(pk=self.instance.pk)
        duplicate = existing.first()
        if duplicate:
            label = ", ".join(part for part in (duplicate.name, duplicate.unit) if part)
            raise serializers.ValidationError(
                {"name": f"Wpis „{label}” już istnieje ({duplicate.grams_per_unit:g} g). Popraw go zamiast dodawać nowy."}
            )
        return entry
