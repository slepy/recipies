import { FormEvent, useEffect, useState } from "react"

import { ApiError } from "../../shared/api/client"
import ConfirmBar from "../../shared/ui/ConfirmBar"
import { getRecipes, Recipe } from "../recipes/api"
import { getShoppingList, ShoppingList } from "../shopping-lists/api"
import ShoppingListItems from "../shopping-lists/ShoppingListItems"
import { deleteRecipeSet, getRecipeSet, RecipeSet, updateRecipeSet } from "./api"

type RecipeSetViewProps = {
  accessToken: string
  setId: number
  // The shopping lists overview opens a set straight on its list.
  initialTab?: Tab
  onBack: () => void
}

export type Tab = "recipes" | "list"

function sameIds(left: number[], right: number[]) {
  const sortedLeft = [...left].sort((a, b) => a - b)
  const sortedRight = [...right].sort((a, b) => a - b)
  return sortedLeft.length === sortedRight.length && sortedLeft.every((id, index) => id === sortedRight[index])
}

export default function RecipeSetView({ accessToken, setId, initialTab = "recipes", onBack }: RecipeSetViewProps) {
  const [recipeSet, setRecipeSet] = useState<RecipeSet | null>(null)
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [tab, setTab] = useState<Tab>(initialTab)
  const [name, setName] = useState("")
  const [chosenIds, setChosenIds] = useState<number[]>([])
  const [query, setQuery] = useState("")
  const [list, setList] = useState<ShoppingList | null>(null)
  const [error, setError] = useState("")
  const [nameError, setNameError] = useState("")
  const [notice, setNotice] = useState("")
  const [isBusy, setIsBusy] = useState(false)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)

  function showSaved(saved: RecipeSet) {
    setRecipeSet(saved)
    setName(saved.name)
    setChosenIds(saved.recipes.map((recipe) => recipe.id))
  }

  useEffect(() => {
    let isCurrent = true
    Promise.all([getRecipeSet(accessToken, setId), getRecipes(accessToken)])
      .then(([saved, ownRecipes]) => {
        if (!isCurrent) return
        showSaved(saved)
        setRecipes(ownRecipes)
      })
      .catch((loadError: unknown) => {
        if (isCurrent) setError(loadError instanceof Error ? loadError.message : "Nie udało się wczytać zestawu.")
      })
    return () => {
      isCurrent = false
    }
  }, [accessToken, setId])

  // The list is read when its tab opens, and again after every save, which recomputes it.
  useEffect(() => {
    if (tab !== "list" || !recipeSet || list) return
    let isCurrent = true
    getShoppingList(accessToken, recipeSet.shopping_list)
      .then((result) => {
        if (isCurrent) setList(result)
      })
      .catch((loadError: unknown) => {
        if (isCurrent) setError(loadError instanceof Error ? loadError.message : "Nie udało się wczytać listy.")
      })
    return () => {
      isCurrent = false
    }
  }, [accessToken, list, recipeSet, tab])

  const titles = new Map<number, string>([
    ...(recipeSet?.recipes.map((recipe) => [recipe.id, recipe.title] as const) ?? []),
    ...recipes.map((recipe) => [recipe.id, recipe.title] as const),
  ])
  const chosen = chosenIds.map((id) => ({ id, title: titles.get(id) ?? "" }))
  const available = recipes.filter(
    (recipe) => !chosenIds.includes(recipe.id) && recipe.title.toLowerCase().includes(query.trim().toLowerCase()),
  )
  const isDirty =
    recipeSet !== null &&
    (name.trim() !== recipeSet.name || !sameIds(chosenIds, recipeSet.recipes.map((recipe) => recipe.id)))

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setNameError("")
    setNotice("")
    if (!name.trim()) {
      setNameError("Podaj nazwę zestawu.")
      return
    }
    setIsBusy(true)
    try {
      showSaved(await updateRecipeSet(accessToken, setId, { name, recipes: chosenIds }))
      setList(null)
      setNotice("Zestaw zapisany. Lista zakupów została przeliczona.")
    } catch (saveError) {
      // The save is all-or-nothing: the saved set and list are unchanged, and the draft stays on screen.
      if (saveError instanceof ApiError && saveError.fields.name) setNameError(saveError.fields.name)
      else setError(saveError instanceof Error ? saveError.message : "Nie udało się zapisać zestawu.")
    } finally {
      setIsBusy(false)
    }
  }

  async function removeSet() {
    setIsBusy(true)
    try {
      await deleteRecipeSet(accessToken, setId)
      onBack()
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Nie udało się usunąć zestawu.")
      setIsConfirmingDelete(false)
      setIsBusy(false)
    }
  }

  return (
    <div className="page">
      <button className="text-button recipe-back" onClick={onBack} type="button">
        ← Zestawy przepisów
      </button>
      {!recipeSet && !error && <p role="status">Wczytuję zestaw...</p>}
      {error && <p className="form-error" role="alert">{error}</p>}

      {recipeSet && (
        <>
          <header className="page-header plan-heading">
            <div>
              <span className="eyebrow">ZESTAW PRZEPISÓW</span>
              <h1>{recipeSet.name}</h1>
            </div>
            <div className="plan-heading__actions">
              <button className="text-button text-button--danger" onClick={() => setIsConfirmingDelete(true)} type="button">
                Usuń zestaw
              </button>
            </div>
          </header>

          {isConfirmingDelete && (
            <ConfirmBar
              confirmLabel="Usuń zestaw"
              isBusy={isBusy}
              onCancel={() => setIsConfirmingDelete(false)}
              onConfirm={() => void removeSet()}
              title="Usunąć zestaw przepisów?"
            >
              <p>Zestaw zostanie usunięty razem z listą zakupów i jej własnymi pozycjami. Przepisy pozostaną bez zmian.</p>
            </ConfirmBar>
          )}

          <div className="tabs" role="tablist" aria-label="Widok zestawu">
            <button
              aria-controls="set-panel-recipes"
              aria-selected={tab === "recipes"}
              className="tabs__tab"
              id="set-tab-recipes"
              onClick={() => setTab("recipes")}
              role="tab"
              type="button"
            >
              Przepisy ({recipeSet.recipes.length})
            </button>
            <button
              aria-controls="set-panel-list"
              aria-selected={tab === "list"}
              className="tabs__tab"
              id="set-tab-list"
              onClick={() => setTab("list")}
              role="tab"
              type="button"
            >
              Lista zakupów
            </button>
          </div>

          {tab === "recipes" && (
            <section aria-labelledby="set-tab-recipes" id="set-panel-recipes" role="tabpanel">
              <form className="plan-form plan-card" onSubmit={(event) => void save(event)} noValidate aria-label="Edycja zestawu">
                <label className="field" htmlFor="set-edit-name">
                  <span>Nazwa zestawu</span>
                  <input
                    aria-invalid={nameError ? true : undefined}
                    id="set-edit-name"
                    maxLength={200}
                    onChange={(event) => setName(event.target.value)}
                    value={name}
                  />
                  {nameError && <small className="form-error" role="alert">{nameError}</small>}
                </label>

                <h2>Przepisy w zestawie ({chosen.length})</h2>
                {chosen.length === 0 && <p>Zestaw nie ma jeszcze przepisów.</p>}
                <ul className="list-items">
                  {chosen.map((recipe) => (
                    <li className="list-item" key={recipe.id}>
                      <span>{recipe.title}</span>
                      <button
                        className="text-button text-button--danger"
                        disabled={isBusy}
                        onClick={() => setChosenIds((ids) => ids.filter((id) => id !== recipe.id))}
                        type="button"
                      >
                        Usuń<span className="visually-hidden"> z zestawu: {recipe.title}</span>
                      </button>
                    </li>
                  ))}
                </ul>

                <div className="recipe-picker" role="group" aria-label="Wybór przepisów">
                  <label className="field">
                    <span>Szukaj przepisu</span>
                    <input onChange={(event) => setQuery(event.target.value)} value={query} />
                  </label>
                  {available.length === 0 && <p>Brak innych przepisów do dodania.</p>}
                  <ul className="recipe-picker__list">
                    {available.map((recipe) => (
                      <li key={recipe.id}>
                        <button
                          className="secondary-button"
                          disabled={isBusy}
                          onClick={() => setChosenIds((ids) => (ids.includes(recipe.id) ? ids : [...ids, recipe.id]))}
                          type="button"
                        >
                          Dodaj: {recipe.title}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                {isDirty && <p role="status">Masz niezapisane zmiany. Lista zakupów zmieni się po zapisaniu.</p>}
                {notice && !isDirty && <p className="integration-status" role="status">{notice}</p>}
                <button className="primary-button" disabled={isBusy || !isDirty} type="submit">
                  {isBusy ? "Zapisuję..." : "Zapisz zestaw"}
                </button>
              </form>
            </section>
          )}

          {tab === "list" && (
            <section aria-labelledby="set-tab-list" id="set-panel-list" role="tabpanel">
              {isDirty && <p>Lista odpowiada ostatnio zapisanemu zestawowi. Zapisz zmiany, aby ją przeliczyć.</p>}
              {!list && !error && <p role="status">Wczytuję listę...</p>}
              {list && <ShoppingListItems accessToken={accessToken} list={list} onListChange={setList} />}
            </section>
          )}
        </>
      )}
    </div>
  )
}
