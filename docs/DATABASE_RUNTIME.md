# Database runtime: local API and development Hyperdrive verification

Real development Worker → Hyperdrive → Neon connectivity and transactions were **verified on 2026-10-06**, including authenticated comments and likes. The base Worker/Preview still exposes the gateway; the separate DEV social Worker mounts the limited API. Production was not changed.

## Update — 2026-10-06

The empty Neon `MovieGraph` development branch/database `moviegraph` has the social schema created by Alembic revisions `20261006_00` and `20261006_01`: `users`, `comments`, `user_movie_likes`, and `alembic_version`. These were direct admin migrations. Subsequently, an actual deployed DEV Worker verified SELECT, INSERT, UPDATE, rollback, DELETE, session cleanup, and the comment/like flow through Hyperdrive. Baseline and final counts were users=0, comments=0, user_movie_likes=0, alembic_version=1. No catalogue tables were present or created. No historical rows were imported.

The supplied Hyperdrive ID is wired only into DEV configurations; base `wrangler.jsonc` remains unbound. Read-only Wrangler inspection confirmed resource `moviegraph-dev`, Neon database `moviegraph`, and caching disabled. Cloudflare's current [Python Hyperdrive guide](https://developers.cloudflare.com/hyperdrive/examples/python-workers/) supports synchronous SQLAlchemy with `pg8000`, and requires serializing synchronous database work. Bindings come from `request.scope["env"]`, as shown in the [FastAPI Worker guide](https://developers.cloudflare.com/workers/languages/python/packages/fastapi/). `social_worker.py` exposes only comments/likes and verifies existing JWT signatures, expiry, and persisted user identity. Registration/login/password runtime migration remains a later phase.

The successful verification used a disposable account, TMDB ID 550, and a uniquely named temporary Cloudflare Worker. Both the fixture rows and temporary Worker were removed afterward. See [SOCIAL_TMDB_ID_MIGRATION.md](SOCIAL_TMDB_ID_MIGRATION.md) for request results, identifiers, commands, and limits of the evidence.

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

## Repeat real DEV verification

Select **MovieGraph Verify Neon DEV** in PyCharm and press Run, or from the project root:

```powershell
& '.\.venv\Scripts\python.exe' scripts/verify_neon_social.py
```

The script uses the existing Wrangler OAuth login and configured `moviegraph-dev` Hyperdrive. It checks target metadata and disabled caching, creates temporary random verification keys, deploys a uniquely named diagnostic Worker, provisions a UUID test user, verifies transactions and authenticated social operations, removes only the fixture rows, compares all table counts against baseline, and deletes that temporary Worker. No direct Neon URL, new binding ID, or manual token entry is required. It refuses an unexpected schema/revision before fixture writes. Neither schema creation nor migrations occur during requests.

The new isolated `wrangler.social-probe.jsonc` / `social_probe_worker.py` harness operates on only its own disposable account and relations. The original `db-probe` harness above remains available for a separately prepared probe table, but it was not used for the successful real verification and its table was not created.

Python Workers currently rejects `pywrangler dev --remote`. Hyperdrive is also listed as unsupported for [remote bindings](https://developers.cloudflare.com/workers/local-development/#remote-bindings). The general Hyperdrive local-development guide's remote-mode example therefore cannot be used with this Python toolchain. A deployed DEV Worker is required to test the actual Hyperdrive path. For local direct DB emulation only, the trusted process variable `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE` can supply a connection string; that path bypasses real Hyperdrive and is separate evidence. Never commit a connection string or Cloudflare's placeholder value.

## Current evidence

See [DATABASE_RUNTIME_REPORT.md](DATABASE_RUNTIME_REPORT.md) and [SOCIAL_TMDB_ID_MIGRATION.md](SOCIAL_TMDB_ID_MIGRATION.md). Automated tests cover binding mocks and real SQLite transactions; additional workerd HTTP checks verify JWT compatibility. The successful temporary Cloudflare deployment verifies real Neon transactions and authenticated comment/like operations through Hyperdrive. Production deployment and a complete frontend login flow remain pending.
