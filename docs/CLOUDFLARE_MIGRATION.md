# MovieGraph-App — Master refactor and Cloudflare migration plan

Status: architecture plan
Target date context: October 2026

## 1. Goal

Refactor the current MovieGraph application into a simpler architecture where:

- TMDB is the source of truth for public catalogue data.
- Neon PostgreSQL stores only MovieGraph-owned application state.
- FastAPI runs on Cloudflare Python Workers.
- Hyperdrive connects the Worker to Neon.
- React/Vite is served by Cloudflare.
- The current app behaviour is preserved wherever it still makes sense.
- The existing automatic TMDB-to-Postgres catalogue import is removed.

Target:

```text
                         TMDB
                          ^
                          |
Browser ---> Cloudflare Python Worker
              |           |
              |           +-- /api/tmdb/*
              |
              +-- /api/v1/*
                       |
                       v
                   Hyperdrive
                       |
                       v
                      Neon
```

The most important simplification is:

```text
OLD
Frontend
  -> backend
  -> local movies table
  -> if missing: TMDB
  -> save Movie + Person + Genre + Collection + Credits
  -> return local object
```

becomes:

```text
NEW CATALOGUE FLOW
Frontend
  -> Worker /api/tmdb/*
  -> TMDB
  -> return catalogue response

No Neon read.
No Neon write.
```

MovieGraph-owned state becomes:

```text
Frontend
  -> Worker /api/v1/*
  -> Neon
```

linked to catalogue entities using TMDB IDs.

---

# 2. Findings from the current repository

## Current backend

The backend is already reasonably separated into:

```text
app/
  api/v1/
  core/
  db/
  deps/
  models/
  schemas/
  services/
```

The API areas include:

- users
- follows
- movies
- people
- recommendations
- comments

This structure is useful and should be evolved rather than thrown away.

## Current catalogue persistence

`Movie` is currently a full local mirror of a TMDB movie.

It includes fields such as:

```text
tmdb_id
title
year
poster_url
released
runtime
box_office
website
plot
rating
trailer_url
tagline
backdrop_url
origin_country
collection_id
```

It also has ORM relationships to:

```text
genres
movie_persons
comments
liked_by
collection
```

`Person` is also a local TMDB mirror:

```text
tmdb_id
name
photo_url
biography
birthday
place_of_birth
```

Current `movie_service.py` confirms the existing import/cache behaviour:

1. search the local Movie table by title
2. search TMDB if local results are insufficient
3. check each TMDB result for an existing local row
4. fetch full details for missing rows
5. insert Movie
6. insert Collection
7. insert Genre records
8. insert Person records
9. insert actor/director MoviePerson rows
10. commit everything to Postgres

`get_or_fetch_movie_by_tmdb_id()` also implements:

```text
check local DB
-> if missing fetch TMDB
-> persist locally
-> return local schema
```

This is the primary behaviour to remove.

## Current MovieGraph data is coupled to the cache

Current `Comment`:

```text
movie_id -> movies.id
user_id  -> users.id
```

Current likes also reference:

```text
movie_id -> movies.id
```

`User.likes` is an ORM relationship to `Movie`.

Therefore the Movie table cannot simply be deleted.

The migration must first move MovieGraph-owned relations from local movie primary keys to `tmdb_movie_id`.

---

# 3. Final data ownership

## TMDB catalogue — do not mirror in Neon

Do not persist as authoritative local catalogue:

- Movie
- Person
- MoviePerson
- Collection
- movie ↔ genre catalogue graph
- TMDB movie metadata
- TMDB person metadata
- TMDB credits

Candidate legacy tables/models for eventual removal:

```text
movies
persons
movie_person*
collections
movie_genres*
```

Exact table names must be confirmed from the code/migrations.

## MovieGraph state — keep in Neon

Keep/refactor:

```text
users
user_follows
comments
likes/favourites
user profile
user preferences
MovieGraph recommendations
other social state
```

Use TMDB identifiers at the boundary.

---

# 4. Candidate final schema

This is a direction, not permission to blindly recreate the database.

## users

Keep normal internal integer/UUID identity.

```text
users
-----
id
email
username
password_hash
birthdate
bio
...
```

## user_follows

Keep internal User IDs.

```text
user_follows
------------
follower_id
followed_id
```

## comments

Target:

