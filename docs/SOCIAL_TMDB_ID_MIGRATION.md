# Social TMDB ID migration

Status: **fresh development schema applied to Neon; real application comment/like flow remains unverified** (2026-10-06). The requested target is MovieGraph Neon `dev` / `moviegraph`. No production migration or historical data import is intended. No database credentials are recorded here.

Configuration boundary: root `.dev.vars` is for Wrangler runtime variables such as TMDB credentials; do not put a direct Neon URL there. The read-only audit and Alembic migration each take a direct development-branch URL from a trusted, temporary shell process variable (`SOCIAL_AUDIT_DATABASE_URL` or `ALEMBIC_DATABASE_URL`). This is separate from Worker runtime configuration and does not configure the application to reach Neon.

This phase migrates only comments and movie likes/favourites. It does not delete legacy catalogue tables, modify follows, or alter recommendation behaviour.

## Real database baseline

The read-only audit connected to database `moviegraph` on the confirmed Neon `dev` branch. The branch details show that `dev` is a child of `production`; the application audit was run only against `dev`. It returned no tables. Neon screenshots subsequently showed zero tables for `moviegraph` and `neondb` in both visible branches; these screenshots are supporting UI evidence, not separate programmatic audits of every database. The `Relieve` Neon project is unrelated and was not used.

| Baseline item | Development branch result |
|---|---|
| Before migration: `public` tables in audited `dev/moviegraph` | no tables present |
| After migration: tables visible in Neon | `alembic_version`, `comments`, `user_movie_likes`, `users` |
| `comments` after migration | present; screenshot shows 0 rows |
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

The current normal Worker explicitly calls `create_app(include_legacy_api=False)`. The legacy API still imports `python-jose` and the legacy config/auth stack; those packages have not been validated in the Worker runtime. Do not mount unauthenticated routes or bypass token checks. The social routes are intentionally local `/api/v1` routes for now; Worker `/api/v1` remains absent until auth and real Hyperdrive access are verified. Local route/test success does not mean Cloudflare social behavior is available.

## Rollback and next steps

Before applying: create/confirm a Neon development branch snapshot and record the audit output. Apply the additive revision only to that branch. Keep old tables and columns for rollback inspection. During code rollback, old application versions may not display new uncached social rows; pause writes and reconcile/export TMDB-keyed rows before changing application versions. Never delete new rows to restore an older binary. Since the migration refuses downgrade, restore a verified snapshot only if an actual database rollback is required.

Next: use the already configured DEV Hyperdrive binding to perform a real comment/like flow with a disposable test user and a TMDB ID absent from any local catalogue. The Worker still does not mount authenticated `/api/v1` routes because authentication/runtime has not been verified with the real binding; do not bypass auth to claim end-to-end Worker behavior. Local automated tests do not count as real application verification. Keep production untouched, and do not proceed to catalogue-table deletion in this phase.
