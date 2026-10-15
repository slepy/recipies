import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "../../shared/api/client"
import { createShoppingList, getShoppingLists } from "../shopping-lists/api"
import { getRecipes, Recipe } from "../recipes/api"
import MealPlanView from "./MealPlanView"
import { addEntry, addMeal, deleteMeal, getPlan, Plan, PlanMeal, updatePlan } from "./api"

vi.mock("./api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./api")>()),
  addEntry: vi.fn(),
  addMeal: vi.fn(),
  deleteEntry: vi.fn(),
  deleteMeal: vi.fn(),
  deletePlan: vi.fn(),
  getPlan: vi.fn(),
  renameMeal: vi.fn(),
  updateEntry: vi.fn(),
  updatePlan: vi.fn(),
}))
vi.mock("../shopping-lists/api", () => ({
  createShoppingList: vi.fn(),
  deleteShoppingList: vi.fn(),
  getShoppingLists: vi.fn(),
}))
vi.mock("../recipes/api", () => ({ getRecipes: vi.fn() }))

function meal(id: number, name: string, date: string, entries: PlanMeal["entries"] = [], isDefault = true): PlanMeal {
  return { id, name, date, position: id, is_default: isDefault, entries }
}

const pasta = {
  id: 100,
  servings: 4,
  recipe: { id: 5, title: "Spaghetti", servings: 2 },
  ingredients: [{ name: "makaron", amount: 400, amount_text: "", unit: "g", metric_amount: null, metric_unit: "" }],
}
const soup = { id: 101, servings: 1, recipe: { id: 6, title: "Zupa", servings: null }, ingredients: [] }

function basePlan(): Plan {
  return {
    id: 3,
    name: "Tydzień",
    start_date: "2026-11-02",
    end_date: "2026-11-03",
    entry_count: 2,
    days: [
      {
        date: "2026-11-02",
        meals: [meal(1, "Śniadanie", "2026-11-02"), meal(2, "Obiad", "2026-11-02", [pasta, soup]), meal(3, "Kolacja", "2026-11-02")],
      },
      { date: "2026-11-03", meals: [meal(4, "Śniadanie", "2026-11-03"), meal(5, "Obiad", "2026-11-03"), meal(6, "Kolacja", "2026-11-03")] },
    ],
  }
}

function renderView(callbacks: { onOpenList?: () => void; onBack?: () => void } = {}) {
  render(
    <MealPlanView
      accessToken="token"
      accountEmail="cook@example.com"
      headerLinks={[]}
      onBack={callbacks.onBack ?? vi.fn()}
      onOpenList={callbacks.onOpenList ?? vi.fn()}
      onSignOut={vi.fn()}
      planId={3}
    />,
  )
}

