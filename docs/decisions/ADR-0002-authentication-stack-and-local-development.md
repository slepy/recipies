# ADR-0002: Authentication Stack and Local Development

- **Status:** Accepted
- **Date:** 2026-10-14
- **Decision owners:** Project owner

## Context

The registration and login feature needs a JSON API, short-lived access JWTs, rotating refresh JWTs, a relational database, and a reproducible local environment. The repository had architectural guidance but no runnable backend, frontend, or container setup.

## Decision

- Use Django REST Framework for the JSON API and SimpleJWT for access/refresh JWT handling and refresh-token blacklisting.
- Keep `accounts` and `authentication` as separate Django apps. `accounts` owns user identity and persistence; `authentication` owns registration, login, and token sessions.
- Keep user model and manager separate. Put user persistence behind a repository contract; keep registration, credential authentication, token issuance, refresh rotation, and revocation in separate services with narrow provider ports and adapters.
- Use PostgreSQL as the application database. Keep SQLite available for quick isolated Django tests when PostgreSQL integration is not needed.
- Use Docker Compose to run PostgreSQL, Django, and the React/Vite frontend locally.
- Proxy `/api` through Vite so the browser uses one origin in development. Protect cookie-authenticated refresh/logout endpoints with CSRF validation and an explicit origin allowlist.
- Keep access tokens in React memory and refresh tokens in an `HttpOnly`, `SameSite=Lax` cookie; mark the cookie `Secure` outside development.

## Rationale

These choices use established Django and JWT libraries, make the PostgreSQL-backed setup reproducible, and avoid cross-origin cookie configuration during local development. Django's token blacklist app supplies persisted refresh-token revocation without storing raw refresh credentials in an application-owned table.

## Consequences

- The backend requires Python 3.10 or newer; the provided container uses Python 3.12.
- PostgreSQL-backed runs need Docker Compose or an equivalent PostgreSQL service.
- Refresh-token blacklist rows need periodic cleanup with Django's `flushexpiredtokens` management command before a public deployment.
- Production origin, HTTPS, secret, cookie, and retention configuration must be reviewed for the chosen deployment.