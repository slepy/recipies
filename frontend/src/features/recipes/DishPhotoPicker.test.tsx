import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import DishPhotoPicker from "./DishPhotoPicker"

function renderPicker(overrides: Partial<Parameters<typeof DishPhotoPicker>[0]> = {}) {
  const props = { file: null, previewUrl: "", isProposed: false, error: "", onSelect: vi.fn(), onRemove: vi.fn(), ...overrides }
  render(<DishPhotoPicker {...props} />)
  return props
}

const photo = new File(["image data"], "leczo.jpg", { type: "image/jpeg" })

describe("dish photo picker", () => {
  it("offers a labelled drop area with the accepted formats while empty", () => {
    renderPicker()

    const input = screen.getByLabelText(/Zdjęcie gotowego dania/)
    expect(input).toHaveAttribute("type", "file")
    expect(input).toHaveAccessibleDescription("JPG, PNG lub WebP · maks. 5 MB")
    expect(screen.getByText("Wybierz zdjęcie")).toBeInTheDocument()
    expect(screen.queryByRole("img")).not.toBeInTheDocument()
  })

  it("passes on a chosen or dropped file and ignores a cancelled dialog", () => {
    const props = renderPicker()

    const input = screen.getByLabelText(/Zdjęcie gotowego dania/)
    fireEvent.change(input, { target: { files: [photo] } })
    expect(props.onSelect).toHaveBeenCalledWith(photo)

    fireEvent.change(input, { target: { files: [] } })
    expect(props.onSelect).toHaveBeenCalledTimes(1)

    fireEvent.drop(screen.getByText("Wybierz zdjęcie").closest("label")!, { dataTransfer: { files: [photo] } })
    expect(props.onSelect).toHaveBeenCalledTimes(2)
  })

  it("shows the chosen photo with its name and lets the user change or remove it", () => {
    const props = renderPicker({ file: photo, previewUrl: "blob:leczo" })

    expect(screen.getByRole("img", { name: "Podgląd zdjęcia gotowego dania" })).toHaveAttribute("src", "blob:leczo")
    expect(screen.getByText("leczo.jpg")).toBeInTheDocument()
    expect(screen.getByText("Zmień zdjęcie")).toHaveAttribute("for", "recipe-photo")
    fireEvent.click(screen.getByRole("button", { name: "Usuń zdjęcie" }))
    expect(props.onRemove).toHaveBeenCalledOnce()
  })

  it("marks a photo proposed by the AI and shows an error", () => {
    renderPicker({ file: photo, previewUrl: "blob:ai", isProposed: true, error: "Plik jest za duży." })

    expect(screen.getByText(/Propozycja AI/)).toBeInTheDocument()
    expect(screen.getByRole("alert")).toHaveTextContent("Plik jest za duży.")
  })
})
