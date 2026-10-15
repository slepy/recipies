# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Read `AGENTS.md` first. It holds the project rules, including the learning priorities (the user is learning Python, so explain unfamiliar backend concepts briefly and work in small steps) and the AI workflows. `docs/architecture.md` is the source of truth for module boundaries. ADRs live in `docs/decisions/`.

## Commands

Everything runs through Docker Compose. `.env` must exist (`cp .env.example .env`); Compose refuses to start without `POSTGRES_PASSWORD` and `DJANGO_SECRET_KEY`.

```sh
docker compose up --build                     # db + backend (:8010) + frontend (:5173)

# Backend (Django test runner, unittest-style; run from backend/ inside the container)
docker compose run --rm backend python manage.py test tests
docker compose run --rm backend python manage.py test tests.authentication.test_login
docker compose run --rm backend python manage.py test tests.authentication.test_login.LoginApiTests.test_bad_credentials_use_a_neutral_error
docker compose run --rm backend python manage.py makemigrations <app>

# Frontend (Vitest + Testing Library, jsdom)
docker compose run --rm frontend npm test
docker compose run --rm frontend npx vitest run src/features/recipes/RecipeWorkspace.test.tsx
docker compose run --rm frontend npm run build   # tsc --noEmit + vite build; this is the type check
```

There is no linter or formatter configured. The backend container runs `migrate` on startup.

Settings read `DB_ENGINE` (`postgres`, the default, or `sqlite`, which defaults to in-memory `SQLITE_NAME=:memory:`). Provider keys can't be saved until `INTEGRATIONS_ENCRYPTION_KEY` (a Fernet key) is set in `.env`; the README has the command that generates one.

## Backend architecture (`backend/`)

This is a Django + DRF modular monolith. Each app owns one capability: `accounts` (user model, repository), `authentication` (register, login, JWT lifecycle, auth HTTP API), `integrations` (per-user encrypted AI provider config), `recipes`, `meal_plans` (plans, meals, entries), `shopping_lists` (lists built from a plan, ADR-0005) and `recipe_sets` (named recipe sets with their own list, ADR-0006). Root routes are in `config/urls.py`, and every API path is under `/api/`.

Conventions that are easy to miss:

- **One production class per module** (and one test class per test module). Packages re-export through `__init__.py`. Folders are named by layer: `models/`, `serializers/`, `views/` (one endpoint per module), `services/` (one use case per module), `contracts/` (`Protocol` ports), `providers/` (one framework adapter each), `errors/`, `repositories/`.
- **The authentication app uses ports and adapters.** Services depend on protocols in `contracts/`. Concrete Django/SimpleJWT providers are wired in `authentication/container.py`, the composition root, and views import ready-made services from it. Auth reaches users only through `accounts.repositories.contracts.UserRepository`, never through direct ORM calls. Simpler apps (`integrations`, `recipes`, `meal_plans`, `shopping_lists`, `recipe_sets`) use models, serializers and views directly. Don't add the ports/adapters layering to them without a concrete need.
- **Auth model:** a short-lived access JWT is returned in the response body and kept in memory by React, which sends it as `Authorization: Bearer`. A rotating, single-use refresh JWT lives in an HttpOnly cookie. Refresh and logout are CSRF-protected and origin-checked (`authentication/views/security.py`, `cookies.py`, `csrf.py`). DRF defaults to `JWTAuthentication` + `IsAuthenticated`. Always scope querysets to `request.user`, and never trust a client-supplied owner ID.
- **Integrations:** at most one provider config per user, with the API key Fernet-encrypted (ADR-0003). A new key is verified against the provider's models-list endpoint before it replaces the existing config. The API never returns the key.
- **Tests live in `backend/tests/<app>/`**, not inside the apps. Every test directory needs an `__init__.py`, or unittest discovery silently skips it.

## Frontend architecture (`frontend/src/`)

React 19 + TypeScript + Vite, with no router or state library yet. `App.tsx` composes feature modules from `features/<feature>/`. Each feature owns its screens, components, `api.ts` (fetch calls and types) and co-located `*.test.tsx`. The target structure, which is not fully created yet, adds `app/` and `shared/{ui,api,lib}`. `shared/ui` must stay domain-neutral, with no feature imports and no network calls. Create a shared component only when reuse is real, and follow the component-driven workflow in `docs/architecture.md`.

Vite proxies `/api` to the backend (`API_PROXY_TARGET`, by default `http://127.0.0.1:8010`), so the app and the API share an origin in development.

## AI workflows (`.ai/`)

- Specs live in `.ai/specs/YYYY-MM-DD-<name>.md`. Write them with `.ai/skills/specification-writing/SKILL.md` and its references.
- Implement from a spec with `.ai/skills/spec-development/SKILL.md`. It requires a new feature branch off the current branch, backend and frontend tests for every affected layer, full suites run, a focused commit, a push and a PR to the recorded base, with no force-push or merge.
- Review or repair a named PR with `.ai/skills/pull-request-review/SKILL.md`.
