import { Navigate, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from "react-router"

import IngredientBase from "../features/ingredients/IngredientBase"
import IntegrationSettings from "../features/integrations/IntegrationSettings"
import MealPlanList from "../features/meal-plans/MealPlanList"
import MealPlanView from "../features/meal-plans/MealPlanView"
import Dashboard from "../features/overview/Dashboard"
import { ListTarget } from "../features/overview/listSources"
import ShoppingOverview from "../features/overview/ShoppingOverview"
import AddToRecipeSet from "../features/recipe-sets/AddToRecipeSet"
import RecipeSetList from "../features/recipe-sets/RecipeSetList"
import RecipeSetView from "../features/recipe-sets/RecipeSetView"
import RecipeEditor from "../features/recipes/RecipeEditor"
import RecipeWorkspace from "../features/recipes/RecipeWorkspace"
import ShoppingListView from "../features/shopping-lists/ShoppingListView"
import AppShell, { NavItem } from "../shared/ui/AppShell"
import { navIcons } from "./navIcons"

type AuthenticatedAppProps = {
  accessToken: string
  accountEmail: string
  accountError: string
  onSignOut: () => void
}

// Each entry is active on its own path and below it, e.g. "/plans" also on "/plans/4".
const navigation = [
  { label: "Pulpit", href: "/", icon: navIcons.dashboard, paths: ["/"] },
  { label: "Przepisy", href: "/recipes", icon: navIcons.recipes, paths: ["/recipes"] },
  { label: "Plany żywieniowe", href: "/plans", icon: navIcons.plans, paths: ["/plans"] },
  { label: "Listy zakupów", href: "/lists", icon: navIcons.lists, paths: ["/lists"] },
  { label: "Zestawy przepisów", href: "/sets", icon: navIcons.sets, paths: ["/sets"] },
  { label: "Baza składników", href: "/ingredients", icon: navIcons.ingredients, paths: ["/ingredients"] },
  { label: "Integracje AI", href: "/settings/integrations", icon: navIcons.settings, paths: ["/settings"] },
]

function isWithin(pathname: string, path: string) {
  return path === "/" ? pathname === "/" : pathname === path || pathname.startsWith(`${path}/`)
}

function PlanRoute({ accessToken }: { accessToken: string }) {
  const navigate = useNavigate()
  const planId = Number(useParams().planId)
  if (!Number.isInteger(planId)) return <Navigate to="/plans" replace />
  return (
    <MealPlanView
      accessToken={accessToken}
      onBack={() => navigate("/plans")}
      onOpenList={(listId) => navigate(`/lists/${listId}`)}
      planId={planId}
    />
  )
}

function ListRoute({ accessToken }: { accessToken: string }) {
  const navigate = useNavigate()
  const listId = Number(useParams().listId)
  if (!Number.isInteger(listId)) return <Navigate to="/lists" replace />
  return (
    <ShoppingListView
      accessToken={accessToken}
      listId={listId}
      onBack={() => navigate("/lists")}
      onBackToPlan={(planId) => navigate(`/plans/${planId}`)}
    />
  )
}

function RecipeEditRoute({ accessToken }: { accessToken: string }) {
  const navigate = useNavigate()
  const recipeId = Number(useParams().recipeId)
  if (!Number.isInteger(recipeId)) return <Navigate to="/recipes" replace />
  return <RecipeEditor accessToken={accessToken} key={recipeId} onBack={() => navigate("/recipes")} recipeId={recipeId} />
}

function RecipeSetRoute({ accessToken }: { accessToken: string }) {
  const navigate = useNavigate()
  const setId = Number(useParams().setId)
  const [searchParams] = useSearchParams()
  if (!Number.isInteger(setId)) return <Navigate to="/sets" replace />
  return (
    <RecipeSetView
      accessToken={accessToken}
      // Keyed by the tab, so following a link to the set's list opens that tab even from the set itself.
      initialTab={searchParams.get("tab") === "list" ? "list" : "recipes"}
      key={`${setId}-${searchParams.get("tab")}`}
      onBack={() => navigate("/sets")}
      setId={setId}
    />
  )
}

export default function AuthenticatedApp({ accessToken, accountEmail, accountError, onSignOut }: AuthenticatedAppProps) {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const navItems: NavItem[] = navigation.map((item) => ({
    label: item.label,
    href: item.href,
    icon: item.icon,
    isActive: item.paths.some((path) => isWithin(pathname, path)),
  }))

  function openList(target: ListTarget) {
    navigate(target.kind === "plan" ? `/lists/${target.listId}` : `/sets/${target.setId}?tab=list`)
  }

  return (
    <AppShell
      accountEmail={accountEmail}
      accountError={accountError}
      navItems={navItems}
      onNavigate={(href) => navigate(href)}
      onSignOut={onSignOut}
    >
      <Routes>
        <Route
          path="/"
          element={
            <Dashboard
              accessToken={accessToken}
              accountEmail={accountEmail}
              onOpenList={openList}
              onOpenLists={() => navigate("/lists")}
              onOpenPlan={(planId) => navigate(`/plans/${planId}`)}
              onOpenPlans={() => navigate("/plans")}
              onOpenRecipes={() => navigate("/recipes")}
              onOpenSets={() => navigate("/sets")}
            />
          }
        />
        <Route
          path="/recipes"
          element={
            <RecipeWorkspace
              accessToken={accessToken}
              onEditRecipe={(recipeId) => navigate(`/recipes/${recipeId}/edit`)}
              onOpenIntegrations={() => navigate("/settings/integrations")}
              renderRecipeActions={(recipe) => (
                <AddToRecipeSet accessToken={accessToken} recipeId={recipe.id} recipeTitle={recipe.title} />
              )}
            />
          }
        />
        <Route path="/recipes/:recipeId/edit" element={<RecipeEditRoute accessToken={accessToken} />} />
        <Route
          path="/plans"
          element={<MealPlanList accessToken={accessToken} onOpenPlan={(planId) => navigate(`/plans/${planId}`)} />}
        />
        <Route path="/plans/:planId" element={<PlanRoute accessToken={accessToken} />} />
        <Route
          path="/lists"
          element={
            <ShoppingOverview
              accessToken={accessToken}
              onOpenList={openList}
              onOpenPlans={() => navigate("/plans")}
              onOpenSets={() => navigate("/sets")}
            />
          }
        />
        <Route path="/lists/:listId" element={<ListRoute accessToken={accessToken} />} />
        <Route path="/ingredients" element={<IngredientBase accessToken={accessToken} />} />
        <Route
          path="/sets"
          element={<RecipeSetList accessToken={accessToken} onOpenSet={(setId) => navigate(`/sets/${setId}`)} />}
        />
        <Route path="/sets/:setId" element={<RecipeSetRoute accessToken={accessToken} />} />
        <Route
          path="/settings/integrations"
          element={
            <div className="page page--narrow">
              <IntegrationSettings accessToken={accessToken} onBack={() => navigate("/")} />
            </div>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  )
}
