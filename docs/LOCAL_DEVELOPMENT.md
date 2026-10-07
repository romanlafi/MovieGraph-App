# Local development and Worker foundation

The local FastAPI/PostgreSQL API remains intact. The default Preview Worker exposes health/TMDB. The separate DEV Worker now supports comments/likes by TMDB ID, verified against Neon through Hyperdrive; registration/login and the full frontend flow are still pending. The fresh DEV social schema exists at Alembic head `20261006_01`. The [migration audit](MIGRATION_AUDIT.md) remains the historical baseline; see the [social migration report](SOCIAL_TMDB_ID_MIGRATION.md) for current evidence.

## Existing local API

### PyCharm: local Worker + isolated PostgreSQL (recommended)

Start Docker Desktop, run **MovieGraph Setup Local DB** once, then run
**MovieGraph Local**. Open <http://127.0.0.1:5173/>. Stop Preview first if it is
running on the same ports. The launcher manages local credentials; no Neon URL
is needed. Setup alone applies explicit Alembic migrations; normal Run does not.
See [environment separation and commands](ENVIRONMENTS.md).

This runs the migrated catalogue and authenticated comments/likes slice, not
the complete legacy API. Registration/login, follows and personalized
recommendations still need Worker migration. The Uvicorn instructions below
describe the older full-app compatibility workflow, not this local Worker.

### PyCharm: catalogue preview (no database)

Select **MovieGraph Preview** from the Run selector and
press Run. It starts the local Cloudflare Worker on port 8787 and Vite on port
5173. Open <http://127.0.0.1:5173/>. Wrangler reads the root `.dev.vars` for the
TMDB credential; no Neon URL or database setup is required. The Vite dev proxy
forwards `/api/tmdb` to the Worker, avoiding browser CORS configuration. This
single PyCharm run configuration checks dependencies/port conflicts, waits for
both servers, and stops their child processes when stopped from PyCharm.

This preview supports search, Home, movie/person details, cast/filmographies,
genres, top-rated/latest lists, featured collections and related catalogue views,
all directly through TMDB without a database. It does not mount auth, comments,
likes or follows; an unavailable social request no longer hides movie details.
Personalized MovieGraph recommendations still require their separate migration.
See [catalogue verification](CATALOGUE_READ_MIGRATION.md). Stop both processes
from PyCharm when finished. No new URL or secret is needed for this catalogue phase.

### PyCharm: verify real Neon DEV

Select **MovieGraph Verify Neon DEV** and press Run. It uses the existing Wrangler login and DEV Hyperdrive ID; it does not request or save a Neon URL. It deploys a uniquely named temporary diagnostic Worker, runs transaction and authenticated comment/like checks with a disposable account, compares baseline/final row counts, removes its fixture rows, and deletes the temporary Worker. This is an integration test, not the full frontend launcher. It does not change the normal Preview or production deployment. See [DATABASE_RUNTIME.md](DATABASE_RUNTIME.md) for the actual runtime flow.

### PyCharm run configurations

