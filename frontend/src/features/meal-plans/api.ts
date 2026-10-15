import { apiRequest } from "../../shared/api/client"

export type ScaledIngredient = {
  name: string
  amount: number | null
  amount_text: string
  unit: string
  metric_amount: number | null
  metric_unit: string
}

export type PlanEntry = {
  id: number
  servings: number
  recipe: { id: number; title: string; servings: number | null }
  ingredients: ScaledIngredient[]
}

export type PlanMeal = {
  id: number
  date: string
  position: number
  name: string
  is_default: boolean
  entries: PlanEntry[]
}

export type PlanDay = { date: string; meals: PlanMeal[] }

export type PlanSummary = {
  id: number
  name: string
  start_date: string
  end_date: string
  entry_count: number
}

export type Plan = PlanSummary & { days: PlanDay[] }

export type PlanInput = { name: string; start_date: string; end_date: string }

export const maxMealsPerDay = 6

const plansPath = "/api/meal-plans/"

export function getPlans(accessToken: string) {
  return apiRequest<PlanSummary[]>(accessToken, plansPath, {}, "Nie udało się wczytać planów.")
}

export function getPlan(accessToken: string, planId: number) {
  return apiRequest<Plan>(accessToken, `${plansPath}${planId}/`, {}, "Nie udało się wczytać planu.")
}

export function createPlan(accessToken: string, plan: PlanInput) {
  return apiRequest<Plan>(accessToken, plansPath, { method: "POST", body: plan })
}

// Shortening a period that removes entries answers 409 until it is sent again with confirm = true.
export function updatePlan(accessToken: string, planId: number, plan: Partial<PlanInput>, confirm = false) {
  return apiRequest<Plan>(accessToken, `${plansPath}${planId}/`, {
    method: "PATCH",
    body: confirm ? { ...plan, confirm: true } : plan,
  })
}

export function deletePlan(accessToken: string, planId: number) {
  return apiRequest<void>(accessToken, `${plansPath}${planId}/`, { method: "DELETE" })
}

export function addMeal(accessToken: string, planId: number, date: string) {
  return apiRequest<PlanMeal>(accessToken, `${plansPath}${planId}/meals/`, { method: "POST", body: { date } })
}

export function renameMeal(accessToken: string, planId: number, mealId: number, name: string) {
  return apiRequest<PlanMeal>(accessToken, `${plansPath}${planId}/meals/${mealId}/`, {
    method: "PATCH",
    body: { name },
  })
}

export function deleteMeal(accessToken: string, planId: number, mealId: number, confirm = false) {
  return apiRequest<void>(accessToken, `${plansPath}${planId}/meals/${mealId}/${confirm ? "?confirm=true" : ""}`, {
    method: "DELETE",
  })
}

export function addEntry(accessToken: string, planId: number, mealId: number, recipeId: number, servings?: number) {
  return apiRequest<PlanEntry>(accessToken, `${plansPath}${planId}/meals/${mealId}/entries/`, {
    method: "POST",
    body: servings === undefined ? { recipe: recipeId } : { recipe: recipeId, servings },
  })
}

export function updateEntry(
  accessToken: string,
  planId: number,
  entryId: number,
  changes: { servings?: number; recipe?: number },
) {
  return apiRequest<PlanEntry>(accessToken, `${plansPath}${planId}/entries/${entryId}/`, {
    method: "PATCH",
    body: changes,
  })
}

export function deleteEntry(accessToken: string, planId: number, entryId: number) {
  return apiRequest<void>(accessToken, `${plansPath}${planId}/entries/${entryId}/`, { method: "DELETE" })
}
