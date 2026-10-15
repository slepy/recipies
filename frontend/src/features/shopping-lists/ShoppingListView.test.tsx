import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { getUnitWeights } from "../ingredients/api"
import ShoppingListView from "./ShoppingListView"
import {
  addCustomItem,
  getRefreshPreview,
  getShoppingList,
  increaseItem,
  ListItem,
  resetItemIncrease,
  refreshShoppingList,
  setItemBought,
  ShoppingList,
} from "./api"

vi.mock("./api", () => ({
  addCustomItem: vi.fn(),
  deleteCustomItem: vi.fn(),
  deleteShoppingList: vi.fn(),
  getRefreshPreview: vi.fn(),
  getShoppingList: vi.fn(),
  increaseItem: vi.fn(),
  resetItemIncrease: vi.fn(),
  refreshShoppingList: vi.fn(),
  setItemBought: vi.fn(),
}))

vi.mock("../ingredients/api", () => ({ getUnitWeights: vi.fn() }))

function item(overrides: Partial<ListItem>): ListItem {
  return {
    id: 1,
    name: "makaron",
    origin: "recipe",
    amount: 600,
    unit: "g",
    amount_text: "",
    metric_amount: null,
    metric_unit: "",
    metric_estimated: false,
    unit_weight: null,
    partial: false,
    bought_metric_base: null,
    extra_amount: 0,
    extra_metric: 0,
    bought: false,
    bought_amount: null,
    is_new: false,
    ...overrides,
  }
}

function list(items: ListItem[], overrides: Partial<ShoppingList> = {}): ShoppingList {
  return {
    id: 8,
    name: "Zakupy sobota",
    plan: 3,
    scope_start: "2026-11-02",
    scope_end: "2026-11-03",
    generated_at: "2026-11-01T10:00:00Z",
    item_count: items.length,
    bought_count: items.filter((entry) => entry.bought).length,
    excluded_entry_ids: [],
    items,
    is_stale: false,
    ...overrides,
  }
}

function renderList() {
  render(
    <ShoppingListView
      accessToken="token"
      accountEmail="cook@example.com"
      headerLinks={[]}
      listId={8}
      onBack={vi.fn()}
      onBackToPlan={vi.fn()}
      onSignOut={vi.fn()}
    />,
  )
}

