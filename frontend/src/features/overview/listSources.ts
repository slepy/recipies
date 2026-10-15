import { PlanSummary } from "../meal-plans/api"
import { RecipeSetSummary } from "../recipe-sets/api"
import { ShoppingListSummary } from "../shopping-lists/api"

// Where a list leads: a plan's list has its own screen, a set's list is a tab of the set.
export type ListTarget = { kind: "plan"; listId: number } | { kind: "set"; setId: number }

export type SourcedList = ShoppingListSummary & { source: string; target: ListTarget }

// Each list knows its plan; a recipe set points at its list, so sets are matched by shopping_list.
export function withSources(lists: ShoppingListSummary[], plans: PlanSummary[], recipeSets: RecipeSetSummary[]): SourcedList[] {
  const planNames = new Map(plans.map((plan) => [plan.id, plan.name]))
  const setsByList = new Map(recipeSets.map((recipeSet) => [recipeSet.shopping_list, recipeSet]))
  return lists.map((list) => {
    const recipeSet = setsByList.get(list.id)
    if (recipeSet) return { ...list, source: `Zestaw: ${recipeSet.name}`, target: { kind: "set", setId: recipeSet.id } }
    const planName = list.plan === null ? undefined : planNames.get(list.plan)
    return { ...list, source: planName ? `Plan: ${planName}` : "Plan żywieniowy", target: { kind: "plan", listId: list.id } }
  })
}

export function isDone(list: ShoppingListSummary) {
  return list.item_count > 0 && list.bought_count === list.item_count
}
