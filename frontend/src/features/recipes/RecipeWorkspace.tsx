import { FormEvent, useEffect, useState } from "react"

import { createRecipe, getRecipes, Ingredient, Recipe, RecipeInput } from "./api"

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
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [servings, setServings] = useState("")
  const [prepTime, setPrepTime] = useState("")
  const [cookTime, setCookTime] = useState("")
  const [ingredients, setIngredients] = useState<IngredientDraft[]>([{ ...emptyIngredient }])
  const [steps, setSteps] = useState<string[]>([""])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  useEffect(() => {
    let isCurrent = true

    getRecipes(accessToken)
      .then((result) => {
        if (isCurrent) setRecipes(result)
      })
      .catch((loadError: unknown) => {
        if (isCurrent) {
          setError(loadError instanceof Error ? loadError.message : "Nie udało się pobrać przepisów.")
        }
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false)
      })

    return () => {
      isCurrent = false
    }
  }, [accessToken])

  function updateIngredient(index: number, field: keyof IngredientDraft, value: string) {
    setIngredients((current) =>
      current.map((ingredient, ingredientIndex) =>
        ingredientIndex === index ? { ...ingredient, [field]: value } : ingredient,
      ),
    )
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
      setNotice("Przepis został zapisany w Twojej kolekcji.")
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

      <div className="recipe-workspace">
        <section className="recipe-editor" aria-labelledby="recipe-heading">
          <span className="eyebrow">TWOJA KUCHNIA</span>
          <h1 id="recipe-heading">Dodaj przepis</h1>
          <p className="recipe-intro">Zapisz swój przepis, aby wrócić do niego przy planowaniu posiłków.</p>

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
            {notice && <p className="integration-status" role="status">{notice}</p>}
            <button className="primary-button recipe-submit" disabled={isSaving} type="submit">
              {isSaving ? "Zapisuję..." : "Zapisz przepis"}
            </button>
          </form>
        </section>

        <section className="recipe-collection" aria-labelledby="collection-heading">
          <div className="collection-heading-row">
            <div>
              <span className="eyebrow">ZAPISANE NA TWOIM KONCIE</span>
              <h2 id="collection-heading">Moje przepisy</h2>
            </div>
            <span className="recipe-count" aria-label={`${recipes.length} przepisów`}>{recipes.length}</span>
          </div>

          {isLoading ? (
            <p className="session-message" role="status">Pobieram przepisy...</p>
          ) : recipes.length === 0 ? (
            <p className="collection-empty">Twoja kolekcja jest pusta. Dodaj pierwszy przepis.</p>
          ) : (
            <div className="recipe-list">
              {recipes.map((recipe) => (
                <article className="recipe-entry" key={recipe.id}>
                  <div className="recipe-entry-heading">
                    <div>
                      <h3>{recipe.title}</h3>
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
      </div>
    </main>
  )
}