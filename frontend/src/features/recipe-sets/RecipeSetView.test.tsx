import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { Recipe, getRecipes } from "../recipes/api"
import { getShoppingList, ListItem, setItemBought, ShoppingList } from "../shopping-lists/api"
import RecipeSetView from "./RecipeSetView"
import { deleteRecipeSet, getRecipeSet, RecipeSet, updateRecipeSet } from "./api"

vi.mock("./api", () => ({ deleteRecipeSet: vi.fn(), getRecipeSet: vi.fn(), updateRecipeSet: vi.fn() }))
vi.mock("../recipes/api", () => ({ getRecipes: vi.fn() }))
vi.mock("../shopping-lists/api", () => ({
  addCustomItem: vi.fn(),
  deleteCustomItem: vi.fn(),
  getShoppingList: vi.fn(),
  increaseItem: vi.fn(),
  resetItemIncrease: vi.fn(),
  setItemBought: vi.fn(),
}))

function recipeSet(recipes: { id: number; title: string }[], overrides: Partial<RecipeSet> = {}): RecipeSet {
  return {
    id: 4,
    name: "Weekend",
    shopping_list: 11,
    recipe_count: recipes.length,
    created_at: "",
    updated_at: "",
    recipes,
    ...overrides,
  }
}

function recipe(id: number, title: string) {
  return { id, title } as Recipe
}

function item(overrides: Partial<ListItem>): ListItem {
  return {
    id: 1,
    name: "mleko",
    origin: "recipe",
    amount: null,
    unit: "",
    amount_text: "",
    metric_amount: 750,
    metric_unit: "ml",
    partial: false,
    bought: false,
    bought_amount: null,
    bought_metric_base: null,
    extra_amount: 0,
    extra_metric: 0,
    is_new: false,
    ...overrides,
  }
}

function list(items: ListItem[]): ShoppingList {
  return {
    id: 11,
    name: "Weekend",
    plan: null,
    scope_start: null,
    scope_end: null,
    generated_at: "",
    item_count: items.length,
    bought_count: 0,
    excluded_entry_ids: [],
    items,
    is_stale: false,
  }
}

function renderView(onBack = vi.fn()) {
  render(
    <RecipeSetView accessToken="token" accountEmail="cook@example.com" headerLinks={[]} onBack={onBack} onSignOut={vi.fn()} setId={4} />,
  )
  return onBack
}

