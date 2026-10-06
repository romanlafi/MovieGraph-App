# Database runtime: local API and development Hyperdrive verification

Infrastructure prepared on 2026-10-05. Real Neon/Hyperdrive connectivity is **not verified**. The normal Worker still exposes health and TMDB, without legacy `/api/v1` or database diagnostics. No application schema/data migration was performed.

## Driver and lifecycle

Worker database requests use synchronous SQLAlchemy with `postgresql+pg8000`. Cloudflare currently lists pg8000 among verified Python/Hyperdrive drivers, supports synchronous SQLAlchemy, requires compatibility date >=2026-09-08, and recommends serializing synchronous database operations with an asyncio lock. Our date is 2026-10-02. See [official Python Hyperdrive documentation](https://developers.cloudflare.com/hyperdrive/examples/python-workers/) and [SQLAlchemy's pg8000 dialect](https://docs.sqlalchemy.org/en/20/dialects/postgresql.html#pg8000).

pg8000 is a Python driver with an existing synchronous SQLAlchemy dialect; it avoids relying on legacy psycopg2 native binaries. Asyncpg would require the async ORM explicitly excluded from this phase. Psycopg is also supported by Cloudflare, but introduces an unnecessary replacement of the existing local driver at this point.

Root `pyproject.toml`/`pylock.toml` provide Worker SQLAlchemy/pg8000 dependencies. `back/requirements.txt` retains psycopg2-binary for the transitional local API and adds pg8000 for development parity/tests. Both drivers have a documented purpose; psycopg2 is not a Worker dependency. No unrelated legacy package upgrades were performed.

`app.db.database` exports declarative Base and lazy context managers, with no import-time engine, connection, config import or schema creation. Each database request creates an engine with NullPool and hidden SQL parameters. Engine creation itself does not connect. Every session closes in `finally`; exceptions trigger rollback; commits remain explicit. Session close rolls back unfinished work. The engine disposes when its scope exits, including session creation failures. There is no shared engine/session/request environment.

Local Uvicorn: `get_db(request)` reads `DATABASE_URL` at dependency invocation. Plain `postgresql://` retains the existing psycopg2 driver and supplied TLS options. Configure the existing local schema separately. Without DATABASE_URL, local legacy database routes return safe 503; health remains available. Legacy SECRET_KEY/TMDB_API_KEY requirements remain unchanged.

Worker: presence of ASGI scope `env` requires its **HYPERDRIVE** binding; it never falls back to DATABASE_URL. The runtime reads host/port/user/password/database and constructs a SQLAlchemy URL without string interpolation. A 10-second driver timeout is explicit. Worker-side Hyperdrive socket TLS is disabled as in Cloudflare's binding example; Hyperdrive must secure its origin connection to Neon. This does not disable TLS on direct local PostgreSQL connections.

The diagnostic harness serializes the complete synchronous engine/session/transaction/cleanup operation with an application-level asyncio lock. The lock stores no credentials or request environment. Do not mount existing synchronous legacy routes in Workers without addressing this runtime requirement and their remaining package dependencies.

## Isolated diagnostic harness

`wrangler.db-probe.jsonc` uses `back/app/db_probe_worker.py` and port 8789. It adds only:

- `GET /api/internal/db-health`: SELECT 1, safe `{ "database": "ok" }`.
- `POST /api/internal/db-probe`: controlled six-part verification on a dedicated probe table.

The normal `wrangler.jsonc`/`worker.py` never installs these routes, even if probe variables are supplied. The harness requires APP_ENV=development, DB_PROBE_ENABLED=true, DB_PROBE_DEVELOPMENT_DATABASE=true and a matching Bearer DB_PROBE_TOKEN. Otherwise it returns 404 or 401. DB failures return sanitized 503. Do not deploy this harness as production. Keep its token secret; use it only against a confirmed development branch.

Only `moviegraph_runtime_probe` is used, with text UUID primary key, value and created_at. HTTP routes never create it. Each invocation inserts a random row, rereads its committed value from a new session, updates and rereads it, deliberately rolls back a second insert and update, verifies absence/original committed value from a new session, deletes and verifies absence, then checks engine connection-close events. Cleanup deletes only the invocation's UUID rows. It never truncates, drops or alters application tables.

## Configuration gate: required before real verification

No real Hyperdrive ID or Neon development connection was present in the inspected configuration. The available legacy DATABASE_URL points at loopback; it was not used for diagnostic mutations. Prepare these locally, without pasting passwords into chat:

1. Create/select a **Neon development branch/test database**. Obtain its **direct/unpooled** PostgreSQL connection string, with TLS, and explicitly confirm it is not production. Cloudflare recommends the direct endpoint for [Neon with Hyperdrive](https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/postgres-database-providers/neon/).
2. In a trusted local/admin shell, set DB_PROBE_DATABASE_URL to that branch's URL (for this CLI use the local psycopg2 URL syntax, including `sslmode=require`). Set a randomly generated DB_PROBE_TOKEN in the shell and ignored root `.dev.vars`. No credentials belong in VITE_* or checked-in JSON. Worker does not need DB_PROBE_DATABASE_URL.
3. From `back`, using the configured local Python interpreter and installed requirements, explicitly create only the probe table:

   ```powershell
   python -m resources.runtime_probe setup --development-database
   ```

   The CLI requires DB_PROBE_DATABASE_URL and the explicit flag. It does not load `.env`, use DATABASE_URL implicitly, import legacy models or call Base.metadata.create_all. This setup command has **not** been executed against a database in this phase. For stronger isolation, use a dedicated test database/role allowed to operate only on the probe table.

4. Create a real development Hyperdrive configuration in Cloudflare. Disable query caching for verification so cached reads cannot obscure transaction evidence. A trusted shell example (not executed here):

   ```powershell
   npx wrangler hyperdrive create moviegraph-runtime-probe-dev --connection-string "$env:DB_PROBE_DATABASE_URL" --caching-disabled --sslmode require
   ```

   Alternatively configure it in the dashboard. Follow [official Wrangler commands](https://developers.cloudflare.com/hyperdrive/reference/wrangler-commands/). The returned **real** ID goes in `wrangler.db-probe.jsonc` by uncommenting/replacing its binding template. No fictitious active ID is committed.

   ```json
   "hyperdrive": [{ "binding": "HYPERDRIVE", "id": "<REAL_DEV_HYPERDRIVE_ID>" }]
   ```

5. From the repository root, run the development harness in remote mode with an authenticated Cloudflare account:

   ```powershell
   python -m pywrangler dev --config wrangler.db-probe.jsonc --remote
   ```

   Use the local URL Wrangler prints (normally port 8789). Ensure DB_PROBE_TOKEN is supplied to that development session. No production deployment is needed. **Remote mode has not been exercised in this phase.** Account access, real binding and origin connectivity remain prerequisites.

6. In a second trusted shell, set DB_PROBE_TOKEN to the same secret; from `back`:

   ```powershell
   python -m resources.runtime_probe verify --development-database --worker-url http://127.0.0.1:8789
   ```

   Success requires HTTP 200 with all six fields exactly PASS: select, insert, update, rollback, delete, session_cleanup. Record the request result and that Wrangler used the real remote Hyperdrive binding. Stop the diagnostic session when finished. Do not infer success from health/TMDB requests or mocked tests.

Cloudflare's [local development guide](https://developers.cloudflare.com/hyperdrive/configuration/local-development/) distinguishes `wrangler dev` with `localConnectionString` (direct DB access, bypassing deployed Hyperdrive pooling/cache) from `wrangler dev --remote` (real configured Hyperdrive). Optional local binding emulation can use the process variable `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE`; never commit it. A successful emulated binding request alone does **not** prove the production Hyperdrive path.

Once real development verification passes, the normal Worker's commented HYPERDRIVE template can be configured with the intended real binding. Adding a production binding does not itself mount the legacy API or run migrations.

## Current evidence

See [DATABASE_RUNTIME_REPORT.md](DATABASE_RUNTIME_REPORT.md) for exact commands and results. Automated tests cover binding mocks and real temporary SQLite transactions. Both Worker entrypoints start locally; normal health and real TMDB traffic return 200. Diagnostic access/missing-binding failures were tested in the actual local Worker. No PostgreSQL/Neon CRUD, deployed Hyperdrive traffic, production deployment, or application-table mutation is claimed.
