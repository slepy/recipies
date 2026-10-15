import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import RecipeWorkspace from "./RecipeWorkspace"
import { ApiError, createRecipe, getRecipes, Recipe, recognizeRecipeImage } from "./api"
import { getProviderConfiguration } from "../integrations/api"

vi.mock("./api", () => ({
  ApiError: class ApiError extends Error {},
  createRecipe: vi.fn(),
  getRecipes: vi.fn(),
  getRecipePhoto: vi.fn(),
  recognizeRecipeImage: vi.fn(),
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
  ingredients: [{ name: "pomidory", amount: "500", unit: "g", metric_amount: null, metric_unit: "" }],
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
    await user.type(screen.getByLabelText("Waga lub objętość"), "0,5")
    await user.selectOptions(screen.getByLabelText("Miara"), "kg")
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
      ingredients: [{ name: "pomidory", amount: "500", unit: "g", metric_amount: 0.5, metric_unit: "kg" }],
      steps: ["Ugotuj pomidory"],
    })
    expect(await screen.findByRole("status")).toHaveTextContent("Przepis został zapisany w Twojej kolekcji.")
  })

  it("drops a metric measure whose amount is not a number", async () => {
    const user = userEvent.setup()
    vi.mocked(createRecipe).mockResolvedValue(savedRecipe)
    renderWorkspace()

    await screen.findByRole("heading", { name: "Moje przepisy" })
    await user.click(screen.getByRole("button", { name: "+ Dodaj nowy" }))
    await user.type(screen.getByLabelText(/Tytuł/), "Chleb")
    await user.type(screen.getByLabelText("Składnik 1"), "mąka")
    await user.type(screen.getByLabelText("Waga lub objętość"), "abc")
    await user.selectOptions(screen.getByLabelText("Miara"), "g")
    await user.click(screen.getByRole("button", { name: "Zapisz przepis" }))

    await waitFor(() => expect(createRecipe).toHaveBeenCalledOnce())
    expect(vi.mocked(createRecipe).mock.calls[0][1].ingredients).toEqual([
      { name: "mąka", amount: "", unit: "", metric_amount: null, metric_unit: "" },
    ])
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

  it("lets the user pick a recognition image, shows the AI notice and allows discarding it", async () => {
    vi.mocked(getProviderConfiguration).mockResolvedValue({ configured: true, provider: "openai", is_active: true })
    const user = userEvent.setup()
    const originalCreateObjectURL = URL.createObjectURL
    const originalRevokeObjectURL = URL.revokeObjectURL
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn(() => "blob:recognition") })
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() })
    const view = renderWorkspace()

    try {
      await screen.findByRole("heading", { name: "Moje przepisy" })
      await user.click(screen.getByRole("button", { name: "+ Dodaj nowy" }))
      await screen.findByLabelText("Wybierz obraz z urządzenia")
      expect(screen.getByRole("heading", { name: "Odczytaj przepis z fotografii" })).toBeInTheDocument()
      expect(screen.getAllByText("JPG, PNG lub WebP · maks. 5 MB").length).toBeGreaterThan(0)
      expect(screen.queryByRole("note")).not.toBeInTheDocument()

      await user.upload(
        await screen.findByLabelText("Wybierz obraz z urządzenia"),
        new File(["image data"], "page.jpg", { type: "image/jpeg" }),
      )

      expect(screen.getByRole("img", { name: "Podgląd obrazu do rozpoznania" })).toHaveAttribute("src", "blob:recognition")
      expect(screen.getByRole("note")).toHaveTextContent("zostanie wysłany do zewnętrznej usługi AI")
      expect(createRecipe).not.toHaveBeenCalled()

      await user.click(screen.getByRole("button", { name: "Odrzuć obraz" }))
      expect(screen.queryByRole("img", { name: "Podgląd obrazu do rozpoznania" })).not.toBeInTheDocument()
      expect(screen.queryByRole("note")).not.toBeInTheDocument()
    } finally {
      view.unmount()
      Object.defineProperty(URL, "createObjectURL", { configurable: true, value: originalCreateObjectURL })
      Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: originalRevokeObjectURL })
    }
  })

  it("rejects unsupported and oversized recognition images before any upload", async () => {
    vi.mocked(getProviderConfiguration).mockResolvedValue({ configured: true, provider: "openai", is_active: true })
    const user = userEvent.setup()
    renderWorkspace()

    await screen.findByRole("heading", { name: "Moje przepisy" })
    await user.click(screen.getByRole("button", { name: "+ Dodaj nowy" }))
    await screen.findByLabelText("Zrób zdjęcie")

    fireEvent.change(screen.getByLabelText("Zrób zdjęcie"), {
      target: { files: [new File(["gif"], "page.gif", { type: "image/gif" })] },
    })
    expect(screen.getByRole("alert")).toHaveTextContent("Wybierz obraz w formacie JPG, PNG lub WebP.")
    expect(screen.queryByRole("note")).not.toBeInTheDocument()

    const tooLarge = new File(["x"], "page.png", { type: "image/png" })
    Object.defineProperty(tooLarge, "size", { value: 5 * 1024 * 1024 + 1 })
    fireEvent.change(screen.getByLabelText("Wybierz obraz z urządzenia"), { target: { files: [tooLarge] } })
    expect(screen.getByRole("alert")).toHaveTextContent("Obraz może mieć maksymalnie 5 MB.")
    expect(screen.queryByRole("note")).not.toBeInTheDocument()
  })

  describe("recognition from an image", () => {
    const draft = {
      title: "Rozpoznana zupa",
      description: "",
      servings: 4,
      prep_time_minutes: null,
      cook_time_minutes: 30,
      ingredients: [{ name: "woda", amount: "2", unit: "szklanki", metric_amount: 0.5, metric_unit: "l" as const }],
      steps: ["Gotuj"],
      // 1x1 transparent PNG
      dish_photo: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
    }
    const originalCreateObjectURL = URL.createObjectURL
    const originalRevokeObjectURL = URL.revokeObjectURL

    beforeEach(() => {
      Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn(() => "blob:image") })
      Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() })
    })

    afterEach(() => {
      Object.defineProperty(URL, "createObjectURL", { configurable: true, value: originalCreateObjectURL })
      Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: originalRevokeObjectURL })
    })

    async function openFormWithImage(isActive: boolean) {
      vi.mocked(getProviderConfiguration).mockResolvedValue({
        configured: true,
        provider: "openai",
        is_active: isActive,
      })
      const user = userEvent.setup()
      renderWorkspace()
      await screen.findByRole("heading", { name: "Moje przepisy" })
      await user.click(screen.getByRole("button", { name: "+ Dodaj nowy" }))
      await user.upload(
        await screen.findByLabelText("Wybierz obraz z urządzenia"),
        new File(["image data"], "page.jpg", { type: "image/jpeg" }),
      )
      return user
    }

    it("fills an editable draft with the proposed dish photo and saves nothing automatically", async () => {
      vi.mocked(recognizeRecipeImage).mockResolvedValue(draft)
      const user = await openFormWithImage(true)

      const button = await screen.findByRole("button", { name: "Rozpoznaj przepis" })
      await waitFor(() => expect(button).toBeEnabled())
      expect(recognizeRecipeImage).not.toHaveBeenCalled()
      await user.click(button)

      await waitFor(() => expect(screen.getByLabelText(/Tytuł/)).toHaveValue("Rozpoznana zupa"))
      expect(recognizeRecipeImage).toHaveBeenCalledWith("memory-access-token", expect.any(File), expect.any(AbortSignal))
      expect(screen.getByLabelText("Porcje")).toHaveValue(4)
      expect(screen.getByLabelText("Przygotowanie (min)")).toHaveValue(null)
      expect(screen.getByLabelText("Składnik 1")).toHaveValue("woda")
      expect(screen.getByLabelText("Waga lub objętość")).toHaveValue("0.5")
      expect(screen.getByLabelText("Miara")).toHaveValue("l")
      expect(screen.getByLabelText("Krok 1")).toHaveValue("Gotuj")
      expect(screen.getByText(/Propozycja AI/)).toBeInTheDocument()
      expect(createRecipe).not.toHaveBeenCalled()

      await user.click(screen.getByRole("button", { name: "Usuń zdjęcie" }))
      expect(screen.queryByText(/Propozycja AI/)).not.toBeInTheDocument()
      expect(screen.queryByRole("img", { name: "Podgląd zdjęcia gotowego dania" })).not.toBeInTheDocument()
    })

    it("saves the proposed dish photo through the normal save path", async () => {
      vi.mocked(recognizeRecipeImage).mockResolvedValue(draft)
      vi.mocked(createRecipe).mockResolvedValue(savedRecipe)
      const user = await openFormWithImage(true)
      await waitFor(() => expect(screen.getByRole("button", { name: "Rozpoznaj przepis" })).toBeEnabled())
      await user.click(screen.getByRole("button", { name: "Rozpoznaj przepis" }))
      await waitFor(() => expect(screen.getByLabelText(/Tytuł/)).toHaveValue("Rozpoznana zupa"))

      await user.click(screen.getByRole("button", { name: "Zapisz przepis" }))

      await waitFor(() => expect(createRecipe).toHaveBeenCalledOnce())
      const saved = vi.mocked(createRecipe).mock.calls[0][1]
      expect(saved.title).toBe("Rozpoznana zupa")
      expect(saved.photo).toBeInstanceOf(File)
      expect(saved.photo?.type).toBe("image/png")
    })

    it("shows a draft without a photo proposal when the model found no dish", async () => {
      vi.mocked(recognizeRecipeImage).mockResolvedValue({ ...draft, dish_photo: null })
      const user = await openFormWithImage(true)
      await waitFor(() => expect(screen.getByRole("button", { name: "Rozpoznaj przepis" })).toBeEnabled())
      await user.click(screen.getByRole("button", { name: "Rozpoznaj przepis" }))

      await waitFor(() => expect(screen.getByLabelText(/Tytuł/)).toHaveValue("Rozpoznana zupa"))
      expect(screen.queryByText(/Propozycja AI/)).not.toBeInTheDocument()
    })

    it("blocks repeated requests while recognizing and keeps the form on failure so the user can retry", async () => {
      let rejectRecognition: (reason: Error) => void = () => undefined
      vi.mocked(recognizeRecipeImage).mockReturnValueOnce(
        new Promise((_resolve, reject) => { rejectRecognition = reject }),
      )
      const user = await openFormWithImage(true)
      await waitFor(() => expect(screen.getByRole("button", { name: "Rozpoznaj przepis" })).toBeEnabled())
      await user.click(screen.getByRole("button", { name: "Rozpoznaj przepis" }))

      expect(screen.getByRole("button", { name: "Rozpoznaję..." })).toBeDisabled()
      expect(screen.getByRole("status")).toHaveTextContent("Rozpoznaję przepis")
      expect(recognizeRecipeImage).toHaveBeenCalledOnce()

      rejectRecognition(new ApiError("Dostawca AI jest niedostępny."))
      expect(await screen.findByRole("alert")).toHaveTextContent("Dostawca AI jest niedostępny.")
      expect(screen.getByLabelText(/Tytuł/)).toHaveValue("")
      expect(createRecipe).not.toHaveBeenCalled()

      vi.mocked(recognizeRecipeImage).mockResolvedValueOnce(draft)
      await user.click(screen.getByRole("button", { name: "Rozpoznaj przepis" }))
      await waitFor(() => expect(screen.getByLabelText(/Tytuł/)).toHaveValue("Rozpoznana zupa"))
    })

    it("cancels a running recognition", async () => {
      vi.mocked(recognizeRecipeImage).mockImplementation(
        (_token, _image, signal) =>
          new Promise((_resolve, reject) => {
            signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")))
          }),
      )
      const user = await openFormWithImage(true)
      await waitFor(() => expect(screen.getByRole("button", { name: "Rozpoznaj przepis" })).toBeEnabled())
      await user.click(screen.getByRole("button", { name: "Rozpoznaj przepis" }))

      await user.click(screen.getByRole("button", { name: "Anuluj" }))

      expect(screen.queryByRole("alert")).not.toBeInTheDocument()
      expect(screen.queryByRole("button", { name: "Rozpoznaj przepis" })).not.toBeInTheDocument()
      expect(screen.getByLabelText(/Tytuł/)).toHaveValue("")
    })

    it("does not send the image and points to integrations when no provider is active", async () => {
      const user = await openFormWithImage(false)

      expect(screen.queryByRole("button", { name: "Rozpoznaj przepis" })).not.toBeInTheDocument()
      await user.click(screen.getByRole("button", { name: "Przejdź do integracji AI" }))
      expect(recognizeRecipeImage).not.toHaveBeenCalled()
    })
  })

  it("shows the camera and file buttons inside the AI section when a provider is configured", async () => {
    const user = userEvent.setup()
    vi.mocked(getProviderConfiguration).mockResolvedValue({ configured: true, provider: "openai", is_active: true })
    renderWorkspace()

    await screen.findByRole("heading", { name: "Moje przepisy" })
    await user.click(screen.getByRole("button", { name: "+ Dodaj nowy" }))

    const aiSection = (await screen.findByRole("heading", { name: "Odczytaj przepis z fotografii" })).closest("section")
    expect(aiSection).not.toBeNull()
    expect(within(aiSection as HTMLElement).getByLabelText("Zrób zdjęcie")).toBeInTheDocument()
    expect(within(aiSection as HTMLElement).getByLabelText("Wybierz obraz z urządzenia")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Konfiguruj AI" })).not.toBeInTheDocument()
  })

  it("offers AI configuration instead of the image buttons when no provider is configured", async () => {
    const user = userEvent.setup()
    const onOpenIntegrations = vi.fn()
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
    await user.click(await screen.findByRole("button", { name: "Konfiguruj AI" }))

    expect(onOpenIntegrations).toHaveBeenCalledOnce()
    expect(screen.queryByLabelText("Zrób zdjęcie")).not.toBeInTheDocument()
    expect(screen.queryByLabelText("Wybierz obraz z urządzenia")).not.toBeInTheDocument()
  })
})