describe("recipe set view", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getRecipeSet).mockResolvedValue(recipeSet([{ id: 1, title: "Zupa" }]))
    vi.mocked(getRecipes).mockResolvedValue([recipe(1, "Zupa"), recipe(2, "Ciasto"), recipe(3, "Sałatka")])
  })

  it("adds and removes recipes and saves them only on an explicit save", async () => {
    vi.mocked(updateRecipeSet).mockResolvedValue(recipeSet([{ id: 2, title: "Ciasto" }]))
    renderView()

    await userEvent.click(await screen.findByRole("button", { name: "Dodaj: Ciasto" }))
    await userEvent.click(screen.getByRole("button", { name: "Usuń z zestawu: Zupa" }))
    expect(updateRecipeSet).not.toHaveBeenCalled()
    expect(screen.getByText(/Masz niezapisane zmiany/)).toBeInTheDocument()
    // A recipe already chosen is no longer offered, so it cannot be added twice.
    expect(screen.queryByRole("button", { name: "Dodaj: Ciasto" })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Zapisz zestaw" }))

    expect(updateRecipeSet).toHaveBeenCalledWith("token", 4, { name: "Weekend", recipes: [2] })
    expect(await screen.findByText("Zestaw zapisany. Lista zakupów została przeliczona.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Zapisz zestaw" })).toBeDisabled()
  })

  it("filters recipes by title", async () => {
    renderView()

    await userEvent.type(await screen.findByLabelText("Szukaj przepisu"), "sał")

    expect(screen.getByRole("button", { name: "Dodaj: Sałatka" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Dodaj: Ciasto" })).not.toBeInTheDocument()
  })

  it("keeps the draft and tells the user when saving fails", async () => {
    vi.mocked(updateRecipeSet).mockRejectedValue(new Error("Nie udało się zapisać zestawu."))
    renderView()

    await userEvent.click(await screen.findByRole("button", { name: "Dodaj: Ciasto" }))
    await userEvent.click(screen.getByRole("button", { name: "Zapisz zestaw" }))

    expect(await screen.findByRole("alert")).toHaveTextContent("Nie udało się zapisać zestawu.")
    expect(screen.getByRole("button", { name: "Usuń z zestawu: Ciasto" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "Weekend" })).toBeInTheDocument()
  })

  it("refuses a blank name next to the field", async () => {
    renderView()

    await userEvent.clear(await screen.findByLabelText("Nazwa zestawu"))
    await userEvent.type(screen.getByLabelText("Nazwa zestawu"), " ")
    await userEvent.click(screen.getByRole("button", { name: "Zapisz zestaw" }))

    expect(screen.getByRole("alert")).toHaveTextContent("Podaj nazwę zestawu.")
    expect(updateRecipeSet).not.toHaveBeenCalled()
  })

  it("shows the set's shopping list in its tab with bought items below active ones", async () => {
    vi.mocked(getShoppingList)
      .mockResolvedValueOnce(list([item({}), item({ id: 2, name: "marchew", amount: 2, unit: "szt", metric_amount: null, metric_unit: "", bought: true })]))
      .mockResolvedValue(list([item({ bought: true }), item({ id: 2, name: "marchew", amount: 2, unit: "szt", metric_amount: null, metric_unit: "", bought: true })]))
    vi.mocked(setItemBought).mockResolvedValue(item({ bought: true }))
    renderView()

    await userEvent.click(await screen.findByRole("tab", { name: "Lista zakupów" }))

    expect(getShoppingList).toHaveBeenCalledWith("token", 11)
    expect(screen.getByRole("tab", { name: "Lista zakupów" })).toHaveAttribute("aria-selected", "true")
    const active = within(await screen.findByRole("region", { name: /Do kupienia/ }))
    expect(active.getByText("mleko (750 ml)")).toBeInTheDocument()
    expect(within(screen.getByRole("region", { name: /Kupione/ })).getByText("marchew 2 szt")).toBeInTheDocument()

    await userEvent.click(active.getByRole("checkbox"))

    expect(setItemBought).toHaveBeenCalledWith("token", 11, 1, true)
    expect(await screen.findByRole("region", { name: "Kupione (2)" })).toBeInTheDocument()
  })

  it("reloads the list after a save so it shows the recomputed items", async () => {
    vi.mocked(getShoppingList).mockResolvedValueOnce(list([item({})])).mockResolvedValue(list([item({ name: "mąka" })]))
    vi.mocked(updateRecipeSet).mockResolvedValue(recipeSet([{ id: 1, title: "Zupa" }, { id: 2, title: "Ciasto" }]))
    renderView()

    await userEvent.click(await screen.findByRole("tab", { name: "Lista zakupów" }))
    await screen.findByText("mleko (750 ml)")
    await userEvent.click(screen.getByRole("tab", { name: /Przepisy/ }))
    await userEvent.click(screen.getByRole("button", { name: "Dodaj: Ciasto" }))
    await userEvent.click(screen.getByRole("button", { name: "Zapisz zestaw" }))
    await screen.findByText(/Zestaw zapisany/)
    await userEvent.click(screen.getByRole("tab", { name: "Lista zakupów" }))

    expect(await screen.findByText("mąka (750 ml)")).toBeInTheDocument()
    expect(getShoppingList).toHaveBeenCalledTimes(2)
  })

  it("asks before deleting the set with its list and cancelling changes nothing", async () => {
    vi.mocked(deleteRecipeSet).mockResolvedValue(undefined)
    const onBack = renderView()

    await userEvent.click(await screen.findByRole("button", { name: "Usuń zestaw" }))
    const dialog = within(screen.getByRole("alertdialog", { name: "Usunąć zestaw przepisów?" }))
    expect(dialog.getByText(/razem z listą zakupów i jej własnymi pozycjami/)).toBeInTheDocument()
    await userEvent.click(dialog.getByRole("button", { name: "Anuluj" }))
    expect(deleteRecipeSet).not.toHaveBeenCalled()
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Usuń zestaw" }))
    await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Usuń zestaw" }))

    expect(deleteRecipeSet).toHaveBeenCalledWith("token", 4)
    expect(onBack).toHaveBeenCalled()
  })
})
