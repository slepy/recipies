import { apiRequest } from "../../shared/api/client"

export type RecipeSetSummary = {
  id: number
  name: string
  shopping_list: number
  recipe_count: number
  created_at: string
  updated_at: string
}

export type RecipeSet = RecipeSetSummary & {
  recipes: { id: number; title: string }[]
}

// Saving the recipes replaces the whole choice and recomputes the set's shopping list.
export type RecipeSetInput = { name?: string; recipes?: number[] }

const setsPath = "/api/recipe-sets/"

export function getRecipeSets(accessToken: string) {
  return apiRequest<RecipeSetSummary[]>(accessToken, setsPath, {}, "Nie udało się wczytać zestawów.")
}

export function getRecipeSet(accessToken: string, setId: number) {
  return apiRequest<RecipeSet>(accessToken, `${setsPath}${setId}/`, {}, "Nie udało się wczytać zestawu.")
}

export function createRecipeSet(accessToken: string, name: string) {
  return apiRequest<RecipeSet>(accessToken, setsPath, { method: "POST", body: { name } }, "Nie udało się utworzyć zestawu.")
}

export function updateRecipeSet(accessToken: string, setId: number, changes: RecipeSetInput) {
  return apiRequest<RecipeSet>(accessToken, `${setsPath}${setId}/`, { method: "PATCH", body: changes }, "Nie udało się zapisać zestawu.")
}

// Adding a recipe that is already in the set is not an error and adds nothing.
export function addRecipeToSet(accessToken: string, setId: number, recipeId: number) {
  return apiRequest<RecipeSet>(
    accessToken,
    `${setsPath}${setId}/recipes/`,
    { method: "POST", body: { recipe: recipeId } },
    "Nie udało się dodać przepisu do zestawu.",
  )
}

export function deleteRecipeSet(accessToken: string, setId: number) {
  return apiRequest<void>(accessToken, `${setsPath}${setId}/`, { method: "DELETE" }, "Nie udało się usunąć zestawu.")
}
