import { ReactNode, useEffect, useState } from "react"

import { getProviderConfiguration } from "../integrations/api"
import { ApiError, createRecipe, getRecipePhoto, getRecipes, Ingredient, Recipe, RecipeDraft, RecipeInput } from "./api"
import RecipeForm, { RecipeFormValues } from "./RecipeForm"
import RecognitionImagePicker from "./RecognitionImagePicker"

type RecipeWorkspaceProps = {
  accessToken: string
  onOpenIntegrations: () => void
  onEditRecipe: (recipeId: number) => void
  // Extra actions shown on each recipe, such as "Dodaj do zestawu" from the recipe-sets feature.
  renderRecipeActions?: (recipe: Recipe) => ReactNode
}

// What a recognised image puts into the form; a new draft remounts the form with these values.
type FormDraft = {
  values: RecipeFormValues
  photo: File | null
}

function dataUrlToFile(dataUrl: string, name: string) {
  const [header, encoded] = dataUrl.split(",")
  const type = header.match(/^data:([^;]+)/)?.[1] ?? "image/jpeg"
  const bytes = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0))
  return new File([bytes], name, { type })
}

function ingredientSummary(ingredient: Ingredient) {
  const metric = ingredient.metric_amount ? `(${ingredient.metric_amount} ${ingredient.metric_unit})` : ""
  return [ingredient.amount, ingredient.unit, ingredient.name, metric].filter(Boolean).join(" ")
}

