import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import RecipeWorkspace from "./RecipeWorkspace"
import { ApiError, createRecipe, getRecipes, Recipe } from "./api"
import { getProviderConfiguration } from "../integrations/api"

vi.mock("./api", () => ({
  ApiError: class ApiError extends Error {},
  createRecipe: vi.fn(),
  getRecipes: vi.fn(),
  getRecipePhoto: vi.fn(),
}))

vi.mock("../integrations/api", () => ({
  getProviderConfiguration: vi.fn(),
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
  photo_url: null,
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
    vi.mocked(getProviderConfiguration).mockResolvedValue({
      configured: false,
      provider: null,
      is_active: false,
    })
  })

  it("separates recipe details from ingredients and saves an editable recipe", async () => {
    const user = userEvent.setup()
    vi.mocked(createRecipe).mockResolvedValue(savedRecipe)
    renderWorkspace()

    expect(await screen.findByRole("heading", { name: "Moje przepisy" })).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "+ Dodaj nowy" }))
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
    expect(screen.getByRole("heading", { name: "Moje przepisy" })).toBeInTheDocument()
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
    const user = userEvent.setup()
    vi.mocked(createRecipe).mockRejectedValue(new Error("Serwer jest niedostępny."))
    renderWorkspace()

    await screen.findByRole("heading", { name: "Moje przepisy" })
    await user.click(screen.getByRole("button", { name: "+ Dodaj nowy" }))
    fireEvent.change(screen.getByLabelText(/Tytuł/), { target: { value: "Mój przepis" } })
    fireEvent.click(screen.getByRole("button", { name: "Zapisz przepis" }))

    expect(await screen.findByRole("alert")).toHaveTextContent("Serwer jest niedostępny.")
    expect(screen.getByLabelText(/Tytuł/)).toHaveValue("Mój przepis")
    await waitFor(() => expect(createRecipe).toHaveBeenCalledOnce())
    await user.click(screen.getByRole("button", { name: "← Moje przepisy" }))
    await user.click(screen.getByRole("button", { name: "+ Dodaj nowy" }))
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("shows backend errors on the collection, not in the add form", async () => {
    const user = userEvent.setup()
    vi.mocked(getRecipes).mockRejectedValue(new ApiError("Sesja wygasła."))
    renderWorkspace()

    expect(await screen.findByRole("alert")).toHaveTextContent("Sesja wygasła.")
    await user.click(screen.getByRole("button", { name: "+ Dodaj nowy" }))

    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("does not invent a collection error when the request fails before an API response", async () => {
    const user = userEvent.setup()
    vi.mocked(getRecipes).mockRejectedValue(new TypeError("Failed to fetch"))
    renderWorkspace()

    await waitFor(() => expect(screen.queryByText("Pobieram przepisy...")).not.toBeInTheDocument())
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    expect(screen.queryByText("Nie masz jeszcze zapisanych przepisów.")).not.toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "+ Dodaj nowy" }))
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("keeps AI recognition separate and uploads a validated dish photo", async () => {
    const user = userEvent.setup()
    const originalCreateObjectURL = URL.createObjectURL
    const originalRevokeObjectURL = URL.revokeObjectURL
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn(() => "blob:dish-photo") })
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() })
    vi.mocked(createRecipe).mockResolvedValue(savedRecipe)
    const view = renderWorkspace()

    try {
      await screen.findByRole("heading", { name: "Moje przepisy" })
      await user.click(screen.getByRole("button", { name: "+ Dodaj nowy" }))
      expect(screen.getByRole("button", { name: "Konfiguruj AI" })).toBeEnabled()

      const photoInput = screen.getByLabelText(/Zdjęcie gotowego dania/)
      const dishPhoto = new File(["image data"], "dish.png", { type: "image/png" })
      await user.upload(photoInput, dishPhoto)
      expect(screen.getByRole("img", { name: "Podgląd zdjęcia gotowego dania" })).toHaveAttribute("src", "blob:dish-photo")

      await user.type(screen.getByLabelText(/Tytuł/), "Pieczone pomidory")
      await user.click(screen.getByRole("button", { name: "Zapisz przepis" }))
      await waitFor(() => expect(createRecipe).toHaveBeenCalledWith(
        "memory-access-token",
        expect.objectContaining({ title: "Pieczone pomidory", photo: dishPhoto }),
      ))
    } finally {
      view.unmount()
      Object.defineProperty(URL, "createObjectURL", { configurable: true, value: originalCreateObjectURL })
      Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: originalRevokeObjectURL })
    }
  })

  it("rejects unsupported dish photo formats before save", async () => {
    const user = userEvent.setup()
    renderWorkspace()

    await screen.findByRole("heading", { name: "Moje przepisy" })
    await user.click(screen.getByRole("button", { name: "+ Dodaj nowy" }))
    fireEvent.change(screen.getByLabelText(/Zdjęcie gotowego dania/), {
      target: { files: [new File(["not an image"], "dish.gif", { type: "image/gif" })] },
    })

    expect(screen.getByRole("alert")).toHaveTextContent("Wybierz zdjęcie w formacie JPG, PNG lub WebP.")
    expect(createRecipe).not.toHaveBeenCalled()
  })

  it("shows AI management when a provider is already configured", async () => {
    const user = userEvent.setup()
    const onOpenIntegrations = vi.fn()
    vi.mocked(getProviderConfiguration).mockResolvedValue({
      configured: true,
      provider: "openai",
      is_active: true,
    })
    render(
      <RecipeWorkspace
        accessToken="memory-access-token"
        accountEmail="cook@example.com"
        accountError=""
        onOpenIntegrations={onOpenIntegrations}
        onSignOut={vi.fn()}
      />,
    )

    await screen.findByRole("heading", { name: "Moje przepisy" })
    await user.click(screen.getByRole("button", { name: "+ Dodaj nowy" }))
    await user.click(await screen.findByRole("button", { name: "Zarządzaj AI" }))

    expect(onOpenIntegrations).toHaveBeenCalledOnce()
  })
})