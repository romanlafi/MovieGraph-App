# TMDB gateway phase report — 2026-10-02

Current catalogue continuation (2026-10-06): frontend Home, details, genres,
lists, credits, featured collections and related catalogue views now use the
gateway. The historical report below describes the first three-route phase;
see [CATALOGUE_READ_MIGRATION.md](CATALOGUE_READ_MIGRATION.md) for current
contracts, deliberate feature replacements and real Worker/browser evidence.

The accepted `MIGRATION_AUDIT.md` is unchanged. Read AGENTS.md, CLOUDFLARE_MIGRATION.md, MIGRATION_AUDIT.md and LOCAL_DEVELOPMENT.md before implementation. This phase adds a real catalogue gateway to the existing Worker while preserving the legacy application. No schema change, SQL, data migration, catalogue deletion or deployment was performed.

## Files created

- `back/app/catalogue/__init__.py`: isolated package boundary.
- `back/app/catalogue/client.py`: authentication, request configuration, async transports, transformations and sanitized errors for three TMDB reads.
- `back/app/catalogue/schemas.py`: explicit catalogue-only response contracts.
- `back/app/catalogue/routes.py`: thin validated FastAPI routes.
- `back/tests/test_tmdb.py`: 11 deterministic gateway/import/transport tests.
- `back/tests/test_passwords.py`: bcrypt hash/verify/backward compatibility smoke test.
- `front/src/types/tmdb.ts`: search result type without a local ID.
- `front/src/services/tmdbService.ts`: search using the existing Axios client.
- `docs/TMDB_GATEWAY_REPORT.md`: this report.

## Existing files modified in this pass

- `back/app/application.py`: mounts catalogue routes in both factories; maps TMDB errors.
- `back/app/worker.py`: updates its boundary description; `include_legacy_api=False` remains.
- `back/app/services/tmdb_service.py`: labels the unchanged synchronous importer helpers as legacy.
- `back/requirements.txt`: pins local legacy bcrypt to 4.0.1.
- `front/src/components/search/SearchBar.tsx`: imports catalogue search and its precise type.
- `front/src/services/moviesService.ts`: removes the obsolete frontend search method; all other legacy calls remain.
- `.dev.vars.example`: documents request-scoped Worker TMDB secrets.
- `pyproject.toml`: describes the new Worker capability and local-only HTTPX; runtime dependencies remain FastAPI only.
- `README.md`, `docs/LOCAL_DEVELOPMENT.md`: describe current transitional behaviour/setup.

The workspace already contained the foundation changes/untracked docs/config before this pass. This list distinguishes this pass from those pre-existing changes. Models, social relations, recommendations, legacy route implementations and foundation tests were not edited. Runtime dependency lockfile did not need a dependency update.

## Routes and response contracts

| Route | Contract |
|---|---|
| GET `/api/tmdb/search/movie?q=alien&page=1` | Array of `{tmdb_id, title, rating, year, poster_url}`. Numeric positive TMDB ID; rating/year/poster nullable. `poster_url` remains a TMDB image path for existing image helper compatibility. |
| GET `/api/tmdb/movie/{tmdb_movie_id}` | `{tmdb_id, title, overview, release_date, runtime, vote_average, poster_path, backdrop_path, tagline}`. Runtime is nullable integer minutes; date is nullable string; other metadata nullable except title/identity. |
| GET `/api/tmdb/person/{tmdb_person_id}` | `{tmdb_id, name, biography, birthday, deathday, place_of_birth, profile_path, known_for_department}`. Metadata nullable except name/identity. |

No response has a local `id`, ORM entity, auth header, API key or read token. Pydantic allowlists output fields. These detail contracts are not substitutes for the legacy detail contracts yet.

Search trims input, requires 2–200 characters and page 1–500. Paths require positive integer IDs. Preserve autocomplete's poster/truthy-rating/non-null-overview filters and first five eligible results from the requested TMDB page. Keep 300ms debounce, two-character UI threshold, existing rendering and `/movie/{tmdb_id}` navigation. MovieDetail/PersonDetail still call legacy `/api/v1` endpoints and may import catalogue rows through those legacy paths; search itself never needs a local Movie row.

The existing Axios instance is reused. Search overrides its base URL by removing the terminal `/api/v1`, then requests the sibling `/api/tmdb/search/movie` with `q`/`page`. Absolute and relative legacy bases keep the same host/path prefix. No second HTTP client or browser TMDB credential was introduced. The complete local UI must use the Uvicorn host until legacy/social paths work in Workers.

