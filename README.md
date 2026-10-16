<h1 align="center">
  <img src="front/public/brand/wordmark-gold.png" alt="MovieGraph" width="480">
</h1>

<p>
  <a href="https://sonarcloud.io/summary/new_code?id=romanlafi_MovieGraph-App"><img src="https://sonarcloud.io/api/project_badges/measure?project=romanlafi_MovieGraph-App&metric=alert_status" alt="SonarCloud Quality Gate"></a>
  <a href="https://sonarcloud.io/summary/new_code?id=romanlafi_MovieGraph-App"><img src="https://sonarcloud.io/api/project_badges/measure?project=romanlafi_MovieGraph-App&metric=duplicated_lines_density" alt="SonarCloud Duplicated Lines"></a>
  <a href="https://sonarcloud.io/summary/new_code?id=romanlafi_MovieGraph-App"><img src="https://sonarcloud.io/api/project_badges/measure?project=romanlafi_MovieGraph-App&metric=sqale_rating" alt="SonarCloud Maintainability Rating"></a>
  <a href="https://sonarcloud.io/summary/new_code?id=romanlafi_MovieGraph-App"><img src="https://sonarcloud.io/api/project_badges/measure?project=romanlafi_MovieGraph-App&metric=security_rating" alt="SonarCloud Security Rating"></a>
</p>

React + TypeScript + Vite frontend, FastAPI on Cloudflare Python Workers, and
PostgreSQL through Hyperdrive. TMDB owns catalogue data; MovieGraph stores
accounts and social relationships by TMDB ID rather than copying the catalogue.

## Development

Start Docker Desktop, select **MovieGraph Local** in PyCharm, and press Play.
Open <http://127.0.0.1:5173/>. The run configuration prepares the local schema
with Alembic and starts the Worker and frontend. Keep the TMDB credential in
`.dev.vars`; local PostgreSQL/JWT keys are generated automatically. You do not
need a Neon URL.

- Local development: isolated PostgreSQL.
- `dev`: working preview → Hyperdrive PRE → shared Neon PRE.
- `staging`: Cloudflare Preview → Hyperdrive PRE → Neon PRE.
- `main`: production Worker → Hyperdrive PROD → production Neon (rollout still needs verification).

See the [local development guide](docs/LOCAL_DEVELOPMENT.md) and
[environments, configuration, and deployment guide](docs/ENVIRONMENTS.md).

GitHub Actions configuration, coverage reports, and SonarCloud setup are
documented in [CI and coverage](docs/SONARCLOUD.md).

Cloudflare Builds runs from the repository root (`/`) with
`npm run build:cloudflare`, which installs the tooling and builds React.
Production uses `npm run deploy:production`; preview branches use
`npm run deploy:preview`. The working branch is currently `dev`.
Pywrangler packages Python during deployment. `wrangler.jsonc` selects
Hyperdrive PROD for `deploy` and PRE for `preview`; see the environments guide
for the exact configuration.

## Current status

Local development includes registration/login, follows, comments, likes, and
the TMDB catalogue. We work on the `dev` branch. Its preview, deployed on
October 16, exposes the account/social routes, and uses Hyperdrive PRE. Neon PRE
is at schema `20261016_00`; bcrypt at cost 12 runs in PostgreSQL. Both dev and
staging passed real registration, invalid and repeated correct logins, social
flows, concurrent reads, and JWT preservation after redeploy. Test rows were
removed and the PRE baseline restored. See [Free-plan auth setup](docs/AUTH_FREE_PLAN.md).
Production is still on a September 24 version, and
`/api/health` returns HTML. See the
[environment and deployment status](docs/ENVIRONMENTS.md).

Legacy tables have not been removed. `docker-compose.yml` describes the old
stack, not the Cloudflare deployment.

## Refactoring notes

Frontend component organization and conventions are documented in
[`front/README.md`](front/README.md). Completed phases and their validation are
recorded in [`docs/FRONTEND_CLEANUP.md`](docs/FRONTEND_CLEANUP.md).

The social API in `back/app/social/` separates account routes (`accounts.py`),
follows (`follows.py`), and comments/likes (`movies.py`). `dependencies.py`
centralizes authentication and request-scoped sessions; `routes.py` installs
the enabled groups. `repositories/accounts.py`, `repositories/follows.py`, and
`repositories/movies.py` hold domain queries. Contracts are explicit, and the
API translates domain errors into HTTP responses. The catalogue is in
`back/app/catalogue/` and does not persist TMDB data.

Local development and Workers import the same `app` package using explicit
imports. Wrangler uses `back` as `base_dir` to preserve the `app` package.
`app/worker.py` is the deployed entry point, `app/local_worker.py` adds the
local PostgreSQL adapter, and `app/diagnostics_worker.py` groups protected
diagnostics. `app.main` serves the current API on CPython if needed. Legacy
routes and importers have been removed; their models remain only for inventory
and migration tests. Docker does not create the schema at startup.

- [Plan and architecture](docs/CLOUDFLARE_MIGRATION.md)
- [Backend inventory and cleanup](docs/BACKEND_CLEANUP.md)
- [TMDB catalogue](docs/CATALOGUE_READ_MIGRATION.md)
- [Social state by TMDB IDs](docs/SOCIAL_TMDB_ID_MIGRATION.md)
- [Hyperdrive/Neon runtime](docs/DATABASE_RUNTIME_REPORT.md)
- [Worker authentication](docs/WORKER_AUTH_MIGRATION.md)
- [Worker follows](docs/WORKER_FOLLOWS_MIGRATION.md)
- [Recommendations](docs/RECOMMENDATIONS_TMDB_MIGRATION.md)
