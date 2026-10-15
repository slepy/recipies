import { useState } from "react"

import { Recipe } from "../recipes/api"
import { PlanEntry, PlanMeal } from "./api"
import RecipePicker from "./RecipePicker"

type MealSectionProps = {
  meal: PlanMeal
  recipes: Recipe[]
  isBusy: boolean
  // When set, the meal and its entries show checkboxes for building a shopping list.
  selection: { excluded: Set<number>; toggleEntries: (entryIds: number[]) => void } | null
  onAddRecipe: (mealId: number, recipe: Recipe, servings: number | undefined) => void
  onChangeServings: (entryId: number, servings: number) => void
  onRemoveEntry: (entryId: number) => void
  onRename: (mealId: number, name: string) => void
  onRemoveMeal: (meal: PlanMeal) => void
}

function ingredientText(ingredient: PlanEntry["ingredients"][number]) {
  const home = ingredient.amount === null ? ingredient.amount_text : `${ingredient.amount} ${ingredient.unit}`.trim()
  const metric = ingredient.metric_amount === null ? "" : `(${ingredient.metric_amount} ${ingredient.metric_unit})`
  return [home, ingredient.name, metric].filter(Boolean).join(" ")
}

function EntryRow({ entry, isBusy, isChecked, showCheckbox, onToggle, onChangeServings, onRemove }: {
  entry: PlanEntry
  isBusy: boolean
  isChecked: boolean
  showCheckbox: boolean
  onToggle: () => void
  onChangeServings: (servings: number) => void
  onRemove: () => void
}) {
  const [servings, setServings] = useState(String(entry.servings))

  function commit() {
    const value = Number(servings)
    if (Number.isInteger(value) && value >= 1 && value <= 99) {
      if (value !== entry.servings) onChangeServings(value)
    } else {
      setServings(String(entry.servings))
    }
  }

  return (
    <li className="plan-entry">
      {showCheckbox && (
        <input aria-label={`Do listy: ${entry.recipe.title}`} checked={isChecked} onChange={onToggle} type="checkbox" />
      )}
      <div className="plan-entry__body">
        <strong>{entry.recipe.title}</strong>
        <label className="plan-entry__servings">
          <span>Porcje</span>
          <input
            aria-label={`Porcje: ${entry.recipe.title}`}
            max={99}
            min={1}
            onBlur={commit}
            onChange={(event) => setServings(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && commit()}
            type="number"
            value={servings}
          />
        </label>
        <details>
          <summary>Składniki na {entry.servings} porcji</summary>
          <ul>
            {entry.ingredients.map((ingredient, index) => (
              <li key={index}>{ingredientText(ingredient)}</li>
            ))}
          </ul>
        </details>
      </div>
      <button className="text-button text-button--danger" disabled={isBusy} onClick={onRemove} type="button">
        Usuń<span className="visually-hidden"> wpis: {entry.recipe.title}</span>
      </button>
    </li>
  )
}

export default function MealSection({
  meal,
  recipes,
  isBusy,
  selection,
  onAddRecipe,
  onChangeServings,
  onRemoveEntry,
  onRename,
  onRemoveMeal,
}: MealSectionProps) {
  const [isPicking, setIsPicking] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const [name, setName] = useState(meal.name)
  const entryIds = meal.entries.map((entry) => entry.id)
  const isMealChecked = selection !== null && entryIds.every((id) => !selection.excluded.has(id))

  return (
    <section className="plan-meal" aria-label={meal.name}>
      <div className="plan-meal__heading">
        {selection && (
          <input
            aria-label={`Do listy cały posiłek: ${meal.name}`}
            checked={isMealChecked}
            disabled={entryIds.length === 0}
            onChange={() => selection.toggleEntries(entryIds)}
            type="checkbox"
          />
        )}
        {isRenaming ? (
          <form
            onSubmit={(event) => {
              event.preventDefault()
              onRename(meal.id, name)
              setIsRenaming(false)
            }}
          >
            <input aria-label="Nazwa posiłku" onChange={(event) => setName(event.target.value)} value={name} />
            <button className="text-button" type="submit">Zapisz nazwę</button>
          </form>
        ) : (
          <h4>{meal.name}</h4>
        )}
        {!meal.is_default && !isRenaming && (
          <>
            <button aria-label={`Zmień nazwę: ${meal.name}`} className="text-button" onClick={() => setIsRenaming(true)} type="button">
              Zmień nazwę
            </button>
            <button className="text-button text-button--danger" disabled={isBusy} onClick={() => onRemoveMeal(meal)} type="button">
              Usuń<span className="visually-hidden"> posiłek: {meal.name}</span>
            </button>
          </>
        )}
      </div>

      <ul className="plan-entries">
        {meal.entries.map((entry) => (
          <EntryRow
            entry={entry}
            isBusy={isBusy}
            isChecked={selection !== null && !selection.excluded.has(entry.id)}
            key={`${entry.id}-${entry.servings}`}
            onChangeServings={(servings) => onChangeServings(entry.id, servings)}
            onRemove={() => onRemoveEntry(entry.id)}
            onToggle={() => selection?.toggleEntries([entry.id])}
            showCheckbox={selection !== null}
          />
        ))}
      </ul>

      {meal.entries.length > 0 ? null : isPicking ? (
        <RecipePicker
          isBusy={isBusy}
          mealName={meal.name}
          onClose={() => setIsPicking(false)}
          onPick={(recipe, servings) => {
            onAddRecipe(meal.id, recipe, servings)
            setIsPicking(false)
          }}
          recipes={recipes}
        />
      ) : (
        <button className="secondary-button" onClick={() => setIsPicking(true)} type="button">
          Dodaj przepis<span className="visually-hidden"> do: {meal.name}</span>
        </button>
      )}
    </section>
  )
}
