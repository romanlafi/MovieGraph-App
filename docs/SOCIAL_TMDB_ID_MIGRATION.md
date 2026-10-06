# Comments and likes TMDB identity migration — prerequisite gate

Status on 2026-10-05: **BLOCKED before real DB inspection/migration/cutover. Not complete.** Read all seven requested instruction/migration/runtime documents completely before creating these preparation files.

The database runtime report explicitly says real Worker → Hyperdrive → Neon is NOT VERIFIED. Its SQLite and mocked tests do not satisfy the prerequisite in this task. The same report records real Worker → TMDB search/movie HTTP 200, although the earlier TMDB_GATEWAY_REPORT remains a historical pre-credential report. No prior real Neon success is assumed.

Current inspection found no active HYPERDRIVE binding in either Wrangler config, no Neon/Hyperdrive/DB-probe process configuration, and only TMDB variables in root `.dev.vars`. The legacy URL in `back/.env` points at loopback, not Neon. No URL, password, hostname, username or private comment content is reproduced here. No PostgreSQL connection, DDL, DML, backfill, Alembic stamp or production deployment was attempted.

## Preparation files created

- `back/resources/social_inventory.py`: trusted development-only read-only inventory CLI. Uses SQLAlchemy inspection against the actual schema, not ORM declarations. No legacy models/services/auth imports or schema creation.
- `back/tests/test_social_inventory.py`: six tests for inspection, mappings, both like sources, provenance, collisions, orphan IDs, set comparison and secret/content exclusion. Fixtures are not a real migration.
- This document.

No application models, routes, services, frontend source, existing reports, dependencies or Worker entrypoints were changed in this task. Pre-existing uncommitted foundation/TMDB/runtime changes are preserved.

## Read-only inspection prepared

In a trusted shell, supply `SOCIAL_MIGRATION_DATABASE_URL` for the confirmed Neon **development** branch, using the direct PostgreSQL/psycopg2 URL with `sslmode=require` or certificate verification. Keep the credential in local ignored configuration; do not paste it into chat or commit it. The CLI deliberately does not fall back to the legacy DATABASE_URL or load an env file implicitly. From `back`, using the configured Python interpreter:

```powershell
python -m resources.social_inventory --development-database
```

The default schema is public; `--schema` selects the real application schema if different. CLI refuses missing config, non-Neon hosts and missing TLS before connecting. The explicit development flag is the operator's confirmation, not an automatic proof of Neon branch identity. Confirm the branch in Neon first.