export default function RecipeWorkspace({
  accessToken,
  onOpenIntegrations,
  onEditRecipe,
  renderRecipeActions,
}: RecipeWorkspaceProps) {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [isProviderConfigured, setIsProviderConfigured] = useState(false)
  const [isProviderActive, setIsProviderActive] = useState(false)
  const [isLoadingProviderConfiguration, setIsLoadingProviderConfiguration] = useState(true)
  const [formDraft, setFormDraft] = useState<FormDraft | null>(null)
  const [formKey, setFormKey] = useState(0)
  const [recipePhotoUrls, setRecipePhotoUrls] = useState<Record<number, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [hasLoadedRecipes, setHasLoadedRecipes] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [loadError, setLoadError] = useState("")
  const [notice, setNotice] = useState("")

  useEffect(() => {
    let isCurrent = true

    getProviderConfiguration(accessToken)
      .then((configuration) => {
        if (!isCurrent) return
        setIsProviderConfigured(configuration.configured)
        setIsProviderActive(configuration.configured && configuration.is_active)
      })
      .catch(() => {
        if (isCurrent) setIsProviderConfigured(false)
      })
      .finally(() => {
        if (isCurrent) setIsLoadingProviderConfiguration(false)
      })

    return () => {
      isCurrent = false
    }
  }, [accessToken])

  useEffect(() => {
    let isCurrent = true

    getRecipes(accessToken)
      .then((result) => {
        if (isCurrent) {
          setRecipes(result)
          setHasLoadedRecipes(true)
        }
      })
      .catch((requestError: unknown) => {
        if (isCurrent && requestError instanceof ApiError && requestError.message) {
          setLoadError(requestError.message)
        }
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false)
      })

    return () => {
      isCurrent = false
    }
  }, [accessToken])

  useEffect(() => {
    let isCurrent = true
    const objectUrls: string[] = []

    Promise.all(
      recipes.map(async (recipe) => {
        if (!recipe.photo_url) return null
        try {
          const photoBlob = await getRecipePhoto(accessToken, recipe.photo_url)
          const photoObjectUrl = URL.createObjectURL(photoBlob)
          objectUrls.push(photoObjectUrl)
          return [recipe.id, photoObjectUrl] as const
        } catch {
          return null
        }
      }),
    ).then((entries) => {
      const photoEntries = entries.filter(
        (entry): entry is readonly [number, string] => entry !== null,
      )
      if (isCurrent) setRecipePhotoUrls(Object.fromEntries(photoEntries))
    })

    return () => {
      isCurrent = false
      objectUrls.forEach((photoObjectUrl) => URL.revokeObjectURL(photoObjectUrl))
    }
  }, [accessToken, recipes])

  function applyDraft(draft: RecipeDraft) {
    const { dish_photo: dishPhoto, ...values } = draft
    setFormDraft({ values, photo: dishPhoto ? dataUrlToFile(dishPhoto, "propozycja-ai.jpg") : null })
    setFormKey((current) => current + 1)
    setNotice("Szkic z rozpoznania. Sprawdź i popraw dane, zanim zapiszesz przepis.")
  }

  function startNewRecipe() {
    setNotice("")
    setIsCreating(true)
  }

  async function saveRecipe(recipeInput: RecipeInput) {
    setNotice("")
    const recipe = await createRecipe(accessToken, recipeInput)
    setRecipes((current) => [recipe, ...current])
    // A saved recipe empties the form for the next one.
    setFormDraft(null)
    setFormKey((current) => current + 1)
    setNotice("Przepis został zapisany w Twojej kolekcji.")
    setIsCreating(false)
  }

  return (
    <div className="page">
      {/* Hidden rather than removed, so leaving the add form keeps what was typed. */}
      <div className="recipe-workspace recipe-workspace--form" hidden={!isCreating}>
        <section className="recipe-editor" aria-labelledby="recipe-heading">
          <button className="text-button recipe-back" onClick={() => setIsCreating(false)} type="button">
            ← Moje przepisy
          </button>
          <span className="eyebrow">TWOJA KUCHNIA</span>
          <h1 id="recipe-heading">Dodaj przepis</h1>
          <p className="recipe-intro">Zapisz swój przepis, aby wrócić do niego przy planowaniu posiłków.</p>

          <section
            className={`recipe-ai-prompt${isProviderConfigured ? " recipe-ai-prompt--ready" : ""}`}
            aria-labelledby="recipe-ai-heading"
          >
            <div>
              <span className="eyebrow">ALTERNATYWNIE · AI</span>
              <h2 id="recipe-ai-heading">Odczytaj przepis z fotografii</h2>
              <p>Import ze zdjęcia będzie edytowalnym szkicem, który sprawdzisz przed zapisem.</p>
            </div>
            {isProviderConfigured ? (
              <RecognitionImagePicker
                accessToken={accessToken}
                isProviderActive={isProviderActive}
                onOpenIntegrations={onOpenIntegrations}
                onRecognized={applyDraft}
              />
            ) : (
              <button
                className="secondary-button"
                disabled={isLoadingProviderConfiguration}
                onClick={onOpenIntegrations}
                type="button"
              >
                {isLoadingProviderConfiguration ? "Sprawdzam AI..." : "Konfiguruj AI"}
              </button>
            )}
          </section>
          {notice && <p className="integration-status" role="status">{notice}</p>}

          <RecipeForm
            initialPhoto={formDraft?.photo}
            initialValues={formDraft?.values}
            isInitialPhotoProposed={Boolean(formDraft?.photo)}
            hidden={!isCreating}
            key={formKey}
            onSubmit={saveRecipe}
            submitLabel="Zapisz przepis"
          />
        </section>
      </div>
      {!isCreating && (
        <section className="recipe-home" aria-labelledby="collection-heading">
          <div className="page-header">
            <div>
              <span className="eyebrow">ZAPISANE NA TWOIM KONCIE</span>
              <h1 id="collection-heading">Moje przepisy</h1>
              <p className="page-intro">Twoja kolekcja sprawdzonych pomysłów na codzienne gotowanie.</p>
            </div>
            <button className="primary-button" onClick={startNewRecipe} type="button">
              + Dodaj nowy
            </button>
          </div>

          {notice && <p className="integration-status" role="status">{notice}</p>}
          {loadError && <p className="form-error" role="alert">{loadError}</p>}
          {isLoading ? (
            <p className="session-message" role="status">Pobieram przepisy...</p>
          ) : !hasLoadedRecipes ? null : recipes.length === 0 ? (
            <div className="collection-empty">
              <p>Nie masz jeszcze zapisanych przepisów.</p>
              <button className="text-button" onClick={startNewRecipe} type="button">
                Dodaj pierwszy przepis
              </button>
            </div>
          ) : (
            <div className="recipe-list">
              {recipes.map((recipe) => (
                <article className="recipe-entry" key={recipe.id}>
                  {recipePhotoUrls[recipe.id] ? (
                    <img className="recipe-entry__photo" src={recipePhotoUrls[recipe.id]} alt={recipe.title} />
                  ) : (
                    <div className="recipe-entry__photo recipe-entry__photo--empty" aria-hidden="true">
                      {recipe.title.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="recipe-entry-heading">
                    <div>
                      <h2>{recipe.title}</h2>
                      <p>{recipe.description || "Bez opisu"}</p>
                    </div>
                    <time dateTime={recipe.created_at}>
                      {new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium" }).format(new Date(recipe.created_at))}
                    </time>
                  </div>
                  {(recipe.servings || recipe.prep_time_minutes !== null || recipe.cook_time_minutes !== null) && (
                    <p className="recipe-entry-meta">
                      {recipe.servings && `${recipe.servings} por.`}
                      {recipe.prep_time_minutes !== null && ` · Przygotowanie ${recipe.prep_time_minutes} min`}
                      {recipe.cook_time_minutes !== null && ` · Gotowanie ${recipe.cook_time_minutes} min`}
                    </p>
                  )}
                  {(recipe.ingredients.length > 0 || recipe.steps.length > 0) && (
                    <details className="recipe-entry-details">
                      <summary>Składniki i przygotowanie</summary>
                      {recipe.ingredients.length > 0 && (
                        <ul className="recipe-entry-ingredients">
                          {recipe.ingredients.map((ingredient, index) => (
                            <li key={`${ingredient.name}-${index}`}>{ingredientSummary(ingredient)}</li>
                          ))}
                        </ul>
                      )}
                      {recipe.steps.length > 0 && (
                        <ol className="recipe-entry-steps">
                          {recipe.steps.map((step, index) => <li key={index}>{step}</li>)}
                        </ol>
                      )}
                    </details>
                  )}
                  <div className="recipe-entry-actions">
                    <button
                      aria-label={`Edytuj przepis: ${recipe.title}`}
                      className="text-button"
                      onClick={() => onEditRecipe(recipe.id)}
                      type="button"
                    >
                      Edytuj
                    </button>
                    {renderRecipeActions?.(recipe)}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}