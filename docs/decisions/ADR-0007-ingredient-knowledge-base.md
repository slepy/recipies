# ADR-0007: Ingredient Knowledge Base

- **Status:** Accepted
- **Date:** 2026-10-15
- **Decision owners:** Project owner

## Context

The ingredient knowledge base specification (`.ai/specs/2026-10-15-ingredient-knowledge-base.md`) asks the app to remember how many grams one unit of a product weighs, learn it from recipes and custom list items, and use it on shopping lists. Recipes and shopping lists both need this knowledge, which does not belong to either of them.

## Decision

- A new `ingredients` app owns `IngredientUnitWeight` (owner, name, unit, grams per unit, source `auto` or `manual`), unique per owner on a normalized name plus a normalized unit. It follows the simple style of `recipes` (models, serializers, views, one-use-case services), without ports and adapters.
- `recipes`, `meal_plans` and `shopping_lists` depend on `ingredients`; `ingredients` imports none of them. Callers pass plain values (name, amount, unit, metric amount and unit) to its services.
- The rules for reading ingredient text live in `ingredients/normalization.py`: the name key (also used by the shopping list sum), the unit key and the amount parser (moved from `meal_plans`, which still re-exports it). One place keeps the key on the list and in the base the same.
- Learning is an explicit service call from the views that save a recipe or a custom list item, not a Django signal, so the flow is visible in code. It only adds missing entries and never changes an existing one; a value changes only when the user edits it. It runs in a savepoint and logs its own errors, so it never blocks the save that triggered it.
- A custom list item whose weight was worked out from the base is flagged `metric_estimated`. Such a weight is recalculated when the item is saved again and never teaches the base; a weight typed by the user ends the estimate.

## Consequences

- The base starts empty and fills from new saves; existing recipes are not processed.
- Different spellings of a unit ("szt.", "sztuka") are separate entries until a synonym list is added.
- List responses carry `unit_weight` for every item, read with one query per list.
