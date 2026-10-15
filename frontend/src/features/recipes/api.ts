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
  photo?: File
}

export type Recipe = Omit<RecipeInput, "photo"> & {
  id: number
  photo_url: string | null
  created_at: string
}

export class ApiError extends Error {}

const recipesPath = "/api/recipes/"

async function readResponse(response: Response, fallbackMessage: string) {
  const payload: unknown = await response.json().catch(() => ({}))
  if (!response.ok) {
    const detail =
      payload && typeof payload === "object" && "detail" in payload
        ? payload.detail
        : null
    throw new ApiError(typeof detail === "string" ? detail : fallbackMessage)
  }
  return payload
}

async function request(
  accessToken: string,
  options: RequestInit = {},
  fallbackMessage = "Nie udało się zapisać przepisu.",
) {
  const response = await fetch(recipesPath, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...options.headers,
    },
  })
  return readResponse(response, fallbackMessage)
}

export async function getRecipes(accessToken: string) {
  return (await request(accessToken, {}, "")) as Recipe[]
}

export async function createRecipe(accessToken: string, recipe: RecipeInput) {
  const { photo, ...recipeDetails } = recipe
  if (!photo) {
    return (await request(accessToken, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(recipeDetails),
    })) as Recipe
  }

  const formData = new FormData()
  formData.append("recipe", JSON.stringify(recipeDetails))
  formData.append("photo", photo)
  return (await request(accessToken, { method: "POST", body: formData })) as Recipe
}

export async function getRecipePhoto(accessToken: string, photoUrl: string) {
  const response = await fetch(photoUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) throw new ApiError("")
  return response.blob()
}