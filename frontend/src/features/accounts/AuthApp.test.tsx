import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import App from "../../App"
import { getCurrentUser, logIn, logOut, refreshAccessToken, register } from "./api"

vi.mock("./api", () => ({
  getCurrentUser: vi.fn(),
  logIn: vi.fn(),
  logOut: vi.fn(),
  refreshAccessToken: vi.fn(),
  register: vi.fn(),
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
})