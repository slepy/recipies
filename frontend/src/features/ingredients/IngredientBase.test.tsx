import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "../../shared/api/client"
import IngredientBase from "./IngredientBase"
import { createUnitWeight, deleteUnitWeight, getUnitWeights, updateUnitWeight, UnitWeight, UnitWeightPage } from "./api"

vi.mock("./api", () => ({
  createUnitWeight: vi.fn(),
  deleteUnitWeight: vi.fn(),
  getUnitWeights: vi.fn(),
  updateUnitWeight: vi.fn(),
}))

function entry(overrides: Partial<UnitWeight>): UnitWeight {
  return {
    id: 1,
    name: "pomidorki koktajlowe",
    unit: "szt.",
    grams_per_unit: 20,
    source: "auto",
    created_at: "2026-10-15T10:00:00Z",
    updated_at: "2026-10-15T10:00:00Z",
    ...overrides,
  }
}

function page(results: UnitWeight[], next: string | null = null): UnitWeightPage {
  return { count: results.length, next, previous: null, results }
}

function renderBase() {
  render(<IngredientBase accessToken="token" accountEmail="cook@example.com" headerLinks={[]} onSignOut={vi.fn()} />)
}

describe("ingredient knowledge base", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getUnitWeights).mockResolvedValue(
      page([entry({}), entry({ id: 2, name: "awokado", unit: "", grams_per_unit: 140, source: "manual" })]),
    )
  })

  it("shows each entry with its unit, weight and a text label of its source", async () => {
    renderBase()

    expect(await screen.findByText("pomidorki koktajlowe, szt., 20 g")).toBeInTheDocument()
    expect(screen.getByText("awokado, 140 g")).toBeInTheDocument()
    expect(screen.getByText("automatycznie")).toBeInTheDocument()
    expect(screen.getByText("ręcznie")).toBeInTheDocument()
  })

  it("explains where entries come from when the base is empty", async () => {
    vi.mocked(getUnitWeights).mockResolvedValue(page([]))
    renderBase()

    expect(await screen.findByText(/Baza jest jeszcze pusta. Wpisy powstają same, gdy zapiszesz przepis/)).toBeInTheDocument()
  })

  it("searches by part of the name", async () => {
    renderBase()
    await screen.findByText("awokado, 140 g")
    vi.mocked(getUnitWeights).mockResolvedValue(page([]))

    await userEvent.type(screen.getByLabelText("Szukaj produktu"), "ruk")

    expect(getUnitWeights).toHaveBeenLastCalledWith("token", "ruk", 1)
    expect(await screen.findByText("Nie znaleziono produktu „ruk”.")).toBeInTheDocument()
  })

  it("loads the next page on request", async () => {
    vi.mocked(getUnitWeights)
      .mockResolvedValueOnce(page([entry({})], "/api/ingredients/unit-weights/?page=2"))
      .mockResolvedValueOnce(page([entry({ id: 3, name: "rukola", unit: "garść" })]))
    renderBase()

    await userEvent.click(await screen.findByRole("button", { name: "Pokaż więcej" }))

    expect(getUnitWeights).toHaveBeenLastCalledWith("token", "", 2)
    expect(await screen.findByText("rukola, garść, 20 g")).toBeInTheDocument()
    expect(screen.getByText("pomidorki koktajlowe, szt., 20 g")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Pokaż więcej" })).not.toBeInTheDocument()
  })

  it("adds an entry by hand", async () => {
    vi.mocked(createUnitWeight).mockResolvedValue(entry({ id: 4 }))
    renderBase()
    const form = within(await screen.findByRole("form", { name: "Nowy wpis" }))

    await userEvent.type(form.getByLabelText(/^Nazwa produktu/), "rukola")
    await userEvent.type(form.getByLabelText(/^Jednostka/), "garść")
    await userEvent.type(form.getByLabelText(/^Gramy na jednostkę/), "20,5")
    await userEvent.click(form.getByRole("button", { name: "Dodaj wpis" }))

    expect(createUnitWeight).toHaveBeenCalledWith("token", { name: "rukola", unit: "garść", grams_per_unit: 20.5 })
    expect(form.getByLabelText(/^Nazwa produktu/)).toHaveValue("")
  })

  it("sends an entry once while it is being saved", async () => {
    let finishSaving: (saved: UnitWeight) => void = () => {}
    vi.mocked(createUnitWeight).mockReturnValue(new Promise((resolve) => (finishSaving = resolve)))
    renderBase()
    const form = within(await screen.findByRole("form", { name: "Nowy wpis" }))

    await userEvent.type(form.getByLabelText(/^Nazwa produktu/), "rukola")
    await userEvent.type(form.getByLabelText(/^Gramy na jednostkę/), "20")
    await userEvent.click(form.getByRole("button", { name: "Dodaj wpis" }))
    await userEvent.click(form.getByRole("button", { name: "Dodaj wpis" }))

    expect(form.getByRole("button", { name: "Dodaj wpis" })).toBeDisabled()
    expect(createUnitWeight).toHaveBeenCalledTimes(1)
    finishSaving(entry({ id: 4 }))
    await waitFor(() => expect(form.getByRole("button", { name: "Dodaj wpis" })).toBeEnabled())
  })

  it("checks the form and shows the server's message about an existing entry", async () => {
    vi.mocked(createUnitWeight).mockRejectedValue(
      new ApiError("Wpis już istnieje.", "", 0, { name: "Wpis „awokado” już istnieje (140 g)." }),
    )
    renderBase()
    const form = within(await screen.findByRole("form", { name: "Nowy wpis" }))

    await userEvent.click(form.getByRole("button", { name: "Dodaj wpis" }))
    expect(form.getByText("Podaj nazwę produktu.")).toBeInTheDocument()
    expect(form.getByText("Podaj wagę jednostki jako liczbę.")).toBeInTheDocument()
    expect(createUnitWeight).not.toHaveBeenCalled()

    await userEvent.type(form.getByLabelText(/^Nazwa produktu/), "Awokado")
    await userEvent.type(form.getByLabelText(/^Gramy na jednostkę/), "150")
    await userEvent.click(form.getByRole("button", { name: "Dodaj wpis" }))

    expect(await form.findByText("Wpis „awokado” już istnieje (140 g).")).toBeInTheDocument()
  })

  it("corrects an entry", async () => {
    vi.mocked(updateUnitWeight).mockResolvedValue(entry({ grams_per_unit: 25, source: "manual" }))
    renderBase()

    await userEvent.click(await screen.findByRole("button", { name: "Popraw: pomidorki koktajlowe" }))
    const form = within(screen.getByRole("form", { name: "Popraw wpis: pomidorki koktajlowe" }))
    const grams = form.getByLabelText(/^Gramy na jednostkę/)
    await userEvent.clear(grams)
    await userEvent.type(grams, "25")
    await userEvent.click(form.getByRole("button", { name: "Zapisz" }))

    expect(updateUnitWeight).toHaveBeenCalledWith("token", 1, { name: "pomidorki koktajlowe", unit: "szt.", grams_per_unit: 25 })
  })

  it("deletes an entry only after confirmation", async () => {
    vi.mocked(deleteUnitWeight).mockResolvedValue(undefined)
    renderBase()

    await userEvent.click(await screen.findByRole("button", { name: "Usuń: awokado" }))
    expect(deleteUnitWeight).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole("button", { name: "Usuń wpis" }))

    expect(deleteUnitWeight).toHaveBeenCalledWith("token", 2)
  })
})
