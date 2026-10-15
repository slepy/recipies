import { useEffect, useState } from "react"

import { formatDay, formatPeriod, todayIsoDay } from "../../shared/lib/formatDate"
import { plural } from "../../shared/lib/plural"
import { getPlan, getPlans, PlanMeal, PlanSummary } from "../meal-plans/api"
import { getRecipeSets, RecipeSetSummary } from "../recipe-sets/api"
import { getRecipes, Recipe } from "../recipes/api"
import { getAllShoppingLists } from "../shopping-lists/api"
import ListCard from "./ListCard"
import { isDone, ListTarget, SourcedList, withSources } from "./listSources"

type DashboardProps = {
  accessToken: string
  accountEmail: string
  onOpenRecipes: () => void
  onOpenPlans: () => void
  onOpenPlan: (planId: number) => void
  onOpenSets: () => void
  onOpenLists: () => void
  onOpenList: (target: ListTarget) => void
}

type Overview = {
  recipes: Recipe[] | null
  plans: PlanSummary[] | null
  recipeSets: RecipeSetSummary[] | null
  lists: SourcedList[] | null
}

// The plan running today, or else the next one to start.
type PlanFocus = { plan: PlanSummary; todayMeals: PlanMeal[] | null }

function greeting(now: Date) {
  const hour = now.getHours()
  if (hour < 5 || hour >= 18) return "Dobry wieczór"
  return "Dzień dobry"
}

function settled<T>(result: PromiseSettledResult<T>) {
  return result.status === "fulfilled" ? result.value : null
}

