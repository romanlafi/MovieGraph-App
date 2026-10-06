# Database runtime phase report — 2026-10-05

## Subsequent update — 2026-10-06

Alembic revisions `20261006_00` and `20261006_01` were applied to the empty Neon `MovieGraph` development branch/database `moviegraph`. **Real Worker → Hyperdrive → Neon transactions and authenticated comments/likes now PASS.** The deployed temporary Worker verified SELECT, INSERT, UPDATE, rollback, DELETE, and session cleanup. TMDB 550 received a comment and like without catalogue tables. Baseline and final counts were users=0, comments=0, user_movie_likes=0, alembic_version=1; the fixture and Worker were removed. Production was not changed. Full identifiers, request results, and commands are recorded in [SOCIAL_TMDB_ID_MIGRATION.md](SOCIAL_TMDB_ID_MIGRATION.md).

Wrangler has an existing OAuth login in its actual Windows configuration directory; earlier missing-login claims were incorrect. Read-only Hyperdrive inspection confirmed `moviegraph-dev`, database `moviegraph`, caching disabled. JWT verification using python-jose is tested in workerd and Cloudflare; password/login runtime integration remains pending. The DEV candidate mounts a limited social API without importing the legacy model/auth graph. The base Preview remains gateway-only.

Python `pywrangler dev --remote` is unsupported, and Hyperdrive remote local bindings are unavailable. The repeatable **MovieGraph Verify Neon DEV** run configuration uses a uniquely named temporary DEV deployment with isolated keys and fixture cleanup. It needs no direct Neon URL. The original findings below describe the 2026-10-05 infrastructure phase and are superseded by this update where applicable.

Historical 2026-10-05 status: infrastructure only, before real development configuration and schema setup. The accepted audit/TMDB gateway remain preserved; the subsequent update above contains the real verification evidence.

## 1. Selected PostgreSQL driver

Worker: **pg8000 1.31.5**, synchronous SQLAlchemy `postgresql+pg8000`. Transitional local legacy API: retained psycopg2-binary with existing `postgresql://`/`postgresql+psycopg2://` DATABASE_URL.

## 2. Why selected

