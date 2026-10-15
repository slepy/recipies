import { useEffect, useState } from "react"

import { getPlans } from "../meal-plans/api"
import { getRecipeSets } from "../recipe-sets/api"
import { getAllShoppingLists } from "../shopping-lists/api"
import ListCard from "./ListCard"
import { isDone, ListTarget, SourcedList, withSources } from "./listSources"

type ShoppingOverviewProps = {
  accessToken: string
  onOpenList: (target: ListTarget) => void
  onOpenPlans: () => void
  onOpenSets: () => void
}

type Filter = "all" | "plan" | "set"

const filters: { value: Filter; label: string }[] = [
  { value: "all", label: "Wszystkie" },
  { value: "plan", label: "Z planów" },
  { value: "set", label: "Z zestawów" },
]

// Every shopping list in one place, whether it was made from a meal plan or belongs to a recipe set.
export default function ShoppingOverview({ accessToken, onOpenList, onOpenPlans, onOpenSets }: ShoppingOverviewProps) {
  const [lists, setLists] = useState<SourcedList[] | null>(null)
  const [error, setError] = useState("")
  const [filter, setFilter] = useState<Filter>("all")

  useEffect(() => {
    let isCurrent = true
    Promise.all([getAllShoppingLists(accessToken), getPlans(accessToken), getRecipeSets(accessToken)])
      .then(([allLists, plans, recipeSets]) => {
        if (isCurrent) setLists(withSources(allLists, plans, recipeSets))
      })
      .catch((loadError: unknown) => {
        if (isCurrent) setError(loadError instanceof Error ? loadError.message : "Nie udało się wczytać list.")
      })
    return () => {
      isCurrent = false
    }
  }, [accessToken])

  const shown = (lists ?? []).filter((list) => filter === "all" || list.target.kind === filter)
  const open = shown.filter((list) => !isDone(list))
  const done = shown.filter(isDone)

  function cards(group: SourcedList[]) {
    return (
      <ul className="card-grid">
        {group.map((list) => (
          <li key={list.id}>
            <ListCard list={list} onOpen={() => onOpenList(list.target)} />
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <span className="eyebrow">ZAKUPY</span>
          <h1>Listy zakupów</h1>
          <p className="page-intro">Wszystkie listy w jednym miejscu: z planów żywieniowych i z zestawów przepisów.</p>
        </div>
        <div className="plan-heading__actions">
          <button className="secondary-button" onClick={onOpenPlans} type="button">
            Lista z planu
          </button>
          <button className="secondary-button" onClick={onOpenSets} type="button">
            Lista z zestawu
          </button>
        </div>
      </header>

      {error && <p className="form-error" role="alert">{error}</p>}
      {!lists && !error && <p className="session-message" role="status">Wczytuję listy...</p>}

      {lists && lists.length === 0 && (
        <div className="collection-empty">
          <h2>Nie masz jeszcze list zakupów</h2>
          <p>Listę tworzysz z wybranych dni planu żywieniowego albo z zestawu przepisów.</p>
          <div className="plan-heading__actions">
            <button className="primary-button" onClick={onOpenPlans} type="button">
              Przejdź do planów
            </button>
            <button className="secondary-button" onClick={onOpenSets} type="button">
              Przejdź do zestawów
            </button>
          </div>
        </div>
      )}

      {lists && lists.length > 0 && (
        <>
          <div className="segmented" role="group" aria-label="Pokaż listy">
            {filters.map((option) => (
              <button
                aria-pressed={filter === option.value}
                className="segmented__option"
                key={option.value}
                onClick={() => setFilter(option.value)}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>

          <section aria-labelledby="open-lists-heading" className="page-section">
            <h2 id="open-lists-heading">Do kupienia ({open.length})</h2>
            {open.length === 0 ? <p className="muted">Wszystkie listy są skończone.</p> : cards(open)}
          </section>

          {done.length > 0 && (
            <section aria-labelledby="done-lists-heading" className="page-section">
              <h2 id="done-lists-heading">Kupione ({done.length})</h2>
              {cards(done)}
            </section>
          )}
        </>
      )}
    </div>
  )
}
