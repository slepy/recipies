import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ApiError } from "../../shared/api/client"
import MealPlanList from "./MealPlanList"
import { createPlan, getPlans, Plan } from "./api"

vi.mock("./api", () => ({ createPlan: vi.fn(), getPlans: vi.fn() }))

function renderList(onOpenPlan = vi.fn()) {
  render(
    <MealPlanList
      accessToken="token"
      onOpenPlan={onOpenPlan}
    />,
  )
  return onOpenPlan
}

describe("meal plan list", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getPlans).mockResolvedValue([
      { id: 1, name: "Tydzień 1", start_date: "2026-11-02", end_date: "2026-11-08", entry_count: 4 },
    ])
  })

  it("lists plans with their period and opens one", async () => {
    const onOpenPlan = renderList()

    await userEvent.click(await screen.findByRole("button", { name: /Tydzień 1/ }))

    expect(onOpenPlan).toHaveBeenCalledWith(1)
  })

  it("shows an empty state", async () => {
    vi.mocked(getPlans).mockResolvedValue([])
    renderList()

    expect(await screen.findByText("Nie masz jeszcze żadnego planu.")).toBeInTheDocument()
  })

  it("creates a plan and opens it", async () => {
    vi.mocked(createPlan).mockResolvedValue({ id: 7 } as Plan)
    const onOpenPlan = renderList()
    await screen.findByText("Tydzień 1")

    await userEvent.type(screen.getByLabelText("Nazwa planu"), "Wakacje")
    await userEvent.type(screen.getByLabelText("Od"), "2026-12-01")
    await userEvent.type(screen.getByLabelText("Do"), "2026-12-03")
    await userEvent.click(screen.getByRole("button", { name: "Utwórz plan" }))

    expect(createPlan).toHaveBeenCalledWith("token", { name: "Wakacje", start_date: "2026-12-01", end_date: "2026-12-03" })
    expect(onOpenPlan).toHaveBeenCalledWith(7)
  })

  it("shows server validation errors next to the right field", async () => {
    vi.mocked(createPlan).mockRejectedValue(
      new ApiError("Podaj nazwę planu.", "", 0, { name: "Podaj nazwę planu.", end_date: "Data końcowa nie może być wcześniejsza niż początkowa." }),
    )
    const onOpenPlan = renderList()
    await screen.findByText("Tydzień 1")

    await userEvent.click(screen.getByRole("button", { name: "Utwórz plan" }))

    expect(await screen.findByText("Podaj nazwę planu.")).toBeInTheDocument()
    expect(screen.getByText(/Data końcowa nie może/)).toBeInTheDocument()
    expect(onOpenPlan).not.toHaveBeenCalled()
  })
})
