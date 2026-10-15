import { FormEvent, useEffect, useState } from "react"

import { ApiError } from "../../shared/api/client"
import { plural } from "../../shared/lib/plural"
import { createRecipeSet, getRecipeSets, RecipeSetSummary } from "./api"

type RecipeSetListProps = {
  accessToken: string
  onOpenSet: (setId: number) => void
}

export default function RecipeSetList({ accessToken, onOpenSet }: RecipeSetListProps) {
  const [recipeSets, setRecipeSets] = useState<RecipeSetSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [name, setName] = useState("")
  const [nameError, setNameError] = useState("")
  const [formError, setFormError] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    let isCurrent = true
    getRecipeSets(accessToken)
      .then((result) => {
        if (isCurrent) setRecipeSets(result)
      })
      .catch((error: unknown) => {
        if (isCurrent) setLoadError(error instanceof Error ? error.message : "Nie udało się wczytać zestawów.")
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false)
      })
    return () => {
      isCurrent = false
    }
  }, [accessToken])

  async function submitSet(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setNameError("")
    setFormError("")
    if (!name.trim()) {
      setNameError("Podaj nazwę zestawu.")
      return
    }
    setIsSaving(true)
    try {
      const recipeSet = await createRecipeSet(accessToken, name)
      onOpenSet(recipeSet.id)
    } catch (error) {
      if (error instanceof ApiError && error.fields.name) setNameError(error.fields.name)
      else setFormError(error instanceof Error ? error.message : "Nie udało się utworzyć zestawu.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <span className="eyebrow">ZAKUPY BEZ PLANU</span>
          <h1>Zestawy przepisów</h1>
          <p className="page-intro">Wybierz przepisy, a zestaw zbierze ich składniki w jedną listę zakupów.</p>
        </div>
      </header>

      <section aria-labelledby="new-set-heading" className="plan-card">
        <h2 id="new-set-heading">Nowy zestaw</h2>
        <form className="plan-form" onSubmit={submitSet} noValidate>
          <label className="field" htmlFor="set-name">
            <span>Nazwa zestawu</span>
            <input
              aria-invalid={nameError ? true : undefined}
              id="set-name"
              maxLength={200}
              onChange={(event) => setName(event.target.value)}
              value={name}
            />
            {nameError && <small className="form-error" role="alert">{nameError}</small>}
          </label>
          {formError && <p className="form-error" role="alert">{formError}</p>}
          <button className="primary-button" disabled={isSaving} type="submit">
            {isSaving ? "Chwila..." : "Utwórz zestaw"}
          </button>
        </form>
      </section>

      <section aria-labelledby="sets-heading">
        <h2 id="sets-heading">Moje zestawy</h2>
        {isLoading && <p role="status">Wczytuję zestawy...</p>}
        {loadError && <p className="form-error" role="alert">{loadError}</p>}
        {!isLoading && !loadError && recipeSets.length === 0 && <p>Nie masz jeszcze żadnego zestawu.</p>}
        <ul className="plan-list">
          {recipeSets.map((recipeSet) => (
            <li key={recipeSet.id}>
              <button className="plan-list__item" onClick={() => onOpenSet(recipeSet.id)} type="button">
                <strong>{recipeSet.name}</strong>
                <span>{plural(recipeSet.recipe_count, "przepis", "przepisy", "przepisów")}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
