# Project Guidance

## Project

This is a small recipe and shopping-list application. The backend will use Python, and the frontend will use React and TypeScript.

## Learning Priorities

- The primary learning goal is Python. Prefer backend tasks that build understanding of Python fundamentals and explain unfamiliar concepts briefly.
- Work in small, understandable steps. Avoid introducing abstractions or dependencies before they solve a clear need.
- When there are reasonable options, explain the trade-off and recommend the simplest approach that fits the current stage of the project.

## Development Practices

- Follow the existing structure and conventions in the repository.
- Keep changes focused on the requested feature.
- Add or update tests for behavior changes and run the relevant checks.
- Build a usable minimum version before adding optional features or infrastructure.
- Use Django for the Python backend and React/TypeScript for the frontend. Follow the agreed module boundaries in `docs/architecture.md`.
- Keep reusable, domain-neutral UI in the shared component area; keep feature behavior and feature-specific components with their owning feature.
- Apply SOLID, DRY, KISS, and OOP pragmatically. Do not add layers, classes, or abstractions without a concrete benefit.
- For reusable or complex UI, follow the component-driven workflow in `docs/architecture.md`: define states and accessibility, verify the component, then compose it into a feature.
- Record cross-cutting architecture choices in `docs/decisions/` and update `docs/architecture.md` when module boundaries change.

## AI Workflows

- For product or feature specification tasks, follow `.ai/skills/specification-writing/SKILL.md` and load its relevant references.
- For implementing a feature from an existing Markdown specification, follow `.ai/skills/spec-development/SKILL.md`.