describe("meal plan view", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getPlan).mockResolvedValue(basePlan())
    vi.mocked(getShoppingLists).mockResolvedValue([])
    vi.mocked(getRecipes).mockResolvedValue([{ id: 5, title: "Spaghetti", servings: 2 }, { id: 6, title: "Zupa", servings: null }] as Recipe[])
  })

  it("shows days with meals, entries and scaled ingredients", async () => {
    renderView()

    const lunch = (await screen.findAllByRole("region", { name: "Obiad" }))[0]

    expect(within(lunch).getByText("Spaghetti")).toBeInTheDocument()
    expect(within(lunch).getByLabelText("Porcje: Spaghetti")).toHaveValue(4)
    expect(within(lunch).getByText("Składniki na 4 porcji")).toBeInTheDocument()
    expect(within(lunch).getByText("400 g makaron")).toBeInTheDocument()
  })

  it("adds a recipe to a meal and reloads the plan", async () => {
    vi.mocked(addEntry).mockResolvedValue(pasta)
    renderView()
    const dinner = (await screen.findAllByRole("region", { name: "Kolacja" }))[0]

    await userEvent.click(within(dinner).getByRole("button", { name: "Dodaj przepis do: Kolacja" }))
    await userEvent.type(within(dinner).getByLabelText("Szukaj przepisu"), "zup")
    await userEvent.click(within(dinner).getByRole("button", { name: "Dodaj: Zupa" }))

    expect(addEntry).toHaveBeenCalledWith("token", 3, 3, 6, undefined)
    expect(getPlan).toHaveBeenCalledTimes(2)
  })

  it("adds a meal to one day and disables the plus at six meals", async () => {
    const plan = basePlan()
    plan.days[1].meals.push(
      meal(7, "Drugie śniadanie", "2026-11-03", [], false),
      meal(8, "Podwieczorek", "2026-11-03", [], false),
      meal(9, "Przekąska", "2026-11-03", [], false),
    )
    vi.mocked(getPlan).mockResolvedValue(plan)
    vi.mocked(addMeal).mockResolvedValue(meal(10, "Drugie śniadanie", "2026-11-02", [], false))
    renderView()

    const firstDay = await screen.findByRole("button", { name: /Dodaj posiłek do dnia: poniedziałek/ })
    const fullDay = screen.getByRole("button", { name: /Dodaj posiłek do dnia: wtorek/ })
    await userEvent.click(firstDay)

    expect(addMeal).toHaveBeenCalledWith("token", 3, "2026-11-02")
    expect(fullDay).toBeDisabled()
    expect(screen.getByText(/maksymalną liczbę 6 posiłków/)).toBeInTheDocument()
  })

  it("asks before removing an added meal that has entries", async () => {
    const plan = basePlan()
    plan.days[0].meals.push(meal(7, "Przekąska", "2026-11-02", [soup], false))
    vi.mocked(getPlan).mockResolvedValue(plan)
    vi.mocked(deleteMeal).mockResolvedValue(undefined)
    renderView()

    await userEvent.click(await screen.findByRole("button", { name: "Usuń posiłek: Przekąska" }))
    expect(deleteMeal).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole("button", { name: "Usuń posiłek" }))

    expect(deleteMeal).toHaveBeenCalledWith("token", 3, 7, true)
  })

  it("asks for confirmation before a shortened period removes entries", async () => {
    vi.mocked(updatePlan)
      .mockRejectedValueOnce(new ApiError("Skrócenie okresu usunie 2 wpisów z planu.", "confirmation_required", 2))
      .mockResolvedValueOnce({ ...basePlan(), end_date: "2026-11-02", days: basePlan().days.slice(0, 1) })
    renderView()

    await userEvent.click(await screen.findByRole("button", { name: "Zmień nazwę i okres" }))
    await userEvent.clear(screen.getByLabelText("Do"))
    await userEvent.type(screen.getByLabelText("Do"), "2026-11-02")
    await userEvent.click(screen.getByRole("button", { name: "Zapisz zmiany" }))

    expect(await screen.findByText(/razem z 2 wpisami/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Skróć i usuń wpisy" }))

    expect(updatePlan).toHaveBeenLastCalledWith("token", 3, expect.objectContaining({ end_date: "2026-11-02" }), true)
    expect(screen.queryByRole("heading", { name: /wtorek/ })).not.toBeInTheDocument()
  })

  it("cancelling the confirmation changes nothing", async () => {
    vi.mocked(updatePlan).mockRejectedValue(new ApiError("x", "confirmation_required", 2))
    renderView()
    await userEvent.click(await screen.findByRole("button", { name: "Zmień nazwę i okres" }))
    await userEvent.click(screen.getByRole("button", { name: "Zapisz zmiany" }))

    const confirmation = await screen.findByRole("alertdialog")
    await userEvent.click(within(confirmation).getByRole("button", { name: "Anuluj" }))

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    expect(updatePlan).toHaveBeenCalledTimes(1)
  })

  it("builds a shopping list from the checked entries only", async () => {
    vi.mocked(createShoppingList).mockResolvedValue({ id: 55 } as never)
    const onOpenList = vi.fn()
    renderView({ onOpenList })

    await userEvent.click(await screen.findByRole("button", { name: "Utwórz listę zakupów" }))
    expect(screen.getByText("Wybrane wpisy: 2")).toBeInTheDocument()
    await userEvent.click(screen.getByLabelText("Do listy: Zupa"))
    expect(screen.getByText("Wybrane wpisy: 1")).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText("Nazwa listy"), "Sobota")
    await userEvent.click(screen.getByRole("button", { name: "Utwórz listę" }))

    expect(createShoppingList).toHaveBeenCalledWith("token", {
      plan: 3,
      name: "Sobota",
      start_date: "2026-11-02",
      end_date: "2026-11-03",
      excluded_entry_ids: [101],
    })
    expect(onOpenList).toHaveBeenCalledWith(55)
  })

  it("unchecking a whole day excludes all of its entries and blocks an empty list", async () => {
    renderView()

    await userEvent.click(await screen.findByRole("button", { name: "Utwórz listę zakupów" }))
    await userEvent.click(screen.getByLabelText(/Do listy cały dzień: poniedziałek/))

    expect(screen.getByText("Wybrane wpisy: 0")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Utwórz listę" })).toBeDisabled()
    expect(screen.getByText(/Wybierz co najmniej jeden wpis/)).toBeInTheDocument()
  })

  it("warns about lists and entries before deleting the plan", async () => {
    vi.mocked(getShoppingLists).mockResolvedValue([
      { id: 9, name: "Sobota", plan: 3, scope_start: null, scope_end: null, generated_at: "", item_count: 3, bought_count: 1 },
    ])
    renderView()

    await userEvent.click(await screen.findByRole("button", { name: "Usuń plan" }))

    expect(screen.getByText("Zostanie usuniętych 2 wpisów oraz 1 list zakupów z tego planu.")).toBeInTheDocument()
  })
})
