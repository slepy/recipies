# ADR-0006: Recipe Sets

- **Status:** Accepted
- **Date:** 2026-10-15
- **Decision owners:** Project owner

## Context

The recipe-based shopping list specification (`.ai/specs/2026-10-14-recipe-based-shopping-lists.md`) adds named "Zestawy przepisów". Each set has exactly one shopping list, which is recomputed when the set's recipes are saved and deleted together with the set. ADR-0005 left room for this: one `ShoppingList` model for every source, with a recipe set adding "its own optional link".

## Decision

- A new `recipe_sets` app owns `RecipeSet`: owner, name, a many-to-many `recipes` field and a one-to-one `shopping_list`. Django's automatic join table is unique per (set, recipe), so a recipe is in a set at most once.
- The link sits on the set (`RecipeSet.shopping_list`), not on the list. This keeps the dependency one-way: `recipe_sets` → `shopping_lists` → `meal_plans` → `recipes`. Deleting the list deletes the set through `CASCADE`, so the set's delete endpoint deletes the list.
- Saving a set's name or recipes and recomputing its list happen in one transaction (`RecipeSetUpdater`). The recompute reuses `ShoppingListRefresher.apply` with rows from `IngredientAggregator.aggregate_recipes`. Recipes are summed as written, without scaling by servings. Custom items, bought state and manual increases survive as for plan lists.
- A set's list has no plan, so the plan "stale" check and refresh do nothing for it. A list changes only when its set is saved. Changes to a recipe after it was added are not synchronised (out of scope in the specification).
- Frontend: the item list and custom-item form move from `ShoppingListView` to `shopping-lists/ShoppingListItems`, which the set's "Lista zakupów" tab reuses. The recipes screen gets a `renderRecipeActions` slot, which `App.tsx` fills with `recipe-sets/AddToRecipeSet`, so the `recipes` feature does not import `recipe-sets`.

## Consequences

- `GET /api/shopping-lists/` without `?plan=` also returns set lists. The frontend asks only for a plan's lists.
- Deleting a set's list through `/api/shopping-lists/<id>/` would delete the set as well. The UI offers this only as "Usuń zestaw", after a confirmation.
- Items that a save brings in are marked "nowa", as after a plan refresh. Items on a brand-new set are not.
