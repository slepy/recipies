---
name: pull-request-review
description: "Review and repair a specific pull request against its requirements, design, implementation, tests, security, and release risks. Use when asked to review or fix a named PR; commit and push repairs, rerun tests, and repeat review until clean or blocked."
argument-hint: "Pull request URL or number, and optionally repository"
---

# Pull Request Review

Review and, when needed, repair the specific pull request supplied by the user. Treat this as an iterative quality gate in the project's SDLC: evaluate the change from requirements and design through implementation and verification to release readiness, fix actionable defects, then test and review the updated PR again. A review is risk-based, not a claim of formal standards compliance.

## Workflow

1. **Resolve the PR.** Use the exact URL or number supplied by the user. Confirm the repository and PR identity before inspecting changes. If the PR cannot be uniquely identified, report the blocker; do not guess or review the current branch as a substitute.
2. **Establish review context and a safe workspace.** Read applicable `AGENTS.md` and project instructions. Inspect the PR description, linked issue or specification, relevant architecture decisions, and base/head commits when available. Treat the PR's stated purpose and referenced requirements as the scope; surface conflicts instead of inventing requirements. Inspect the working tree and preserve user changes. Check out the PR head branch or use an isolated worktree; never overwrite, stash, discard, reset, or commit unrelated changes. If the PR cannot be safely checked out or isolated, report the blocker.
3. **Understand the change.** Inspect the complete PR diff and enough surrounding code, call sites, and tests to understand the affected behavior. Identify changed components and their SDLC stage: requirements/design, implementation, verification, deployment/operations. Follow security and privacy concerns across all stages.
4. **Check traceability and design.** For changes tied to a specification or issue, compare behavior with the relevant requirements and acceptance criteria. Check module ownership, API/data contracts, compatibility, migrations, and documented architecture decisions when affected. Report missing traceability or design gaps only when they create a concrete risk or prevent verification.
5. **Analyze correctness and risk.** Look for demonstrable defects, regressions, unsafe assumptions, broken error paths, data-integrity problems, authorization gaps, privacy leaks, accessibility failures, and operational or migration risks. Check boundary conditions and failure behavior relevant to the changed code. Prefer root causes over style preferences.
6. **Run initial checks and triage failures.** Inspect CI results and run focused tests for the changed behavior. When a test fails, compare the PR logic with the base and the intended behavior in the specification. If the behavior intentionally changed, update the test to assert the new contract while preserving meaningful coverage. If the relevant logic was not changed and the test still represents intended behavior, fix the implementation so the test passes; do not weaken or delete a valid test to hide a defect. Fix regressions introduced by the PR. Keep repairs within the PR's affected functionality; report unrelated pre-existing or environment failures that cannot safely be addressed in this scope.
7. **Repair findings.** Validate every finding against the diff and nearby behavior. Include only actionable issues introduced or exposed by this PR, with precise changed-code locations, triggering conditions, and impact. Fix confirmed defects at their root cause and add or update focused tests. Do not make speculative, stylistic, or unrelated changes. If no actionable defect exists, do not create a no-op commit.
8. **Commit and update the PR.** After each coherent repair batch passes focused tests, stage only the review fixes and their tests, create a focused commit on the PR head branch, and push it to update the same PR. Never force-push. Do not approve or merge the PR.
9. **Run full tests after the commit.** Run all applicable project test suites and checks after pushing each repair commit, using documented commands and reporting exact outcomes. For this repository, run the complete backend and frontend test suites when present. If a suite fails, diagnose it using step 6, repair confirmed in-scope defects, commit and push the repair, then rerun all suites. Do not claim success if a suite was skipped, unavailable, or failing.
10. **Repeat review until clean.** Reinspect the complete updated PR diff and test results after each repair commit. If the review finds another actionable defect or tests fail, return to step 7 and repeat. Finish only when a fresh review finds no actionable defects and all applicable tests pass, or when a concrete blocker prevents safe progress. Do not use a fixed iteration cap to stop while a repairable in-scope defect remains.
11. **Report the outcome.** Summarize findings fixed, commit(s), updated PR link, tests and checks with outcomes, and any remaining blocker or residual risk. If the review is clean without changes, say no commit was necessary. Never say the PR is clean when actionable findings remain or required tests did not pass.

## SDLC Review Lens

Apply only the parts relevant to the PR, and tie concerns to observable evidence:

- **Requirements:** intended behavior, acceptance criteria, edge cases, and explicit non-goals.
- **Design:** module boundaries, contracts, data model, compatibility, and architecture decisions.
- **Implementation:** correctness, resilience, input validation, access control, and error handling.
- **Verification:** tests at appropriate boundaries, meaningful coverage of changed behavior, and reproducible CI evidence.
- **Security and privacy:** authentication and authorization, trust boundaries, sensitive data handling, logging, and dependency risks.
- **Release and operations:** migrations, configuration, rollback or failure behavior, observability, and deployment assumptions.

Do not demand a separate document or test for every stage when the change does not warrant one. Scale scrutiny to impact and risk; treat security as cross-cutting.

## Severity

- **Critical:** likely broad compromise, unrecoverable data loss, or a release-blocking failure with severe impact.
- **High:** a serious security, data-integrity, or core-workflow defect affecting a meaningful set of users.
- **Medium:** a concrete defect with bounded impact, a significant edge-case failure, or a material gap in required verification.
- **Low:** a minor but actionable defect with limited impact.

Use the repository's established severity labels if present. Severity describes impact, not confidence; omit an issue when evidence is insufficient.

## Boundaries

- Review and modify only the identified PR and the context needed to assess and repair it. Do not expand into a general repository audit.
- When this skill is invoked, fixing confirmed in-scope findings, committing those repairs, and pushing them to the PR branch are part of the requested workflow. Do not force-push, approve, merge, or deploy.
- Do not treat passing tests as proof of correctness or a green CI run as proof of security.
- Do not report a missing test alone as a defect unless the uncovered behavior creates a concrete risk or the project explicitly requires that verification.
- Never claim conformance to SDLC standards or legal/security frameworks based on this review. Identify the evidence examined and remaining limitations.
