import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import AppShell from "./AppShell"

function renderShell(overrides: Partial<Parameters<typeof AppShell>[0]> = {}) {
  const props = {
    accountEmail: "cook@example.com",
    navItems: [
      { label: "Pulpit", href: "/", icon: null, isActive: true },
      { label: "Przepisy", href: "/recipes", icon: null, isActive: false },
    ],
    onNavigate: vi.fn(),
    onSignOut: vi.fn(),
    children: <h1>Treść</h1>,
    ...overrides,
  }
  render(<AppShell {...props} />)
  return props
}

describe("app shell", () => {
  it("shows the navigation, the account and the screen content", () => {
    renderShell()

    expect(screen.getByRole("navigation", { name: "Nawigacja główna" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Pulpit" })).toHaveAttribute("aria-current", "page")
    expect(screen.getByRole("link", { name: "Przepisy" })).not.toHaveAttribute("aria-current")
    expect(screen.getByText("cook@example.com")).toBeInTheDocument()
    expect(screen.getByRole("main")).toContainElement(screen.getByRole("heading", { name: "Treść" }))
  })

  it("navigates inside the app on a plain click and keeps real links", () => {
    const props = renderShell()

    const link = screen.getByRole("link", { name: "Przepisy" })
    expect(link).toHaveAttribute("href", "/recipes")
    fireEvent.click(link)
    expect(props.onNavigate).toHaveBeenCalledWith("/recipes")

    // A modified click is left to the browser, e.g. to open a new tab (jsdom cannot open one, so stop it here).
    link.addEventListener("click", (event) => event.preventDefault())
    fireEvent.click(link, { metaKey: true })
    expect(props.onNavigate).toHaveBeenCalledTimes(1)
  })

  it("signs out and shows an account error", () => {
    const props = renderShell({ accountError: "Nie udało się zakończyć sesji." })

    expect(screen.getByRole("alert")).toHaveTextContent("Nie udało się zakończyć sesji.")
    fireEvent.click(screen.getByRole("button", { name: "Wyloguj się" }))
    expect(props.onSignOut).toHaveBeenCalledOnce()
  })
})
