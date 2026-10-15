import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "../../shared/api/client"
import RecipeSetList from "./RecipeSetList"
import { createRecipeSet, getRecipeSets, RecipeSet } from "./api"

vi.mock("./api", () => ({ createRecipeSet: vi.fn(), getRecipeSets: vi.fn() }))

function renderList(onOpenSet = vi.fn()) {
  render(
    <RecipeSetList accessToken="token" accountEmail="cook@example.com" headerLinks={[]} onOpenSet={onOpenSet} onSignOut={vi.fn()} />,
  )
  return onOpenSet
}

const summary = { shopping_list: 5, created_at: "2026-10-15T10:00:00Z", updated_at: "2026-10-15T10:00:00Z" }

describe("recipe set list", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getRecipeSets).mockResolvedValue([
      { id: 1, name: "Weekend", recipe_count: 3, ...summary },
      { id: 2, name: "Weekend", recipe_count: 1, ...summary },
    ])
  })

  it("lists sets with the same name separately and opens the chosen one", async () => {
    const onOpenSet = renderList()

    await userEvent.click(await screen.findByRole("button", { name: /Weekend 1 przepis/ }))

    expect(screen.getByRole("button", { name: /Weekend 3 przepisy/ })).toBeInTheDocument()
    expect(onOpenSet).toHaveBeenCalledWith(2)
  })

  it("shows an empty state", async () => {
    vi.mocked(getRecipeSets).mockResolvedValue([])
    renderList()

    expect(await screen.findByText("Nie masz jeszcze żadnego zestawu.")).toBeInTheDocument()
  })

  it("creates a set and opens it", async () => {
    vi.mocked(createRecipeSet).mockResolvedValue({ id: 7 } as RecipeSet)
    const onOpenSet = renderList()
    await screen.findAllByText("Weekend")

    await userEvent.type(screen.getByLabelText("Nazwa zestawu"), "Grill")
    await userEvent.click(screen.getByRole("button", { name: "Utwórz zestaw" }))

    expect(createRecipeSet).toHaveBeenCalledWith("token", "Grill")
    expect(onOpenSet).toHaveBeenCalledWith(7)
  })

  it("refuses a blank name next to the field without calling the server", async () => {
    renderList()
    await screen.findAllByText("Weekend")

    await userEvent.type(screen.getByLabelText("Nazwa zestawu"), "   ")
    await userEvent.click(screen.getByRole("button", { name: "Utwórz zestaw" }))

    expect(screen.getByRole("alert")).toHaveTextContent("Podaj nazwę zestawu.")
    expect(screen.getByLabelText(/^Nazwa zestawu/)).toHaveAttribute("aria-invalid", "true")
    expect(createRecipeSet).not.toHaveBeenCalled()
  })

  it("shows the server's name error next to the field", async () => {
    vi.mocked(createRecipeSet).mockRejectedValue(new ApiError("Za długa.", "", 0, { name: "Za długa." }))
    const onOpenSet = renderList()
    await screen.findAllByText("Weekend")

    await userEvent.type(screen.getByLabelText("Nazwa zestawu"), "x")
    await userEvent.click(screen.getByRole("button", { name: "Utwórz zestaw" }))

    expect(await screen.findByRole("alert")).toHaveTextContent("Za długa.")
    expect(onOpenSet).not.toHaveBeenCalled()
  })
})
