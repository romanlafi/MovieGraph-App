# Social TMDB ID migration

Status: **TMDB-ID comments/likes and the limited Worker API verified against real Neon DEV through Hyperdrive** (2026-10-06). The requested target is MovieGraph Neon `dev` / `moviegraph`. This is a fresh deployment: no historical source rows existed to import. Full application authentication/deployment and the remaining catalogue refactor are still pending. No database credentials are recorded here.

Configuration boundary: root `.dev.vars` is for Wrangler runtime variables such as TMDB credentials; do not put a direct Neon URL there. The read-only audit and Alembic migration each take a direct development-branch URL from a trusted, temporary shell process variable (`SOCIAL_AUDIT_DATABASE_URL` or `ALEMBIC_DATABASE_URL`). This is separate from Worker runtime configuration and does not configure the application to reach Neon.

This phase migrates only comments and movie likes/favourites. It does not delete legacy catalogue tables, modify follows, or alter recommendation behaviour.

## Real database baseline

The read-only audit connected to database `moviegraph` on the confirmed Neon `dev` branch. The branch details show that `dev` is a child of `production`; the application audit was run only against `dev`. It returned no tables. Neon screenshots subsequently showed zero tables for `moviegraph` and `neondb` in both visible branches; these screenshots are supporting UI evidence, not separate programmatic audits of every database. The `Relieve` Neon project is unrelated and was not used.

| Baseline item | Development branch result |
|---|---|
| Before migration: `public` tables in audited `dev/moviegraph` | no tables present |
| After migration: tables visible in Neon | `alembic_version`, `comments`, `user_movie_likes`, `users` |
| `comments` after migration | present; real Hyperdrive query confirms 0 baseline rows |
| Real DEV baseline / after fixture cleanup | `users=0`, `comments=0`, `user_movie_likes=0`, `alembic_version=1` |
| `user_likes`, `likes`, `movies` | absent on the fresh target; no legacy source rows to import |
| Legacy comment/like mapping and collisions | not applicable: no legacy sources existed on this target |

The audit's `row_count: 0` for a missing likes table means **the table is absent**, not that a source table was inspected and proven empty. The user explicitly chose a fresh development deployment rather than importing historical social rows. No historical data is claimed as preserved or imported. The utility outputs schema metadata and row counts, never comment text, credentials or connection strings.

From `back`, after confirming a Neon **development** branch and setting these variables only in a trusted local shell:

```powershell
$env:SOCIAL_AUDIT_DATABASE_URL = '<direct Neon development URL>'
$env:SOCIAL_AUDIT_TARGET = 'neon-development'
& '<configured Python executable>' -m resources.social_migration_audit --development-database
```

The URL must use the direct PostgreSQL endpoint and TLS. Do not use the production branch or paste the URL into chat. The utility rejects a missing development label, non-PostgreSQL URL, or non-Neon host; this is an operator guard, not a substitute for confirming the branch in Neon.

## Alembic and baseline strategy

Alembic is configured under `back/migrations/` and added to `back/requirements.txt`. `back/alembic.ini` does not contain a database URL. `migrations/env.py` requires `ALEMBIC_DATABASE_URL`, `ALEMBIC_TARGET=neon-development`, and the explicit `ALEMBIC_ALLOW_DATA_MIGRATION=1` opt-in. The Worker imports neither Alembic nor migration code; requests never create schema or run migrations.

`20261006_00` validates the existing legacy table/column shapes when tables exist, and allows the specifically audited empty development target without creating anything. `20261006_01` has two explicit paths: on an empty target it creates only `users`, `comments`, and `user_movie_likes`; on a populated legacy schema it adds/backfills the TMDB relations and retains the old structures. It does not recreate the catalogue schema, and does not use `Base.metadata.create_all()`. If an unexpected partial schema or `alembic_version` state exists, stop and reconcile it; never stamp over it.

