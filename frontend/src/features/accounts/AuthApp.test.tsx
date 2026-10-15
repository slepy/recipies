import { act, fireEvent, render, screen, within } from "@testing-library/react"
import { MemoryRouter, useLocation, useNavigate } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import App from "../../App"
import { getCurrentUser, logIn, logOut, refreshAccessToken, register } from "./api"
import { getProviderConfiguration } from "../integrations/api"
import { getPlans } from "../meal-plans/api"
import { getRecipeSets } from "../recipe-sets/api"
import { getRecipes } from "../recipes/api"
import { getAllShoppingLists } from "../shopping-lists/api"

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

vi.mock("../meal-plans/api", () => ({ getPlan: vi.fn(), getPlans: vi.fn() }))
vi.mock("../recipe-sets/api", () => ({ getRecipeSets: vi.fn() }))
vi.mock("../shopping-lists/api", () => ({ getAllShoppingLists: vi.fn() }))

// The dashboard greets by the time of day, so match either greeting.
const dashboardHeading = { name: /^(Dzień dobry|Dobry wieczór), cook$/ }

function CurrentPath() {
  return <output data-testid="current-path">{useLocation().pathname}</output>
}

function BackButton() {
  const navigate = useNavigate()
  return <button onClick={() => navigate(-1)}>Wstecz przeglądarki</button>
}

