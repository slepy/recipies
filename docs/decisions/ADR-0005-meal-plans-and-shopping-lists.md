# ADR-0005: Meal Plans and Shopping Lists

- **Status:** Accepted
- **Date:** 2026-10-15
- **Decision owners:** Project owner

## Context

The meal plan specification (`.ai/specs/2026-10-15-meal-plan.md`) needs a planner and shopping lists built from it. Its open question was whether `shopping_lists` should have one list model for every source (a recipe set or a plan) or separate tables.

## Decision

- A new `meal_plans` app owns plans, meals (one row per meal slot; a day is the set of meals sharing a date, so there is no day table) and entries (recipe plus servings). It reads recipes and never writes them.
- The `shopping_lists` app owns one `ShoppingList` model with an optional `plan` link and its `ShoppingListItem` rows. A recipe set can later add its own optional link without a new table. `shopping_lists` depends on `meal_plans`; `meal_plans` does not depend on `shopping_lists`.
- A list is a snapshot of the recipe items computed from a remembered scope (date range plus unchecked entry ids). It changes only when the user confirms a refresh, which keeps "bought" state stable during shopping.
- Every item stores its origin (`recipe` or `custom`). A refresh recomputes only recipe items and matches them to saved ones by a key (normalized name plus kind of measure), so custom items and bought state survive.
- Scaling lives in `meal_plans.services.IngredientScaler` and summing in `shopping_lists.services.IngredientAggregator`. The household measure (amount + unit) is summed per unit and the metric one (g/kg together, ml/l together) per kind, each independently, and one row shows both. A second row appears only for several household units or both mass and volume. There are no conversions between kinds.
- "Plan changed" is computed, not versioned: the list is stale when recomputing it would add, change or remove a recipe item.

## Consequences

- The aggregator is shared by any future list source.
- A row is flagged as a partial sum when some recipe lacks a measure that others have.
- The user can raise the amount of a recipe item by hand. The increase is stored separately (`extra_amount`, `extra_metric` in g/ml) and added after every refresh, so it survives plan changes. Recipe names are not shown on the list.
- Staleness is recomputed on every list read, which is cheap at the limits the specification sets (92 days, 6 meals, 20 entries per meal).