To avoid putting Neon credentials in `.dev.vars` or saving them in a run configuration, use the shared PyCharm run configuration **MovieGraph Initialize Neon DEV**. In Neon, select project **MovieGraph** → branch **dev** → database **moviegraph**, click **Connect**, choose the direct/unpooled connection, and copy its URL. In PyCharm, select that run configuration and press **Run**. Type `DEV` in the Run console, then paste the URL when the hidden-input prompt appears:

```text
Neon target must be MovieGraph > dev > moviegraph. Type DEV to continue: DEV
Paste the direct Neon DEV URL (input hidden): [paste URL here]
```

The URL is entered only into the hidden prompt; it is not saved in PyCharm, `.dev.vars`, or the repository. The runner applied Alembic `upgrade head` and printed the current revision; the resulting tables are visible in the Neon `dev/moviegraph` screenshot. The applied head is `20261006_01` (baseline `20261006_00`). On the confirmed empty target it created the minimal users/comments/likes tables; unexpected partial schemas abort. The migration's `downgrade` intentionally refuses to run after TMDB-ID writes: use a verified Neon branch/snapshot restore procedure, not a lossy drop of the new social data.

## Migration behavior

### Comments

On the empty-target path, `20261006_01` creates the minimal existing user identity fields and TMDB-keyed comments with `tmdb_movie_id NOT NULL`; `movie_id` remains nullable compatibility storage but has no catalogue FK because no `movies` table is created. Likes are stored in `user_movie_likes(user_id, tmdb_movie_id)` with uniqueness and a positive-ID check. No catalogue tables or historical rows are created.

On the legacy path, `20261006_01` inspects `comments`, `movies`, and `users`; it adds nullable `comments.tmdb_movie_id`, backfills using `comments.movie_id -> movies.id -> movies.tmdb_id`, checks all rows map to positive IDs, creates an index and a positive-ID check, then makes `tmdb_movie_id` non-null. It retains the old `movie_id` column and its existing FK. `tmdb_movie_id` has no local Movie FK. Existing comment IDs, user IDs, text and timestamps are not updated. The migration asserts the comment row count is unchanged. Exact before/after payload `EXCEPT` checks are required only when migrating a populated legacy database.

Any unmapped comment aborts the transaction. The migration error includes only comment IDs and local movie IDs, never comment text. Do not repair or delete rows to make it pass; investigate and record an explicit user-data resolution first.

### Likes

On the empty-target path there are no legacy like-source tables and no provenance rows to import. On the legacy path the read-only inventory establishes whether `user_likes`, `likes`, both, or neither exist and counts their rows. The migration accepts either source alone or both, and stops if neither exists; it inspects each present table's actual required columns. Both present sources are read and mapped through `movies.tmdb_id`. Null/orphaned users, orphaned movies, or missing/nonpositive TMDB IDs abort migration.

`user_movie_likes(user_id, tmdb_movie_id)` is created with a composite primary key, `users.id` FK, positive-ID check, and TMDB-ID index. There is deliberately no movie FK and no invented timestamp. The `user_movie_like_sources` ledger keeps one row for every source row, including both origins when they overlap. Duplicate source rows mapping to the same user/TMDB pair create one target pair but remain separately attributable in the ledger. The migration checks set equality in both directions (`expected EXCEPT target` and `target EXCEPT expected`) before commit. Both old like structures remain intact.

### API and frontend

Comments use `GET /api/v1/movies/{tmdb_movie_id}/comments` and authenticated `POST /api/v1/movies/{tmdb_movie_id}/comments` with `{ "text": "..." }`. The ID must be positive. Existing public comment reads, auth on creation, response username, newest-first order, and creation behavior remain.

Likes use authenticated `POST /api/v1/movies/{tmdb_movie_id}/like`, `DELETE` on the same path, `GET` on the same path for `{ "tmdb_movie_id": number, "liked": boolean }`, and `GET /api/v1/movies/likes` returning a number array. Like is idempotent; unlike a missing like is idempotent. Likes do not fetch TMDB. List responses contain IDs only; the current frontend needs identity for the heart state, while catalogue cards already have TMDB metadata. No enrichment calls or catalogue persistence are introduced.

