import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import UnitWeightPicker from "./UnitWeightPicker"
import { getUnitWeights, UnitWeight } from "./api"

vi.mock("./api", () => ({ getUnitWeights: vi.fn() }))

function entry(id: number, name: string, unit: string, grams: number): UnitWeight {
  return { id, name, unit, grams_per_unit: grams, source: "auto", created_at: "", updated_at: "" }
}

const entries = [entry(1, "awokado", "", 140), entry(2, "Pomidorki koktajlowe", "szt.", 20), entry(3, "rukola", "garść", 20)]

function renderPicker(takenNames = new Set<string>()) {
  const onPick = vi.fn()
  render(<UnitWeightPicker accessToken="token" onPick={onPick} takenNames={takenNames} />)
  return onPick
}

describe("unit weight picker", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getUnitWeights).mockResolvedValue({ count: 3, next: null, previous: null, results: entries })
  })

  it("is a labelled combobox that searches the knowledge base", async () => {
    renderPicker()

    await userEvent.type(screen.getByRole("combobox", { name: "Wybierz z bazy składników" }), "o")

    expect(getUnitWeights).toHaveBeenCalledWith("token", "o")
    expect(await screen.findByRole("option", { name: "awokado, 140 g" })).toBeInTheDocument()
  })

  it("moves with the arrow keys and picks with Enter", async () => {
    const onPick = renderPicker()
    const input = screen.getByRole("combobox")

    await userEvent.type(input, "o")
    await screen.findByRole("option", { name: "awokado, 140 g" })
    await userEvent.keyboard("{ArrowDown}{ArrowDown}")
    expect(screen.getByRole("option", { name: "Pomidorki koktajlowe, szt., 20 g" })).toHaveAttribute("aria-selected", "true")
    expect(input).toHaveAttribute("aria-activedescendant", screen.getByRole("option", { name: /Pomidorki/ }).id)
    await userEvent.keyboard("{Enter}")

    expect(onPick).toHaveBeenCalledWith(entries[1])
    expect(input).toHaveValue("")
  })

  it("closes with Escape without picking", async () => {
    const onPick = renderPicker()

    await userEvent.type(screen.getByRole("combobox"), "o")
    await screen.findByRole("option", { name: "awokado, 140 g" })
    await userEvent.keyboard("{ArrowDown}{Escape}")

    expect(screen.getByRole("combobox")).toHaveAttribute("aria-expanded", "false")
    expect(screen.queryByRole("option")).not.toBeInTheDocument()
    expect(onPick).not.toHaveBeenCalled()
  })

  it("marks products already on the list in text and does not let them be picked", async () => {
    const onPick = renderPicker(new Set(["pomidorki koktajlowe"]))

    await userEvent.type(screen.getByRole("combobox"), "o")
    const taken = await screen.findByRole("option", { name: "Pomidorki koktajlowe, szt., 20 g (już na liście)" })
    expect(taken).toHaveAttribute("aria-disabled", "true")
    await userEvent.click(taken)
    await userEvent.keyboard("{ArrowDown}{ArrowDown}{Enter}")

    expect(onPick).not.toHaveBeenCalled()
  })

  it("says when nothing matches", async () => {
    vi.mocked(getUnitWeights).mockResolvedValue({ count: 0, next: null, previous: null, results: [] })
    renderPicker()

    await userEvent.type(screen.getByRole("combobox"), "xyz")

    expect(await screen.findByText("Nie ma takiego produktu w bazie. Wpisz pozycję ręcznie poniżej.")).toBeInTheDocument()
  })
})