```text
comments
--------
id
user_id
tmdb_movie_id
text
created_at
```

Indexes:

```text
INDEX(tmdb_movie_id)
INDEX(user_id)
```

No FK from `tmdb_movie_id` because TMDB is external.

## user_movie_likes

Target:

```text
user_movie_likes
----------------
user_id
tmdb_movie_id
created_at
```

Constraint:

```text
UNIQUE(user_id, tmdb_movie_id)
```

No local Movie FK.

## user_movie_state

Only if current/future functionality warrants it:

```text
user_movie_state
----------------
user_id
tmdb_movie_id
status
user_rating
watched_at
updated_at
```

Do not create this just because it looks nice.

## recommendations

If recommendations are generated by MovieGraph:

```text
recommendations
---------------
id
user_id
tmdb_movie_id
score
algorithm/version/type
created_at
```

Do not require a local Movie row.

## genre preferences

Audit the existing Genre model.

If Genre exists partly for movie catalogue relationships and partly for user preferences, split those responsibilities.

A persisted MovieGraph preference might be:

```text
user_genre_preferences
----------------------
user_id
tmdb_genre_id
```

Optionally store a small display name snapshot only if useful, but the TMDB genre ID should be the stable external reference.

---

# 5. API target

## Catalogue namespace

Use a clear external-data boundary.

Recommended:

```text
/api/tmdb
```

Examples:

```text
GET /api/tmdb/search/movie?q=alien&page=1
GET /api/tmdb/search/person?q=ridley
GET /api/tmdb/movie/348
GET /api/tmdb/movie/348/credits
GET /api/tmdb/person/578
GET /api/tmdb/movie/popular
GET /api/tmdb/movie/top-rated
GET /api/tmdb/trending/movie/day
GET /api/tmdb/movie/348/recommendations
```

Only expose routes the frontend needs.

These routes:

- call TMDB
- validate/normalize input
- map upstream failures
- return data

They do not:

- query Movie merely to see whether it exists locally
- create Movie
- create Person
- create Collection
- create Genre catalogue relationships
- create MoviePerson

## MovieGraph namespace

Keep:

```text
/api/v1
```

Examples:

```text
/api/v1/users/*
/api/v1/follows/*
/api/v1/comments/*
/api/v1/movies/{tmdb_movie_id}/comments
/api/v1/movies/{tmdb_movie_id}/like
/api/v1/movies/{tmdb_movie_id}/me
/api/v1/recommendations/*
```

The word `movies` here means "MovieGraph state related to this TMDB movie", not a local Movie catalogue entity.

---

# 6. Frontend target

The frontend currently has a centralized Axios client, which is useful.

Split conceptual services cleanly, for example:

```text
services/
  api.ts
  tmdbService.ts
  authService.ts
  commentService.ts
  followService.ts
  recommendationService.ts
  userMovieService.ts
```

Do not require this exact file list if the current code suggests a cleaner arrangement.

## ID semantics

Audit every frontend use of:

```ts
id
movieId
personId
```

The old app may often mean local Postgres IDs.

Catalogue routes should use TMDB IDs.

Prefer explicit types/fields at API boundaries:

```ts
tmdbId
tmdbMovieId
tmdbPersonId
userId
commentId
```

For React routes prefer:

```text
/movie/:tmdbMovieId
/person/:tmdbPersonId
```

A movie detail page should never need a local Movie row before rendering.

---

# 7. TMDB integration

The current `tmdb_service.py` uses synchronous `httpx.get()` calls and manually makes multiple calls for a movie:

```text
movie
credits
videos
```

During refactor:

- centralize one TMDB client
- keep API credential backend-only
- establish a consistent timeout
- establish consistent error handling
- investigate TMDB append/combined capabilities where they reduce requests
- avoid repeated request setup
- do not write to the database

Do not build an elaborate generic SDK.

Return only data useful to MovieGraph.

---

# 8. Migration phases

## Phase 0 — baseline

Before schema changes:

- run frontend lint/build
- run current backend tests if any
- inventory every API route
- inventory every model/table
- inventory every local Movie ID crossing API boundaries
- inventory every frontend route/service that expects local movie/person IDs
- inventory current recommendation behaviour
- inventory current home-page behaviour such as random/top-rated/latest/collections
- record current known bugs separately

Important:

Functions currently based on the local cache, such as:

