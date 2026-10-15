import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import AddToRecipeSet from "./AddToRecipeSet"
import { addRecipeToSet, getRecipeSets, RecipeSet } from "./api"

vi.mock("./api", () => ({ addRecipeToSet: vi.fn(), getRecipeSets: vi.fn() }))

const summary = { recipe_count: 0, shopping_list: 5, created_at: "", updated_at: "" }

describe("add to recipe set", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("loads the sets only when opened and adds the recipe to the chosen one", async () => {
    vi.mocked(getRecipeSets).mockResolvedValue([
      { id: 1, name: "Weekend", ...summary },
      { id: 2, name: "Grill", ...summary },
    ])
    vi.mocked(addRecipeToSet).mockResolvedValue({ id: 2, name: "Grill" } as RecipeSet)
    render(<AddToRecipeSet accessToken="token" recipeId={9} recipeTitle="Zupa" />)
    expect(getRecipeSets).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole("button", { name: "Dodaj do zestawu: Zupa" }))
    await userEvent.selectOptions(await screen.findByLabelText("Zestaw"), "2")
    await userEvent.click(screen.getByRole("button", { name: "Dodaj" }))

    expect(addRecipeToSet).toHaveBeenCalledWith("token", 2, 9)
    expect(await screen.findByRole("status")).toHaveTextContent("Przepis jest w zestawie „Grill”.")
  })

  it("explains what to do when there are no sets", async () => {
    vi.mocked(getRecipeSets).mockResolvedValue([])
    render(<AddToRecipeSet accessToken="token" recipeId={9} recipeTitle="Zupa" />)

    await userEvent.click(screen.getByRole("button", { name: "Dodaj do zestawu: Zupa" }))

    expect(await screen.findByText(/Nie masz jeszcze zestawów/)).toBeInTheDocument()
    expect(addRecipeToSet).not.toHaveBeenCalled()
  })

  it("shows an error when adding fails", async () => {
    vi.mocked(getRecipeSets).mockResolvedValue([{ id: 1, name: "Weekend", ...summary }])
    vi.mocked(addRecipeToSet).mockRejectedValue(new Error("Nie znaleziono przepisu."))
    render(<AddToRecipeSet accessToken="token" recipeId={9} recipeTitle="Zupa" />)

    await userEvent.click(screen.getByRole("button", { name: "Dodaj do zestawu: Zupa" }))
    await userEvent.click(await screen.findByRole("button", { name: "Dodaj" }))

    expect(await screen.findByRole("alert")).toHaveTextContent("Nie znaleziono przepisu.")
  })
})
