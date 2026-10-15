import { act, fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter, useLocation } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import App from "../../App"
import { getCurrentUser, logIn, logOut, refreshAccessToken, register } from "./api"
import { getProviderConfiguration } from "../integrations/api"
import { getRecipes } from "../recipes/api"

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

vi.mock("../recipes/api", () => ({
  createRecipe: vi.fn(),
  getRecipes: vi.fn(),
}))

function CurrentPath() {
  return <output data-testid="current-path">{useLocation().pathname}</output>
}

function renderApp(path = "/login") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
      <CurrentPath />
    </MemoryRouter>,
  )
}

function currentPath() {
  return screen.getByTestId("current-path").textContent
}

describe("account access screen", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(refreshAccessToken).mockResolvedValue(null)
    vi.mocked(getRecipes).mockResolvedValue([])
    vi.mocked(getProviderConfiguration).mockResolvedValue({
      configured: false,
      provider: null,
      is_active: false,
    })
  })

  it("provides labeled login fields and switches to registration", async () => {
    renderApp()

    expect(await screen.findByRole("heading", { name: "Zaloguj się" })).toBeInTheDocument()
    expect(screen.getByLabelText("Adres e-mail")).toHaveAttribute("type", "email")
    expect(screen.getByLabelText(/^Hasło/)).toHaveAttribute("type", "password")

    fireEvent.click(screen.getByRole("button", { name: "Utwórz konto" }))

    expect(screen.getByRole("heading", { name: "Utwórz konto" })).toBeInTheDocument()
    expect(screen.getByLabelText(/^Hasło/)).toHaveAttribute("minlength", "12")
    expect(currentPath()).toBe("/register")
  })

  it("registers and shows the signed-in account", async () => {
    vi.mocked(register).mockResolvedValue("memory-access-token")
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 1, email: "cook@example.com" })
    renderApp()

    await screen.findByRole("heading", { name: "Zaloguj się" })
    fireEvent.click(screen.getByRole("button", { name: "Utwórz konto" }))
    fireEvent.change(screen.getByLabelText("Adres e-mail"), { target: { value: "cook@example.com" } })
    fireEvent.change(screen.getByLabelText(/^Hasło/), { target: { value: "a-long-unique-password" } })
    fireEvent.click(screen.getByRole("button", { name: "Utwórz konto" }))

    expect(await screen.findByRole("heading", { name: "Moje przepisy" })).toBeInTheDocument()
    expect(screen.getByText("cook@example.com")).toBeInTheDocument()
    expect(currentPath()).toBe("/recipes")
    expect(screen.queryByRole("region", { name: "Miska, przepisy na co dzień" })).not.toBeInTheDocument()
    expect(register).toHaveBeenCalledWith("cook@example.com", "a-long-unique-password")
    expect(logIn).not.toHaveBeenCalled()
    expect(logOut).not.toHaveBeenCalled()
  })

  it("refreshes the access token before it expires", async () => {
    vi.useFakeTimers()
    vi.mocked(refreshAccessToken)
      .mockResolvedValueOnce("initial-access-token")
      .mockResolvedValueOnce("renewed-access-token")
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 1, email: "cook@example.com" })
    renderApp()

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(screen.getByRole("heading", { name: "Moje przepisy" })).toBeInTheDocument()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(23 * 60 * 60 * 1000)
    })

    expect(refreshAccessToken).toHaveBeenCalledTimes(2)
  })

  it("opens AI integration settings from the signed-in view", async () => {
    vi.mocked(refreshAccessToken).mockResolvedValue("memory-access-token")
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 1, email: "cook@example.com" })
    renderApp()

    expect(await screen.findByRole("heading", { name: "Moje przepisy" })).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Integracje AI" }))

    expect(await screen.findByRole("heading", { name: "Integracje AI" })).toBeInTheDocument()
    expect(await screen.findByText("Nie skonfigurowano dostawcy AI")).toBeInTheDocument()
    expect(currentPath()).toBe("/settings/integrations")

    fireEvent.click(screen.getByRole("button", { name: /Wróć/ }))

    expect(await screen.findByRole("heading", { name: "Moje przepisy" })).toBeInTheDocument()
    expect(currentPath()).toBe("/recipes")
  })

  it("opens integration settings directly from their URL after restoring the session", async () => {
    vi.mocked(refreshAccessToken).mockResolvedValue("memory-access-token")
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 1, email: "cook@example.com" })
    renderApp("/settings/integrations")

    expect(await screen.findByRole("heading", { name: "Integracje AI" })).toBeInTheDocument()
    expect(currentPath()).toBe("/settings/integrations")
  })

  it("opens registration directly from its URL", async () => {
    renderApp("/register")

    expect(await screen.findByRole("heading", { name: "Utwórz konto" })).toBeInTheDocument()
  })

  it("sends anonymous visitors of a signed-in page to the login screen", async () => {
    renderApp("/recipes")

    expect(await screen.findByRole("heading", { name: "Zaloguj się" })).toBeInTheDocument()
    expect(currentPath()).toBe("/login")
  })

  it("returns to the login screen after signing out", async () => {
    vi.mocked(refreshAccessToken).mockResolvedValue("memory-access-token")
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 1, email: "cook@example.com" })
    vi.mocked(logOut).mockResolvedValue(undefined)
    renderApp("/recipes")

    expect(await screen.findByRole("heading", { name: "Moje przepisy" })).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Wyloguj się" }))

    expect(await screen.findByRole("heading", { name: "Zaloguj się" })).toBeInTheDocument()
    expect(currentPath()).toBe("/login")
  })

  it("shows a sign-out error without leaving the recipe workspace", async () => {
    vi.mocked(refreshAccessToken).mockResolvedValue("memory-access-token")
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 1, email: "cook@example.com" })
    vi.mocked(logOut).mockRejectedValue(new Error("Session could not be closed."))
    renderApp()

    expect(await screen.findByRole("heading", { name: "Moje przepisy" })).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Wyloguj się" }))

    expect(await screen.findByRole("alert")).toHaveTextContent("Nie udało się zakończyć sesji. Spróbuj ponownie.")
    expect(screen.getByRole("heading", { name: "Moje przepisy" })).toBeInTheDocument()
  })
})