# Miska

A private recipe and shopping-list app with a Django API and a React/TypeScript frontend.

## Run Locally

Requirements: Docker Desktop with Docker Compose.

```sh
cp .env.example .env
docker compose up --build
```

Open the frontend at <http://localhost:5173>. The API is available at <http://127.0.0.1:8010> and PostgreSQL data is kept in the `postgres_data` volume.

For backend checks:

```sh
docker compose run --rm backend python manage.py test accounts authentication
```

For frontend checks:

```sh
docker compose run --rm frontend npm test
docker compose run --rm frontend npm run build
```

The default `.env.example` values are only for local development. Use unique secrets and HTTPS settings for any deployed environment.