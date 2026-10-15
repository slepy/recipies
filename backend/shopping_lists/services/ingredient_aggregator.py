from meal_plans.services import IngredientScaler

MASS = {"g": 1, "kg": 1000}
VOLUME = {"ml": 1, "l": 1000}


class IngredientAggregator:
    """Scales the ingredients of plan entries and sums them per product.

    Each ingredient contributes one measure: the metric one when it has it (g/kg add up, ml/l add up),
    otherwise the household one when the amount is a number (added only within the same unit),
    otherwise it stays on the list without a quantity. There are no conversions between kinds.
    """

    def aggregate(self, entries):
        scaler = IngredientScaler()
        groups = {}
        for entry in entries:
            source = {"recipe": entry.recipe.title, "date": entry.meal.date.isoformat(), "meal": entry.meal.name}
            for ingredient in scaler.scale(entry.recipe, entry.servings):
                name = ingredient["name"].strip()
                if not name:
                    continue
                measure, amount, unit = self.measure(ingredient)
                normalized_name = " ".join(name.casefold().split())
                group = groups.setdefault(
                    (normalized_name, measure),
                    {"name": name, "amount": None, "unit": unit, "sources": []},
                )
                if amount is not None:
                    group["amount"] = (group["amount"] or 0) + amount
                if source not in group["sources"]:
                    group["sources"].append(source)

        kinds_per_name = {}
        for normalized_name, measure in groups:
            kinds_per_name[normalized_name] = kinds_per_name.get(normalized_name, 0) + 1

        items = []
        for (normalized_name, measure), group in sorted(groups.items()):
            amount, unit = self.display(measure, group["amount"], group["unit"])
            items.append(
                {
                    "key": f"{normalized_name}|{measure}",
                    "name": group["name"],
                    "amount": amount,
                    "unit": unit,
                    "partial": kinds_per_name[normalized_name] > 1,
                    "sources": group["sources"],
                }
            )
        return items

    def measure(self, ingredient):
        metric_amount = ingredient["metric_amount"]
        metric_unit = ingredient["metric_unit"]
        if metric_amount is not None and metric_unit in MASS:
            return "mass", metric_amount * MASS[metric_unit], "g"
        if metric_amount is not None and metric_unit in VOLUME:
            return "volume", metric_amount * VOLUME[metric_unit], "ml"
        if ingredient["amount"] is not None:
            unit = ingredient["unit"].strip()
            return f"home:{unit.casefold()}", ingredient["amount"], unit
        return "none", None, ""

    def display(self, measure, amount, unit):
        if amount is None:
            return None, unit
        # Round the finished sum, not the parts, so rounding errors do not pile up.
        if measure == "mass" and amount >= 1000:
            return round(amount / 1000, 2), "kg"
        if measure == "volume" and amount >= 1000:
            return round(amount / 1000, 2), "l"
        return round(amount, 2), unit