- random movies
- random collection with movies
- top rated from local DB
- latest from local DB
- related-by-local-people-and-genres

must be mapped to a new source before deleting catalogue tables.

Do not silently remove those UI features.

Deliverable:

```text
docs/MIGRATION_AUDIT.md
```

No behavioural changes yet.

---

## Phase 1 — configuration cleanup

Refactor configuration to separate:

### Server secrets

```text
SECRET_KEY
TMDB credential
Hyperdrive/DB runtime credential/binding
```

### Server config

```text
TMDB_BASE_URL
JWT_ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES
APP_ENV
```

Remove production dependence on `load_dotenv()`.

Do not expose TMDB credential via Vite.

Acceptance:

- local backend config is documented
- missing required values fail clearly
- frontend build receives no secret

---

## Phase 2 — minimal Cloudflare Python Worker shell

Run the existing FastAPI app under the supported Cloudflare Python Worker ASGI integration.

Do not change application data architecture in this phase.

Add/update:

```text
pyproject.toml
wrangler configuration
Worker entrypoint
local dev configuration example
```

Acceptance:

- Worker starts locally
- health endpoint responds
- at least one existing API endpoint responds
- production path does not rely on Uvicorn

---

## Phase 3 — TMDB read path decoupling

Create the new `/api/tmdb/*` layer.

First migrate read-only catalogue operations:

- search movie
- movie detail
- person detail
- credits
- popular/top-rated/latest/trending equivalents required by UI
- collections/franchises where UI requires them
- related/recommendation catalogue views where appropriate

Frontend should be switched incrementally to these endpoints.

Critical acceptance test:

> Searching or opening a previously unseen movie must not create any row in Neon/Postgres.

At this phase legacy catalogue tables may still exist for old code paths, but new catalogue paths must not populate them.

---

## Phase 4 — introduce TMDB IDs into MovieGraph relations

Before removing `movies`, migrate internal relations.

### Comments

Add:

```text
comments.tmdb_movie_id
```

Backfill from:

```text
comments.movie_id -> movies.id -> movies.tmdb_id
```

Verify all legacy comments.

Update backend APIs to operate by TMDB ID.

Update frontend calls.

Only after verification should `comments.movie_id` become obsolete.

### Likes

Introduce TMDB-ID based user likes.

Backfill:

```text
user/local movie relation -> movies.tmdb_id
```

Preserve uniqueness.

Update frontend and backend.

### Other relations

Find every FK/reference to:

```text
movies.id
persons.id
genres.id
collections.id
```

Classify each as:

- MovieGraph state that must be converted to external IDs
- obsolete TMDB mirror relation
- genuine internal domain state that should remain

Acceptance:

- existing comments remain visible on the correct TMDB movie
- existing likes remain attached to the correct TMDB movie
- new comments/likes no longer require a local Movie row

---

## Phase 5 — recommendations redesign

Audit the current recommendation implementation separately.

If current MovieGraph recommendations rely on:

- local genres
- local cast/director graph
- only movies previously imported into Postgres

then the old algorithm is inherently biased toward the accidental cache population.

Refactor it.

Possible target:

```text
MovieGraph user state in Neon
      +
TMDB metadata fetched on demand
      ->
recommendation calculation
      ->
persist only tmdb_movie_id + score/state
```

Or, if a feature is simply "TMDB recommendations", treat it as catalogue and do not label it as a MovieGraph-generated recommendation.

Acceptance:

- recommendation behaviour is intentional
- results are not limited to movies accidentally cached in Postgres
- saved recommendation rows reference TMDB IDs rather than local Movie IDs

---

## Phase 6 — remove catalogue persistence behaviour

Delete/replace code paths such as:

```text
register_movie_from_data
_get_or_create_person
get_or_fetch_movie_by_tmdb_id -> persist
search local movies first
populate Collection
populate Genre for every movie
populate MoviePerson
```

No route should create catalogue rows as a side effect of browsing.

Acceptance:

- repeated catalogue browsing creates zero new catalogue DB rows
- application-owned writes continue to work

---

## Phase 7 — database cleanup migrations

Only now consider dropping legacy catalogue tables.

Before every drop:

- verify no remaining FK
- verify no remaining ORM relationship
- verify no remaining schema references
- verify no frontend expectation of local catalogue IDs
- verify migrated row counts
- verify no null TMDB IDs in migrated MovieGraph relations

