# Architecture and Compliance Guidance

## Architecture: Document Only What Helps a Decision

A feature specification is not automatically a full architecture document. Record enough to understand boundaries, consequences, and verification. Scale the detail to change size, uncertainty, and risk.

For a small feature, usually capture:

1. **Context:** users, neighboring components, external services, and trust boundaries.
2. **Building blocks:** the backend/frontend modules or services affected and their responsibilities.
3. **Runtime flow:** the important request/data flow, including error paths where they change behavior.
4. **Data:** ownership, persistence, relationships, validation, and migration/deletion impact.
5. **Interfaces:** API/UI contracts, compatibility, and dependency constraints.
6. **Decisions:** important choice, rationale, alternatives, and consequences. Link a separate ADR when the decision is cross-cutting or likely to be revisited.
7. **Quality attributes:** measurable security, privacy, reliability, accessibility, performance, and operability needs relevant to the feature.

Use an arc42-inspired selection of sections when it helps; do not mechanically copy all twelve arc42 sections into every feature spec. A simple flow can be text or Mermaid if it remains readable and the repository supports it. Keep diagrams tied to an identified question.

## Dependency Review

For every material dependency, identify:

- Kind: upstream decision/data/API, downstream consumer, external service, package/runtime, or organizational approval.
- Owner and source of truth.
- Version, contract, or compatibility constraint when applicable.
- Required-by milestone and readiness/blocking status.
- Failure, delay, outage, or removal impact; fallback if one exists.

Avoid speculative dependency lists. Include dependencies that constrain scope, schedule, interfaces, operation, or verification.

## Compliance Review

Treat this as a documented applicability and evidence exercise, not a generic promise that the feature is "compliant".

1. **Set scope:** feature, data, jurisdictions, users, deployment model, and lifecycle activities in scope. Unknown deployment or jurisdiction must remain an explicit unknown.
2. **Identify sources:** applicable laws/regulations, contracts, internal policies, and technical standards. Record exact title, version/date, and authoritative source. Do not invent an obligation from a generic checklist.
3. **Assess applicability:** mark Yes, No, or Unknown and record a concise rationale. N/A requires rationale; Unknown requires an owner and next step.
4. **Map obligations:** link applicable obligations to requirement IDs, design controls, and acceptance criteria.
5. **Name evidence:** specify the test, review, configuration, record, or artifact that would demonstrate the control. Assign an evidence owner and status.
6. **Record gaps:** include unresolved interpretation, missing evidence, compensating control, risk, and release/decision impact.
7. **Review with the right people:** route legal interpretation to qualified counsel and security/privacy questions to an appropriate reviewer. The specification is not legal advice or certification.
8. **Recheck changes:** revisit the review when data use, integrations, jurisdictions, deployment, or requirements change; verify sources are still current.

For a recipe and shopping-list app, do not assume that all data is non-personal. A local recipe can be non-personal, while accounts, identifiers, shared lists, telemetry, or dietary/allergy information may introduce privacy or security obligations depending on context and jurisdiction. Record what is actually collected and where it goes; seek qualified review for health-related or otherwise sensitive data.

## Status Vocabulary

Prefer explicit statuses such as:

- **Not assessed:** no applicability decision yet.
- **Applicable / open:** obligation identified, control or evidence incomplete.
- **Evidence ready:** evidence exists and is linked; this alone is not a legal compliance certification.
- **Gap:** control/evidence is missing or failed.
- **Not applicable:** rationale recorded and accepted by the appropriate reviewer.
