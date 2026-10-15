import { fireEvent, render, screen, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { getPlans } from "../meal-plans/api"
import { getRecipeSets } from "../recipe-sets/api"
import { getAllShoppingLists, ShoppingListSummary } from "../shopping-lists/api"
import ShoppingOverview from "./ShoppingOverview"

vi.mock("../meal-plans/api", () => ({ getPlans: vi.fn() }))
vi.mock("../recipe-sets/api", () => ({ getRecipeSets: vi.fn() }))
vi.mock("../shopping-lists/api", () => ({ getAllShoppingLists: vi.fn() }))

function summary(id: number, name: string, plan: number | null, itemCount: number, boughtCount: number): ShoppingListSummary {
  return {
    id,
    name,
    plan,
    scope_start: null,
    scope_end: null,
    generated_at: "2026-10-15T10:00:00Z",
    item_count: itemCount,
    bought_count: boughtCount,
  }
}

function renderOverview() {
  const props = { onOpenList: vi.fn(), onOpenPlans: vi.fn(), onOpenSets: vi.fn() }
  render(<ShoppingOverview accessToken="token" {...props} />)
  return props
}

describe("shopping lists overview", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getPlans).mockResolvedValue([
      { id: 3, name: "Tydzień", start_date: "2026-10-12", end_date: "2026-10-18", entry_count: 5 },
    ])
    vi.mocked(getRecipeSets).mockResolvedValue([
      { id: 8, name: "Grill", shopping_list: 21, recipe_count: 2, created_at: "", updated_at: "" },
    ])
    vi.mocked(getAllShoppingLists).mockResolvedValue([
      summary(20, "Zakupy na weekend", 3, 4, 1),
      summary(21, "Grill", null, 3, 0),
      summary(22, "Poniedziałek", 3, 2, 2),
    ])
  })

  it("shows plan and set lists together with their source and progress", async () => {
    renderOverview()

    const open = await screen.findByRole("region", { name: "Do kupienia (2)" })
    expect(within(open).getByRole("button", { name: /Plan: Tydzień.*Zakupy na weekend.*Zostały 3 pozycje.*Kupione 1 z 4/ })).toBeInTheDocument()
    expect(within(open).getByRole("button", { name: /Zestaw: Grill.*Grill.*Kupione 0 z 3/ })).toBeInTheDocument()

    const done = screen.getByRole("region", { name: "Kupione (1)" })
    expect(within(done).getByRole("button", { name: /Poniedziałek.*Wszystko kupione/ })).toBeInTheDocument()
  })

  it("opens a plan list on its own screen and a set list on its set", async () => {
    const props = renderOverview()

    fireEvent.click(await screen.findByRole("button", { name: /Zakupy na weekend/ }))
    expect(props.onOpenList).toHaveBeenCalledWith({ kind: "plan", listId: 20 })

    fireEvent.click(screen.getByRole("button", { name: /Zestaw: Grill/ }))
    expect(props.onOpenList).toHaveBeenCalledWith({ kind: "set", setId: 8 })
  })

  it("filters the lists by their source", async () => {
    renderOverview()

    await screen.findByRole("region", { name: "Do kupienia (2)" })
    fireEvent.click(screen.getByRole("button", { name: "Z zestawów" }))

    expect(screen.getByRole("button", { name: "Z zestawów" })).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByRole("region", { name: "Do kupienia (1)" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Zakupy na weekend/ })).not.toBeInTheDocument()
    expect(screen.queryByRole("region", { name: /^Kupione/ })).not.toBeInTheDocument()
  })

  it("explains where lists come from when there are none", async () => {
    vi.mocked(getAllShoppingLists).mockResolvedValue([])
    const props = renderOverview()

    expect(await screen.findByRole("heading", { name: "Nie masz jeszcze list zakupów" })).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Przejdź do planów" }))
    expect(props.onOpenPlans).toHaveBeenCalledOnce()
  })

  it("shows an error when the lists cannot be loaded", async () => {
    vi.mocked(getAllShoppingLists).mockRejectedValue(new Error("Nie udało się wczytać list."))
    renderOverview()

    expect(await screen.findByRole("alert")).toHaveTextContent("Nie udało się wczytać list.")
  })
})
