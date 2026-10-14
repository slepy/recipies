---
name: spec-development
description: "Implement and verify a feature from a Markdown specification. Use when asked to develop from SPEC-development.md, a feature spec, or acceptance criteria; follow the spec through implementation, tests, and review."
argument-hint: "Path to the Markdown feature specification"
---

# Spec-Driven Development

Implement a feature from the user's specified Markdown document. Treat the document as the scope and acceptance baseline, while following repository instructions and preserving existing work.

## Workflow

1. **Resolve the input.** Use the specification path supplied by the user. If none is supplied, use the specification identified by the active editor context or request context; otherwise select the single clearly relevant specification from the repository. Never ask the user to provide missing context. If no specification can be identified unambiguously, report the blocker without starting implementation. Confirm the file exists and read it fully. Do not create or rewrite the specification as part of implementation.
2. **Understand the repository.** Read applicable `AGENTS.md` and project instructions, relevant README sections, and the code and tests that own the behavior. Check the working tree before editing and preserve changes that already exist.
3. **Pass the must-have gate.** Before changing code, account for each item below as confirmed by the specification/repository, resolved with a conservative assumption, or explicitly blocked:
	- A clear goal and in-scope behavior.
	- Scope boundaries and relevant non-goals.
	- Observable acceptance criteria or an equivalent way to determine correct behavior.
	- Relevant constraints, dependencies, and architecture boundaries.
	- A focused verification method for the behavior being changed, including backend and frontend tests whenever those layers are in scope.

	Derive missing details from the user's request, specification, existing behavior, repository conventions, and tests. Choose the narrowest safe assumption and record consequential assumptions in the final report. Do not ask the user questions or silently invent requirements. If a must-have cannot be established and no safe, independently useful implementation is possible, report the blocker and stop before coding; otherwise proceed only with the supported scope and identify what remains blocked.
4. **Create the work branch.** Before editing files, record the current branch and select the PR base: use the target branch explicitly supplied by the user; otherwise use the branch checked out when this workflow started. Create a new, uniquely named feature branch from that base, using a short specification-derived name and a numeric suffix if needed. Confirm the new branch is based on the selected base. Never implement directly on the base branch.

	Inspect and preserve the working tree. Do not stash, discard, reset, or include pre-existing user changes in the feature commit. Stage only files and hunks belonging to this implementation. If existing changes make safe isolation impossible, stop before editing and report the blocker; do not ask the user to resolve it.
5. **Plan traceability.** Break the work into small, reviewable steps. For each acceptance criterion, identify the implementation area and a suitable verification method. Plan backend and frontend tests for every layer affected by the feature; if a layer is not affected, record why its tests are not applicable. Follow the spec's phases when present; otherwise use a short local plan.
6. **Implement narrowly.** Make the smallest coherent change that satisfies the specified behavior. Follow existing conventions, avoid unrelated cleanup and unnecessary dependencies, and do not expand non-goals. Write or update focused backend and frontend tests for changed behavior at their appropriate boundaries. For Python work, keep explanations of unfamiliar concepts brief and aligned with the project's learning priorities.
7. **Verify.** Run focused tests while developing, then run the complete backend and frontend test suites before preparing the PR. Discover commands from project documentation and package/configuration files; run every applicable suite and report the exact commands and outcomes. When a test fails, reproduce and diagnose it against the specification, changed logic, and relevant history/diff. If the intended behavior changed, update the affected tests to assert the new behavior while preserving meaningful coverage. If the relevant logic was not changed and the test still represents intended behavior, fix the functionality so the test passes; do not weaken or delete a valid test to hide a defect. Fix failures caused by the change. For flaky, infrastructure, or environment failures that cannot be fixed within scope, report the evidence and limitation explicitly; never claim the full test run passed when any suite was not run or failed.
8. **Review and prepare the change.** Inspect the final diff against the recorded base for scope, correctness, regressions, accidental changes, unrelated user work, and test quality. Check that each acceptance criterion has an appropriate verification result and that all applicable backend and frontend suites have been run. Stage only the implementation's files/hunks, create a focused commit, and push the feature branch to its matching remote. Never force-push.
9. **Open the pull request.** Create a PR from the feature branch to the exact base branch recorded in step 4. Include a concise summary, relevant specification/acceptance criteria, and verification results. If required checks are failing or unavailable, disclose that in the PR and mark it draft when supported. Do not merge the PR. If authentication, remote configuration, or hosting tools prevent pushing or creating the PR, report the branch, commit, intended base, and specific blocker; do not claim the PR was created and do not ask the user a question.
10. **Report completion.** Summarize the feature changes, base and feature branches, commit, PR link (or the exact blocker if no PR could be opened), specification criteria addressed, checks and outcomes, and unresolved decisions or limitations. Link to changed files where useful.

## Boundaries

- The specified Markdown file is the feature source of truth, but it does not override repository instructions or the user's latest direction. Surface conflicts rather than silently choosing one.
- Do not invent requirements, silently change acceptance criteria, or implement optional ideas as part of the requested scope.
- Work autonomously without requesting clarification. Resolve ordinary ambiguity conservatively from available project evidence; stop only when a required input is genuinely unavailable or proceeding would be unsafe.
- Creating a focused commit, pushing the feature branch, and opening a PR to the recorded base are required parts of this workflow. Do not merge, deploy, force-push, run destructive operations, or perform production data changes.
- Keep user changes intact. Do not revert unrelated work or modify generated files unless the feature requires it.
- If a blocker prevents a safe or meaningful implementation, stop at that point, explain the blocker, and report the work and verification completed so far.