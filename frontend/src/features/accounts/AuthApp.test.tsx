import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import App from "../../App"
import { getCurrentUser, logIn, logOut, refreshAccessToken, register } from "./api"
import { getProviderConfiguration } from "../integrations/api"

vi.mock("./api", () => ({
  getCurrentUser: vi.fn(),
  logIn: vi.fn(),
  logOut: vi.fn(),
  refreshAccessToken: vi.fn(),
  register: vi.fn(),
}))

vi.mock("../integrations/api", () => ({
  activateProvider: vi.fn(),
  getProviderConfiguration: vi.fn(),
  removeProviderConfiguration: vi.fn(),
  saveProviderConfiguration: vi.fn(),
}))

describe("account access screen", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(refreshAccessToken).mockResolvedValue(null)
  })

  it("provides labeled login fields and switches to registration", async () => {
    render(<App />)

    expect(await screen.findByRole("heading", { name: "Zaloguj się" })).toBeInTheDocument()
    expect(screen.getByLabelText("Adres e-mail")).toHaveAttribute("type", "email")
    expect(screen.getByLabelText(/^Hasło/)).toHaveAttribute("type", "password")

    fireEvent.click(screen.getByRole("button", { name: "Utwórz konto" }))

    expect(screen.getByRole("heading", { name: "Utwórz konto" })).toBeInTheDocument()
    expect(screen.getByLabelText(/^Hasło/)).toHaveAttribute("minlength", "12")
  })

  it("registers and shows the signed-in account", async () => {
    vi.mocked(register).mockResolvedValue("memory-access-token")
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 1, email: "cook@example.com" })
    render(<App />)

    await screen.findByRole("heading", { name: "Zaloguj się" })
    fireEvent.click(screen.getByRole("button", { name: "Utwórz konto" }))
    fireEvent.change(screen.getByLabelText("Adres e-mail"), { target: { value: "cook@example.com" } })
    fireEvent.change(screen.getByLabelText(/^Hasło/), { target: { value: "a-long-unique-password" } })
    fireEvent.click(screen.getByRole("button", { name: "Utwórz konto" }))

    expect(await screen.findByText("Jesteś zalogowany jako cook@example.com.")).toBeInTheDocument()
    expect(register).toHaveBeenCalledWith("cook@example.com", "a-long-unique-password")
    expect(logIn).not.toHaveBeenCalled()
    expect(logOut).not.toHaveBeenCalled()
  })

  it("opens AI integration settings from the signed-in view", async () => {
    vi.mocked(refreshAccessToken).mockResolvedValue("memory-access-token")
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 1, email: "cook@example.com" })
    vi.mocked(getProviderConfiguration).mockResolvedValue({
      configured: false,
      provider: null,
      is_active: false,
    })
    render(<App />)

    expect(await screen.findByText("Jesteś zalogowany jako cook@example.com.")).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Integracje AI" }))

    expect(await screen.findByRole("heading", { name: "Integracje AI" })).toBeInTheDocument()
    expect(await screen.findByText("Nie skonfigurowano dostawcy AI")).toBeInTheDocument()
  })
})