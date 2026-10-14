# ADR-0001: Modular Web Architecture

- **Status:** Accepted
- **Date:** 2026-10-14
- **Decision owners:** Project owner

## Context

The project is a recipe and shopping-list application with a Python backend and a React/TypeScript frontend. Product specifications require user accounts, private recipes, and persistent shopping lists. The project should remain approachable while it grows, and shared UI components should be developed and composed deliberately.

## Decision

- Use Django for the Python backend, organized as a modular monolith around product domains.
- Use React and TypeScript for the frontend.
- Structure the frontend with Component-Based Architecture: domain-neutral shared UI is separate from feature-owned components and screens.
- Use Component-Driven Development for reusable or complex UI: define behavior and states, build and verify the component, then compose it into features.
- Apply SOLID, DRY, KISS, and OOP as practical design guidance, not as a requirement to add layers or abstractions preemptively.

## Rationale

Django provides a cohesive foundation for a data-centric application with accounts and persistence. A single backend and frontend keep deployment and learning scope manageable. Feature boundaries make domain ownership visible, while a small shared UI layer supports consistency without putting product behavior into generic controls.

## Consequences

- Django apps should own their domain behavior and avoid circular dependencies.
- Shared frontend components must remain independent of product features; feature modules compose them.
- Component tests and accessible states are part of the component development workflow.
- Django REST Framework is recommended for the JSON API but remains an open implementation choice.
- Database, routing, testing libraries, and Storybook remain undecided until implementation needs make those choices concrete.

## Alternatives Considered

- **FastAPI:** viable for an API-first backend, but would require selecting and integrating more of the account, persistence, and migration foundation separately.
- **A single unstructured Django app and frontend folder:** simpler at the very beginning, but makes domain and component ownership harder to preserve as features arrive.
- **Mandatory Storybook from day one:** deferred because a component catalog may not justify its setup before reusable UI has accumulated.
