import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import ShoppingListView from "./ShoppingListView"
import {
  addCustomItem,
  getRefreshPreview,
  getShoppingList,
  ListItem,
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
  refreshShoppingList: vi.fn(),
  setItemBought: vi.fn(),
}))

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
    partial: false,
    sources: [{ recipe: "Spaghetti", date: "2026-11-02", meal: "Obiad" }],
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
      list([item({}), item({ id: 2, name: "mleko", origin: "custom", amount: 2, unit: "l", sources: [] })]),
    )
    renderList()

    expect(await screen.findByText("makaron 600 g")).toBeInTheDocument()
    expect(screen.getByText("własna")).toBeInTheDocument()
    expect(screen.getByText("z przepisów")).toBeInTheDocument()
    expect(screen.getByText(/Spaghetti – .* obiad/)).toBeInTheDocument()
  })

  it("shows a custom item with its amount as typed and its metric measure", async () => {
    vi.mocked(getShoppingList).mockResolvedValue(
      list([item({ id: 2, name: "śmietana", origin: "custom", amount: 0.5, amount_text: "1/2", unit: "kubek", metric_amount: 125, metric_unit: "ml", sources: [] })]),
    )
    renderList()

    expect(await screen.findByText("śmietana 1/2 kubek (125 ml)")).toBeInTheDocument()
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
})
