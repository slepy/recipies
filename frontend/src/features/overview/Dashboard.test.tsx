import { fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { getPlan, getPlans } from "../meal-plans/api"
import { getRecipeSets } from "../recipe-sets/api"
import { getRecipes, Recipe } from "../recipes/api"
import { getAllShoppingLists } from "../shopping-lists/api"
import Dashboard from "./Dashboard"

vi.mock("../meal-plans/api", () => ({ getPlan: vi.fn(), getPlans: vi.fn() }))
vi.mock("../recipe-sets/api", () => ({ getRecipeSets: vi.fn() }))
vi.mock("../recipes/api", () => ({ getRecipes: vi.fn() }))
vi.mock("../shopping-lists/api", () => ({ getAllShoppingLists: vi.fn() }))

function recipe(id: number, title: string): Recipe {
  return {
    id,
    title,
    description: "",
    servings: 2,
    prep_time_minutes: 10,
    cook_time_minutes: 20,
    ingredients: [],
    steps: [],
    photo_url: null,
    created_at: "2026-10-14T10:00:00Z",
  }
}

const plan = { id: 3, name: "Tydzień", start_date: "2026-10-12", end_date: "2026-10-18", entry_count: 1 }

function renderDashboard() {
  const props = {
    onOpenRecipes: vi.fn(),
    onOpenPlans: vi.fn(),
    onOpenPlan: vi.fn(),
    onOpenSets: vi.fn(),
    onOpenLists: vi.fn(),
    onOpenList: vi.fn(),
  }
  render(<Dashboard accessToken="token" accountEmail="cook@example.com" {...props} />)
  return props
}

describe("dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Only the date is faked, so promises and timers keep working.
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(new Date("2026-10-15T09:00:00"))
    vi.mocked(getRecipes).mockResolvedValue([recipe(1, "Owsianka"), recipe(2, "Leczo")])
    vi.mocked(getPlans).mockResolvedValue([plan])
    vi.mocked(getRecipeSets).mockResolvedValue([])
    vi.mocked(getAllShoppingLists).mockResolvedValue([
      {
        id: 20,
        name: "Zakupy na weekend",
        plan: 3,
        scope_start: null,
        scope_end: null,
        generated_at: "",
        item_count: 5,
        bought_count: 2,
      },
    ])
    vi.mocked(getPlan).mockResolvedValue({
      ...plan,
      days: [
        {
          date: "2026-10-15",
          meals: [
            {
              id: 7,
              date: "2026-10-15",
              position: 1,
              name: "Śniadanie",
              is_default: true,
              entries: [{ id: 1, servings: 2, recipe: { id: 1, title: "Owsianka", servings: 2 }, ingredients: [] }],
            },
            { id: 8, date: "2026-10-15", position: 2, name: "Obiad", is_default: true, entries: [] },
          ],
        },
      ],
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("greets the user and sums up their kitchen", async () => {
    renderDashboard()

    expect(await screen.findByRole("heading", { name: "Dzień dobry, cook" })).toBeInTheDocument()
    const stats = screen.getByRole("list", { name: "Podsumowanie" })
    expect(within(stats).getByRole("button", { name: "2 Przepisy" })).toBeInTheDocument()
    expect(within(stats).getByRole("button", { name: "1 Plany żywieniowe" })).toBeInTheDocument()
    expect(within(stats).getByRole("button", { name: "0 Zestawy przepisów" })).toBeInTheDocument()
    expect(within(stats).getByRole("button", { name: "3 Pozycje do kupienia" })).toBeInTheDocument()
  })

  it("shows today's meals from the running plan", async () => {
    const props = renderDashboard()

    const today = await screen.findByRole("region", { name: "Dziś w planie" })
    expect(await within(today).findByText("Owsianka")).toBeInTheDocument()
    expect(within(today).getByText("Nic nie zaplanowano")).toBeInTheDocument()
    expect(getPlan).toHaveBeenCalledWith("token", 3)

    fireEvent.click(within(today).getByRole("button", { name: "Otwórz plan" }))
    expect(props.onOpenPlan).toHaveBeenCalledWith(3)
  })

  it("shows the next plan when none runs today", async () => {
    vi.mocked(getPlans).mockResolvedValue([{ ...plan, start_date: "2026-10-20", end_date: "2026-10-26" }])
    renderDashboard()

    const next = await screen.findByRole("region", { name: "Najbliższy plan" })
    expect(within(next).getByText(/Tydzień/)).toBeInTheDocument()
    expect(getPlan).not.toHaveBeenCalled()
  })

  it("opens open shopping lists and the recent recipes", async () => {
    const props = renderDashboard()

    const lists = await screen.findByRole("region", { name: "Listy zakupów" })
    fireEvent.click(within(lists).getByRole("button", { name: /Zakupy na weekend/ }))
    expect(props.onOpenList).toHaveBeenCalledWith({ kind: "plan", listId: 20 })
    fireEvent.click(within(lists).getByRole("button", { name: "Wszystkie listy" }))
    expect(props.onOpenLists).toHaveBeenCalledOnce()

    const recipes = screen.getByRole("region", { name: "Ostatnio dodane przepisy" })
    expect(within(recipes).getByText("Leczo")).toBeInTheDocument()
    expect(within(recipes).getAllByText("2 por. · 30 min")).toHaveLength(2)
  })

  it("keeps the other cards when one part fails to load", async () => {
    vi.mocked(getRecipes).mockRejectedValue(new Error("Nie udało się wczytać przepisów."))
    renderDashboard()

    expect(await screen.findByText("Nie udało się wczytać przepisów.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Zakupy na weekend/ })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "– Przepisy" })).toBeInTheDocument()
  })
})
