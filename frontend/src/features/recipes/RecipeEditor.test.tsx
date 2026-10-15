import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError, getRecipe, getRecipePhoto, Recipe, updateRecipe } from "./api"
import RecipeEditor from "./RecipeEditor"

vi.mock("./api", () => ({
  ApiError: class ApiError extends Error {},
  getRecipe: vi.fn(),
  getRecipePhoto: vi.fn(),
  updateRecipe: vi.fn(),
}))

const savedRecipe: Recipe = {
  id: 12,
  title: "Zupa pomidorowa",
  description: "Domowa",
  servings: 3,
  prep_time_minutes: 10,
  cook_time_minutes: null,
  ingredients: [{ name: "pomidory", amount: "500", unit: "g", metric_amount: 500, metric_unit: "g" }],
  steps: ["Ugotuj pomidory"],
  photo_url: null,
  created_at: "2026-10-14T12:00:00Z",
}

const originalCreateObjectURL = URL.createObjectURL
const originalRevokeObjectURL = URL.revokeObjectURL

function renderEditor(onBack = vi.fn()) {
  render(<RecipeEditor accessToken="memory-access-token" onBack={onBack} recipeId={12} />)
  return onBack
}

describe("recipe editor", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getRecipe).mockResolvedValue(savedRecipe)
    vi.mocked(updateRecipe).mockResolvedValue(savedRecipe)
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn(() => "blob:saved-photo") })
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() })
  })

  afterEach(() => {
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: originalCreateObjectURL })
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: originalRevokeObjectURL })
  })

  it("fills the form with the saved recipe and explains the effect on plans and lists", async () => {
    renderEditor()

    expect(screen.getByRole("heading", { name: "Edytuj przepis" })).toBeInTheDocument()
    expect(await screen.findByLabelText(/Tytuł/)).toHaveValue("Zupa pomidorowa")
    expect(getRecipe).toHaveBeenCalledWith("memory-access-token", 12)
    expect(screen.getByLabelText("Opis lub notatka")).toHaveValue("Domowa")
    expect(screen.getByLabelText("Porcje")).toHaveValue(3)
    expect(screen.getByLabelText("Gotowanie (min)")).toHaveValue(null)
    expect(screen.getByLabelText("Składnik 1")).toHaveValue("pomidory")
    expect(screen.getByLabelText("Waga lub objętość")).toHaveValue("500")
    expect(screen.getByLabelText("Krok 1")).toHaveValue("Ugotuj pomidory")
    expect(screen.getByText(/Gotowe listy zakupów się nie zmienią/)).toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: "Odczytaj przepis z fotografii" })).not.toBeInTheDocument()
  })

  it("saves the changed recipe and goes back to the list", async () => {
    const user = userEvent.setup()
    const onBack = renderEditor()

    const title = await screen.findByLabelText(/Tytuł/)
    await user.clear(title)
    await user.type(title, "Krem pomidorowy")
    await user.click(screen.getByRole("button", { name: "+ Dodaj krok" }))
    await user.type(screen.getByLabelText("Krok 2"), "Zmiksuj")
    await user.click(screen.getByRole("button", { name: "Zapisz zmiany" }))

    await waitFor(() => expect(onBack).toHaveBeenCalledOnce())
    expect(updateRecipe).toHaveBeenCalledWith("memory-access-token", 12, {
      title: "Krem pomidorowy",
      description: "Domowa",
      servings: 3,
      prep_time_minutes: 10,
      cook_time_minutes: null,
      ingredients: [{ name: "pomidory", amount: "500", unit: "g", metric_amount: 500, metric_unit: "g" }],
      steps: ["Ugotuj pomidory", "Zmiksuj"],
    })
  })

  it("edits ingredients saved without every field", async () => {
    const user = userEvent.setup()
    // Older recipes have no metric measure, and the API accepts ingredients with only some fields.
    const partialIngredient = { name: "sól" } as Recipe["ingredients"][number]
    vi.mocked(getRecipe).mockResolvedValue({ ...savedRecipe, ingredients: [partialIngredient] })
    const onBack = renderEditor()

    expect(await screen.findByLabelText("Składnik 1")).toHaveValue("sól")
    expect(screen.getByLabelText("Ilość")).toHaveValue("")
    expect(screen.getByLabelText("Waga lub objętość")).toHaveValue("")
    expect(screen.getByLabelText("Miara")).toHaveValue("")
    await user.click(screen.getByRole("button", { name: "Zapisz zmiany" }))

    await waitFor(() => expect(onBack).toHaveBeenCalledOnce())
    expect(vi.mocked(updateRecipe).mock.calls[0][2].ingredients).toEqual([
      { name: "sól", amount: "", unit: "", metric_amount: null, metric_unit: "" },
    ])
  })

  it("keeps the typed changes when saving fails", async () => {
    const user = userEvent.setup()
    vi.mocked(updateRecipe).mockRejectedValue(new ApiError("Nie udało się zapisać zmian."))
    const onBack = renderEditor()

    const title = await screen.findByLabelText(/Tytuł/)
    await user.clear(title)
    await user.type(title, "Krem")
    await user.click(screen.getByRole("button", { name: "Zapisz zmiany" }))

    expect(await screen.findByRole("alert")).toHaveTextContent("Nie udało się zapisać zmian.")
    expect(screen.getByLabelText(/Tytuł/)).toHaveValue("Krem")
    expect(onBack).not.toHaveBeenCalled()
  })

  it("cancels without saving", async () => {
    const user = userEvent.setup()
    const onBack = renderEditor()

    await user.click(await screen.findByRole("button", { name: "Anuluj" }))

    expect(onBack).toHaveBeenCalledOnce()
    expect(updateRecipe).not.toHaveBeenCalled()
  })

  it("tells the user when the recipe does not exist", async () => {
    vi.mocked(getRecipe).mockRejectedValue(new ApiError("Nie znaleziono przepisu."))
    renderEditor()

    expect(await screen.findByRole("alert")).toHaveTextContent("Nie znaleziono przepisu.")
    expect(screen.queryByRole("button", { name: "Zapisz zmiany" })).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "← Moje przepisy" })).toBeInTheDocument()
  })

  it("keeps the saved photo unless it is removed", async () => {
    const user = userEvent.setup()
    vi.mocked(getRecipe).mockResolvedValue({ ...savedRecipe, photo_url: "/api/recipes/12/photo/" })
    vi.mocked(getRecipePhoto).mockResolvedValue(new Blob(["photo"], { type: "image/png" }))
    renderEditor()

    expect(await screen.findByRole("img", { name: "Podgląd zdjęcia gotowego dania" })).toHaveAttribute(
      "src",
      "blob:saved-photo",
    )
    expect(screen.getByText("Zapisane zdjęcie dania")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Zapisz zmiany" }))
    await waitFor(() => expect(updateRecipe).toHaveBeenCalledOnce())
    expect(vi.mocked(updateRecipe).mock.calls[0][2]).not.toHaveProperty("remove_photo")
    expect(vi.mocked(updateRecipe).mock.calls[0][2]).not.toHaveProperty("photo")

    await user.click(screen.getByRole("button", { name: "Usuń zdjęcie" }))
    expect(screen.queryByRole("img", { name: "Podgląd zdjęcia gotowego dania" })).not.toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Zapisz zmiany" }))
    await waitFor(() => expect(updateRecipe).toHaveBeenCalledTimes(2))
    expect(vi.mocked(updateRecipe).mock.calls[1][2]).toMatchObject({ remove_photo: true })
  })

  it("replaces the saved photo with a new one", async () => {
    const user = userEvent.setup()
    vi.mocked(getRecipe).mockResolvedValue({ ...savedRecipe, photo_url: "/api/recipes/12/photo/" })
    vi.mocked(getRecipePhoto).mockResolvedValue(new Blob(["photo"], { type: "image/png" }))
    renderEditor()

    await screen.findByRole("img", { name: "Podgląd zdjęcia gotowego dania" })
    const newPhoto = new File(["image data"], "nowe.png", { type: "image/png" })
    await user.upload(screen.getByLabelText(/Zdjęcie gotowego dania/), newPhoto)
    expect(screen.getByText("nowe.png")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Zapisz zmiany" }))

    await waitFor(() => expect(updateRecipe).toHaveBeenCalledOnce())
    expect(vi.mocked(updateRecipe).mock.calls[0][2]).toMatchObject({ photo: newPhoto })
    expect(vi.mocked(updateRecipe).mock.calls[0][2]).not.toHaveProperty("remove_photo")
  })
})
