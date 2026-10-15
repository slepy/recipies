"""Limits from the ingredient knowledge base specification (2026-10-15-ingredient-knowledge-base.md)."""

MIN_GRAMS_PER_UNIT = 0.01
MAX_GRAMS_PER_UNIT = 100000
MAX_ENTRIES_PER_USER = 5000
PAGE_SIZE = 50
# Only mass is learned; volume would need a density per product.
GRAMS_IN = {"g": 1, "kg": 1000}
