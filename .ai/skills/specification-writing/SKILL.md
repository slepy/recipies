---
name: specification-writing
description: "Create, refine, or review product and feature specifications. Use for product specs, requirements, user stories, acceptance criteria, dependencies, architecture notes, risk analysis, or compliance review."
---

# Specification Writing

## Purpose

Produce a clear, appropriately sized specification that a person can discuss, implement, and verify. Save project specifications under `.ai/specs/` unless the user asks for another location.

## When to Use

- Turning an idea or user request into a feature specification.
- Clarifying requirements, scope, dependencies, acceptance criteria, or quality goals.
- Reviewing an existing specification before implementation.
- Recording relevant architecture and compliance considerations.

## Workflow

1. Read the root `AGENTS.md`, relevant README sections, and nearby specifications. Inspect code only when an existing behavior or interface affects the feature.
2. Identify the problem, intended users, desired outcome, and decision the specification should enable. Preserve the user's learning goal: explain unfamiliar technical choices briefly and prefer the simplest useful design.
3. Before drafting, separate confirmed facts from assumptions, unknowns, and decisions. Identify choices that would materially change scope, safety, architecture, or acceptance, then ask the user a concise set of questions in one round. Include a recommended answer and brief rationale for each choice. Wait for the answers before writing the specification. Do not defer these questions until after presenting a draft. If the user asks to proceed without answering, use the recommended choices as explicit assumptions and identify only material items that remain unresolved.
4. Define scope and non-goals. Write functional requirements as uniquely identified, atomic statements. Write acceptance criteria as observable outcomes; use Given/When/Then when it improves clarity.
5. Capture quality requirements as measurable scenarios where practical (condition, stimulus, expected response, and measurement). Consider security, privacy, accessibility, performance, reliability, and operability in proportion to the feature's risk.
6. Map dependencies: upstream decisions/data/services, downstream consumers, external services or packages, ownership, versions or constraints, readiness, and consequences if unavailable. Distinguish blockers from optional dependencies.
7. Describe only the architecture needed to explain the change: affected components, boundaries, data flow, interfaces, persistence, and important decisions. Do not prescribe implementation details without a reason. See [architecture and compliance guidance](./references/architecture-and-compliance.md).
8. Define ordered implementation phases with a focused scope, dependencies, deliverable or exit criteria, and a way to verify completion for each phase. Keep phases small enough to review independently; make blockers and cross-spec dependencies explicit.
9. Complete the `# Compliance Review` section. Identify potentially applicable laws, policies, contracts, and security requirements; record applicability and evidence. Do not make legal conclusions or claim compliance without evidence.
10. Use the [specification template](./references/specification-template.md), then check the [specification checklist](./references/specification-checklist.md). Tailor or omit irrelevant sections and state why when omission affects a material risk.
11. Save or update `.ai/specs/<YYYY-MM-DD>-<short-feature-name-in-english>.md`, using the current date and an English, lowercase, hyphen-separated feature name (for example, `.ai/specs/2026-10-14-registration-and-login.md`). Preserve existing decisions and status; do not overwrite another spec. Record decisions from the clarification round. Include unresolved questions only when the user chose to proceed without answering or the issue could not reasonably be resolved in that round; explain the impact and next decision needed. Do not ask the user to resolve ordinary scope decisions after presenting the specification.

## Quality Bar

- A reader can tell what problem is being solved and what is deliberately excluded.
- Each in-scope requirement has a way to verify it, or is explicitly marked as not yet verifiable.
- Dependencies, assumptions, risks, and open decisions are visible rather than hidden in prose.
- The proposed architecture fits the current project and avoids unnecessary infrastructure.
- Compliance is treated as a traceable review, not a blanket guarantee.

## References

- [Specification template](./references/specification-template.md)
- [Specification checklist](./references/specification-checklist.md)
- [Architecture and compliance guidance](./references/architecture-and-compliance.md)
- [Research sources and applicability notes](./references/sources.md)
