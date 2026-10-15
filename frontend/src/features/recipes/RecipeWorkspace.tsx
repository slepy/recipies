import { FormEvent, useEffect, useState } from "react"

import { getProviderConfiguration } from "../integrations/api"
import { ApiError, createRecipe, getRecipePhoto, getRecipes, Ingredient, Recipe, RecipeInput } from "./api"
import { imageAccept, imageFormatsHint, validateImage } from "./imageRules"
import RecognitionImagePicker from "./RecognitionImagePicker"

type RecipeWorkspaceProps = {
  accessToken: string
  accountEmail: string
  accountError: string
  onOpenIntegrations: () => void
  onSignOut: () => void
}

type IngredientDraft = Ingredient

const emptyIngredient: IngredientDraft = { name: "", amount: "", unit: "" }

function optionalNumber(value: string) {
  return value === "" ? null : Number(value)
}

function ingredientSummary(ingredient: Ingredient) {
  return [ingredient.amount, ingredient.unit, ingredient.name].filter(Boolean).join(" ")
}

export default function RecipeWorkspace({
  accessToken,
  accountEmail,
  accountError,
  onOpenIntegrations,
  onSignOut,
}: RecipeWorkspaceProps) {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [isProviderConfigured, setIsProviderConfigured] = useState(false)
  const [isLoadingProviderConfiguration, setIsLoadingProviderConfiguration] = useState(true)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [servings, setServings] = useState("")
  const [prepTime, setPrepTime] = useState("")
  const [cookTime, setCookTime] = useState("")
  const [ingredients, setIngredients] = useState<IngredientDraft[]>([{ ...emptyIngredient }])
  const [steps, setSteps] = useState<string[]>([""])
  const [dishPhoto, setDishPhoto] = useState<File | null>(null)
  const [dishPhotoPreview, setDishPhotoPreview] = useState("")
  const [photoError, setPhotoError] = useState("")
  const [recipePhotoUrls, setRecipePhotoUrls] = useState<Record<number, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [hasLoadedRecipes, setHasLoadedRecipes] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [error, setError] = useState("")
  const [loadError, setLoadError] = useState("")
  const [notice, setNotice] = useState("")

  useEffect(() => {
    let isCurrent = true

    getProviderConfiguration(accessToken)
      .then((configuration) => {
        if (isCurrent) setIsProviderConfigured(configuration.configured)
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
    if (!dishPhoto) {
      setDishPhotoPreview("")
      return
    }

    const previewUrl = URL.createObjectURL(dishPhoto)
    setDishPhotoPreview(previewUrl)
    return () => URL.revokeObjectURL(previewUrl)
  }, [dishPhoto])

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

  function updateIngredient(index: number, field: keyof IngredientDraft, value: string) {
    setIngredients((current) =>
      current.map((ingredient, ingredientIndex) =>
        ingredientIndex === index ? { ...ingredient, [field]: value } : ingredient,
      ),
    )
  }

  function selectDishPhoto(file: File | undefined) {
    setPhotoError("")
    if (!file) {
      setDishPhoto(null)
      return
    }
    const message = validateImage(file, "zdjęcie")
    setPhotoError(message)
    setDishPhoto(message ? null : file)
  }

  function startNewRecipe() {
    setError("")
    setPhotoError("")
    setIsCreating(true)
  }

  async function submitRecipe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setNotice("")
    setIsSaving(true)

    const recipeInput: RecipeInput = {
      title: title.trim(),
      description: description.trim(),
      servings: optionalNumber(servings),
      prep_time_minutes: optionalNumber(prepTime),
      cook_time_minutes: optionalNumber(cookTime),
      ingredients: ingredients
        .map((ingredient) => ({
          name: ingredient.name.trim(),
          amount: ingredient.amount.trim(),
          unit: ingredient.unit.trim(),
        }))
        .filter((ingredient) => ingredient.name || ingredient.amount || ingredient.unit),
      steps: steps.map((step) => step.trim()).filter(Boolean),
    }
    if (dishPhoto) recipeInput.photo = dishPhoto

    try {
      const recipe = await createRecipe(accessToken, recipeInput)
      setRecipes((current) => [recipe, ...current])
      setTitle("")
      setDescription("")
      setServings("")
      setPrepTime("")
      setCookTime("")
      setIngredients([{ ...emptyIngredient }])
      setSteps([""])
      setDishPhoto(null)
      setNotice("Przepis został zapisany w Twojej kolekcji.")
      setIsCreating(false)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Nie udało się zapisać przepisu.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main className="recipe-app">
      <header className="recipe-topbar">
        <a className="wordmark wordmark--dark" href="/" aria-label="Miska, strona główna">
          miska<span>.</span>
        </a>
        <div className="recipe-account">
          <span>{accountEmail}</span>
          <button className="text-button" type="button" onClick={onOpenIntegrations}>
            Integracje AI
          </button>
          <button className="text-button" type="button" onClick={onSignOut}>
            Wyloguj się
          </button>
        </div>
      </header>
      {accountError && (
        <p className="recipe-account-error" role="alert">{accountError}</p>
      )}

      {isCreating ? (
      <div className="recipe-workspace recipe-workspace--form">
        <section className="recipe-editor" aria-labelledby="recipe-heading">
          <button className="text-button recipe-back" onClick={() => setIsCreating(false)} type="button">
            ← Moje przepisy
          </button>
          <span className="eyebrow">TWOJA KUCHNIA</span>
          <h1 id="recipe-heading">Dodaj przepis</h1>
          <p className="recipe-intro">Zapisz swój przepis, aby wrócić do niego przy planowaniu posiłków.</p>

          <section className="recipe-ai-prompt" aria-labelledby="recipe-ai-heading">
            <div>
              <span className="eyebrow">ALTERNATYWNIE · AI</span>
              <h2 id="recipe-ai-heading">Odczytaj przepis z fotografii</h2>
              <p>Import ze zdjęcia będzie edytowalnym szkicem. Rozpoznawanie uruchomimy po zatwierdzeniu dostawcy i zasad wysyłania zdjęć.</p>
            </div>
            <button
              className="secondary-button"
              disabled={isLoadingProviderConfiguration}
              onClick={onOpenIntegrations}
              type="button"
            >
              {isLoadingProviderConfiguration
                ? "Sprawdzam AI..."
                : isProviderConfigured
                  ? "Zarządzaj AI"
                  : "Konfiguruj AI"}
            </button>
          </section>

          <RecognitionImagePicker />

          <form className="recipe-form" onSubmit={submitRecipe}>
            <fieldset className="recipe-section">
              <legend>Część opisowa</legend>
              <label className="recipe-field" htmlFor="recipe-title">
                <span>Tytuł <span aria-hidden="true">*</span></span>
                <input
                  autoComplete="off"
                  id="recipe-title"
                  maxLength={200}
                  onChange={(event) => setTitle(event.target.value)}
                  required
                  value={title}
                />
              </label>
              <label className="recipe-field" htmlFor="recipe-description">
                <span>Opis lub notatka</span>
                <textarea
                  id="recipe-description"
                  onChange={(event) => setDescription(event.target.value)}
                  rows={3}
                  value={description}
                />
              </label>
              <div className="recipe-photo-field">
                <label className="recipe-field" htmlFor="recipe-photo">
                  <span>Zdjęcie gotowego dania</span>
                  <span className="recipe-photo-picker">
                    <span>{dishPhoto ? dishPhoto.name : "Wybierz zdjęcie"}</span>
                    <input
                      accept={imageAccept}
                      id="recipe-photo"
                      onChange={(event) => selectDishPhoto(event.target.files?.[0])}
                      type="file"
                    />
                  </span>
                  <small>{imageFormatsHint}</small>
                </label>
                {photoError && <p className="form-error" role="alert">{photoError}</p>}
                {dishPhotoPreview && (
                  <div className="recipe-photo-preview">
                    <img src={dishPhotoPreview} alt="Podgląd zdjęcia gotowego dania" />
                    <button className="text-button" onClick={() => setDishPhoto(null)} type="button">
                      Usuń zdjęcie
                    </button>
                  </div>
                )}
              </div>
              <div className="recipe-number-grid">
                <label className="recipe-field" htmlFor="recipe-servings">
                  <span>Porcje</span>
                  <input
                    id="recipe-servings"
                    min="1"
                    onChange={(event) => setServings(event.target.value)}
                    type="number"
                    value={servings}
                  />
                </label>
                <label className="recipe-field" htmlFor="recipe-prep-time">
                  <span>Przygotowanie (min)</span>
                  <input
                    id="recipe-prep-time"
                    min="0"
                    onChange={(event) => setPrepTime(event.target.value)}
                    type="number"
                    value={prepTime}
                  />
                </label>
                <label className="recipe-field" htmlFor="recipe-cook-time">
                  <span>Gotowanie (min)</span>
                  <input
                    id="recipe-cook-time"
                    min="0"
                    onChange={(event) => setCookTime(event.target.value)}
                    type="number"
                    value={cookTime}
                  />
                </label>
              </div>
              <div className="recipe-list-editor">
                <div className="recipe-list-heading">
                  <span>Kroki przygotowania</span>
                  <button
                    className="text-button"
                    onClick={() => setSteps((current) => [...current, ""])}
                    type="button"
                  >
                    + Dodaj krok
                  </button>
                </div>
                <ol className="recipe-step-fields">
                  {steps.map((step, index) => (
                    <li key={index}>
                      <label className="recipe-field" htmlFor={`recipe-step-${index}`}>
                        <span>Krok {index + 1}</span>
                        <textarea
                          id={`recipe-step-${index}`}
                          onChange={(event) =>
                            setSteps((current) =>
                              current.map((currentStep, stepIndex) =>
                                stepIndex === index ? event.target.value : currentStep,
                              ),
                            )
                          }
                          rows={2}
                          value={step}
                        />
                      </label>
                      {steps.length > 1 && (
                        <button
                          aria-label={`Usuń krok ${index + 1}`}
                          className="remove-row"
                          onClick={() => setSteps((current) => current.filter((_, stepIndex) => stepIndex !== index))}
                          type="button"
                        >
                          Usuń
                        </button>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            </fieldset>

            <fieldset className="recipe-section">
              <legend>Składniki</legend>
              <div className="recipe-list-editor">
                <div className="recipe-list-heading">
                  <span>Pozycje na liście</span>
                  <button
                    className="text-button"
                    onClick={() => setIngredients((current) => [...current, { ...emptyIngredient }])}
                    type="button"
                  >
                    + Dodaj składnik
                  </button>
                </div>
                <div className="recipe-ingredient-fields">
                  {ingredients.map((ingredient, index) => (
                    <div className="recipe-ingredient-row" key={index}>
                      <label className="recipe-field" htmlFor={`ingredient-name-${index}`}>
                        <span>Składnik {index + 1}</span>
                        <input
                          id={`ingredient-name-${index}`}
                          maxLength={200}
                          onChange={(event) => updateIngredient(index, "name", event.target.value)}
                          value={ingredient.name}
                        />
                      </label>
                      <label className="recipe-field" htmlFor={`ingredient-amount-${index}`}>
                        <span>Ilość</span>
                        <input
                          id={`ingredient-amount-${index}`}
                          maxLength={100}
                          onChange={(event) => updateIngredient(index, "amount", event.target.value)}
                          value={ingredient.amount}
                        />
                      </label>
                      <label className="recipe-field" htmlFor={`ingredient-unit-${index}`}>
                        <span>Jednostka</span>
                        <input
                          id={`ingredient-unit-${index}`}
                          maxLength={100}
                          onChange={(event) => updateIngredient(index, "unit", event.target.value)}
                          value={ingredient.unit}
                        />
                      </label>
                      {ingredients.length > 1 && (
                        <button
                          aria-label={`Usuń składnik ${index + 1}`}
                          className="remove-row"
                          onClick={() =>
                            setIngredients((current) => current.filter((_, ingredientIndex) => ingredientIndex !== index))
                          }
                          type="button"
                        >
                          Usuń
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </fieldset>

            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="primary-button recipe-submit" disabled={isSaving} type="submit">
              {isSaving ? "Zapisuję..." : "Zapisz przepis"}
            </button>
          </form>
        </section>
      </div>
      ) : (
        <section className="recipe-home" aria-labelledby="collection-heading">
          <div className="recipe-home__heading">
            <div>
              <span className="eyebrow">ZAPISANE NA TWOIM KONCIE</span>
              <h1 id="collection-heading">Moje przepisy</h1>
              <p className="recipe-intro">Twoja kolekcja sprawdzonych pomysłów na codzienne gotowanie.</p>
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
                  {recipePhotoUrls[recipe.id] && (
                    <img className="recipe-entry__photo" src={recipePhotoUrls[recipe.id]} alt={recipe.title} />
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
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  )
}