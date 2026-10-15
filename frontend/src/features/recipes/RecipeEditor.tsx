import { useEffect, useState } from "react"

import { ApiError, getRecipe, getRecipePhoto, Recipe, RecipeInput, updateRecipe } from "./api"
import RecipeForm from "./RecipeForm"

type RecipeEditorProps = {
  accessToken: string
  recipeId: number
  // Called after a cancel and after a successful save.
  onBack: () => void
}

type LoadedRecipe = {
  recipe: Recipe
  photoUrl: string
}

export default function RecipeEditor({ accessToken, recipeId, onBack }: RecipeEditorProps) {
  const [loaded, setLoaded] = useState<LoadedRecipe | null>(null)
  const [loadError, setLoadError] = useState("")

  useEffect(() => {
    let isCurrent = true
    let photoUrl = ""

    async function load() {
      try {
        const recipe = await getRecipe(accessToken, recipeId)
        if (recipe.photo_url) {
          // A photo that fails to load only hides its preview; the rest of the recipe can still be edited.
          const photo = await getRecipePhoto(accessToken, recipe.photo_url).catch(() => null)
          if (photo) photoUrl = URL.createObjectURL(photo)
          // Left the page while the photo loaded: the cleanup already ran, so release it here.
          if (!isCurrent && photoUrl) URL.revokeObjectURL(photoUrl)
        }
        if (isCurrent) setLoaded({ recipe, photoUrl })
      } catch (requestError) {
        if (isCurrent) {
          setLoadError(
            requestError instanceof ApiError && requestError.message
              ? requestError.message
              : "Nie udało się pobrać przepisu.",
          )
        }
      }
    }

    void load()
    return () => {
      isCurrent = false
      if (photoUrl) URL.revokeObjectURL(photoUrl)
    }
  }, [accessToken, recipeId])

  async function saveChanges(recipeInput: RecipeInput) {
    await updateRecipe(accessToken, recipeId, recipeInput)
    onBack()
  }

  return (
    <div className="page">
      <div className="recipe-workspace recipe-workspace--form">
        <section className="recipe-editor" aria-labelledby="recipe-heading">
          <button className="text-button recipe-back" onClick={onBack} type="button">
            ← Moje przepisy
          </button>
          <span className="eyebrow">TWOJA KUCHNIA</span>
          <h1 id="recipe-heading">Edytuj przepis</h1>

          {loadError ? (
            <p className="form-error" role="alert">{loadError}</p>
          ) : !loaded ? (
            <p className="session-message" role="status">Pobieram przepis...</p>
          ) : (
            <>
              <p className="recipe-intro">
                Zmiany zobaczysz od razu w planach, w których jest ten przepis. Gotowe listy zakupów się nie zmienią.
              </p>
              <RecipeForm
                initialValues={loaded.recipe}
                onCancel={onBack}
                onSubmit={saveChanges}
                hasSavedPhoto={Boolean(loaded.recipe.photo_url)}
                savedPhotoUrl={loaded.photoUrl}
                submitLabel="Zapisz zmiany"
              />
            </>
          )}
        </section>
      </div>
    </div>
  )
}
