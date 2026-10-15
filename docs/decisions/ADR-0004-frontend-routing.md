# ADR-0004: Frontend Routing

- **Status:** Accepted
- **Date:** 2026-10-15
- **Decision owners:** Project owner

## Context

The React app switched screens with component state, so the browser URL never changed. Users could not bookmark or reload a screen, share a link, or use the browser's back button. ADR-0001 left frontend routing undecided until a concrete need appeared.

## Decision

- Use React Router 7 (the `react-router` package) in declarative mode: `BrowserRouter` in `main.tsx`, with `Routes` declared in `App.tsx`.
- Initial routes: `/login`, `/register`, `/recipes` and `/settings/integrations`. Meal plans added `/plans`, `/plans/:planId` and `/lists/:listId` (ADR-0005), the ingredient knowledge base added `/ingredients` (ADR-0007), and the app shell added the dashboard at `/` and all shopping lists at `/lists` (ADR-0008).
- While the session is being restored, show the loading screen without redirecting. Anonymous visitors are then redirected to `/login`, and signed-in users who reach `/login`, `/register` or an unknown path are redirected to the dashboard at `/` (ADR-0008; it was `/recipes` before).
- Feature components keep receiving navigation callbacks (`onOpenIntegrations`, `onBack`) from `App.tsx` instead of importing the router, so they can still be tested without one.

## Rationale

React Router is the most widely used React router. Its declarative mode needs no build plugin or file conventions, and it adds only one dependency. Hand-rolled `history.pushState` handling would have to reimplement back/forward handling and redirects. Next.js or React Router framework mode would add server rendering that a login-only app backed by Django does not need.

## Consequences

- Screens have shareable, reloadable URLs, and back/forward navigation works.
- A production host must serve `index.html` for unknown non-`/api` paths (SPA fallback). The Vite dev server already does this.
- Tests that render `App` must wrap it in a `MemoryRouter`.
- The app does not yet return users to the page they originally requested after login. Add this when a deep link needs it.
