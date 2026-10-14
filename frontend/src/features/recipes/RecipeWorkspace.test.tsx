import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import RecipeWorkspace from "./RecipeWorkspace"
import { createRecipe, getRecipes, Recipe } from "./api"

vi.mock("./api", () => ({
  createRecipe: vi.fn(),
  getRecipes: vi.fn(),
}))

const savedRecipe: Recipe = {
  id: 12,
  title: "Zupa pomidorowa",
  description: "Domowa",
  servings: 3,
  prep_time_minutes: 10,
  cook_time_minutes: 25,
  ingredients: [{ name: "pomidory", amount: "500", unit: "g" }],
  steps: ["Ugotuj pomidory"],
  created_at: "2026-10-14T12:00:00Z",
}

function renderWorkspace() {
  return render(
    <RecipeWorkspace
      accessToken="memory-access-token"
      accountEmail="cook@example.com"
      accountError=""
      onOpenIntegrations={vi.fn()}
      onSignOut={vi.fn()}
    />,
  )
}

describe("recipe workspace", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getRecipes).mockResolvedValue([])
  })

  it("separates recipe details from ingredients and saves an editable recipe", async () => {
    const user = userEvent.setup()
    vi.mocked(createRecipe).mockResolvedValue(savedRecipe)
    renderWorkspace()

    expect(await screen.findByText("Twoja kolekcja jest pusta. Dodaj pierwszy przepis.")).toBeInTheDocument()
    expect(screen.getByRole("group", { name: "Część opisowa" })).toBeInTheDocument()
    expect(screen.getByRole("group", { name: "Składniki" })).toBeInTheDocument()
    expect(screen.getByLabelText(/Tytuł/)).toBeRequired()

    await user.type(screen.getByLabelText(/Tytuł/), "Zupa pomidorowa")
    await user.type(screen.getByLabelText("Opis lub notatka"), "Domowa")
    await user.type(screen.getByLabelText("Porcje"), "3")
    await user.type(screen.getByLabelText("Przygotowanie (min)"), "10")
    await user.type(screen.getByLabelText("Gotowanie (min)"), "25")
    await user.type(screen.getByLabelText("Składnik 1"), "pomidory")
    await user.type(screen.getByLabelText("Ilość"), "500")
    await user.type(screen.getByLabelText("Jednostka"), "g")
    await user.type(screen.getByLabelText("Krok 1"), "Ugotuj pomidory")
    await user.click(screen.getByRole("button", { name: "Zapisz przepis" }))

    await screen.findByRole("heading", { name: "Zupa pomidorowa" })
    expect(createRecipe).toHaveBeenCalledWith("memory-access-token", {
      title: "Zupa pomidorowa",
      description: "Domowa",
      servings: 3,
      prep_time_minutes: 10,
      cook_time_minutes: 25,
      ingredients: [{ name: "pomidory", amount: "500", unit: "g" }],
      steps: ["Ugotuj pomidory"],
    })
    expect(await screen.findByRole("status")).toHaveTextContent("Przepis został zapisany w Twojej kolekcji.")
  })

  it("shows a save error and preserves the entered title", async () => {
    vi.mocked(createRecipe).mockRejectedValue(new Error("Serwer jest niedostępny."))
    renderWorkspace()

    await screen.findByText("Twoja kolekcja jest pusta. Dodaj pierwszy przepis.")
    fireEvent.change(screen.getByLabelText(/Tytuł/), { target: { value: "Mój przepis" } })
    fireEvent.click(screen.getByRole("button", { name: "Zapisz przepis" }))

    expect(await screen.findByRole("alert")).toHaveTextContent("Serwer jest niedostępny.")
    expect(screen.getByLabelText(/Tytuł/)).toHaveValue("Mój przepis")
    await waitFor(() => expect(createRecipe).toHaveBeenCalledOnce())
  })
})