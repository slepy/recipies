import { apiRequest } from "../../shared/api/client"

export type UnitWeight = {
  id: number
  name: string
  unit: string
  grams_per_unit: number
  source: "auto" | "manual"
  created_at: string
  updated_at: string
}

export type UnitWeightPage = {
  count: number
  next: string | null
  previous: string | null
  results: UnitWeight[]
}

export type UnitWeightInput = { name: string; unit: string; grams_per_unit: number }

const unitWeightsPath = "/api/ingredients/unit-weights/"

// Entries by name, then unit, 50 per page; a phrase keeps those whose name contains it.
export function getUnitWeights(accessToken: string, query = "", page = 1) {
  const params = new URLSearchParams({ page: String(page) })
  if (query.trim()) params.set("q", query.trim())
  return apiRequest<UnitWeightPage>(accessToken, `${unitWeightsPath}?${params}`, {}, "Nie udało się wczytać bazy składników.")
}

export function createUnitWeight(accessToken: string, entry: UnitWeightInput) {
  return apiRequest<UnitWeight>(accessToken, unitWeightsPath, { method: "POST", body: entry })
}

export function updateUnitWeight(accessToken: string, entryId: number, entry: Partial<UnitWeightInput>) {
  return apiRequest<UnitWeight>(accessToken, `${unitWeightsPath}${entryId}/`, { method: "PATCH", body: entry })
}

export function deleteUnitWeight(accessToken: string, entryId: number) {
  return apiRequest<void>(accessToken, `${unitWeightsPath}${entryId}/`, { method: "DELETE" })
}
