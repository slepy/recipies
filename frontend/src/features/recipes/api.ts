export type Ingredient = {
  name: string
  amount: string
  unit: string
}

export type RecipeInput = {
  title: string
  description: string
  servings: number | null
  prep_time_minutes: number | null
  cook_time_minutes: number | null
  ingredients: Ingredient[]
  steps: string[]
}

export type Recipe = RecipeInput & {
  id: number
  created_at: string
}

const recipesPath = "/api/recipes/"

async function readResponse(response: Response) {
  const payload: unknown = await response.json().catch(() => ({}))
  if (!response.ok) {
    const detail =
      payload && typeof payload === "object" && "detail" in payload
        ? payload.detail
        : null
    throw new Error(typeof detail === "string" ? detail : "Nie udało się zapisać przepisu.")
  }
  return payload
}

async function request(accessToken: string, options: RequestInit = {}) {
  const response = await fetch(recipesPath, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...options.headers,
    },
  })
  return readResponse(response)
}

export async function getRecipes(accessToken: string) {
  return (await request(accessToken)) as Recipe[]
}

export async function createRecipe(accessToken: string, recipe: RecipeInput) {
  return (await request(accessToken, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(recipe),
  })) as Recipe
}