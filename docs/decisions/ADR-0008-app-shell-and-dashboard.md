# ADR-0008: App Shell, Dashboard and Shopping Lists Overview

- **Status:** Accepted
- **Date:** 2026-10-15
- **Decision owners:** Project owner

## Context

After signing in, every screen drew its own row of text links (`PageHeader`, and a copy inside the recipes screen), and the screens styled their forms and buttons in different ways. There was no start page. Shopping lists could only be reached from the plan or recipe set they belong to. The user asked for a dashboard and for all shopping lists in one place. Registration also needed a password confirmation field.

## Decision

- `shared/ui/AppShell` is the page frame for signed-in screens: a sidebar (a top bar with a scrolling link row on narrow screens), the account and sign-out, and the screen content in `<main>`. It is domain-neutral: it receives the nav items (label, href, icon, active) and an `onNavigate` callback, and it renders real links so they can open in a new tab. `PageHeader` was removed, and screens no longer receive `accountEmail`, `headerLinks` or `onSignOut`.
- `app/AuthenticatedApp.tsx` holds the signed-in routes and the navigation. `App.tsx` keeps only the session and the sign-in screens (`features/accounts/AuthScreen`).
- A new `features/overview` module holds read-only screens that combine other features: `Dashboard` at `/` (counts, today's meals from the running plan or the next plan, open lists, latest recipes) and `ShoppingOverview` at `/lists` (every list, with a filter by source). It only calls other features' API functions. Only `app/` imports it, so there is no cycle between `recipe-sets` and `shopping-lists`.
- A list's source is worked out in the browser. Plan names come from the plan list, and a set is matched through `RecipeSet.shopping_list`. The backend already returns every list from `GET /api/shopping-lists/` (ADR-0006), so no API change was needed. A plan list opens at `/lists/:id`, and a set's list opens at `/sets/:id?tab=list`, because deleting a set's list on its own would delete the set as well (ADR-0006).
- The dashboard loads its parts with `Promise.allSettled`, so a failed request only empties its own card.
- Password confirmation is checked only in the browser. The API still receives one password, because the second field only catches typing mistakes.
- One stylesheet with design tokens (colours, radii, shadows, control height) styles every form control, button and card. Long accessible names such as "Usuń wpis: Owsianka" stay for screen readers and tests, but the visible text is short ("Usuń").

## Consequences

- New signed-in screens render only their content inside the shell and use `.page` and `.page-header`.
- After signing in, the user lands on `/` instead of `/recipes`.
- The dashboard and the overview send several requests (recipes, plans, sets, lists, and one plan). This is acceptable at the current data sizes. A backend summary endpoint can replace them if it becomes slow.
