import logging

from django.db import transaction

from ingredients.models import IngredientUnitWeight
from ingredients.normalization import name_key, parse_amount, unit_key
from ingredients.rules import GRAMS_IN, MAX_ENTRIES_PER_USER, MAX_GRAMS_PER_UNIT, MIN_GRAMS_PER_UNIT

logger = logging.getLogger(__name__)


def grams_per_unit(amount_text, metric_amount, metric_unit):
    """Twelve pieces weighing 240 g give 20.0 g per piece; None when the numbers cannot give a sensible unit weight."""
    amount = parse_amount(amount_text)
    if amount is None or amount <= 0 or metric_unit not in GRAMS_IN or not metric_amount or metric_amount <= 0:
        return None
    grams = round(metric_amount * GRAMS_IN[metric_unit] / amount, 2)
    return grams if MIN_GRAMS_PER_UNIT <= grams <= MAX_GRAMS_PER_UNIT else None


class UnitWeightLearner:
    """Adds unit weights the user does not have yet; never changes an existing entry.

    Takes plain ingredient values (name, amount, unit, metric_amount, metric_unit), so recipes and
    shopping lists can call it without this app knowing their models.
    """

    def learn(self, owner, ingredients):
        try:
            # A savepoint: if learning fails, only its own writes are undone, never the caller's save.
            with transaction.atomic():
                self._learn(owner, ingredients)
        except Exception:
            logger.warning("Learning ingredient unit weights failed.", exc_info=True)

    def _learn(self, owner, ingredients):
        found = {}
        for ingredient in ingredients:
            name = str(ingredient.get("name") or "").strip()
            grams = grams_per_unit(ingredient.get("amount"), ingredient.get("metric_amount"), ingredient.get("metric_unit"))
            if not name or grams is None:
                continue
            unit = str(ingredient.get("unit") or "").strip()
            # The first ingredient with a given key wins, as the user listed them.
            found.setdefault((name_key(name), unit_key(unit)), (name, unit, grams))
        if not found:
            return

        entries = IngredientUnitWeight.objects.filter(owner=owner)
        known = set(entries.filter(name_key__in={key[0] for key in found}).values_list("name_key", "unit_key"))
        room = max(MAX_ENTRIES_PER_USER - entries.count(), 0)
        new = [(key, value) for key, value in found.items() if key not in known][:room]
        # bulk_create skips save(), so the keys are set here; ignore_conflicts covers a parallel save of the same key.
        IngredientUnitWeight.objects.bulk_create(
            [
                IngredientUnitWeight(
                    owner=owner,
                    name=name,
                    name_key=keys[0],
                    unit=unit,
                    unit_key=keys[1],
                    grams_per_unit=grams,
                    source=IngredientUnitWeight.AUTO,
                )
                for keys, (name, unit, grams) in new
            ],
            ignore_conflicts=True,
        )