function renderApp(path = "/login") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
      <CurrentPath />
      <BackButton />
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
    vi.mocked(getPlans).mockResolvedValue([])
    vi.mocked(getRecipeSets).mockResolvedValue([])
    vi.mocked(getAllShoppingLists).mockResolvedValue([])
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
    fireEvent.change(screen.getByLabelText(/^Powtórz hasło/), { target: { value: "a-long-unique-password" } })
    fireEvent.click(screen.getByRole("button", { name: "Utwórz konto" }))

    expect(await screen.findByRole("heading", dashboardHeading)).toBeInTheDocument()
    expect(screen.getByText("cook@example.com")).toBeInTheDocument()
    expect(currentPath()).toBe("/")
    expect(screen.queryByRole("region", { name: "Miska, przepisy na co dzień" })).not.toBeInTheDocument()
    expect(register).toHaveBeenCalledWith("cook@example.com", "a-long-unique-password")
    expect(logIn).not.toHaveBeenCalled()
    expect(logOut).not.toHaveBeenCalled()
  })

  it("asks to repeat the password and stops when the two differ", async () => {
    renderApp("/register")

    await screen.findByRole("heading", { name: "Utwórz konto" })
    expect(screen.getByLabelText(/^Powtórz hasło/)).toHaveAttribute("type", "password")
    fireEvent.change(screen.getByLabelText("Adres e-mail"), { target: { value: "cook@example.com" } })
    fireEvent.change(screen.getByLabelText(/^Hasło/), { target: { value: "a-long-unique-password" } })
    fireEvent.change(screen.getByLabelText(/^Powtórz hasło/), { target: { value: "a-long-unique-passwort" } })
    fireEvent.submit(screen.getByLabelText("Adres e-mail").closest("form")!)

    expect(await screen.findByRole("alert")).toHaveTextContent("Hasła nie są takie same.")
    expect(screen.getByLabelText(/^Powtórz hasło/)).toHaveAttribute("aria-invalid", "true")
    expect(register).not.toHaveBeenCalled()
  })

  it("does not ask to repeat the password when logging in", async () => {
    renderApp()

    await screen.findByRole("heading", { name: "Zaloguj się" })
    expect(screen.queryByLabelText(/^Powtórz hasło/)).not.toBeInTheDocument()
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
    expect(screen.getByRole("heading", dashboardHeading)).toBeInTheDocument()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(23 * 60 * 60 * 1000)
    })

    expect(refreshAccessToken).toHaveBeenCalledTimes(2)
  })

  it("opens AI integration settings from the signed-in view", async () => {
    vi.mocked(refreshAccessToken).mockResolvedValue("memory-access-token")
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 1, email: "cook@example.com" })
    renderApp("/recipes")

    expect(await screen.findByRole("heading", { name: "Moje przepisy" })).toBeInTheDocument()
    fireEvent.click(screen.getByRole("link", { name: "Integracje AI" }))

    expect(await screen.findByRole("heading", { name: "Integracje AI" })).toBeInTheDocument()
    expect(await screen.findByText("Nie skonfigurowano dostawcy AI")).toBeInTheDocument()
    expect(currentPath()).toBe("/settings/integrations")

    fireEvent.click(screen.getByRole("button", { name: /Wróć/ }))

    expect(await screen.findByRole("heading", dashboardHeading)).toBeInTheDocument()
    expect(currentPath()).toBe("/")
  })

  it("opens integration settings directly from their URL after restoring the session", async () => {
    vi.mocked(refreshAccessToken).mockResolvedValue("memory-access-token")
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 1, email: "cook@example.com" })
    renderApp("/settings/integrations")

    expect(await screen.findByRole("heading", { name: "Integracje AI" })).toBeInTheDocument()
    expect(currentPath()).toBe("/settings/integrations")
  })

  it("clears a form error when the browser goes back to the other form", async () => {
    vi.mocked(register).mockRejectedValue(new Error("Konto już istnieje."))
    renderApp()

    await screen.findByRole("heading", { name: "Zaloguj się" })
    fireEvent.click(screen.getByRole("button", { name: "Utwórz konto" }))
    fireEvent.change(screen.getByLabelText("Adres e-mail"), { target: { value: "cook@example.com" } })
    fireEvent.change(screen.getByLabelText(/^Hasło/), { target: { value: "a-long-unique-password" } })
    fireEvent.change(screen.getByLabelText(/^Powtórz hasło/), { target: { value: "a-long-unique-password" } })
    fireEvent.submit(screen.getByLabelText("Adres e-mail").closest("form")!)
    expect(await screen.findByRole("alert")).toHaveTextContent("Konto już istnieje.")

    fireEvent.click(screen.getByRole("button", { name: "Wstecz przeglądarki" }))

    expect(await screen.findByRole("heading", { name: "Zaloguj się" })).toBeInTheDocument()
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
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

  it("shows a sign-out error without leaving the current screen", async () => {
    vi.mocked(refreshAccessToken).mockResolvedValue("memory-access-token")
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 1, email: "cook@example.com" })
    vi.mocked(logOut).mockRejectedValue(new Error("Session could not be closed."))
    renderApp()

    expect(await screen.findByRole("heading", dashboardHeading)).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: "Wyloguj się" }))

    expect(await screen.findByRole("alert")).toHaveTextContent("Nie udało się zakończyć sesji. Spróbuj ponownie.")
    expect(screen.getByRole("heading", dashboardHeading)).toBeInTheDocument()
  })

  it("moves between screens with the main navigation and marks the current one", async () => {
    vi.mocked(refreshAccessToken).mockResolvedValue("memory-access-token")
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 1, email: "cook@example.com" })
    renderApp("/")

    expect(await screen.findByRole("heading", dashboardHeading)).toBeInTheDocument()
    const navigation = screen.getByRole("navigation", { name: "Nawigacja główna" })
    expect(within(navigation).getByRole("link", { name: "Pulpit" })).toHaveAttribute("aria-current", "page")

    fireEvent.click(within(navigation).getByRole("link", { name: "Listy zakupów" }))

    expect(await screen.findByRole("heading", { name: "Listy zakupów" })).toBeInTheDocument()
    expect(currentPath()).toBe("/lists")
    expect(within(navigation).getByRole("link", { name: "Listy zakupów" })).toHaveAttribute("aria-current", "page")
    expect(within(navigation).getByRole("link", { name: "Pulpit" })).not.toHaveAttribute("aria-current")
  })

  it("sends a signed-in user from the login screen to the dashboard", async () => {
    vi.mocked(refreshAccessToken).mockResolvedValue("memory-access-token")
    vi.mocked(getCurrentUser).mockResolvedValue({ id: 1, email: "cook@example.com" })
    renderApp("/login")

    expect(await screen.findByRole("heading", dashboardHeading)).toBeInTheDocument()
    expect(currentPath()).toBe("/")
  })
})
