export type Ingredient = {
  name: string
  amount: string
  unit: string
  metric_amount: number | null
  metric_unit: "" | "g" | "kg" | "ml" | "l"
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
  // Only for an update: drops the saved photo when no new one is sent.
  remove_photo?: boolean
}

export type Recipe = Omit<RecipeInput, "photo" | "remove_photo"> & {
  id: number
  photo_url: string | null
  created_at: string
}

export type RecipeDraft = Omit<RecipeInput, "photo" | "remove_photo"> & {
  dish_photo: string | null
}

export class ApiError extends Error {
  code: string

  constructor(message: string, code = "") {
    super(message)
    this.code = code
  }
}

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
  path = recipesPath,
) {
  const response = await fetch(path, {
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

// Without a photo the recipe goes as JSON; with one, as a form with the details as JSON text and the file.
function recipeBody(recipe: RecipeInput): RequestInit {
  const { photo, ...recipeDetails } = recipe
  if (!photo) {
    return { headers: { "Content-Type": "application/json" }, body: JSON.stringify(recipeDetails) }
  }

  const formData = new FormData()
  formData.append("recipe", JSON.stringify(recipeDetails))
  formData.append("photo", photo)
  return { body: formData }
}

export async function createRecipe(accessToken: string, recipe: RecipeInput) {
  return (await request(accessToken, { method: "POST", ...recipeBody(recipe) })) as Recipe
}

export async function getRecipe(accessToken: string, recipeId: number) {
  const response = await fetch(`${recipesPath}${recipeId}/`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (response.status === 404) throw new ApiError("Nie znaleziono przepisu.", "not_found")
  return (await readResponse(response, "Nie udało się pobrać przepisu.")) as Recipe
}

export async function updateRecipe(accessToken: string, recipeId: number, recipe: RecipeInput) {
  return (await request(
    accessToken,
    { method: "PATCH", ...recipeBody(recipe) },
    "Nie udało się zapisać zmian.",
    `${recipesPath}${recipeId}/`,
  )) as Recipe
}

export async function getRecipePhoto(accessToken: string, photoUrl: string) {
  const response = await fetch(photoUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) throw new ApiError("")
  return response.blob()
}

export async function recognizeRecipeImage(accessToken: string, image: File, signal?: AbortSignal) {
  const formData = new FormData()
  formData.append("image", image)
  const response = await fetch(`${recipesPath}recognize/`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: formData,
    signal,
  })
  const payload: unknown = await response.json().catch(() => ({}))
  if (!response.ok) {
    const fields = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {}
    const imageError = Array.isArray(fields.image) ? fields.image[0] : fields.image
    const message = [fields.detail, imageError].find((value) => typeof value === "string")
    throw new ApiError(
      typeof message === "string" ? message : "Nie udało się rozpoznać przepisu.",
      typeof fields.code === "string" ? fields.code : "",
    )
  }
  return payload as RecipeDraft
}
