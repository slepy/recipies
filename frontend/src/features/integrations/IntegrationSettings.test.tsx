import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import IntegrationSettings from "./IntegrationSettings"
import {
  activateProvider,
  getProviderConfiguration,
  removeProviderConfiguration,
  saveProviderConfiguration,
} from "./api"

vi.mock("./api", () => ({
  activateProvider: vi.fn(),
  getProviderConfiguration: vi.fn(),
  removeProviderConfiguration: vi.fn(),
  saveProviderConfiguration: vi.fn(),
}))

describe("AI integration settings", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getProviderConfiguration).mockResolvedValue({
      configured: false,
      provider: null,
      is_active: false,
    })
  })

  it("loads provider status and saves a selected provider without retaining the key in the field", async () => {
    vi.mocked(saveProviderConfiguration).mockResolvedValue({
      configured: true,
      provider: "openrouter",
      is_active: false,
    })
    render(<IntegrationSettings accessToken="access-token" onBack={vi.fn()} />)

    expect(await screen.findByText("Nie skonfigurowano dostawcy AI")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("radio", { name: "OpenRouter" }))
    fireEvent.change(screen.getByLabelText("Klucz API"), { target: { value: "secret-api-key" } })
    fireEvent.click(screen.getByRole("button", { name: "Sprawdź i zapisz" }))

    await screen.findByText("Połączenie sprawdzone. Konfiguracja zapisana; aktywuj ją, aby używać dostawcy.")
    expect(saveProviderConfiguration).toHaveBeenCalledWith(
      "access-token",
      "openrouter",
      "secret-api-key",
    )
    expect(screen.getByLabelText("Klucz API")).toHaveValue("")
    expect(screen.getByText("OpenRouter · Skonfigurowany, nieaktywny")).toHaveAttribute("role", "status")
  })

  it("preserves current status and displays a safe error when checking a replacement key fails", async () => {
    vi.mocked(getProviderConfiguration).mockResolvedValue({
      configured: true,
      provider: "openai",
      is_active: true,
    })
    vi.mocked(saveProviderConfiguration).mockRejectedValue(new Error("Klucz API jest nieprawidłowy."))
    render(<IntegrationSettings accessToken="access-token" onBack={vi.fn()} />)

    await screen.findByText("OpenAI · Aktywny")
    fireEvent.click(screen.getByRole("radio", { name: "OpenRouter" }))
    fireEvent.change(screen.getByLabelText("Klucz API"), { target: { value: "invalid-secret" } })
    fireEvent.click(screen.getByRole("button", { name: "Sprawdź i zapisz" }))

    expect(await screen.findByRole("alert")).toHaveTextContent("Klucz API jest nieprawidłowy.")
    expect(screen.getByRole("status")).toHaveTextContent("OpenAI · Aktywny")
    expect(screen.getByLabelText("Klucz API")).toHaveValue("invalid-secret")
  })

  it("activates or removes the configured provider", async () => {
    vi.mocked(getProviderConfiguration).mockResolvedValue({
      configured: true,
      provider: "openai",
      is_active: false,
    })
    vi.mocked(activateProvider).mockResolvedValue({
      configured: true,
      provider: "openai",
      is_active: true,
    })
    vi.mocked(removeProviderConfiguration).mockResolvedValue()
    render(<IntegrationSettings accessToken="access-token" onBack={vi.fn()} />)

    fireEvent.click(await screen.findByRole("button", { name: "Aktywuj dostawcę" }))
    await waitFor(() => expect(activateProvider).toHaveBeenCalledWith("access-token"))
    expect(await screen.findByText("Dostawca AI jest aktywny.")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Usuń konfigurację" }))
    await waitFor(() => expect(removeProviderConfiguration).toHaveBeenCalledWith("access-token"))
    expect(await screen.findByText("Nie skonfigurowano dostawcy AI")).toBeInTheDocument()
  })
})