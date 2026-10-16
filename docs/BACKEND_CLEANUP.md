# Backend cleanup on dev

## Ownership and consumers

The active frontend services call `/api/tmdb/*` for catalogue data and
`/api/v1/users/*`, `/api/v1/follows/*`, `/api/v1/movies/*` for application state.
The deployed and local Workers install these handlers from `app.social`.
No current frontend service calls the legacy catalogue or recommendation routes.

| Component | Consumers found before retirement | Action |
| --- | --- | --- |
| `social/store.py` | Social routes/dependencies, two legacy social service wrappers, Worker tests | Split into accounts, follows and movie repositories; update callers. |
| `api/v1`, `services/postgres`, `services/tmdb_service.py` | Compatibility `app.main`, legacy API tests and the obsolete population script | Retire runtime routes/importers; use the current social API for CPython and tests. |
| Legacy schemas, HTTP exception subclasses, Passlib helpers | Legacy routes/services and password tests | Remove with their consumers; retain current request/response contracts and direct bcrypt verification. |
| `models/*` | Alembic metadata and migration/backfill fixtures | Retain as historical migration schema; never import into the Worker request path. |
| `resources/create_tables.py`, `populate_via_api.py` | Old Docker startup and a hard-coded LAN population workflow | Remove automatic catalogue schema creation and the obsolete importer workflow. |
| Catalogue-only `worker.py`, limited `social_worker.py` | Historical reports and catalogue-only entrypoint tests | Use `worker.py` as the complete deployed entrypoint; keep catalogue-only factory tests. |
| `preview_worker.py` | Root Wrangler config and Worker package tests | Replace with the authoritative `worker.py`; preview bindings still come from Wrangler. |
| `local_worker.py` | Local Wrangler launcher | Retain for the local PostgreSQL SCRAM adapter. |
| DB/social probe entrypoints | Diagnostic Wrangler configurations and remote verification script | Consolidate into one protected diagnostic entrypoint. |

The retired local catalogue route paths are intentionally removed. Current
frontend routes and social response payloads remain unchanged, including the
temporary authenticated email-based follow/profile compatibility API.

## Schema safety

This cleanup does not run schema migrations or drop tables. The historical
Movie/Person/Genre/Collection models remain available for legacy database
inventory and the existing backfill tests. Removing those tables remains a
separate explicit migration after verifying foreign keys, mapped comments,
likes, preference preservation and the remote Alembic revision.

## Runtime boundaries

- `app/worker.py`: deployed API and assets, with bindings selected by Wrangler.
- `app/local_worker.py`: same API, local PostgreSQL compatibility only.
- `app/diagnostics_worker.py`: explicitly protected verification endpoints,
  absent from deployed/local application entrypoints.
- `app/main.py`: optional CPython ASGI development adapter for the current API.

Remote verification targets the `dev` preview. Its Hyperdrive currently points
to the shared PRE database. Test identities must be disposable, removed by
their exact fixture UUID, and baseline application row counts verified after
cleanup. Production is outside this cleanup.

## Validation and remote findings

Final local validation: 100 backend tests pass, frontend lint has zero errors
and two existing Fast Refresh warnings, and the frontend production build passes.
The Python Worker packaging dry-run also passes.

The original catalogue test examined the last upstream request, which is now a
credits enrichment request for the latest-movies list. It now checks the initial
catalogue source and separately verifies credits enrichment. The password test
no longer requires a legacy bcrypt package version; it verifies a fixed existing
`$2a$` hash and the current hash generation and input-length behavior.

Real Hyperdrive PRE verification confirmed revision `20261009_00`, SELECT,
INSERT, UPDATE, transaction rollback, session cleanup, comments and idempotent
likes without any catalogue tables. Baseline and final row counts matched:
users 2, comments 0, user_movie_likes 15, user_follows 1,
user_genre_preferences 3 and alembic_version 1. Disposable users and their
preferences/follows/comments/likes were removed; no schema migration was run.

The updated `dev` preview passed real registration, duplicate registration,
wrong-password rejection, login and profile/preference readback. The second
account login reproducibly failed with HTTP 503. A temporary Tail Worker
confirmed the exact outcome `exceededCpu`, rather than inferring it from the
broader GraphQL `exceededResources` status. It logged only outcome, method,
path and exception type, never request headers or bodies.
The temporary Tail Worker was detached from `dev`, verified to leave zero tail
destinations, and deleted. All temporary database-verification Workers were
also deleted after their fixture cleanup.

The final published cleanup is dev deployment 15,
`59812800-9838-45b1-ad5b-8e0c78133818`, using `worker.py`. Production and staging
were not published. The rejected CPU-budget deployment created no successful
replacement; the unsupported setting is absent from the working configuration.

The first remote attempt also exposed a Python/JavaScript binding issue in the
login limiters. Their options are now converted using `pyodide.ffi.to_js` with
`Object.fromEntries` in Workers; CPython tests use native dictionaries. A focused
test protects that conversion, and the subsequent remote login passed it.

GraphQL returned CPU measurements in microseconds, confirmed by the live schema
description. In the measured failing run, registration's CPU p99 reached
1,099.429 ms, login samples reached 342.449 ms, and the failed second login
reported 211.605 ms. These are observations, not a benchmark or a latency SLA.

Cloudflare rejected a preview-only `cpu_ms: 5000` deployment with error 100328:
CPU limits are unsupported on the Free plan. No subscription or billing changes
were made. The unsupported limit was removed from the active configuration.
The earlier conclusion that this requires Workers Paid was too restrictive.
Keep bcrypt cost 12 and the Free plan. The prepared PostgreSQL hashing backend
removes bcrypt computation from the Worker without rewriting existing hashes;
see [AUTH_FREE_PLAN.md](AUTH_FREE_PLAN.md) for migration and activation.
Full remote verification remains necessary before production.

The repeatable verification command is:

```powershell
.venv/Scripts/python.exe scripts/verify_neon_social.py --preview-url https://dev-moviegraph-app.romanoscense10.workers.dev
```

It uses a temporary protected diagnostic Worker for exact-UUID cleanup and
checks baseline counts afterward. It restricts application checks to `dev` and
writes a sanitized report to ignored `output/backend-dev-verification.json`.
Wall-clock timings in that report are not CPU timings.

References: [Python FFI](https://developers.cloudflare.com/workers/languages/python/ffi/),
[preview observability](https://developers.cloudflare.com/workers/previews/test-and-debug/),
[CPU limits](https://developers.cloudflare.com/workers/platform/limits/#cpu-time)
and [GraphQL Workers metrics](https://developers.cloudflare.com/analytics/graphql-api/tutorials/querying-workers-metrics/).
