# Specification Checklist

Use this as a risk-based review. Not every item needs a long section; mark irrelevant items N/A with a short reason when their absence could be misread.

## Problem and Scope

- [ ] The user problem, target users, desired outcome, and supporting evidence are stated.
- [ ] Facts, assumptions, and unknowns are distinguishable.
- [ ] In-scope and out-of-scope behavior are explicit.
- [ ] User scenarios include important error, empty, and boundary states.

## Requirements and Verification

- [ ] Requirements are atomic, uniquely identified, and use unambiguous language.
- [ ] Acceptance criteria describe observable behavior, including validation and failure paths.
- [ ] Quality requirements have measurable targets or a stated plan to define them.
- [ ] Every in-scope requirement maps to a verification method; gaps are visible.
- [ ] Terminology is consistent and domain-specific terms are defined.

## Dependencies and Interfaces

- [ ] Upstream decisions, data, APIs, and downstream consumers are identified.
- [ ] External services and package/runtime constraints include owner/source and version where relevant.
- [ ] Blockers are distinguished from optional dependencies and have a fallback or impact.
- [ ] API, UI, data, and error contracts are compatible with existing consumers or migration is planned.

## Architecture and Data

- [ ] Affected components and responsibility boundaries are clear.
- [ ] Important data/control flows and trust boundaries are understandable.
- [ ] Data ownership, validation, relationships, sensitivity, retention, and deletion are considered.
- [ ] Architecture choices solve a stated requirement and do not add unnecessary infrastructure.
- [ ] Important trade-offs, constraints, and architecture decisions are recorded or linked.

## Security, Privacy, and Compliance

- [ ] Authentication, authorization, ownership, and abuse cases are considered where relevant.
- [ ] Secrets, logs, error messages, and sensitive data exposure are addressed.
- [ ] Potential personal or sensitive data is identified; unknowns are not silently treated as N/A.
- [ ] Compliance Review names sources/versions, scope, applicability rationale, requirement mapping, evidence, owner, and gaps.
- [ ] No compliance claim is made without current, reviewable evidence.
- [ ] Legal/regulatory interpretation is escalated to a qualified reviewer when needed.

## Delivery and Operations

- [ ] Implementation is divided into ordered, independently verifiable phases with scope, dependencies, and exit criteria.
- [ ] Rollout, migration, monitoring, failure handling, and rollback are covered when impacted.
- [ ] Acceptance and release conditions are clear.
- [ ] Risks have impact, mitigation, and an owner or explicit decision path.
- [ ] Open questions identify the decision needed and whether they block implementation.

## Ready for Implementation?

- [ ] A developer can start without guessing about core behavior or interfaces.
- [ ] A tester can determine success from the acceptance criteria.
- [ ] Product/domain and technical reviewers can see what decision they are being asked to make.
- [ ] Remaining ambiguity is explicitly accepted, bounded, or blocking.