pg8000 is listed as verified in [Cloudflare's current Python Hyperdrive documentation](https://developers.cloudflare.com/hyperdrive/examples/python-workers/) and has an existing [synchronous SQLAlchemy dialect](https://docs.sqlalchemy.org/en/20/dialects/postgresql.html#pg8000). It avoids the legacy psycopg2 binary assumption. The official guide supports sync SQLAlchemy, with async SQLAlchemy unsupported; this phase deliberately preserves sync ORM. Library selection/packaging is not proof of an actual PostgreSQL connection.

## 3. Files created in this phase

- `back/app/db/runtime.py`
- `back/app/db/probe.py`
- `back/app/db/diagnostics.py`
- `back/app/db_probe_worker.py`
- `back/resources/runtime_probe.py`
- `back/tests/test_db_runtime.py`
- `wrangler.db-probe.jsonc`
- `docs/DATABASE_RUNTIME.md`
- `docs/DATABASE_RUNTIME_REPORT.md`

## 4. Files modified in this phase

- `back/app/db/database.py`: remove eager engine/sessionmaker, lazy scoped resources.
- `back/app/core/config.py`: remove eager DATABASE_URL requirement.
- `back/resources/create_tables.py`: adapt existing local-only helper to explicit lazy engine scope and main guard; not executed against a database.
- `back/requirements.txt`: add pg8000 and label retained local psycopg2.
- `back/tests/test_foundation.py`: preserve coverage, replace obsolete import-time DATABASE_URL expectation with new request-time tests.
- `pyproject.toml`, `pylock.toml`: Worker SQLAlchemy/pg8000 dependencies and generated lock.
- `wrangler.jsonc`: commented real binding template; no active fake ID or diagnostic route.
- `.dev.vars.example`: optional development diagnostic secret instructions.
- `README.md`, `docs/LOCAL_DEVELOPMENT.md`: current status and setup.

The workspace already had uncommitted foundation/TMDB/frontend changes before this phase. Those are preserved, not counted as new infrastructure edits. The normal Worker entrypoint, application factory, catalogue gateway and frontend source were not changed in this phase.

## 5. Local DATABASE_URL flow

Local Uvicorn → request `get_db` → lazy DATABASE_URL parsing → existing psycopg2 SQLAlchemy dialect → PostgreSQL. Supplied TLS parameters remain intact. A missing URL no longer prevents application import/health; database routes return safe 503. Existing routes/models/importer/auth behaviour are retained; no real database-backed local feature test was run.

## 6. Worker HYPERDRIVE flow

Development harness → ASGI request scope `env.HYPERDRIVE` → validated binding host/port/user/password/database → URL.create `postgresql+pg8000` → sync SQLAlchemy → binding socket → Hyperdrive → Neon. This last connection chain is **prepared, not verified**. Worker scope never falls back to DATABASE_URL. Driver timeout is 10 seconds. Origin credentials are never in frontend code or returned by diagnostics.

Normal Worker continues to expose `/api/health` and `/api/tmdb/*`; `/api/v1/*` and `/api/internal/*` remain absent. Only the separate development harness installs the protected diagnostic routes.

## 7. SQLAlchemy engine lifecycle

No global engine/sessionmaker and no connection on import or create_engine invocation. Engine created only when entering database scope, NullPool, hide_parameters=True, disposed in finally. No application-side persistent connection pool. No ORM schema creation or migrations during Worker startup/HTTP requests.

## 8. SQLAlchemy session lifecycle

Request/scoped Session, autoflush=False, explicit commits only. Exception → rollback → guaranteed close; success → close (unfinished transactions roll back). Outer scope disposes engine even if session creation fails. Diagnostic async routes serialize the whole sync transaction/cleanup flow with asyncio.Lock; no environment/credentials/session stored globally.

## 9–14. Verification results

| Required operation | Real temporary SQLite / SQLAlchemy | Real PostgreSQL via Worker/Hyperdrive/Neon |
| --- | --- | --- |
| 9. SELECT | PASS | NOT RUN |
| 10. INSERT | PASS, committed value reread | NOT RUN |
| 11. UPDATE | PASS, committed value reread | NOT RUN |
| 12. ROLLBACK | PASS, insert absent and update reverted across sessions | NOT RUN |
| 13. DELETE | PASS, absence reread | NOT RUN |
| 14. Session cleanup | PASS, close events match connections; unfinished work not persisted | NOT RUN |

SQLite files were temporary and isolated; existing probe-table rows were preserved. Lifecycle mocks also confirm rollback/close/dispose calls, including failure paths. These results do not prove PostgreSQL driver/socket behaviour.

## 15. Mocked tests

Hyperdrive binding dictionaries/attribute objects, Worker ASGI entrypoint shim, engine constructor options, error/lifecycle paths, HTTP diagnostic failures and configuration injection. All automated TMDB network traffic is mocked. The diagnostic POST SQLite test mocks runtime configuration only; the SQL transactions themselves are real. The actual pg8000 dialect engine is constructed in CPython with network connection explicitly forbidden.

## 16. Real tests

Temporary SQLite SELECT/INSERT/UPDATE/rollback/DELETE/connection-close checks, local password hashing/verification and fixed bcrypt hash compatibility, frontend lint/build, actual local Python Worker startup/health, actual Worker → TMDB requests, real Worker diagnostic authorization/missing-binding failure responses. No PostgreSQL/Neon traffic was run.

## 17. Real Worker → Hyperdrive → Neon result

**NOT VERIFIED.** No real binding ID or Neon development credential was available in inspected configuration. The existing legacy DATABASE_URL is loopback and was not used for mutation tests. Diagnostic authenticated requests return sanitized HTTP 503 because HYPERDRIVE is absent. No active placeholder ID was invented.

[Cloudflare's local development documentation](https://developers.cloudflare.com/hyperdrive/configuration/local-development/) explicitly distinguishes direct DB access via localConnectionString from remote development using deployed Hyperdrive. Thus neither local emulation nor mocks will be reported as real Hyperdrive success. Follow [DATABASE_RUNTIME.md](DATABASE_RUNTIME.md) through the configuration gate and remote verification procedure.

## 18. Exact validation commands executed

PowerShell, project interpreter `C:/Proyectos/MovieGraph-App/.venv/Scripts/python.exe` (Python 3.13.5). PyCharm's configured interpreter was queried before Python commands. Commands below are execution records, not credential-bearing production commands. Repeated reads (`Get-Content`, `rg`, `git status --short`) and official documentation browsing were inspection only.

From repository root:

```powershell
& 'C:/Proyectos/MovieGraph-App/.venv/Scripts/python.exe' -m pip install 'pg8000~=1.31.5'
& 'C:/Proyectos/MovieGraph-App/.venv/Scripts/python.exe' -m unittest discover -s back/tests -v
```

The first unittest invocation failed with two module import errors because it was launched from the root without back on PYTHONPATH; it was corrected to the documented working directory. From `back`, executed three times while fixing/expanding tests:

```powershell
& 'C:/Proyectos/MovieGraph-App/.venv/Scripts/python.exe' -m unittest discover -s tests -v
```

Initial proper-directory run: 33 tests, two errors from unsanitized invalid-URL parsing; fixed by mapping SQLAlchemy ArgumentError. Next: 33/33 OK. Final expanded suite: 35/35 OK.

From `front`:

```powershell
npm run lint
npm run build
```

Lint ran twice, same six warnings/zero errors. Build ran once, successful. From repository root, in two separate sessions:

```powershell
$env:PATH = 'C:/Proyectos/MovieGraph-App/.venv/Scripts;' + $env:PATH
& 'C:/Proyectos/MovieGraph-App/.venv/Scripts/python.exe' -m pywrangler dev --port 8790
```

```powershell
$env:PATH = 'C:/Proyectos/MovieGraph-App/.venv/Scripts;' + $env:PATH
& 'C:/Proyectos/MovieGraph-App/.venv/Scripts/python.exe' -m pywrangler dev --config wrangler.db-probe.jsonc --var DB_PROBE_TOKEN:local-test-placeholder
```

The token above is a disposable, non-secret local test placeholder; no real token was logged. Pywrangler resolved/generated the lock and installed Worker modules, using Wrangler 4.147.0. It retained FastAPI 0.115.14; new Worker dependencies resolved SQLAlchemy 2.0.54 and pg8000 1.31.5. Local legacy SQLAlchemy was not upgraded.

An initial HTTP loop using `Invoke-WebRequest -SkipHttpErrorCheck` did not make requests because that flag is unsupported by this Windows PowerShell version. It was replaced with these successful commands:

```powershell
curl.exe --silent --show-error --max-time 30 --write-out '\nHTTP %{http_code}\n' http://127.0.0.1:8790/api/health
curl.exe --silent --show-error --max-time 30 --write-out '\nHTTP %{http_code}\n' 'http://127.0.0.1:8790/api/tmdb/search/movie?q=alien&page=1'
curl.exe --silent --show-error --max-time 30 --write-out '\nHTTP %{http_code}\n' http://127.0.0.1:8790/api/tmdb/movie/348
curl.exe --silent --show-error --max-time 30 --write-out '\nHTTP %{http_code}\n' http://127.0.0.1:8790/api/v1/movies
curl.exe --silent --show-error --max-time 30 --write-out '\nHTTP %{http_code}\n' http://127.0.0.1:8790/api/internal/db-health
curl.exe --silent --show-error --max-time 30 --write-out '\nHTTP %{http_code}\n' http://127.0.0.1:8789/api/health
curl.exe --silent --show-error --max-time 30 --write-out '\nHTTP %{http_code}\n' http://127.0.0.1:8789/api/internal/db-health
curl.exe --silent --show-error --max-time 30 --write-out '\nHTTP %{http_code}\n' --header 'Authorization: Bearer local-test-placeholder' http://127.0.0.1:8789/api/internal/db-health
curl.exe --silent --show-error --max-time 30 --write-out '\nHTTP %{http_code}\n' --request POST --header 'Authorization: Bearer local-test-placeholder' http://127.0.0.1:8789/api/internal/db-probe
curl.exe --silent --show-error --max-time 30 --write-out '\nHTTP %{http_code}\n' 'http://127.0.0.1:8789/api/tmdb/search/movie?q=alien&page=1'
curl.exe --silent --show-error --max-time 30 --write-out '\nHTTP %{http_code}\n' http://127.0.0.1:8789/api/v1/movies
```

From `back`, intentional negative CLI tests:

```powershell
$env:DB_PROBE_TOKEN = 'local-test-placeholder'
& 'C:/Proyectos/MovieGraph-App/.venv/Scripts/python.exe' -m resources.runtime_probe verify --development-database --worker-url http://127.0.0.1:8789
```

Exit 1, expected: Worker DB verification failed (missing binding). No SQL executed.

```powershell
$env:DB_PROBE_DATABASE_URL = ''
& 'C:/Proyectos/MovieGraph-App/.venv/Scripts/python.exe' -m resources.runtime_probe setup --development-database
```

Exit 1, expected: Set DB_PROBE_DATABASE_URL for the Neon development branch. No connection/table creation executed. Environment assignments apply only to each tool process.

```powershell
git diff --check
```

Exit 0, no whitespace errors; Git warns about existing Windows LF/CRLF normalization. No Hyperdrive creation/deletion, remote Worker request or production deployment command was executed.

New files were also checked individually (Git no-index returns 1 for file differences; no whitespace errors were reported):

```powershell
$files = @('back/app/db/runtime.py','back/app/db/probe.py','back/app/db/diagnostics.py','back/app/db_probe_worker.py','back/resources/runtime_probe.py','back/tests/test_db_runtime.py','wrangler.db-probe.jsonc','docs/DATABASE_RUNTIME.md','docs/DATABASE_RUNTIME_REPORT.md')
foreach ($file in $files) { git diff --no-index --check -- NUL $file }
```

After verifying process identity, the two temporary test Worker trees were stopped using `taskkill.exe /PID 14344 /T /F` and `taskkill.exe /PID 22164 /T /F`. The user's pre-existing Worker on port 8787 (PID 10336) remained running. No files were deleted by process cleanup.

## 19. Complete check results

| Check | Result |
| --- | --- |
| Foundation | 7 PASS |
| TMDB gateway | 11 PASS, external network mocked |
| Password | 1 PASS: short password hash, correct/incorrect verification, existing hash |
| DB runtime | 16 PASS, mocks + real temporary SQLite |
| Final backend suite | **35 tests, 9.118 seconds, OK**, exit 0 |
| Frontend lint | exit 0, 0 errors, 6 existing warnings |
| Frontend build | exit 0, TypeScript/Vite success, 482 modules, Vite 1.93 seconds |
| Normal Worker health | real HTTP 200, status ok, port 8790 |
| Normal Worker TMDB search | real HTTP 200, five results, Alien TMDB 348 |
| Normal Worker TMDB movie/348 | real HTTP 200, TMDB identity 348 |
| Normal Worker legacy/internal paths | HTTP 404 |
| Diagnostic Worker health/TMDB search | real HTTP 200, port 8789 |
| Diagnostic Worker without token | HTTP 401 |
| Diagnostic Worker with token/no binding | health/probe HTTP 503, safe response |
| Diagnostic Worker legacy route | HTTP 404 |
| CLI refusal/missing binding | expected exit 1, no DB success claimed |
| git diff --check | PASS, exit 0 |
| Real PostgreSQL/Neon/Hyperdrive CRUD | **NOT RUN** |

Lint warnings: FollowContext.tsx lines 24/53, LikeContext.tsx lines 47/56, useMoviesByGenre.ts line 20, CollectionsPage.tsx line 53. Interpreter still prints its existing CPython `<prefix>` warning; checks succeed. No new frontend changes.

## 20. Remaining blockers

Remaining runtime verification: confirm in Cloudflare that the configured HYPERDRIVE ID targets Neon `MovieGraph` → `dev` → `moviegraph` and has caching disabled; prepare only the isolated `moviegraph_runtime_probe` table; authenticate Wrangler for remote development; and provide a temporary diagnostic token to that test session. These are the prerequisites before real SELECT/INSERT/UPDATE/rollback/DELETE/session cleanup can be recorded. Worker pg8000 sockets and PostgreSQL transaction semantics remain unverified. Legacy auth/password packages are still not proven in Workers, and `/api/v1` remains disabled there.

## 21. Recommended next phase

Complete the documented **real development Hyperdrive verification gate first**, recording all six results and the real Worker request path. Then assess a narrow MovieGraph state route and remaining Worker authentication/package support before mounting legacy routes. Comments/likes TMDB-ID migration remains a separate subsequent task, with explicit backfill/safety work. No catalogue table deletion or social-data migration belongs to this infrastructure phase.