Shared configurations live in `.run/` and use the project's Python and Node.js
interpreters, without machine-specific executable paths. PyCharm supports
[shared and compound configurations](https://www.jetbrains.com/help/pycharm/run-debug-configuration.html).

Before the first run:

1. Install `back/requirements.txt` into the Python environment configured in PyCharm
   and run `npm ci` in `front` if dependencies are not installed yet.
2. Copy `back/.env.example` to `back/.env` and replace `SECRET_KEY`, `TMDB_API_KEY`
   and `DATABASE_URL` with your local values. Keep secrets out of `.run/`.
3. Ensure PostgreSQL is reachable at `DATABASE_URL` and has the existing legacy
   schema. The current Compose `db` service does not publish port 5432 to the host;
   starting that service alone does not make it accessible to local Uvicorn.

Select **MovieGraph Full App (local PostgreSQL required)** in PyCharm's Run selector to launch both processes:

| Configuration | Command / URL |
| --- | --- |
| MovieGraph Backend Dev | `python -m uvicorn app.main:app --env-file .env --reload --host 127.0.0.1 --port 8000` from `back`; http://localhost:8000/docs |
| MovieGraph Frontend Dev | `npm run dev -- --host localhost --port 5173 --strictPort` from `front`; http://localhost:5173 |
| MovieGraph Full App (local PostgreSQL required) | Runs the legacy backend and frontend together |

Both processes reload on edits. The frontend configuration sets the public
`VITE_API_PROD_URL=http://localhost:8000/api/v1`, so a frontend `.env` is optional
when using this configuration. Port 5173 is fixed to match the local CORS origins;
Vite fails clearly if the port is occupied. Backend variables are explicitly
loaded from the ignored `back/.env`. No schema creation or migration runs at startup.
The compound configuration starts both processes without waiting for backend
readiness; refresh the browser after the API has started if needed.

These configurations run the complete transitional local application. The
catalogue-only Worker remains a separate workflow documented below.

Use the Python interpreter configured for `back` (Python 3.13 was used for this pass). In `back`:

```powershell
python -m pip install -r requirements.txt
Copy-Item .env.example .env
# Edit .env: real backend secrets and local PostgreSQL connection string.
python -m uvicorn app.main:app --env-file .env --reload --port 8000
```

These are user-facing examples; use your environment's Python executable. `.env` is ignored and explicitly loaded by the local launcher. App imports no longer call `load_dotenv()`. In Docker Compose the `env_file` already supplies variables; set DATABASE_URL host to `db`. Compose remains a legacy local option. Its automatic create_all startup is not a migration workflow and must not be used against a production database.

Required local API variables: SECRET_KEY and TMDB_API_KEY; missing values fail at API construction with the variable name only. DATABASE_URL is resolved lazily when a database dependency runs; its absence returns safe 503 on database routes and does not prevent health or TMDB. JWT_ALGORITHM defaults HS256; ACCESS_TOKEN_EXPIRE_MINUTES defaults 30 and must be positive. Preserve existing real secrets/algorithm/expiry when upgrading an environment. APP_ENV defaults development. CORS defaults to localhost:5173, 127.0.0.1:5173 and localhost:3001; comma-separated CORS_ORIGINS overrides this. APP_ENV=production defaults to no CORS (same-origin); wildcards are rejected. Do not add browser VITE_* secrets.

PostgreSQL must already have the current legacy schema for feature testing. This pass does not create tables, seed data or migrate a database. Legacy requirements pin bcrypt 4.0.1 for Passlib 1.7.4 compatibility. Both hash helpers and password verification pass locally, including a fixed existing bcrypt hash. Native bcrypt/auth dependencies remain unverified in Workers; real database-backed registration/login has not been exercised.

In `front`:

```powershell
npm ci
Copy-Item .env.example .env
npm run dev
```

VITE_API_PROD_URL remains the public API base including `/api/v1` (example http://localhost:8000/api/v1). It is not a secret. Configure the actual port (Compose backend uses 8001). Search uses the same Axios client/host with sibling `/api/tmdb/search/movie`; other calls stay on `/api/v1`. Use the local Uvicorn host for the complete transitional UI. Worker port 8787 supports catalogue search but lacks the legacy API required by detail/social screens.

## Python Worker shell

Official [FastAPI guide](https://developers.cloudflare.com/workers/languages/python/packages/fastapi/) uses `workers.asgi.entrypoint` and pywrangler. Runtime dependencies are in root `pyproject.toml`; `back/requirements.txt` is the transitional **local legacy API** environment. Pywrangler rejects requirements.txt in its working directory, so run the Worker from the repository root. The shared application factory mounts `app/catalogue` without importing legacy config, DB, models, auth or importer services. Keep `include_legacy_api=False` until those packages and transactions are verified.

### First-time setup (Windows PowerShell)

From the repository root, install the Worker toolchain into the project Python
environment and the frontend dependencies once:

```powershell
& .\.venv\Scripts\python.exe -m pip install workers-py workers-runtime-sdk uv
cd front
npm.cmd ci
cd ..
```

The repository's `.dev.vars` is a local-only file and is ignored by Git. It is
safe to start Wrangler without a TMDB credential; `/api/health` works, while
catalogue requests return 503 until you add `TMDB_READ_ACCESS_TOKEN` or
`TMDB_API_KEY` to that file. Use a TMDB credential from your own account; never
put it in a `VITE_*` variable.

### Start the Worker

With Python >=3.13 and Node installed, from the repository root:

```powershell
$env:PATH = "$PWD\.venv\Scripts;$env:PATH"
& .\.venv\Scripts\python.exe -m pywrangler dev
```

On Windows, adding the project environment's Scripts folder to `PATH` lets
`pywrangler` find its installed `uv` executable. Invoking it through the
configured project interpreter avoids `uv run` failing to detect the
PyCharm-managed Python. Keep the working directory at the repository root.
Wrangler serves the Worker at `http://localhost:8787` by default.

Then, in a second PowerShell window:

```powershell
Invoke-RestMethod http://localhost:8787/api/health
```

Expected `{ "status": "ok" }`. Health is liveness only; it proves neither PostgreSQL connectivity nor TMDB/auth readiness. `/api/v1/*` is absent and returns 404. No deployment/static-assets integration is claimed. Health requires no credentials. For catalogue requests copy `.dev.vars.example` to ignored `.dev.vars` and set `TMDB_READ_ACCESS_TOKEN` or `TMDB_API_KEY`. Bindings are read from request scope `env`; local Uvicorn uses environment variables. Never copy credentials into the browser build. A missing TMDB credential returns HTTP 503 only on catalogue requests.

```powershell
Invoke-RestMethod 'http://localhost:8787/api/tmdb/search/movie?q=alien&page=1'
Invoke-RestMethod 'http://localhost:8787/api/tmdb/movie/348'
Invoke-RestMethod 'http://localhost:8787/api/tmdb/person/578'
```

The Worker uses native async [workers.fetch](https://developers.cloudflare.com/workers/runtime-apis/fetch/) with an abortable 10-second timeout. Local requests use HTTPX AsyncClient. HTTPX and auth packages remain local dependencies. SQLAlchemy/pg8000 are now Worker dependencies for the separate development DB harness; the normal TMDB path still does not import them. Search retains the legacy autocomplete filters/five-result limit; detail contracts are deliberately separate from legacy ORM contracts. See the TMDB phase report for response fields and error mapping.

On 2026-10-05, real local Worker requests with a development read token returned HTTP 200 for health, search `q=alien`, movie 348 (Alien) and person 578 (Ridley Scott). The first live run exposed that Workers rejects `redirect="error"`; the transport now uses `manual` and maps upstream redirect responses to 502 without following them. All 19 backend tests pass, including redirect regressions. No DB/Hyperdrive or production deployment was tested.

For the PyCharm `pywrangler` configuration, use module `pywrangler`, arguments `dev`, the project Python interpreter, and the repository root as working directory. Wrangler reads root `.dev.vars` itself; set `TMDB_READ_ACCESS_TOKEN` to the token only (without `Bearer `). Stop an existing Worker before starting another: otherwise Wrangler may choose 8788 instead of 8787. A TMDB 502 with `TMDB is unavailable` is a transport failure, whereas invalid TMDB credentials return `TMDB upstream request failed`. Logs record only transport exception types to avoid leaking credentials.

On the audited Windows environment, `uv run` could not query the PyCharm-created CPython interpreter in isolated mode (missing `encodings`). Running pywrangler directly through that configured interpreter worked, with its Scripts directory on PATH so pywrangler could find uv. For example, from the root, after installing tooling into that interpreter:

```powershell
python -m pip install workers-py workers-runtime-sdk uv
python -m pywrangler dev
```

The actual successful run used Python 3.13.5 for the CLI, while compatibility date 2026-10-02 selected Python 3.14 for the Worker toolchain. Pywrangler generated root `pylock.toml`, which is retained for the runtime dependency versions. `.venv-workers`, `python_modules`, `.wrangler`, and local virtual environments are generated/ignored. `back/app/worker.py` is the entrypoint so Wrangler scans application sources rather than the local venv or env files beside `back/requirements.txt`. The health endpoint was verified under Wrangler 4.147.0; full application readiness remains unverified.

The real development Hyperdrive ID is wired in DEV configurations; the base `wrangler.jsonc` remains unbound. Synchronous SQLAlchemy/pg8000 transactions and authenticated comments/likes have been verified in a temporary Cloudflare deployment against Neon. The default Preview remains gateway-only; `wrangler.dev.jsonc` selects the limited social candidate. Follow [DATABASE_RUNTIME.md](DATABASE_RUNTIME.md) for repeatable verification and the distinction between direct local emulation and deployed Hyperdrive. Python `dev --remote` is unsupported; the verification run handles a temporary deployment and cleanup automatically.

## Validation

From `back` with local requirements installed:

```powershell
python -m unittest discover -s tests -v
```

Checks use isolated placeholder config and mock TMDB/Hyperdrive traffic; they never connect to PostgreSQL/TMDB. Database tests also execute real transactions on temporary SQLite files, explicitly not Neon/Hyperdrive. Foundation coverage is retained, with the obsolete eager DATABASE_URL failure expectation replaced by request-time missing-config coverage. Additional tests cover transformed search/detail responses, validation, HTTP/transport/timeout errors, secret exclusion, Worker entrypoint imports, forbidden legacy imports, bcrypt compatibility, engine/session cleanup and rollback. Frontend checks remain `npm run lint` and `npm run build`. Current exact infrastructure results/commands are in [DATABASE_RUNTIME_REPORT.md](DATABASE_RUNTIME_REPORT.md); the accepted TMDB report and audit remain historical records.
