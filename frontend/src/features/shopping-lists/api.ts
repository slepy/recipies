import { apiRequest } from "../../shared/api/client"

export type ListItem = {
  id: number
  name: string
  origin: "recipe" | "custom"
  amount: number | null
  unit: string
  amount_text: string
  metric_amount: number | null
  metric_unit: "" | "g" | "kg" | "ml" | "l"
  // True when a custom item's weight was worked out from the ingredient knowledge base.
  metric_estimated: boolean
  // Grams per unit of this product and unit from the knowledge base, or null when unknown.
  unit_weight: number | null
  partial: boolean
  bought: boolean
  bought_amount: number | null
  bought_metric_base: number | null
  extra_amount: number
  extra_metric: number
  is_new: boolean
}

export type ShoppingListSummary = {
  id: number
  name: string
  plan: number | null
  scope_start: string | null
  scope_end: string | null
  generated_at: string
  item_count: number
  bought_count: number
}

export type ShoppingList = ShoppingListSummary & {
  excluded_entry_ids: number[]
  items: ListItem[]
  is_stale: boolean
}

export type ListInput = {
  plan: number
  name: string
  start_date: string
  end_date: string
  excluded_entry_ids: number[]
}

// Same fields as a recipe ingredient (see recipes/api.ts).
export type CustomItemInput = {
  name: string
  amount: string
  unit: string
  metric_amount: number | null
  metric_unit: "" | "g" | "kg" | "ml" | "l"
}

export type RefreshPreview = { added: string[]; changed: string[]; removed: string[]; custom_kept: number }

const listsPath = "/api/shopping-lists/"

export function getShoppingLists(accessToken: string, planId: number) {
  return apiRequest<ShoppingListSummary[]>(accessToken, `${listsPath}?plan=${planId}`, {}, "Nie udało się wczytać list.")
}

// Every list of the user: plan lists and recipe set lists (plan is null for a set's list).
export function getAllShoppingLists(accessToken: string) {
  return apiRequest<ShoppingListSummary[]>(accessToken, listsPath, {}, "Nie udało się wczytać list.")
}

export function getShoppingList(accessToken: string, listId: number) {
  return apiRequest<ShoppingList>(accessToken, `${listsPath}${listId}/`, {}, "Nie udało się wczytać listy.")
}

export function createShoppingList(accessToken: string, list: ListInput) {
  return apiRequest<ShoppingList>(accessToken, listsPath, { method: "POST", body: list })
}

export function deleteShoppingList(accessToken: string, listId: number) {
  return apiRequest<void>(accessToken, `${listsPath}${listId}/`, { method: "DELETE" })
}

export function getRefreshPreview(accessToken: string, listId: number) {
  return apiRequest<RefreshPreview>(accessToken, `${listsPath}${listId}/refresh/`, {}, "Nie udało się sprawdzić zmian.")
}

export function refreshShoppingList(accessToken: string, listId: number) {
  return apiRequest<ShoppingList>(accessToken, `${listsPath}${listId}/refresh/`, { method: "POST" }, "Nie udało się odświeżyć listy.")
}

export function addCustomItem(accessToken: string, listId: number, item: CustomItemInput) {
  return apiRequest<ListItem>(accessToken, `${listsPath}${listId}/items/`, { method: "POST", body: item })
}

export function setItemBought(accessToken: string, listId: number, itemId: number, bought: boolean) {
  return apiRequest<ListItem>(accessToken, `${listsPath}${listId}/items/${itemId}/`, {
    method: "PATCH",
    body: { bought },
  })
}

// Raise the amount of a recipe item; the metric increase is in the item's own metric unit.
export function increaseItem(
  accessToken: string,
  listId: number,
  itemId: number,
  increase: { increase_amount?: number; increase_metric_amount?: number },
) {
  return apiRequest<ListItem>(accessToken, `${listsPath}${listId}/items/${itemId}/`, { method: "PATCH", body: increase })
}

export function resetItemIncrease(accessToken: string, listId: number, itemId: number) {
  return apiRequest<ListItem>(accessToken, `${listsPath}${listId}/items/${itemId}/`, {
    method: "PATCH",
    body: { reset_increase: true },
  })
}

export function deleteCustomItem(accessToken: string, listId: number, itemId: number) {
  return apiRequest<void>(accessToken, `${listsPath}${listId}/items/${itemId}/`, { method: "DELETE" })
}