Inspection runs inside a PostgreSQL REPEATABLE READ, READ ONLY transaction, with a 10-second statement timeout. [PostgreSQL documents the transaction modes](https://www.postgresql.org/docs/current/sql-set-transaction.html); [SQLAlchemy's Inspector](https://docs.sqlalchemy.org/en/20/core/reflection.html) obtains deployed schema metadata. The CLI prints only schema metadata, counts, social identifier mappings and issue identifiers. It does not select users' emails/passwords/usernames or comments' text/timestamps. It never writes to database tables.

Output includes:

- Actual public tables, column types/nullability, primary keys, foreign keys, indexes, unique/check constraints and row counts.
- Whether likes exists; absent is reported as absent with unknown/not-applicable count, not assumed empty.
- Comments mapped through local movie_id → movies.id → movies.tmdb_id, invalid/null TMDB IDs, orphaned users/movies and existing TMDB-field mismatches. Issue rows contain identifiers/reasons only.
- Both actual legacy like sources, raw/valid/unmapped counts, overlap, duplicate user/TMDB pairs and a source ledger retaining likes.id where present. No timestamps are invented.
- Distinct expected pairs and, if a canonical user_movie_likes table already exists, expected-minus-target and target-minus-expected, duplicate target rows and invalid target pairs.
- Schema blockers instead of inventing mappings when required tables/columns are absent.

This is a **pre-cutover legacy inventory**, not a migration executor or proof of historical payload preservation. A later integrity stage must compare full comment ID/user/text/created_at tuples privately against the trusted branch/snapshot. Legitimate post-cutover comments with no legacy movie_id need distinct treatment then; this initial inventory intentionally flags legacy mapping gaps.

## 1. Real baseline counts

| Entity | Real Neon baseline |
| --- | --- |
| users | NOT INSPECTED |
| comments | NOT INSPECTED |
| user_likes | NOT INSPECTED |
| likes | Presence/count UNKNOWN |
| movies/persons/movie_persons/collections/genres/movie_genres | NOT INSPECTED |
| user_genres/user_follows | NOT INSPECTED |

No fixture count is substituted for real baseline evidence.

## 2. Separate likes table

The ORM declares Like → likes, while active routes use User.likes → user_likes. The local table-creation helper imports Like, so an unused route model does not prove the deployed table absent/empty. Real existence/count/data remain UNKNOWN pending the read-only inventory.

## 3. Comments strategy — proposed, not applied

After real schema inspection and safe branch/snapshot confirmation: add nullable comments.tmdb_movie_id and index; retain movie_id/FK; backfill only via movies.tmdb_id; block on every impossible legacy mapping. Preserve comment IDs/users/text/timestamps with both-way tuple comparisons. Before new comments can omit a legacy Movie row, the **existing NOT NULL movie_id constraint must be relaxed** while retaining the column/FK. Merely adding a nullable TMDB column does not satisfy the objective. Exact revision/constraint handling must follow real schema inspection. New-field NOT NULL/positive constraints follow verified backfill and application rollout, not precede them.

## 4. Likes strategy — not selected before inspecting both sources

Candidate canonical representation: user_movie_likes(user_id, tmdb_movie_id), unique pair, no catalogue FK or invented historical timestamp. Alternatively an additive active-table transition may be safer depending on deployed constraints. Preserve both source structures and a provenance ledger. Classify every invalid source row and stop for an explicit resolution; never delete rows to make checks pass. Consolidate valid overlap into a single relationship only with provenance preserving each original source. Verify pair-set equality in both directions, not counts alone.

## 5. Alembic/configuration changes

None applied. No generated initial schema recreation. After the actual schema is known, establish a reviewed baseline/stamp representing that existing schema, followed by explicit additive revisions. Alembic stamping records a revision without running migration bodies; it must not falsely certify an uninspected schema. See [Alembic stamp documentation](https://alembic.sqlalchemy.org/en/latest/api/commands.html#alembic.command.stamp). Do not use create_all, autogenerate a wholesale replacement, or migrate from Worker HTTP requests.

## 6. Revision IDs

None created, stamped or executed. Real schema is a required input before assigning reviewed baseline/additive revision IDs.

## 7–9. Mapping/collision results

| Measure | Real Neon result |
| --- | --- |
| Comments original/mapped/unmapped | UNKNOWN / UNKNOWN / UNKNOWN |
| user_likes raw/mapped/unmapped | UNKNOWN / UNKNOWN / UNKNOWN |
| likes raw/mapped/unmapped | UNKNOWN / UNKNOWN / UNKNOWN |
| Cross-source overlap / duplicate collisions | UNKNOWN |
| Collisions resolved | NONE; no migration executed |
| Expected EXCEPT target / target EXCEPT expected | NOT EXECUTED |

Hard cutover requirements remain zero impossible mappings, preserved payload/identity and verified expected/target relationship sets.

## 10. Comment API contract

Existing API unchanged: POST /api/v1/comments/ with local movie_id; GET same path with local movie_id query. Proposed new contract after gates: GET/POST /api/v1/movies/{tmdb_movie_id}/comments, positive integer TMDB ID, authenticated creation, public listing, existing username/response/order semantics. No Movie lookup or TMDB validation fetch for creation/listing. No claim that this contract is implemented yet.

## 11. Like API contract/listing

Existing POST/DELETE /api/v1/movies/like?movie_id=... and GET /api/v1/movies/likes remain unchanged. Proposed contract: TMDB-based like/unlike/state and authenticated list of explicit tmdb_movie_id relationships. Return IDs (option A) because the frontend LikeContext consumes state and membership, with no discovered caller rendering its Movie[] as a liked-catalogue list. No unnecessary TMDB N+1 enrichment. Confirm the real data/rollout contract before implementing this change.

## 12. Frontend boundaries inspected; none migrated yet

- services/commentService.ts: local movieId and movie_id payload/query.
- services/moviesService.ts: local like/unlike params and Movie[] likes.
- contexts/LikeContext.tsx: membership compares ambiguous local string IDs.
- components/common/LikeButton.tsx and components/movie/MovieCard.tsx: local Movie.id.
- hooks/movie/useMovieDetail.ts: comments/submission wait for the legacy Movie.id.
- pages/detail/MovieDetail.tsx: route id already means TMDB ID.

Future touched social boundaries must use numeric tmdbMovieId parsed from route/explicit movie.tmdb_id, while cast/related/collections retain their existing local compatibility paths. Social calls must be independent of catalogue success and must not require local Movie.id.

## 13–15. Non-cached movie and zero catalogue-write proofs

NOT RUN for the new application behaviour because no contract/model/data cutover has been made. Existing comments and likes still require legacy catalogue state. Inventory fixtures prove mapping/classification only, not commenting/liking without a Movie row. New behaviour must eventually be tested through authenticated application requests and checked against movies/persons/genres/collections/movie_persons counts/rows.

## 16. Automated results

Complete suite: **41 tests, 8.455 seconds, OK, exit 0**. Foundation 7, TMDB 11, password 1, DB runtime 16, new read-only social inventory 6. New tests include real SQLite reflection/read-only statements and identifier fixtures; none are a Neon migration or new comment/like API test. Missing local/non-Neon config refuses before connection, and equal-count/wrong-pair fixtures are caught by both-way set checks. Prior auth/password/TMDB/runtime coverage remains intact.

## 17. Real Neon tests

NONE. No development snapshot confirmed, real baseline read, migration/backfill/integrity SQL or test-account comment/like operation executed. No real Hyperdrive success inferred.

## 18. Frontend validation

Lint exit 0, zero errors and six existing warnings (FollowContext 2, LikeContext 2, useMoviesByGenre 1, CollectionsPage 1). Build exit 0, TypeScript/Vite success, 482 modules, Vite 2.07 seconds. No frontend source changes.

## 19. Exact validation commands executed

Interpreter queried with PyCharm get_python_environment before each Python invocation; configured Python 3.13.5 at root .venv. From `back`:

```powershell
& 'C:/Proyectos/MovieGraph-App/.venv/Scripts/python.exe' -m unittest discover -s tests -v
& 'C:/Proyectos/MovieGraph-App/.venv/Scripts/python.exe' -m resources.social_inventory --development-database
```

Suite passed. CLI exited 1 with the safe message requiring SOCIAL_MIGRATION_DATABASE_URL; no DB connection attempted. From `front`:

```powershell
npm run lint
npm run build
```

Both exit 0. From root:

```powershell
git diff --check
```

No whitespace errors. Read-only preparation also used Get-Content for all seven required documents/affected source, rg for social/recommendation coupling, git status --short, credential **name-only** inspection and hostname-classification booleans. Official SQLAlchemy/PostgreSQL/Alembic docs were consulted. No credential value was printed. No pip install, migration command, SQL DDL/DML, Worker deployment or PostgreSQL request was executed.

## 20. Blockers / exact next input

Configure the confirmed Neon development connection locally and provide only its configuration location and development-branch confirmation. Provide/configure the real Hyperdrive binding and complete the existing runtime probe through real Hyperdrive, because this task expressly conditions acceptance on real runtime verification. Then perform the read-only baseline inspection and confirm a safe branch/snapshot before selecting/reviewing Alembic migrations. Password/JWT package compatibility in Workers remains unverified; do not mount authenticated routes or bypass auth to force completion.

## 21. Rollback strategy

No application/data cutover happened, so this preparation needs no database rollback. Future rollout must retain legacy columns/source tables/provenance and take a development branch/snapshot. Once new TMDB-only comments/likes exist, blindly reverting to legacy code is **not** a complete rollback: those rows have no local Movie identity. Preserve those writes and document a compatible application rollback/roll-forward strategy. Do not manufacture catalogue rows or delete new social data to satisfy old NOT NULL constraints.

## 22. Recommended next phase and compatibility finding

Resume the real prerequisite verification and schema/data inventory, then implement this same requested comments/likes phase. Recommendations currently read User.likes and join Movie.liked_by through user_likes. Changing the canonical like relation without a deliberately scoped compatibility read would leave recommendation inputs stale after like/unlike. Preserve algorithm behaviour; decide the minimum compatibility adapter after inventory rather than silently redesigning recommendations or discarding either like source. Keep all legacy catalogue tables/importers and full Worker legacy API disabled until their separate dependencies are resolved.