`MovieDetail` keeps local Movie IDs temporarily for legacy cast/related/collection requests. Its comments now use the route movie's TMDB ID. Movie cards and LikeButton also use the TMDB ID directly. This is an intentional transitional boundary: comments/likes go straight to MovieGraph state by TMDB ID; remaining catalogue features may still use the mirrored local Movie row.

## Integrity gates after migration

The read-only audit must be saved as the baseline. After the Alembic revision, re-run a complete report and verify:

- comments: original count/IDs/users/text/timestamps preserved; mapped count equals original; zero null, invalid or mismatched `tmdb_movie_id`; each new ID equals `movies.tmdb_id` for its old key.
- likes: raw counts for both source tables; valid/mapped counts; orphan users/movies and invalid TMDB IDs zero; collision count explained by source ledger; ledger count equals total valid raw rows.
- target pairs: `expected EXCEPT user_movie_likes` is empty and `user_movie_likes EXCEPT expected` is empty. Compare full sets, not just counts.
- schema: target composite primary key and positive check exist; comment and like TMDB indexes exist; no FK references a local Movie from either new `tmdb_movie_id`; old `movie_id` columns/FKs and all catalogue tables remain.
- real application behavior: an authenticated user can comment, read, like, read state/list, and unlike a positive TMDB ID with no `movies` row; no Movie, Person, Genre, Collection, or MoviePerson rows are created.

For complete comment payload preservation, before running Alembic in a separate admin session, keep a local snapshot query result (do not paste it into chat):

```sql
CREATE TEMP TABLE comments_before AS
SELECT c.id, c.user_id, c.movie_id, c.text, c.created_at, m.tmdb_id AS tmdb_movie_id
FROM comments c LEFT JOIN movies m ON m.id = c.movie_id;
```

After migration and before enabling application writes, run both directions in that same SQL session; each result must be empty:

```sql
SELECT id, user_id, movie_id, text, created_at, tmdb_movie_id FROM comments_before
EXCEPT
SELECT id, user_id, movie_id, text, created_at, tmdb_movie_id FROM comments;

SELECT id, user_id, movie_id, text, created_at, tmdb_movie_id FROM comments
EXCEPT
SELECT id, user_id, movie_id, text, created_at, tmdb_movie_id FROM comments_before;
```

For likes, while application writes remain paused, compare provenance and targets in both directions. The migration itself checks the complete distinct target set before commit. These SQL checks can be repeated independently:

```sql
WITH expected AS (
  SELECT legacy_user_id AS user_id, tmdb_movie_id FROM user_movie_like_sources
)
SELECT * FROM expected EXCEPT SELECT user_id, tmdb_movie_id FROM user_movie_likes;

WITH expected AS (
  SELECT legacy_user_id AS user_id, tmdb_movie_id FROM user_movie_like_sources
)
SELECT user_id, tmdb_movie_id FROM user_movie_likes EXCEPT SELECT * FROM expected;

SELECT legacy_source, count(*) FROM user_movie_like_sources GROUP BY legacy_source ORDER BY legacy_source;
```

Automated SQLite tests are fixtures, not Neon evidence. They do not populate the baseline table in this report and cannot prove existing production/development rows were preserved.

## Worker boundary

The gateway-only `worker.py` and existing Preview remain unchanged. `wrangler.dev.jsonc` now selects `social_worker.py`, which mounts only the six comment/like operations alongside health/TMDB. It does not mount users, follows, recommendations, or legacy catalogue endpoints. A permanent DEV deployment is not claimed by the temporary verification run.

