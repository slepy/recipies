# ADR-0003: AI Provider Credentials

- **Status:** Accepted
- **Date:** 2026-10-14
- **Decision owners:** Project owner

## Context

The application needs user-owned OpenAI or OpenRouter credentials for future AI-assisted recipe import. Credentials must not reach the browser again after submission, and a failed provider check must not replace a working configuration.

## Decision

- Add an `integrations` Django app for provider configuration and connectivity checks, with a feature-owned React settings screen.
- Store at most one provider configuration per user. A successfully checked replacement deletes the previous credential and leaves the new provider inactive until the user explicitly activates it.
- Encrypt API credentials with Fernet using the dedicated `INTEGRATIONS_ENCRYPTION_KEY` environment secret. Do not fall back to plaintext or another application key when it is missing.
- Check credentials through each provider's models-list endpoint with a bounded timeout. Map authentication, rate-limit, and network failures to safe application messages.
- Keep recipe image recognition and its external data-retention decisions outside this configuration feature.

## Rationale

Fernet provides authenticated symmetric encryption using an established library. A dedicated environment secret separates database exposure from credential confidentiality, while the single-configuration rule matches the product decision and keeps replacement behavior clear.

## Consequences

- Local and deployed environments must set and securely back up `INTEGRATIONS_ENCRYPTION_KEY` before credentials can be saved.
- Losing or rotating the encryption key without re-encrypting existing credentials makes them unreadable.
- The settings API returns provider status only; it never returns the encrypted or plaintext credential.
- AI image recognition remains unavailable until its recipe draft contract, supported models, image limits, and privacy requirements are resolved.
