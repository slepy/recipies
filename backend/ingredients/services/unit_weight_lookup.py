from ingredients.models import IngredientUnitWeight
from ingredients.normalization import name_key, unit_key


class UnitWeightLookup:
    """The owner's grams per unit for a set of product names, loaded with one query."""

    def __init__(self, owner, names):
        rows = IngredientUnitWeight.objects.filter(owner=owner, name_key__in={name_key(name) for name in names})
        self.weights = {
            (row_name, row_unit): grams
            for row_name, row_unit, grams in rows.values_list("name_key", "unit_key", "grams_per_unit")
        }

    def grams_per_unit(self, name, unit):
        return self.weights.get((name_key(name), unit_key(unit)))