describe("shopping list view", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("labels recipe and custom items and shows where recipe items come from", async () => {
    vi.mocked(getShoppingList).mockResolvedValue(
      list([item({}), item({ id: 2, name: "mleko", origin: "custom", amount: 2, unit: "l" })]),
    )
    renderList()

    expect(await screen.findByText("makaron 600 g")).toBeInTheDocument()
    expect(screen.getByText("własna")).toBeInTheDocument()
    expect(screen.getByText("z przepisów")).toBeInTheDocument()
    expect(screen.queryByText(/Spaghetti/)).not.toBeInTheDocument()
  })

  it("shows a custom item with its amount as typed and its metric measure", async () => {
    vi.mocked(getShoppingList).mockResolvedValue(
      list([item({ id: 2, name: "śmietana", origin: "custom", amount: 0.5, amount_text: "1/2", unit: "kubek", metric_amount: 125, metric_unit: "ml" })]),
    )
    renderList()

    expect(await screen.findByText("śmietana 1/2 kubek (125 ml)")).toBeInTheDocument()
  })

  it("shows the amount, unit, weight and measure of a recipe item together", async () => {
    vi.mocked(getShoppingList).mockResolvedValue(
      list([item({ name: "mąka", amount: 2, unit: "szklanki", metric_amount: 300, metric_unit: "g" })]),
    )
    renderList()

    expect(await screen.findByText("mąka 2 szklanki (300 g)")).toBeInTheDocument()
  })

  it("increases a recipe item in both measures", async () => {
    vi.mocked(getShoppingList).mockResolvedValue(
      list([item({ name: "mąka", amount: 2, unit: "szklanki", metric_amount: 300, metric_unit: "g" })]),
    )
    vi.mocked(increaseItem).mockResolvedValue(item({}))
    renderList()

    await userEvent.click(await screen.findByRole("button", { name: "Zwiększ ilość: mąka" }))
    await userEvent.type(screen.getByLabelText("Dodaj ilość: mąka"), "1")
    await userEvent.type(screen.getByLabelText("Dodaj wagę lub objętość: mąka"), "150")
    await userEvent.click(screen.getByRole("button", { name: "Zwiększ" }))

    expect(increaseItem).toHaveBeenCalledWith("token", 8, 1, { increase_amount: 1, increase_metric_amount: 150 })
  })

  it("offers only the measures the item has and can take the increase back", async () => {
    vi.mocked(getShoppingList).mockResolvedValue(list([item({ name: "jajka", amount: 4, unit: "szt", extra_amount: 2 })]))
    vi.mocked(resetItemIncrease).mockResolvedValue(item({}))
    renderList()

    await userEvent.click(await screen.findByRole("button", { name: "Zwiększ ilość: jajka" }))
    expect(screen.queryByLabelText(/Dodaj wagę lub objętość/)).not.toBeInTheDocument()
    expect(screen.getByText("zwiększona ręcznie")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Cofnij zwiększenie: jajka" }))

    expect(resetItemIncrease).toHaveBeenCalledWith("token", 8, 1)
  })

  it("tells how much more to buy in each measure after an increase of a bought item", async () => {
    vi.mocked(getShoppingList).mockResolvedValue(
      list([item({ bought: true, amount: 3, unit: "szt", bought_amount: 2, metric_amount: 1.2, metric_unit: "kg", bought_metric_base: 1000 })]),
    )
    renderList()

    expect(await screen.findByText("Ilość zmieniona od zakupu: dokup 1 szt i 0.2 kg")).toBeInTheDocument()
  })

  it("shows bought items under the active ones and lets the user restore them", async () => {
    vi.mocked(getShoppingList)
      .mockResolvedValueOnce(list([item({}), item({ id: 2, name: "jajka", amount: 4, unit: "szt", bought: true, bought_amount: 4 })]))
      .mockResolvedValue(list([item({}), item({ id: 2, name: "jajka", amount: 4, unit: "szt" })]))
    vi.mocked(setItemBought).mockResolvedValue(item({}))
    renderList()

    const bought = within(await screen.findByRole("region", { name: /Kupione/ }))
    expect(bought.getByText("jajka 4 szt")).toBeInTheDocument()
    expect(bought.getByText("kupione")).toBeInTheDocument()
    await userEvent.click(bought.getByRole("checkbox"))

    expect(setItemBought).toHaveBeenCalledWith("token", 8, 2, false)
    expect(within(await screen.findByRole("region", { name: /Do kupienia \(2\)/ })).getByText("jajka 4 szt")).toBeInTheDocument()
  })

  it("flags a bought item whose amount grew since it was bought", async () => {
    vi.mocked(getShoppingList).mockResolvedValue(list([item({ bought: true, bought_amount: 400 })]))
    renderList()

    expect(await screen.findByText("Ilość zmieniona od zakupu: dokup 200 g")).toBeInTheDocument()
  })

  it("adds a custom item and refuses an empty name", async () => {
    vi.mocked(getShoppingList).mockResolvedValue(list([item({})]))
    vi.mocked(addCustomItem).mockResolvedValue(item({ id: 3, origin: "custom" }))
    renderList()
    await screen.findByText("makaron 600 g")

    await userEvent.click(screen.getByRole("button", { name: "Dodaj pozycję" }))
    expect(screen.getByText("Podaj nazwę pozycji.")).toBeInTheDocument()
    expect(addCustomItem).not.toHaveBeenCalled()

    await userEvent.type(screen.getByLabelText(/^Własna pozycja/), "papier toaletowy")
    await userEvent.type(screen.getByLabelText("Ilość"), "1/2")
    await userEvent.type(screen.getByLabelText("Jednostka"), "rolki")
    await userEvent.type(screen.getByLabelText("Waga lub objętość"), "0,5")
    await userEvent.selectOptions(screen.getByLabelText("Miara"), "kg")
    await userEvent.click(screen.getByRole("button", { name: "Dodaj pozycję" }))

    expect(addCustomItem).toHaveBeenCalledWith("token", 8, {
      name: "papier toaletowy",
      amount: "1/2",
      unit: "rolki",
      metric_amount: 0.5,
      metric_unit: "kg",
    })
  })

  it("shows no stale notice when the plan did not change", async () => {
    vi.mocked(getShoppingList).mockResolvedValue(list([item({})]))
    renderList()
    await screen.findByText("makaron 600 g")

    expect(screen.queryByText("Plan zmienił się od wygenerowania listy.")).not.toBeInTheDocument()
  })

  it("previews the changes and refreshes only after confirmation", async () => {
    vi.mocked(getShoppingList).mockResolvedValue(list([item({})], { is_stale: true }))
    vi.mocked(getRefreshPreview).mockResolvedValue({ added: ["marchew"], changed: ["makaron"], removed: [], custom_kept: 2 })
    vi.mocked(refreshShoppingList).mockResolvedValue(list([item({ amount: 800 })]))
    renderList()

    await userEvent.click(await screen.findByRole("button", { name: "Odśwież z planu" }))
    expect(await screen.findByText("Dodane pozycje: 1 (marchew)")).toBeInTheDocument()
    expect(screen.getByText("Zachowane własne pozycje: 2")).toBeInTheDocument()
    expect(refreshShoppingList).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole("button", { name: "Odśwież listę" }))

    expect(refreshShoppingList).toHaveBeenCalledWith("token", 8)
    expect(await screen.findByText("makaron 800 g")).toBeInTheDocument()
    expect(screen.queryByText("Plan zmienił się od wygenerowania listy.")).not.toBeInTheDocument()
  })

  it("cancelling the preview leaves the list untouched", async () => {
    vi.mocked(getShoppingList).mockResolvedValue(list([item({})], { is_stale: true }))
    vi.mocked(getRefreshPreview).mockResolvedValue({ added: [], changed: ["makaron"], removed: [], custom_kept: 0 })
    renderList()

    await userEvent.click(await screen.findByRole("button", { name: "Odśwież z planu" }))
    await userEvent.click(await screen.findByRole("button", { name: "Anuluj" }))

    expect(refreshShoppingList).not.toHaveBeenCalled()
    expect(screen.getByText("makaron 600 g")).toBeInTheDocument()
  })

  it("keeps the saved list and shows an error when the refresh fails", async () => {
    vi.mocked(getShoppingList).mockResolvedValue(list([item({})], { is_stale: true }))
    vi.mocked(getRefreshPreview).mockResolvedValue({ added: [], changed: ["makaron"], removed: [], custom_kept: 0 })
    vi.mocked(refreshShoppingList).mockRejectedValue(new Error("Nie udało się odświeżyć listy."))
    renderList()

    await userEvent.click(await screen.findByRole("button", { name: "Odśwież z planu" }))
    await userEvent.click(await screen.findByRole("button", { name: "Odśwież listę" }))

    expect(await screen.findByRole("alert")).toHaveTextContent("Nie udało się odświeżyć listy.")
    expect(screen.getByText("makaron 600 g")).toBeInTheDocument()
  })

  it("marks a weight estimated from the knowledge base as approximate", async () => {
    vi.mocked(getShoppingList).mockResolvedValue(
      list([item({ id: 2, name: "awokado", origin: "custom", amount: 3, amount_text: "3", unit: "", metric_amount: 420, metric_unit: "g", metric_estimated: true })]),
    )
    renderList()

    expect(await screen.findByText("awokado 3 (≈ 420 g)")).toBeInTheDocument()
  })

  it("previews the grams an increase adds and leaves the calculation to the server", async () => {
    vi.mocked(getShoppingList).mockResolvedValue(
      list([item({ name: "pomidorki", amount: 12, unit: "szt.", metric_amount: 240, metric_unit: "g", unit_weight: 20 })]),
    )
    vi.mocked(increaseItem).mockResolvedValue(item({}))
    renderList()

    await userEvent.click(await screen.findByRole("button", { name: "Zwiększ ilość: pomidorki" }))
    await userEvent.type(screen.getByLabelText("Dodaj ilość: pomidorki"), "6")
    expect(screen.getByText("+6 szt. ≈ +120 g")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Zwiększ" }))

    expect(increaseItem).toHaveBeenCalledWith("token", 8, 1, { increase_amount: 6 })
  })

  it("shows no increase preview without a unit weight", async () => {
    vi.mocked(getShoppingList).mockResolvedValue(
      list([item({ name: "pomidorki", amount: 12, unit: "szt.", metric_amount: 240, metric_unit: "g" })]),
    )
    renderList()

    await userEvent.click(await screen.findByRole("button", { name: "Zwiększ ilość: pomidorki" }))
    await userEvent.type(screen.getByLabelText("Dodaj ilość: pomidorki"), "6")

    expect(screen.queryByText(/≈/)).not.toBeInTheDocument()
  })

  it("adds a product picked from the knowledge base with only its amount", async () => {
    vi.mocked(getShoppingList).mockResolvedValue(list([item({})]))
    vi.mocked(getUnitWeights).mockResolvedValue({
      count: 2,
      next: null,
      previous: null,
      results: [
        { id: 5, name: "awokado", unit: "", grams_per_unit: 140, source: "auto", created_at: "", updated_at: "" },
        { id: 6, name: "Makaron", unit: "g", grams_per_unit: 1, source: "auto", created_at: "", updated_at: "" },
      ],
    })
    vi.mocked(addCustomItem).mockResolvedValue(item({ id: 3, origin: "custom" }))
    renderList()

    await userEvent.type(await screen.findByRole("combobox", { name: "Wybierz z bazy składników" }), "a")
    expect(await screen.findByRole("option", { name: "Makaron, g, 1 g (już na liście)" })).toHaveAttribute("aria-disabled", "true")
    await userEvent.click(screen.getByRole("option", { name: "awokado, 140 g" }))
    expect(screen.getByLabelText(/^Własna pozycja/)).toHaveValue("awokado")
    expect(screen.getByLabelText("Ilość")).toHaveFocus()
    await userEvent.keyboard("3")
    expect(screen.getByText("≈ 420 g według bazy składników")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Dodaj pozycję" }))

    expect(addCustomItem).toHaveBeenCalledWith("token", 8, {
      name: "awokado",
      amount: "3",
      unit: "",
      metric_amount: null,
      metric_unit: "",
    })
  })
})