Candidate removals:

```text
movies
persons
movie_person
collections
movie_genres
catalogue-only genre data
```

Genre preference state may require preserving/refactoring part of the current Genre system.

Use reversible migrations where feasible.

Take a Neon branch/backup strategy before destructive migration.

---

## Phase 8 — Hyperdrive + Neon production DB path

Move the remaining MovieGraph database access to:

```text
Worker -> Hyperdrive -> Neon
```

Keep synchronous SQLAlchemy if supported and reliable in the current runtime.

Replace `psycopg2-binary` with a verified Worker-compatible PostgreSQL driver.

Verify using current official docs before coding.

Acceptance:

- select
- insert
- update
- delete
- transaction rollback
- request session close
- production Hyperdrive binding
- Neon persistence

At this stage the database is much smaller and cleaner because catalogue reads no longer touch it.

---

## Phase 9 — frontend cleanup

Remove remaining assumptions that every TMDB object has a local MovieGraph DB record.

Simplify types.

Remove dead API methods.

Ensure:

```text
catalogue -> /api/tmdb/*
application state -> /api/v1/*
```

Review loading/error behaviour for parallel requests on movie detail pages.

Example:

```text
movie details   -> TMDB
comments        -> MovieGraph
viewer like     -> MovieGraph
```

One failing social request should not necessarily prevent basic TMDB movie details from rendering.

---

## Phase 10 — Workers Static Assets

Serve the Vite build with the Worker if current Cloudflare support and repository structure make this the cleanest deployment.

Target one origin.

Ensure:

```text
/api/* -> Worker API
everything else -> static assets / SPA fallback
```

Do not allow SPA fallback to convert API 404s into `index.html`.

Acceptance:

- `/`
- deep React route refresh
- JS/CSS assets
- `/api/tmdb/*`
- `/api/v1/*`

all behave correctly.

---

## Phase 11 — security/CORS

With one origin:

- remove broad production wildcard CORS where unnecessary
- preserve local dev origin explicitly
- verify JWT configuration
- verify ownership authorization
- sanitize errors
- ensure TMDB token never reaches browser
- ensure Neon credentials never reach browser

Do not mix in a full auth redesign.

---

## Phase 12 — delete obsolete deployment infrastructure

Once Cloudflare deployment works:

Review/remove or mark legacy:

```text
back/Dockerfile
front/Dockerfile
front/nginx.conf
old docker-compose production assumptions
Uvicorn production instructions
old host-specific env variables
```

Docker may remain as a local tool if it still provides value.

There must be one authoritative production architecture in README.

---

## Phase 13 — final refactor

Only after architecture works:

- simplify backend services
- remove dead models/schemas
- remove duplicate transformations
- clean naming
- modularize genuinely shared frontend components
- improve typing
- remove stale CSS/components
- remove temporary compatibility endpoints
- update README
- update architecture diagram
- add useful CI

Do not make this a giant style-only rewrite.

---

# 9. Important feature mapping

Current DB-based catalogue functions require deliberate replacements.

## Search

Old:

```text
local DB search -> TMDB -> persist
```

New:

```text
TMDB search directly through gateway
```

## Movie detail

Old:

```text
local Movie -> fetch/persist if absent
```

New:

```text
TMDB detail
```

plus independent MovieGraph state.

## Person detail

Old:

```text
local Person / populated person data
```

New:

```text
TMDB person detail
```

## Top rated

Old:

```text
ORDER BY local Movie.rating
```

New:

use the appropriate TMDB catalogue endpoint/filter.

## Latest

Old:

```text
ORDER BY local Movie.released
```

New:

use the appropriate TMDB now-playing/discover/release-date endpoint depending on current UI meaning.

Do not choose the replacement by name alone; inspect the UI semantics.

## Random hero

Old:

random locally cached movie with backdrop/tagline.

This cannot remain dependent on accidental database contents.

Choose a deliberate TMDB-backed pool such as trending/popular/discover and select from it.

Keep visual requirements such as backdrop/tagline if the UI needs them.

## Collection section

Old:

random local Collection that happens to contain at least two cached movies.

New:

design an intentional TMDB-backed collection/franchise feature, or preserve the current UX using TMDB collection data.

Do not preserve the accidental behaviour of "whatever collections happen to have been cached".

