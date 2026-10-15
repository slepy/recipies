from ingredients.normalization import name_key
from meal_plans.services import IngredientScaler

MASS = {"g": 1, "kg": 1000}
VOLUME = {"ml": 1, "l": 1000}


def metric_base(amount, unit):
    """Metric amount in g or ml, or None when the item has no metric measure."""
    if amount is None:
        return None
    return amount * {**MASS, **VOLUME}.get(unit, 1)


def format_metric(dimension, base):
    """Show a total in g/ml, switching to kg/l from one thousand. Rounds the finished sum only."""
    if base is None:
        return None, ""
    small, large = ("g", "kg") if dimension == "mass" else ("ml", "l")
    if base >= 1000:
        return round(base / 1000, 2), large
    return round(base, 2), small


class IngredientAggregator:
    """Scales the ingredients of plan entries and sums them per product.

    The household measure (amount + unit) is added only within the same unit, and the metric one
    (g/kg together, ml/l together) within the same kind, each on its own. One row carries both
    measures; a second row appears only when a product has several household units or both mass
    and volume. There are no conversions between kinds.
    """

    def aggregate(self, entries):
        scaler = IngredientScaler()
        products = {}
        for entry in entries:
            for ingredient in scaler.scale(entry.recipe, entry.servings):
                name = ingredient["name"].strip()
                if not name:
                    continue
                household = (ingredient["amount"], ingredient["unit"].strip()) if ingredient["amount"] is not None else None
                metric = self.metric(ingredient)
                normalized_name = name_key(name)
                products.setdefault(normalized_name, {"name": name, "contributions": []})["contributions"].append(
                    (household, metric)
                )

        rows = []
        for normalized_name, product in sorted(products.items()):
            rows.extend(self.rows(normalized_name, product))
        return rows

    def metric(self, ingredient):
        amount, unit = ingredient["metric_amount"], ingredient["metric_unit"]
        if amount is not None and unit in MASS:
            return "mass", amount * MASS[unit]
        if amount is not None and unit in VOLUME:
            return "volume", amount * VOLUME[unit]
        return None

    def rows(self, normalized_name, product):
        households, metrics = {}, {}
        without_household = without_metric = 0
        for household, metric in product["contributions"]:
            if household:
                amount, unit = household
                group = households.setdefault(unit.casefold(), [unit, 0])
                group[1] += amount
            else:
                without_household += 1
            if metric:
                dimension, base = metric
                metrics[dimension] = metrics.get(dimension, 0) + base
            else:
                without_metric += 1

        household_groups = sorted(households.items())
        metric_groups = sorted(metrics.items())
        row_count = max(len(household_groups), len(metric_groups), 1)
        # A sum is partial when some contribution lacks a measure that others have.
        partial = row_count > 1 or bool(
            (household_groups and without_household) or (metric_groups and without_metric)
        )

        rows = []
        for index in range(row_count):
            unit_key, (unit, amount) = household_groups[index] if index < len(household_groups) else ("", ("", None))
            dimension, base = metric_groups[index] if index < len(metric_groups) else ("", None)
            rows.append(
                {
                    "key": f"{normalized_name}|{unit_key}|{dimension}",
                    "name": product["name"],
                    "amount": amount,
                    "unit": unit,
                    "dimension": dimension,
                    "metric_base": base,
                    "partial": partial,
                }
            )
        return rows

    def present(self, row, extra_amount=0, extra_metric=0):
        """What the list shows for a computed row plus the user's manual increase."""
        amount = None if row["amount"] is None else round(row["amount"] + extra_amount, 2)
        base = None if row["metric_base"] is None else row["metric_base"] + extra_metric
        metric_amount, metric_unit = format_metric(row["dimension"], base)
        return {
            "name": row["name"],
            "key": row["key"],
            "amount": amount,
            "unit": row["unit"],
            "metric_amount": metric_amount,
            "metric_unit": metric_unit,
            "partial": row["partial"],
        }
