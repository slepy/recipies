# Miska

A private recipe and shopping-list app with a Django API and a React/TypeScript frontend.

## Run Locally

Requirements: Docker Desktop with Docker Compose.

```sh
cp .env.example .env
docker compose up --build
```

Open the frontend at <http://localhost:5173>. The API is available at <http://127.0.0.1:8010> and PostgreSQL data is kept in the `postgres_data` volume.

Before saving an AI provider key, generate a dedicated encryption key and put it in `.env` as `INTEGRATIONS_ENCRYPTION_KEY`:

```sh
docker compose run --rm --no-deps backend python -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())'
```

Keep this key private and back it up securely. Losing or replacing it makes previously saved provider keys unreadable.

For backend checks:

```sh
docker compose run --rm backend python manage.py test tests
```

For frontend checks:

```sh
docker compose run --rm frontend npm test
docker compose run --rm frontend npm run build
```

The default `.env.example` values are only for local development. Use unique secrets and HTTPS settings for any deployed environment.