export default function Dashboard({
  accessToken,
  accountEmail,
  onOpenRecipes,
  onOpenPlans,
  onOpenPlan,
  onOpenSets,
  onOpenLists,
  onOpenList,
}: DashboardProps) {
  const [overview, setOverview] = useState<Overview | null>(null)
  const [focus, setFocus] = useState<PlanFocus | null>(null)
  const today = todayIsoDay()

  useEffect(() => {
    let isCurrent = true

    async function load() {
      // Each part of the dashboard loads on its own, so one failed request hides only its own card.
      const [recipes, plans, recipeSets, lists] = await Promise.allSettled([
        getRecipes(accessToken),
        getPlans(accessToken),
        getRecipeSets(accessToken),
        getAllShoppingLists(accessToken),
      ])
      const planList = settled(plans)
      const setList = settled(recipeSets)
      const allLists = settled(lists)
      if (!isCurrent) return
      setOverview({
        recipes: settled(recipes),
        plans: planList,
        recipeSets: setList,
        lists: allLists && withSources(allLists, planList ?? [], setList ?? []),
      })

      const current = planList?.find((plan) => plan.start_date <= today && today <= plan.end_date)
      const upcoming = planList
        ?.filter((plan) => plan.start_date > today)
        .sort((left, right) => left.start_date.localeCompare(right.start_date))[0]
      if (current) {
        const meals = await getPlan(accessToken, current.id)
          .then((plan) => plan.days.find((day) => day.date === today)?.meals ?? [])
          .catch(() => null)
        if (isCurrent) setFocus({ plan: current, todayMeals: meals })
      } else if (upcoming) {
        setFocus({ plan: upcoming, todayMeals: null })
      }
    }

    void load()
    return () => {
      isCurrent = false
    }
  }, [accessToken, today])

  const openLists = overview?.lists?.filter((list) => !isDone(list)) ?? []
  const itemsLeft = openLists.reduce((sum, list) => sum + list.item_count - list.bought_count, 0)
  const latestRecipes = overview?.recipes?.slice(0, 4) ?? []
  const name = accountEmail.split("@")[0]
  const isRunningToday = focus !== null && focus.plan.start_date <= today

  const stats = [
    { label: "Przepisy", value: overview?.recipes?.length, onOpen: onOpenRecipes },
    { label: "Plany żywieniowe", value: overview?.plans?.length, onOpen: onOpenPlans },
    { label: "Zestawy przepisów", value: overview?.recipeSets?.length, onOpen: onOpenSets },
    { label: "Pozycje do kupienia", value: overview?.lists ? itemsLeft : undefined, onOpen: onOpenLists },
  ]

  return (
    <div className="page dashboard">
      <header className="page-header">
        <div>
          <span className="eyebrow">{formatDay(today).toUpperCase()}</span>
          <h1>{greeting(new Date())}, {name}</h1>
          <p className="page-intro">Oto, co dzieje się dziś w Twojej kuchni.</p>
        </div>
        <div className="plan-heading__actions">
          <button className="primary-button" onClick={onOpenRecipes} type="button">
            + Dodaj przepis
          </button>
        </div>
      </header>

      {!overview && <p className="session-message" role="status">Wczytuję podsumowanie...</p>}

      {overview && (
        <>
          <ul className="stat-grid" aria-label="Podsumowanie">
            {stats.map((stat) => (
              <li key={stat.label}>
                <button className="stat-tile" onClick={stat.onOpen} type="button">
                  <span className="stat-tile__value">{stat.value ?? "–"}</span>
                  <span className="stat-tile__label">{stat.label}</span>
                </button>
              </li>
            ))}
          </ul>

          <div className="dashboard-grid">
            <section className="panel" aria-labelledby="today-heading">
              <div className="panel__heading">
                <h2 id="today-heading">{isRunningToday ? "Dziś w planie" : "Najbliższy plan"}</h2>
                {focus && (
                  <button className="text-button" onClick={() => onOpenPlan(focus.plan.id)} type="button">
                    Otwórz plan
                  </button>
                )}
              </div>
              {!focus && (
                <div className="panel__empty">
                  <p>Nie masz planu na najbliższe dni.</p>
                  <button className="secondary-button" onClick={onOpenPlans} type="button">
                    Zaplanuj posiłki
                  </button>
                </div>
              )}
              {focus && (
                <>
                  <p className="muted">
                    {focus.plan.name} · {formatPeriod(focus.plan.start_date, focus.plan.end_date)}
                  </p>
                  {isRunningToday && focus.todayMeals === null && <p className="muted">Nie udało się wczytać posiłków.</p>}
                  {focus.todayMeals && (
                    <ul className="meal-rows">
                      {focus.todayMeals.map((meal) => (
                        <li className="meal-row" key={meal.id}>
                          <span className="meal-row__name">{meal.name}</span>
                          <span>
                            {meal.entries.length === 0
                              ? "Nic nie zaplanowano"
                              : meal.entries.map((entry) => entry.recipe.title).join(", ")}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </section>

            <section className="panel" aria-labelledby="dashboard-lists-heading">
              <div className="panel__heading">
                <h2 id="dashboard-lists-heading">Listy zakupów</h2>
                <button className="text-button" onClick={onOpenLists} type="button">
                  Wszystkie listy
                </button>
              </div>
              {overview.lists === null && <p className="muted">Nie udało się wczytać list.</p>}
              {overview.lists && openLists.length === 0 && (
                <div className="panel__empty">
                  <p>Nie masz otwartych list zakupów.</p>
                </div>
              )}
              {openLists.length > 0 && (
                <ul className="stack">
                  {openLists.slice(0, 3).map((list) => (
                    <li key={list.id}>
                      <ListCard list={list} onOpen={() => onOpenList(list.target)} />
                    </li>
                  ))}
                </ul>
              )}
              {openLists.length > 3 && (
                <p className="muted">i jeszcze {plural(openLists.length - 3, "lista", "listy", "list")}</p>
              )}
            </section>

            <section className="panel panel--wide" aria-labelledby="latest-recipes-heading">
              <div className="panel__heading">
                <h2 id="latest-recipes-heading">Ostatnio dodane przepisy</h2>
                <button className="text-button" onClick={onOpenRecipes} type="button">
                  Wszystkie przepisy
                </button>
              </div>
              {overview.recipes === null && <p className="muted">Nie udało się wczytać przepisów.</p>}
              {overview.recipes && latestRecipes.length === 0 && (
                <div className="panel__empty">
                  <p>Nie masz jeszcze przepisów. Dodaj pierwszy, żeby planować posiłki.</p>
                </div>
              )}
              {latestRecipes.length > 0 && (
                <ul className="recipe-tiles">
                  {latestRecipes.map((recipe) => (
                    <li className="recipe-tile" key={recipe.id}>
                      <span className="recipe-tile__mark" aria-hidden="true">{recipe.title.charAt(0).toUpperCase()}</span>
                      <span>
                        <strong>{recipe.title}</strong>
                        <small>
                          {[
                            recipe.servings ? `${recipe.servings} por.` : "",
                            recipe.prep_time_minutes !== null || recipe.cook_time_minutes !== null
                              ? `${(recipe.prep_time_minutes ?? 0) + (recipe.cook_time_minutes ?? 0)} min`
                              : "",
                          ]
                            .filter(Boolean)
                            .join(" · ") || "Bez szczegółów"}
                        </small>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  )
}
