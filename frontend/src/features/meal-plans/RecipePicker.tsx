import { FormEvent, useState } from "react"

import { Recipe } from "../recipes/api"

type RecipePickerProps = {
  mealName: string
  recipes: Recipe[]
  isBusy: boolean
  onPick: (recipe: Recipe, servings: number | undefined) => void
  onClose: () => void
}

// Search the user's recipes and add one to a meal; empty servings use the recipe's own (or 1).
export default function RecipePicker({ mealName, recipes, isBusy, onPick, onClose }: RecipePickerProps) {
  const [query, setQuery] = useState("")
  const [servings, setServings] = useState("")
  const matches = recipes.filter((recipe) => recipe.title.toLowerCase().includes(query.trim().toLowerCase()))

  function pick(event: FormEvent, recipe: Recipe) {
    event.preventDefault()
    onPick(recipe, servings === "" ? undefined : Number(servings))
  }

  return (
    <div className="recipe-picker" role="group" aria-label={`Dodaj przepis do: ${mealName}`}>
      <label className="field">
        <span>Szukaj przepisu</span>
        <input onChange={(event) => setQuery(event.target.value)} value={query} />
      </label>
      <label className="field">
        <span>Liczba porcji (opcjonalnie)</span>
        <input max={99} min={1} onChange={(event) => setServings(event.target.value)} type="number" value={servings} />
      </label>
      {matches.length === 0 && <p>Nie znaleziono przepisów.</p>}
      <ul className="recipe-picker__list">
        {matches.map((recipe) => (
          <li key={recipe.id}>
            <button className="secondary-button" disabled={isBusy} onClick={(event) => pick(event, recipe)} type="button">
              Dodaj: {recipe.title}
            </button>
          </li>
        ))}
      </ul>
      <button className="text-button" onClick={onClose} type="button">
        Zamknij wybór
      </button>
    </div>
  )
}