Both runtimes share `app/social/store.py`, using SQLAlchemy Core queries against only the required users/comments/likes columns. These query declarations never create schema. The local service paths remain compatible; the Worker imports no legacy ORM model graph, legacy config, password hashing, or psycopg2. Comment listing joins username information in one query and preserves newest-first ordering.

The Worker uses the same `python-jose` JWT verifier as existing authentication. It reads SECRET_KEY/JWT_ALGORITHM from request bindings, validates signatures and expiry, requires the existing email subject, and resolves that email to a persisted user. A token cannot choose another user's ID. Missing/invalid/expired/wrong-algorithm tokens are rejected before database access. No password verification is bypassed: login/registration remain outside this slice. `python-jose` is now a Worker dependency and has been verified inside workerd and an actual Cloudflare deployment; passlib/bcrypt remain local pending a separate authentication runtime phase.

Async Worker handlers hold an asyncio lock across the complete synchronous database session and cleanup, as required by the [official Python Hyperdrive guidance](https://developers.cloudflare.com/hyperdrive/examples/python-workers/). Engines use the existing pg8000/NullPool request lifecycle. SQL failures return sanitized 503 responses and roll back.

`social_probe_worker.py` is a separate development-only harness. Its fixture administration requires development flags and a random diagnostic Bearer secret. It creates only a UUID-named test account with a locally generated bcrypt password hash and refuses a schema without the expected Alembic revision. Actual comment/like calls still require a separately signed JWT and persisted user lookup. Cleanup targets only that UUID account, matching both its reserved email and username, and its comments/likes. No application Worker installs these admin routes, and no HTTP request creates tables or runs migrations.

## Real runtime and application evidence — 2026-10-06

Wrangler `whoami` confirmed an existing OAuth login. Earlier statements that login configuration was missing were based on checking the wrong Windows config location. A read-only `hyperdrive get` confirmed ID `24054140a3aa418ba1bd24b015f3d04b`, resource name `moviegraph-dev`, database `moviegraph`, Neon origin, and caching disabled. The actual database returned the expected schema and Alembic head `20261006_01` before fixture writes.

Python Workers rejects `pywrangler dev --remote`; Hyperdrive also does not support [remote bindings during local development](https://developers.cloudflare.com/workers/local-development/#remote-bindings). Therefore `scripts/verify_neon_social.py` deployed a uniquely named temporary Cloudflare Worker with the existing DEV binding, ran the real flow, cleaned its fixture rows, and deleted the temporary Worker. It needs no direct Neon URL. Its ephemeral JWT/admin keys are generated locally, omitted from reports, and removed with the temporary configuration. Root temporary config files are ignored by Git and deleted after testing; keeping the temporary config at the project root ensures Wrangler includes `python_modules`.

Successful temporary Worker: `moviegraph-probe-dev-073de2e5d83c4f48822e840897f5313b`. Fixture UUID: `073de2e5-d83c-4f48-822e-840897f5313b`; fixture user ID `1`; comment ID `1`; movie TMDB ID `550`. These are disposable test identifiers, not real user data.

| Real verification | Result |
|---|---|
| SELECT / committed INSERT / committed UPDATE | PASS |
| Rolled-back INSERT and UPDATE | PASS, verified from a new session |
| DELETE / session and engine connection cleanup | PASS |
| Authenticated POST comment / public GET comments | HTTP 200; fixture username and comment ID matched |
| Like / duplicate like / state / list of TMDB IDs | HTTP 200; one relationship to TMDB 550 |
| Unlike / repeated unlike / state / empty list | HTTP 200; liked=false, list empty |
| Movie/Person/Genre/Collection/MoviePerson persistence | No catalogue tables before or after; none created |
| Final DEV counts | Identical to baseline: users=0, comments=0, user_movie_likes=0, alembic_version=1 |
| Temporary Worker removal | Confirmed successful |

PostgreSQL sequences advanced normally for the disposable rows; they were not reset. There were zero legacy comments or likes on this target: mapped/unmapped counts and duplicate collisions are zero because both source structures and the catalogue were absent, not because historical rows were repaired or discarded. No new migration revision was added during Worker integration.

The automated Worker tests use real JWT verification and actual SQLite transactions with mocked Hyperdrive configuration. They cover isolation between users, invalid tokens, positive TMDB IDs, ordering, failed-write rollback, lock release, no legacy imports, and fixture cleanup. Those fixtures are separate from the real Neon evidence above. A real local workerd run also returned 200 for health/TMDB, 401 for missing/forged/expired tokens, and 503 for a correctly verified legacy-minted JWT when no binding was configured; that 503 is only auth/runtime evidence, not database success.

Frontend boundaries already migrated in this phase: `services/commentService.ts`, `types/comment.ts`, `hooks/movie/useMovieDetail.ts`, `contexts/LikeContext.tsx`, `components/common/LikeButton.tsx`, `components/movie/MovieCard.tsx`, `services/moviesService.ts`, and `data/apiConstants.ts`. They continue to use TMDB IDs for social state while remaining detail catalogue features retain their temporary compatibility path.

Commands executed from the root unless noted:

```powershell
npx.cmd --yes wrangler whoami
npx.cmd --yes wrangler hyperdrive get 24054140a3aa418ba1bd24b015f3d04b
& '.\.venv\Scripts\python.exe' -m pywrangler dev --config wrangler.social-runtime-test.jsonc --ip 127.0.0.1 --port 8791
curl.exe --silent --show-error --max-time 30 --write-out '\nHTTP %{http_code}\n' http://127.0.0.1:8791/api/health
& '.\.venv\Scripts\python.exe' scripts/verify_neon_social.py
git diff --check
```

The local runtime test config was removed and its Worker stopped. An additional local Python HTTP runner minted JWTs with the unchanged `app.core.security.create_access_token` and checked forged, expired, missing-expiry, and valid tokens against workerd without printing tokens. The verification script initially attempted unsupported remote dev, then corrected temporary config placement and the Worker name length; those failed deployments did not write to Neon and their unique resources were cleaned up. The successful run uses `pywrangler deploy --config <temporary-root-config>` and `npx wrangler delete --config <same-config> --force` internally. The temporary key values are deliberately not part of command/report output.

From `back`, with the configured PyCharm interpreter:

```powershell
& '..\.venv\Scripts\python.exe' -m unittest discover -s tests -p 'test_social*.py' -v
& '..\.venv\Scripts\python.exe' -m unittest discover -s tests -p test_social_worker.py -v
& '..\.venv\Scripts\python.exe' -m unittest discover -s tests -v
```

Final complete backend suite: **56 tests passed in 11.832 seconds**, including foundation/auth/password, DB runtime, TMDB gateway, social integrity/migration fixtures, and the new Worker slice. From `front`: `npm.cmd run lint` (0 errors, 6 existing warnings) and `npm.cmd run build` (TypeScript/Vite success). `git diff --check` and new-file no-index whitespace checks passed; only existing Windows LF/CRLF notices were emitted.

## Rollback and next steps

Before applying: create/confirm a Neon development branch snapshot and record the audit output. Apply the additive revision only to that branch. Keep old tables and columns for rollback inspection. During code rollback, old application versions may not display new uncached social rows; pause writes and reconcile/export TMDB-keyed rows before changing application versions. Never delete new rows to restore an older binary. Since the migration refuses downgrade, restore a verified snapshot only if an actual database rollback is required.

Next: migrate the existing registration/login/account routes to the Worker while preserving password hashes, Bearer JWT behavior, and user preference behavior, then connect a permanent DEV frontend/API preview for interactive testing. The limited social API and real Hyperdrive transactions are now verified; the full user authentication flow and permanent deployment remain pending. Use the shared **MovieGraph Verify Neon DEV** run configuration to repeat the isolated verification without saving or re-entering a Neon URL. Catalogue table deletion is still outside this phase.
