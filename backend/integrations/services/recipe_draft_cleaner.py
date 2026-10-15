from integrations.errors import InvalidRecognitionResponse

METRIC_UNITS = ("g", "kg", "ml", "l")


class RecipeDraftCleaner:
    """Keeps only known recipe fields with the right types; anything unreadable stays empty."""

    def clean(self, raw) -> dict:
        if not isinstance(raw, dict):
            raise InvalidRecognitionResponse

        raw_ingredients = raw.get("ingredients")
        ingredients = []
        for item in raw_ingredients if isinstance(raw_ingredients, list) else []:
            if not isinstance(item, dict):
                continue
            ingredient = {
                "name": self._text(item.get("name"), 200),
                "amount": self._amount(item.get("amount")),
                "unit": self._text(item.get("unit"), 100),
                "metric_amount": self._metric_amount(item.get("metric_amount")),
                "metric_unit": self._metric_unit(item.get("metric_unit")),
            }
            if not ingredient["metric_amount"] or not ingredient["metric_unit"]:
                # a metric measure needs both parts, otherwise it cannot be summed
                ingredient["metric_amount"], ingredient["metric_unit"] = None, ""
            if any(value not in ("", None) for value in ingredient.values()):
                ingredients.append(ingredient)

        raw_steps = raw.get("steps")
        steps = [self._text(item, 2000) for item in raw_steps] if isinstance(raw_steps, list) else []

        return {
            "title": self._text(raw.get("title"), 200),
            "description": self._text(raw.get("description"), 5000),
            "servings": self._whole_number(raw.get("servings"), 32767),
            "prep_time_minutes": self._whole_number(raw.get("prep_time_minutes"), 100000),
            "cook_time_minutes": self._whole_number(raw.get("cook_time_minutes"), 100000),
            "ingredients": ingredients,
            "steps": [step for step in steps if step],
            "dish_region": raw.get("dish_region"),
        }

    def _text(self, value, limit):
        return value.strip()[:limit] if isinstance(value, str) else ""

    def _amount(self, value):
        # Models often return 3 or 0.5 instead of "3" or "0.5".
        if isinstance(value, bool):
            return ""
        if isinstance(value, (int, float)):
            return f"{value:g}"
        return self._text(value, 100)

    def _metric_amount(self, value):
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            return None
        return value if 0 < value <= 1000000 else None

    def _metric_unit(self, value):
        unit = value.strip().lower() if isinstance(value, str) else ""
        return unit if unit in METRIC_UNITS else ""

    def _whole_number(self, value, maximum):
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            return None
        return int(value) if 0 <= value <= maximum else None
