import { FormEvent, useEffect, useState } from "react"

import { Ingredient, RecipeInput } from "./api"
import DishPhotoPicker from "./DishPhotoPicker"
import { validateImage } from "./imageRules"

export type RecipeFormValues = Omit<RecipeInput, "photo" | "remove_photo">

type RecipeFormProps = {
  initialValues?: RecipeFormValues
  // A photo that is not saved yet, such as the dish cut out of a recognised image.
  initialPhoto?: File | null
  isInitialPhotoProposed?: boolean
  // The recipe already has a photo; the form can keep, replace or remove it.
  hasSavedPhoto?: boolean
  // Preview of the saved photo; empty when it could not be loaded.
  savedPhotoUrl?: string
  // A hidden form keeps its values but drops its messages, so they do not greet the user on return.
  hidden?: boolean
  submitLabel: string
  // Throws to show its message under the form; the typed values stay.
  onSubmit: (recipe: RecipeInput) => Promise<void>
  onCancel?: () => void
}

// The form keeps the metric amount as text while it is being typed.
type IngredientDraft = Omit<Ingredient, "metric_amount"> & { metric_amount: string }

const emptyIngredient: IngredientDraft = { name: "", amount: "", unit: "", metric_amount: "", metric_unit: "" }
const metricUnits = ["g", "kg", "ml", "l"] as const

// A saved ingredient can miss keys: the API accepts partial ingredients, and older recipes have no metric measure.
function toIngredientDraft(ingredient: Partial<Ingredient>): IngredientDraft {
  return {
    name: ingredient.name ?? "",
    amount: ingredient.amount ?? "",
    unit: ingredient.unit ?? "",
    metric_amount: numberText(ingredient.metric_amount),
    metric_unit: ingredient.metric_unit ?? "",
  }
}

function optionalNumber(value: string) {
  return value === "" ? null : Number(value)
}

function numberText(value: number | null | undefined) {
  return value === null || value === undefined ? "" : String(value)
}

export default function RecipeForm({
  initialValues,
  initialPhoto = null,
  isInitialPhotoProposed = false,
  hasSavedPhoto = false,
  savedPhotoUrl = "",
  hidden = false,
  submitLabel,
  onSubmit,
  onCancel,
}: RecipeFormProps) {
  const [title, setTitle] = useState(initialValues?.title ?? "")
  const [description, setDescription] = useState(initialValues?.description ?? "")
  const [servings, setServings] = useState(numberText(initialValues?.servings))
  const [prepTime, setPrepTime] = useState(numberText(initialValues?.prep_time_minutes))
  const [cookTime, setCookTime] = useState(numberText(initialValues?.cook_time_minutes))
  const [ingredients, setIngredients] = useState<IngredientDraft[]>(
    initialValues?.ingredients.length ? initialValues.ingredients.map(toIngredientDraft) : [{ ...emptyIngredient }],
  )
  const [steps, setSteps] = useState<string[]>(initialValues?.steps.length ? initialValues.steps : [""])
  const [dishPhoto, setDishPhoto] = useState<File | null>(initialPhoto)
  const [isDishPhotoProposed, setIsDishPhotoProposed] = useState(isInitialPhotoProposed)
  const [keepsSavedPhoto, setKeepsSavedPhoto] = useState(hasSavedPhoto)
  const [dishPhotoPreview, setDishPhotoPreview] = useState("")
  const [photoError, setPhotoError] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!hidden) return
    setError("")
    setPhotoError("")
  }, [hidden])

  useEffect(() => {
    if (!dishPhoto) {
      setDishPhotoPreview("")
      return
    }

    const previewUrl = URL.createObjectURL(dishPhoto)
    setDishPhotoPreview(previewUrl)
    return () => URL.revokeObjectURL(previewUrl)
  }, [dishPhoto])

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
    setIsDishPhotoProposed(false)
    setDishPhoto(message ? null : file)
  }

  function removeDishPhoto() {
    setDishPhoto(null)
    setIsDishPhotoProposed(false)
    setKeepsSavedPhoto(false)
  }

  async function submitRecipe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setIsSaving(true)

    const recipeInput: RecipeInput = {
      title: title.trim(),
      description: description.trim(),
      servings: optionalNumber(servings),
      prep_time_minutes: optionalNumber(prepTime),
      cook_time_minutes: optionalNumber(cookTime),
      ingredients: ingredients
        .map((ingredient) => {
          const metricAmount = optionalNumber(ingredient.metric_amount.trim().replace(",", "."))
          // a metric measure needs both the number and the unit to be summed later
          const hasMetric = metricAmount !== null && Number.isFinite(metricAmount) && Boolean(ingredient.metric_unit)
          return {
            name: ingredient.name.trim(),
            amount: ingredient.amount.trim(),
            unit: ingredient.unit.trim(),
            metric_amount: hasMetric ? metricAmount : null,
            metric_unit: hasMetric ? ingredient.metric_unit : "",
          } satisfies Ingredient
        })
        .filter((ingredient) => ingredient.name || ingredient.amount || ingredient.unit || ingredient.metric_amount),
      steps: steps.map((step) => step.trim()).filter(Boolean),
    }
    if (dishPhoto) recipeInput.photo = dishPhoto
    else if (hasSavedPhoto && !keepsSavedPhoto) recipeInput.remove_photo = true

    try {
      await onSubmit(recipeInput)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Nie udało się zapisać przepisu.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
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
        <DishPhotoPicker
          error={photoError}
          file={dishPhoto}
          isProposed={isDishPhotoProposed}
          onRemove={removeDishPhoto}
          onSelect={selectDishPhoto}
          hasSavedPhoto={!dishPhoto && keepsSavedPhoto}
          previewUrl={dishPhotoPreview || (keepsSavedPhoto ? savedPhotoUrl : "")}
        />
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
                <label className="recipe-field" htmlFor={`ingredient-metric-amount-${index}`}>
                  <span>Waga lub objętość</span>
                  <input
                    id={`ingredient-metric-amount-${index}`}
                    inputMode="decimal"
                    maxLength={12}
                    onChange={(event) => updateIngredient(index, "metric_amount", event.target.value)}
                    value={ingredient.metric_amount}
                  />
                </label>
                <label className="recipe-field" htmlFor={`ingredient-metric-unit-${index}`}>
                  <span>Miara</span>
                  <select
                    id={`ingredient-metric-unit-${index}`}
                    onChange={(event) => updateIngredient(index, "metric_unit", event.target.value)}
                    value={ingredient.metric_unit}
                  >
                    <option value="">—</option>
                    {metricUnits.map((unit) => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
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
      <div className="recipe-form-actions">
        <button className="primary-button recipe-submit" disabled={isSaving} type="submit">
          {isSaving ? "Zapisuję..." : submitLabel}
        </button>
        {onCancel && (
          <button className="secondary-button" disabled={isSaving} onClick={onCancel} type="button">
            Anuluj
          </button>
        )}
      </div>
    </form>
  )
}
