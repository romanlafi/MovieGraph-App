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
Neon PostgreSQL through Hyperdrive. TMDB provides catalogue data; MovieGraph
stores accounts, follows, comments and likes using TMDB IDs.

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

See the [environment and deployment guide](docs/ENVIRONMENTS.md) for current
commands and rollout status, [local development](docs/LOCAL_DEVELOPMENT.md) for
setup, and [CI and coverage](docs/SONARCLOUD.md) for checks.

## Current status

The `dev` and `staging` previews use Hyperdrive PRE. Neon PRE is at schema
`20261016_00`; PostgreSQL performs bcrypt at cost 12. Real auth and social flows
passed on both previews. The last staging verification passed 72 checks and
restored the PRE baseline. See [auth details](docs/AUTH_FREE_PLAN.md).

The production schema is at `20261016_00` with `pgcrypto`; it had no application
tables or rows before migration. Commit `798b7bd` is on `main` and the Worker is
deployed. Health, TMDB and unauthenticated auth checks passed; see
[the production migration report](docs/PRODUCTION_MIGRATION.md) for rollout details.

The repository cleanup and validation results, including the dependency audit
count, are in [the preproduction cleanup report](docs/PREPRODUCTION_CLEANUP.md).

The obsolete Docker/nginx deployment stack has been removed;
`compose.local.yaml` remains for isolated local PostgreSQL. Legacy catalogue
tables remain until production data has been inventoried and safely migrated.
Schema changes use explicit trusted migrations. See the
[documentation index](docs/README.md) for architecture, operations and phase reports.
