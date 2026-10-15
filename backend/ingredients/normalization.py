"""How ingredient text is read, shared by recipes, meal plans and shopping lists."""

import re

_NUMBER = re.compile(r"^(?:(\d+)\s+)?(\d+)/(\d+)$|^\d+(?:[.,]\d+)?$")


def name_key(name):
    """Lower case with single spaces, so "Pomidorki  Koktajlowe" and "pomidorki koktajlowe" match."""
    return " ".join(str(name or "").casefold().split())


def unit_key(unit):
    """Lower case without a trailing dot, so "Szt." and "szt" match; "sztuka" does not (no synonyms)."""
    return str(unit or "").strip().casefold().rstrip(".").strip()


def parse_amount(text):
    """Turn "2", "1,5", "1/2" or "1 1/2" into a float; return None for anything else ("do smaku", "2-3")."""
    value = str(text or "").strip()
    match = _NUMBER.match(value)
    if not match:
        return None
    if match.group(2) is None:
        return float(value.replace(",", "."))
    denominator = int(match.group(3))
    if denominator == 0:
        return None
    return int(match.group(1) or 0) + int(match.group(2)) / denominator
