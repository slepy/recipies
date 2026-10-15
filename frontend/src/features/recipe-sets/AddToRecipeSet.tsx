import { FormEvent, useState } from "react"

import { addRecipeToSet, getRecipeSets, RecipeSetSummary } from "./api"

type AddToRecipeSetProps = {
  accessToken: string
  recipeId: number
  recipeTitle: string
}

// "Dodaj do zestawu" on a recipe. The sets are loaded only when the user opens the choice.
export default function AddToRecipeSet({ accessToken, recipeId, recipeTitle }: AddToRecipeSetProps) {
  const [recipeSets, setRecipeSets] = useState<RecipeSetSummary[] | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [selectedId, setSelectedId] = useState("")
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")

  async function open() {
    setError("")
    setNotice("")
    setIsOpen(true)
    setIsBusy(true)
    try {
      const result = await getRecipeSets(accessToken)
      setRecipeSets(result)
      setSelectedId(result.length > 0 ? String(result[0].id) : "")
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Nie udało się wczytać zestawów.")
    } finally {
      setIsBusy(false)
    }
  }

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedId) return
    setError("")
    setIsBusy(true)
    try {
      const recipeSet = await addRecipeToSet(accessToken, Number(selectedId), recipeId)
      setNotice(`Przepis jest w zestawie „${recipeSet.name}”.`)
      setIsOpen(false)
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : "Nie udało się dodać przepisu do zestawu.")
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <div className="recipe-set-add">
      {!isOpen && (
        <button aria-label={`Dodaj do zestawu: ${recipeTitle}`} className="text-button" onClick={() => void open()} type="button">
          Dodaj do zestawu
        </button>
      )}
      {isOpen && recipeSets === null && isBusy && <p role="status">Wczytuję zestawy...</p>}
      {isOpen && recipeSets !== null && recipeSets.length === 0 && (
        <p>
          Nie masz jeszcze zestawów. Utwórz go w zakładce „Zestawy przepisów”.{" "}
          <button className="text-button" onClick={() => setIsOpen(false)} type="button">Zamknij</button>
        </p>
      )}
      {isOpen && recipeSets !== null && recipeSets.length > 0 && (
        <form aria-label={`Dodaj do zestawu: ${recipeTitle}`} className="recipe-set-add__form" onSubmit={(event) => void add(event)}>
          <label className="field">
            <span>Zestaw</span>
            <select onChange={(event) => setSelectedId(event.target.value)} value={selectedId}>
              {recipeSets.map((recipeSet) => (
                <option key={recipeSet.id} value={recipeSet.id}>{recipeSet.name}</option>
              ))}
            </select>
          </label>
          <button className="secondary-button" disabled={isBusy} type="submit">
            {isBusy ? "Chwila..." : "Dodaj"}
          </button>
          <button className="text-button" onClick={() => setIsOpen(false)} type="button">Anuluj</button>
        </form>
      )}
      {notice && <p className="integration-status" role="status">{notice}</p>}
      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
  )
}