## Related movies

Old:

local graph intersection over cached people/genres.

New possibilities:

- TMDB similar/recommendations
- a deliberate MovieGraph algorithm using TMDB metadata
- a combination

Pick intentionally and document semantics.

---

# 10. Migration data checks

Before removing legacy catalogue:

Record counts:

```text
movies
comments
likes/user_likes
persons
movie_person
collections
genres
movie_genres
```

For comments:

```text
legacy comments count
mapped comments count
unmapped comments count
```

Expected:

```text
unmapped = 0
```

For likes:

```text
legacy likes count
mapped likes count
duplicate collisions
unmapped likes count
```

Resolve collisions before applying final uniqueness constraints.

Do not discard records to make a migration pass.

---

# 11. Naming guidance

The old project uses ambiguous IDs.

During migration make boundary names explicit.

Python:

```python
tmdb_movie_id
tmdb_person_id
user_id
```

TypeScript:

```ts
tmdbMovieId
tmdbPersonId
userId
```

Do not rename every internal primary key for style.

The goal is to eliminate ambiguity between:

```text
MovieGraph DB identity
vs
TMDB catalogue identity
```

---

# 12. Cloudflare/Neon constraints

Implementation details must be verified against current official documentation at execution time.

Codex should verify:

- Python Worker FastAPI/ASGI entrypoint
- `pywrangler` workflow
- current Python compatibility date requirements
- Hyperdrive binding access from Python
- supported PostgreSQL drivers
- synchronous SQLAlchemy support
- Workers Static Assets configuration

Do not copy old blog-post assumptions into the code.

---

# 13. Suggested repository end state

Illustrative:

```text
MovieGraph-App/
├── AGENTS.md
├── README.md
├── wrangler.jsonc
├── .dev.vars.example
├── back/
│   ├── app/
│   │   ├── api/
│   │   │   ├── tmdb/
│   │   │   └── v1/
│   │   ├── core/
│   │   ├── db/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   │   └── tmdb/
│   │   ├── main.py
│   │   └── worker.py
│   ├── migrations/
│   ├── tests/
│   └── pyproject.toml
├── front/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.ts
└── docs/
    ├── CLOUDFLARE_MIGRATION.md
    └── MIGRATION_AUDIT.md
```

Use the existing structure when it is already clearer.

---

# 14. Definition of done

The project is not finished merely because a Worker deploy succeeds.

All must be true:

- React builds
- FastAPI runs on Python Workers
- frontend is deployable on Cloudflare
- Hyperdrive reaches Neon
- MovieGraph reads/writes persist
- TMDB search does not query or populate a local Movie cache
- TMDB movie detail does not create Movie records
- TMDB person detail does not create Person records
- comments work using TMDB movie IDs
- likes work using TMDB movie IDs
- existing comments were migrated
- existing likes were migrated
- recommendation behaviour is preserved or deliberately redesigned
- homepage catalogue features no longer depend on accidental cached rows
- obsolete catalogue tables are removed safely
- TMDB secret stays server-side
- database secret stays server-side
- frontend understands ID semantics
- CORS is safe
- README matches reality
- relevant tests/build/lint pass

---

# 15. First Codex task

Give Codex this exact scope first:

> Read `AGENTS.md` and `docs/CLOUDFLARE_MIGRATION.md` completely. Inspect the entire repository before changing code. Produce `docs/MIGRATION_AUDIT.md` that maps the current architecture, all API routes, all SQLAlchemy models and relationships, all frontend services/routes/types that depend on local Movie or Person IDs, and every code path that writes TMDB catalogue data into Postgres. Explicitly classify each persisted table/field as either MovieGraph-owned state, TMDB catalogue mirror, mixed responsibility, or infrastructure. Trace how comments, likes, genres, recommendations, home-page sections, search, movie detail and person detail depend on the current local Movie cache. Then propose the precise data migration from local `movies.id` references to TMDB IDs, including row-count/integrity checks. Do not drop tables and do not rewrite the application yet. After the audit, implement only the lowest-risk foundations: configuration cleanup and the minimal Cloudflare Python Worker shell, while preserving current behaviour. Verify current Cloudflare Python Workers/FastAPI/Hyperdrive details against official documentation before implementation. Run every available validation command and report exact results and blockers.

Do not start catalogue table deletion until the audit has been reviewed.