## Request strategy and configuration

Verified official [TMDB search](https://developer.themoviedb.org/reference/search-movie), [movie details](https://developer.themoviedb.org/reference/movie-details), [person details](https://developer.themoviedb.org/reference/person-details), [application authentication](https://developer.themoviedb.org/docs/authentication-application), and [append-to-response](https://developer.themoviedb.org/docs/append-to-response) documentation before implementation. Append supports movie/person detail subrequests, but this phase has no credits consumer: each operation makes one request; no speculative credits/videos fetches were added.

Verified official [Cloudflare FastAPI](https://developers.cloudflare.com/workers/languages/python/packages/fastapi/), [package support](https://developers.cloudflare.com/workers/languages/python/packages/), and [native async fetch](https://developers.cloudflare.com/workers/runtime-apis/fetch/) docs, plus the installed Workers SDK source. Use native `workers.fetch` in Pyodide/emscripten, with a 10-second asyncio timeout and AbortController cancellation; HTTPX AsyncClient is used locally. HTTPX itself is not asserted to work in Workers and is not a Worker runtime dependency. A speculative HTTPX-specific Cloudflare doc URL was unavailable; it was not used as authority.

The new client owns gateway authentication. Prefer `TMDB_READ_ACCESS_TOKEN` Bearer auth, with `TMDB_API_KEY` fallback; optional `TMDB_BASE_URL` defaults to official v3. Read configuration lazily from ASGI request `env` in Workers, process environment locally. Never import legacy `core.config` or copy bindings to process-global state. Health/imports work without DATABASE_URL, SECRET_KEY or a TMDB credential. The legacy synchronous service keeps its original authentication/configuration until its callers migrate.

Error mapping is shared across routes: invalid input → 422; missing credential → 503; upstream 404 → 404; upstream 429 → 503; other non-200 HTTP statuses (including TMDB credential rejection) → 502; transport failure → 502; timeout → 504; invalid upstream payload → 502. Upstream bodies/exception strings/authenticated URLs are never returned. Redirects are rejected.

## Zero persistence evidence

`app/catalogue` has no database/session/model/auth/importer dependencies. All three routes execute successfully for unseen IDs in a fresh interpreter with no DATABASE_URL and an import hook that rejects SQLAlchemy, psycopg2, DB/model modules, auth packages, legacy config, legacy TMDB service and PostgreSQL services. These tests would fail if a call path reached `register_movie_from_data`, `get_or_fetch_*`, a local Movie/Person constructor, a session or engine. No PostgreSQL driver/session is available to the tested path, so neither reads nor writes can occur. This is structural/behavioural proof, not live database query-log evidence.

The actual `worker.py` entrypoint is separately loaded in a credential-free interpreter with a mocked ASGI adapter and TMDB transport. Health/detail succeed, legacy returns 404, and DB/models/SQLAlchemy/auth modules are absent from sys.modules. Local Wrangler starts using root FastAPI-only runtime dependencies. Wrangler bundles legacy Python source files beside the entrypoint, but the Worker does not import or execute those modules; bundling is not importing.

Tests cover response transformations/filters, positive IDs, whitespace/empty/missing/oversized queries, page bounds, search/detail upstream failures and missing resources, malformed responses, token auth, secret exclusion, local async HTTP transport, native fetch signal/abort/timeout/transport errors, and import isolation. Mocked Workers SDK tests do not prove a successful real Worker outbound request.

## bcrypt/Passlib resolution

Local legacy requirements retain Passlib 1.7.4 and pin bcrypt 4.0.1. [bcrypt's official changelog](https://github.com/pyca/bcrypt) documents bcrypt 5 raising ValueError for inputs longer than 72 bytes. Inspection of installed Passlib's bcrypt handler shows its backend wraparound self-test supplies a long input, causing even short-password hashing to fail on initial backend loading. bcrypt 4.0.1 supports the existing Passlib probes and version lookup.

No hashing algorithm, hash format, cost configuration, password API or existing hashes were changed. Both `get_password_hash` and `hash_password` generate bcrypt `$2b$` hashes and pass correct/incorrect-password verification. A fixed `$2a$`/`abc` test vector from Passlib's bundled bcrypt tests also verifies, independently of newly generated hashes. An initially incorrect fixture/password pairing failed; corrected fixture passes. No actual user hashes were accessed or rewritten.

This is a compatibility pin for the legacy CPython environment, not a claim of Worker-native bcrypt support. bcrypt is a native extension and auth is intentionally absent from Worker dependencies/imports. Worker authentication package compatibility remains a blocker for mounting legacy routes. Preserve existing bcrypt hashes when investigating that later; do not silently switch algorithms.

## Exact validation commands and results

PowerShell executable chosen using PyCharm `get_python_environment` before each Python invocation: Python 3.13.5, root `.venv`, pip. Commands below are the executed validation/runtime commands (read-only inspection commands omitted).

Repository root:

```powershell
& 'C:/Proyectos/MovieGraph-App/.venv/Scripts/python.exe' -m pip install bcrypt==4.0.1
$env:PATH='C:/Proyectos/MovieGraph-App/.venv/Scripts;' + $env:PATH; & 'C:/Proyectos/MovieGraph-App/.venv/Scripts/python.exe' -m pywrangler dev
git diff --check
```

pip exit 0: bcrypt 5.0.0 replaced with 4.0.1. Wrangler 4.147.0 reaches Ready at 127.0.0.1:8787 without secrets or DB bindings. `git diff --check` exit 0; only Windows line-ending notices. CPython still prints the baseline platform-library-prefix warning.

`back`:

```powershell
& 'C:/Proyectos/MovieGraph-App/.venv/Scripts/python.exe' -m unittest discover -s tests -v
```

Executed three times: initial 18 tests, one failure due to incorrect fixed password fixture; corrected 18/18 pass (5.839s); after actual Worker entrypoint test, **19/19 pass (6.162s), exit 0**. Breakdown: unchanged foundation 7, TMDB 11, passwords 1. Password smoke includes both helpers, correct verification, incorrect rejection and fixed existing-hash verification. These runs do not perform real login/registration or database operations.

`front`:

```powershell
npm run lint
npm run build
```

Both exit 0. Lint: **0 errors, 6 unchanged baseline warnings** (FollowContext 2, LikeContext 2, useMoviesByGenre 1, CollectionsPage 1). Build: TypeScript + Vite 6.3.2; **482 modules**; JS 388.30 kB / gzip 125.58 kB; CSS 32.31 kB / gzip 6.46 kB. No frontend dependency changes.

Actual local Worker probes, repository root:

```powershell
$paths=@('/api/health','/api/tmdb/search/movie?q=alien','/api/tmdb/movie/348','/api/tmdb/person/578','/api/v1/users/me'); foreach ($path in $paths) { try { $r=Invoke-WebRequest -Uri ('http://127.0.0.1:8787'+$path) -UseBasicParsing -TimeoutSec 15; Write-Output ($path+' HTTP '+[int]$r.StatusCode+' '+$r.Content) } catch { $r=$_.Exception.Response; Write-Output ($path+' HTTP '+[int]$r.StatusCode+' '+$_.ErrorDetails.Message) } }
```

| Request | Actual result |
|---|---|
| `/api/health` | HTTP 200 `{"status":"ok"}` |
| `/api/tmdb/search/movie?q=alien` | HTTP 503 `{"detail":"TMDB credential is not configured"}` |
| `/api/tmdb/movie/348` | HTTP 503, same clear missing-credential body |
| `/api/tmdb/person/578` | HTTP 503, same clear missing-credential body |
| `/api/v1/users/me` | HTTP 404 `{"detail":"Not Found"}` |

No TMDB credential was present in checked process environment or root `.dev.vars`/`back/.env` files. **Live TMDB Worker integration was not verified.** These missing-credential requests do not exercise real outbound TMDB traffic. No database, Neon, Hyperdrive, Cloudflare production deployment or Static Assets integration was tested or claimed.

## Blockers and recommended next phase

Supply a backend-only development TMDB credential and verify actual Wrangler search/movie/person requests and timeout/error behaviour. Then introduce reviewed additive TMDB ID migrations for comments/likes with real row-set/integrity checks and coordinated social callers, before switching detail screens or removing any importer/table. Separately validate Worker-compatible database/auth packages and Hyperdrive transactions. Preserve the audit's recommendation/home/collection/genre decisions for later phases. Existing npm advisories, six lint warnings and the Windows interpreter warning remain baseline issues.
