# Feature Specification: <name>

> Status: Draft | In review | Approved | Implemented | Superseded  
> Owner: <person or role>  
> Created: <YYYY-MM-DD>  
> Updated: <YYYY-MM-DD>  
> Related issue/decision: <link or ID, if any>

## Implementation Status

> Checked: <YYYY-MM-DD>, code at commit `<short SHA>` (<branch>). If neither the code nor this specification changed since then, this section is enough.

| Area | Status | Details |
|---|---|---|
| <FR-ID short name> | ✅ Done / 🟡 Partial / ❌ Not started | <where it lives, what is missing> |

**Known issues:** <defects or gaps found in the implemented parts, or "none">

**Next step:** <the next phase or requirement to implement>

## 1. Summary

<Describe the proposed change in a few sentences.>

## 2. Problem and Context

- **Problem:** <What is difficult, missing, or costly today?>
- **Evidence/context:** <User feedback, observed behavior, or source; distinguish facts from assumptions.>
- **Desired outcome:** <What should improve, for whom, and how will we know?>

## 3. Users and Use Cases

| User/actor | Need or scenario | Expected outcome |
|---|---|---|
| <actor> | <scenario> | <outcome> |

## 4. Scope

### In scope

- <Included behavior>

### Out of scope

- <Explicitly excluded behavior>

## 5. Requirements and Acceptance Criteria

Use stable IDs so implementation, tests, and review can refer to the same requirement.

### Functional requirements

- **FR-001:** <The system shall ...>
  - **AC-001:** Given <context>, when <action>, then <observable result>.
  - **AC-002:** <Additional boundary or error case, if needed.>

### Quality requirements

| ID | Quality attribute | Scenario and measurable target | Verification |
| --- | --- | --- | --- |
| QR-001 | <e.g. reliability, accessibility, performance, security> | <condition + stimulus + expected response + target> | <test, inspection, or measurement> |

## 6. Data and Information

- **Data created/read/updated/deleted:** <entities and fields relevant to this feature>
- **Source of truth and ownership:** <component or user>
- **Sensitivity and personal data:** <known categories, or "not yet assessed">
- **Validation and consistency:** <rules, uniqueness, units, relationships>
- **Retention, deletion, migration, and backup:** <requirements or not applicable with rationale>

## 7. Dependencies and Interfaces

| Dependency | Type | Owner/source | Constraint or version | Needed by | Status | Impact if unavailable |
|---|---|---|---|---|---|---|
| <name> | Upstream / downstream / external / package / decision | <owner> | <version, contract, or constraint> | <date or milestone> | Ready / Open / Blocked / Optional | <fallback or consequence> |

- **API/UI contracts:** <routes, request/response shapes, events, validation and error behavior, or link to contract>
- **Compatibility:** <existing clients/data and backward-compatibility needs>

## 8. Architecture and Design

- **Affected components:** <components and responsibilities>
- **Context and boundaries:** <users, systems, trust boundaries, and interfaces>
- **Key flow:** <brief ordered data/control flow>
- **Data model changes:** <entities, relationships, ownership, persistence>
- **Decisions:** <decision, reason, alternatives considered; link ADR if one exists>
- **Deployment/operations impact:** <only if this feature changes it>

Keep diagrams lightweight. Add a context or sequence diagram only when it clarifies a boundary or non-obvious flow.

## 9. Security, Privacy, and Abuse Cases

- **Assets and trust boundaries:** <what needs protection and where trust changes>
- **Access control:** <who may do what, including ownership checks>
- **Threats or misuse cases:** <relevant abuse/error scenarios>
- **Secrets, logging, and data exposure:** <requirements>
- **Mitigations and verification:** <controls linked to requirement/acceptance IDs>

## Compliance Review

This is an applicability and evidence review, not a legal opinion or certification.

| Source/obligation and version | Applies? | Rationale and scope | Requirement IDs | Evidence/verification | Owner | Status/gap |
|---|---|---|---|---|---|---|
| <law, contract, policy, standard, or "not identified yet"> | Yes / No / Unknown | <why and to which data/process/component> | <IDs> | <test, artifact, review, or evidence needed> | <role> | Not started / In progress / Evidence ready / Gap / N/A |

- **Jurisdictions and deployment contexts considered:** <...>
- **Data protection or regulatory questions needing expert review:** <...>
- **Unresolved compliance risks and release impact:** <...>

## 11. Rollout and Operations

### Implementation Phases

Break delivery into ordered, independently verifiable phases. Keep each phase focused and state its dependencies and completion evidence.

| Phase | Scope and deliverable | Dependencies | Exit criteria and verification |
|---|---|---|---|
| 1. <name> | <focused work and deliverable> | <decisions, components, or prior phases> | <observable completion criteria and checks> |

- **Release/migration approach:** <...>
- **Monitoring and support signals:** <...>
- **Failure handling, rollback, and recovery:** <...>

## 12. Verification and Traceability

| Requirement/AC ID | Verification method | Test or evidence location | Status |
|---|---|---|---|
| <ID> | Automated test / manual test / analysis / review | <path, test name, or planned> | Planned / Passing / Gap |

## 13. Risks, Assumptions, and Open Questions

### Risks

| Risk | Likelihood/impact | Mitigation or decision needed | Owner |
|---|---|---|---|
| <...> | <...> | <...> | <...> |

### Assumptions

- <Assumption and how it can be confirmed>

### Open questions

- [ ] <Question, decision owner, and when it blocks progress>

## 14. Review and Approval

- **Product/domain review:** <name/role, status>
- **Technical review:** <name/role, status>
- **Security/privacy/compliance review:** <name/role or N/A with rationale>
- **Decision and date:** <...>
