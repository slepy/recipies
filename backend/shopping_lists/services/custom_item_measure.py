from ingredients.services import UnitWeightLearner, UnitWeightLookup
from shopping_lists.services.ingredient_aggregator import format_metric


class CustomItemMeasure:
    """Links a custom item's weight with the ingredient knowledge base.

    A weight the user typed in is theirs: it teaches the base and is never recalculated. Without one,
    a numeric amount of a product the base knows gets an estimated weight, redone whenever the item is saved.
    """

    def estimate(self, item, owner, metric_given):
        """Call before saving, with metric_given=True when the request carried a weight."""
        if metric_given:
            item.metric_estimated = False
            return
        if item.metric_amount is not None and not item.metric_estimated:
            return
        grams = UnitWeightLookup(owner, [item.name]).grams_per_unit(item.name, item.unit)
        if grams is not None and item.amount is not None and item.amount > 0:
            item.metric_amount, item.metric_unit = format_metric("mass", item.amount * grams)
            item.metric_estimated = True
        elif item.metric_estimated:
            # The amount no longer allows an estimate, so the old one would be wrong.
            item.metric_amount, item.metric_unit, item.metric_estimated = None, "", False

    def learn(self, item, owner):
        """Call after saving; an estimated weight came from the base, so it teaches nothing."""
        if item.metric_amount is None or item.metric_estimated:
            return
        UnitWeightLearner().learn(
            owner,
            [
                {
                    "name": item.name,
                    "amount": item.amount_text,
                    "unit": item.unit,
                    "metric_amount": item.metric_amount,
                    "metric_unit": item.metric_unit,
                }
            ],
        )
