import { FormEvent, useCallback, useEffect, useState } from "react"

import { ApiError } from "../../shared/api/client"
import { formatDay, formatPeriod } from "../../shared/lib/formatDate"
import ConfirmBar from "../../shared/ui/ConfirmBar"
import { getRecipes, Recipe } from "../recipes/api"
import { createShoppingList, deleteShoppingList, getShoppingLists, ShoppingListSummary } from "../shopping-lists/api"
import {
  addEntry,
  addMeal,
  deleteEntry,
  deleteMeal,
  deletePlan,
  getPlan,
  maxMealsPerDay,
  Plan,
  PlanMeal,
  renameMeal,
  updateEntry,
  updatePlan,
} from "./api"
import MealSection from "./MealSection"

type MealPlanViewProps = {
  accessToken: string
  planId: number
  onBack: () => void
  onOpenList: (listId: number) => void
}

type Pending = { title: string; message: string; confirmLabel: string; run: () => Promise<void> }

export default function MealPlanView({
  accessToken,
  planId,
  onBack,
  onOpenList,
}: MealPlanViewProps) {
  const [plan, setPlan] = useState<Plan | null>(null)
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [lists, setLists] = useState<ShoppingListSummary[]>([])
  const [error, setError] = useState("")
  const [isBusy, setIsBusy] = useState(false)
  const [pending, setPending] = useState<Pending | null>(null)

  const [isEditingPeriod, setIsEditingPeriod] = useState(false)
  const [editName, setEditName] = useState("")
  const [editStart, setEditStart] = useState("")
  const [editEnd, setEditEnd] = useState("")
  const [editErrors, setEditErrors] = useState<Record<string, string>>({})

  const [isSelecting, setIsSelecting] = useState(false)
  const [excluded, setExcluded] = useState<Set<number>>(new Set())
  const [rangeStart, setRangeStart] = useState("")
  const [rangeEnd, setRangeEnd] = useState("")
  const [listName, setListName] = useState("")
  const [listErrors, setListErrors] = useState<Record<string, string>>({})

  const reload = useCallback(async () => {
    const [freshPlan, freshLists] = await Promise.all([getPlan(accessToken, planId), getShoppingLists(accessToken, planId)])
    setPlan(freshPlan)
    setLists(freshLists)
  }, [accessToken, planId])

  useEffect(() => {
    let isCurrent = true
    Promise.all([reload(), getRecipes(accessToken).then((result) => isCurrent && setRecipes(result))]).catch(
      (loadError: unknown) => {
        if (isCurrent) setError(loadError instanceof Error ? loadError.message : "Nie udało się wczytać planu.")
      },
    )
    return () => {
      isCurrent = false
    }
  }, [accessToken, reload])

  // Runs one change, then reloads the plan; the server stays the source of truth.
  async function mutate(action: () => Promise<unknown>) {
    setError("")
    setIsBusy(true)
    try {
      await action()
      await reload()
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : "Nie udało się zapisać zmian.")
    } finally {
      setIsBusy(false)
    }
  }

  async function confirmPending() {
    if (!pending) return
    setIsBusy(true)
    try {
      await pending.run()
    } catch (confirmError) {
      setError(confirmError instanceof Error ? confirmError.message : "Nie udało się zapisać zmian.")
    } finally {
      setPending(null)
      setIsBusy(false)
    }
  }

  function startEditingPeriod() {
    if (!plan) return
    setEditName(plan.name)
    setEditStart(plan.start_date)
    setEditEnd(plan.end_date)
    setEditErrors({})
    setIsEditingPeriod(true)
  }

  async function savePeriod(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!plan) return
    const changes = { name: editName, start_date: editStart, end_date: editEnd }
    setEditErrors({})
    setError("")
    setIsBusy(true)
    try {
      setPlan(await updatePlan(accessToken, plan.id, changes))
      setIsEditingPeriod(false)
    } catch (saveError) {
      if (saveError instanceof ApiError && saveError.code === "confirmation_required") {
        setPending({
          title: "Skrócić okres planu?",
          message: `Zmiana usunie dni poza nowym okresem razem z ${saveError.entryCount} wpisami.`,
          confirmLabel: "Skróć i usuń wpisy",
          run: async () => {
            setPlan(await updatePlan(accessToken, plan.id, changes, true))
            setIsEditingPeriod(false)
          },
        })
      } else if (saveError instanceof ApiError && Object.keys(saveError.fields).length > 0) {
        setEditErrors(saveError.fields)
      } else {
        setError(saveError instanceof Error ? saveError.message : "Nie udało się zapisać planu.")
      }
    } finally {
      setIsBusy(false)
    }
  }

  function askToRemoveMeal(meal: PlanMeal) {
    if (meal.entries.length === 0) {
      void mutate(() => deleteMeal(accessToken, planId, meal.id))
      return
    }
    setPending({
      title: `Usunąć posiłek „${meal.name}”?`,
      message: `Posiłek ma ${meal.entries.length} wpisów, które zostaną usunięte.`,
      confirmLabel: "Usuń posiłek",
      run: async () => {
        await deleteMeal(accessToken, planId, meal.id, true)
        await reload()
      },
    })
  }

  function askToDeletePlan() {
    if (!plan) return
    setPending({
      title: "Usunąć plan?",
      message: `Zostanie usuniętych ${plan.entry_count} wpisów oraz ${lists.length} list zakupów z tego planu.`,
      confirmLabel: "Usuń plan",
      run: async () => {
        await deletePlan(accessToken, planId)
        onBack()
      },
    })
  }

  function askToDeleteList(list: ShoppingListSummary) {
    setPending({
      title: `Usunąć listę „${list.name}”?`,
      message: "Lista i jej własne pozycje zostaną usunięte. Plan pozostanie bez zmian.",
      confirmLabel: "Usuń listę",
      run: async () => {
        await deleteShoppingList(accessToken, list.id)
        await reload()
      },
    })
  }

  function startSelecting() {
    if (!plan) return
    setExcluded(new Set())
    setRangeStart(plan.start_date)
    setRangeEnd(plan.end_date)
    setListName("")
    setListErrors({})
    setIsSelecting(true)
  }

  function toggleEntries(entryIds: number[]) {
    setExcluded((current) => {
      const next = new Set(current)
      const allIncluded = entryIds.every((id) => !next.has(id))
      for (const id of entryIds) {
        if (allIncluded) next.add(id)
        else next.delete(id)
      }
      return next
    })
  }

  const selectedCount = plan
    ? plan.days
        .filter((day) => day.date >= rangeStart && day.date <= rangeEnd)
        .flatMap((day) => day.meals.flatMap((meal) => meal.entries))
        .filter((entry) => !excluded.has(entry.id)).length
    : 0

  async function submitList(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isBusy) return
    setListErrors({})
    setError("")
    setIsBusy(true)
    try {
      const list = await createShoppingList(accessToken, {
        plan: planId,
        name: listName,
        start_date: rangeStart,
        end_date: rangeEnd,
        excluded_entry_ids: [...excluded],
      })
      onOpenList(list.id)
    } catch (createError) {
      if (createError instanceof ApiError && Object.keys(createError.fields).length > 0) setListErrors(createError.fields)
      else setError(createError instanceof Error ? createError.message : "Nie udało się utworzyć listy.")
      setIsBusy(false)
    }
  }

  const selection = isSelecting ? { excluded, toggleEntries } : null

  return (
    <div className="page">
      <button className="text-button recipe-back" onClick={onBack} type="button">
        ← Plany żywieniowe
      </button>
      {!plan && !error && <p role="status">Wczytuję plan...</p>}
      {error && <p className="form-error" role="alert">{error}</p>}

      {pending && (
        <ConfirmBar
          confirmLabel={pending.confirmLabel}
          isBusy={isBusy}
          onCancel={() => setPending(null)}
          onConfirm={() => void confirmPending()}
          title={pending.title}
        >
          <p>{pending.message}</p>
        </ConfirmBar>
      )}

      {plan && (
        <>
          <header className="page-header plan-heading">
            <div>
              <span className="eyebrow">PLAN ŻYWIENIOWY</span>
              <h1>{plan.name}</h1>
              <p className="page-intro">{formatPeriod(plan.start_date, plan.end_date)}</p>
            </div>
            <div className="plan-heading__actions">
              <button className="secondary-button" onClick={startEditingPeriod} type="button">
                Zmień nazwę i okres
              </button>
              <button className="primary-button" disabled={isSelecting} onClick={startSelecting} type="button">
                Utwórz listę zakupów
              </button>
              <button className="text-button text-button--danger" onClick={askToDeletePlan} type="button">
                Usuń plan
              </button>
            </div>
          </header>

          {isEditingPeriod && (
            <form className="plan-form plan-card" onSubmit={savePeriod} noValidate aria-label="Zmiana nazwy i okresu">
              <label className="field" htmlFor="edit-name">
                <span>Nazwa planu</span>
                <input id="edit-name" onChange={(event) => setEditName(event.target.value)} value={editName} />
                {editErrors.name && <small className="form-error" role="alert">{editErrors.name}</small>}
              </label>
              <label className="field" htmlFor="edit-start">
                <span>Od</span>
                <input id="edit-start" onChange={(event) => setEditStart(event.target.value)} type="date" value={editStart} />
                {editErrors.start_date && <small className="form-error" role="alert">{editErrors.start_date}</small>}
              </label>
              <label className="field" htmlFor="edit-end">
                <span>Do</span>
                <input id="edit-end" onChange={(event) => setEditEnd(event.target.value)} type="date" value={editEnd} />
                {editErrors.end_date && <small className="form-error" role="alert">{editErrors.end_date}</small>}
              </label>
              <button className="primary-button" disabled={isBusy} type="submit">Zapisz zmiany</button>
              <button className="secondary-button" onClick={() => setIsEditingPeriod(false)} type="button">
                Anuluj
              </button>
            </form>
          )}

          {isSelecting && (
            <form className="plan-form plan-card" onSubmit={submitList} noValidate aria-label="Nowa lista zakupów">
              <p>Zaznacz dni, posiłki lub wpisy, z których ma powstać lista.</p>
              <label className="field" htmlFor="list-name">
                <span>Nazwa listy</span>
                <input id="list-name" onChange={(event) => setListName(event.target.value)} value={listName} />
                {listErrors.name && <small className="form-error" role="alert">{listErrors.name}</small>}
              </label>
              <label className="field" htmlFor="range-start">
                <span>Zakres od</span>
                <input id="range-start" max={plan.end_date} min={plan.start_date} onChange={(event) => setRangeStart(event.target.value)} type="date" value={rangeStart} />
              </label>
              <label className="field" htmlFor="range-end">
                <span>Zakres do</span>
                <input id="range-end" max={plan.end_date} min={plan.start_date} onChange={(event) => setRangeEnd(event.target.value)} type="date" value={rangeEnd} />
                {(listErrors.end_date || listErrors.start_date) && (
                  <small className="form-error" role="alert">{listErrors.end_date || listErrors.start_date}</small>
                )}
              </label>
              <p role="status">Wybrane wpisy: {selectedCount}</p>
              {selectedCount === 0 && <p>Wybierz co najmniej jeden wpis, aby utworzyć listę.</p>}
              <button className="primary-button" disabled={isBusy || selectedCount === 0} type="submit">
                {isBusy ? "Chwila..." : "Utwórz listę"}
              </button>
              <button className="secondary-button" onClick={() => setIsSelecting(false)} type="button">
                Anuluj
              </button>
            </form>
          )}

          {plan.days.map((day) => {
            const dayEntryIds = day.meals.flatMap((meal) => meal.entries.map((entry) => entry.id))
            const isDayChecked = dayEntryIds.every((id) => !excluded.has(id))
            const isOutsideRange = isSelecting && (day.date < rangeStart || day.date > rangeEnd)
            return (
              <section className="plan-day" aria-label={formatDay(day.date)} key={day.date}>
                <div className="plan-day__heading">
                  {isSelecting && (
                    <input
                      aria-label={`Do listy cały dzień: ${formatDay(day.date)}`}
                      checked={isDayChecked}
                      disabled={dayEntryIds.length === 0}
                      onChange={() => toggleEntries(dayEntryIds)}
                      type="checkbox"
                    />
                  )}
                  <h3>{formatDay(day.date)}</h3>
                  {isOutsideRange && <span>poza zakresem listy</span>}
                </div>
                {day.meals.map((meal) => (
                  <MealSection
                    isBusy={isBusy}
                    key={meal.id}
                    meal={meal}
                    onAddRecipe={(mealId, recipe, servings) =>
                      void mutate(() => addEntry(accessToken, planId, mealId, recipe.id, servings))
                    }
                    onChangeServings={(entryId, servings) =>
                      void mutate(() => updateEntry(accessToken, planId, entryId, { servings }))
                    }
                    onRemoveEntry={(entryId) => void mutate(() => deleteEntry(accessToken, planId, entryId))}
                    onRemoveMeal={askToRemoveMeal}
                    onRename={(mealId, name) => void mutate(() => renameMeal(accessToken, planId, mealId, name))}
                    recipes={recipes}
                    selection={selection}
                  />
                ))}
                <div className="plan-day__add">
                  <button
                    aria-label={`Dodaj posiłek do dnia: ${formatDay(day.date)}`}
                    className="secondary-button"
                    disabled={isBusy || day.meals.length >= maxMealsPerDay}
                    onClick={() => void mutate(() => addMeal(accessToken, planId, day.date))}
                    type="button"
                  >
                    + Dodaj posiłek
                  </button>
                  {day.meals.length >= maxMealsPerDay && (
                    <small>Dzień ma już maksymalną liczbę {maxMealsPerDay} posiłków.</small>
                  )}
                </div>
              </section>
            )
          })}

          <section aria-labelledby="plan-lists-heading" className="plan-card">
            <h2 id="plan-lists-heading">Listy zakupów z tego planu</h2>
            {lists.length === 0 && <p>Nie utworzono jeszcze żadnej listy.</p>}
            <ul className="plan-list">
              {lists.map((list) => (
                <li key={list.id}>
                  <button className="plan-list__item" onClick={() => onOpenList(list.id)} type="button">
                    <strong>{list.name}</strong>
                    <span>Kupione {list.bought_count} z {list.item_count}</span>
                  </button>
                  <button className="text-button text-button--danger" onClick={() => askToDeleteList(list)} type="button">
                    Usuń<span className="visually-hidden"> listę: {list.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  )
}
