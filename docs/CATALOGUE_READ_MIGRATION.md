# Catalogue read migration — 2026-10-06

## Scope and ownership

The frontend catalogue services now use the existing `/api/tmdb/*` gateway instead of database-backed `/api/v1/movies/*` and `/api/v1/people/*` reads. Search, Home, movie/person details, filmographies, genres, top-rated/latest lists, collections and related catalogue views are covered. The gateway has no database dependencies and does not persist metadata. No schema migration, Neon operation, table deletion or production deployment was performed in this phase.

Comments and likes remain MovieGraph-owned `/api/v1` requests. The personal/social recommendation algorithms, account/authentication and follows are not replaced with TMDB recommendations. Their legacy paths still require a separate migration. Legacy catalogue routes/importers remain for those compatibility paths; their continued existence does not imply that all catalogue persistence has been removed.

## Deliberate catalogue replacements

| Previous source | New source and semantics |
| --- | --- |
| Locally cached random hero movies | Random selection from the first weekly TMDB trending page, with backdrops; up to five details fetched concurrently for tagline/trailer metadata. |
| Locally cached latest movies | TMDB discover sorted by primary release date descending, excluding future dates, requiring at least ten votes to avoid an unreviewed catalogue dominating the section. Not TMDB's single `/movie/latest` resource. |
| Locally cached top-rated movies | TMDB `/movie/top_rated`, preserving upstream ranking. |
| Local genre table and movie associations | TMDB genre list and discover with a positive `tmdb_genre_id`, ordered by title. Genre-name URLs remain compatible; Explore uses IDs directly. User genre preferences are untouched. |
| Random cached people | Random selection of up to fifteen non-adult people with photos from TMDB's first popular page. |
| Locally cached movie detail/cast/videos | One movie detail request with `append_to_response=credits,videos`; cast and directors are deduplicated by TMDB ID, preserving character and role information. |
| Related cached movies sharing people/genres | TMDB movie recommendations. This is catalogue discovery, not the MovieGraph personalized recommendation algorithm. Results are no longer confined to cached movies. |
| Cached collection inventory/random collection | An explicit featured franchise selection: TMDB IDs `8091`, `10`, `1241`, `119`, `86311`, `528`, `645`, `9485`. These IDs are editorial references, not mirrored metadata. Each collection and all its parts come from TMDB; parts are ordered by release date, unknown dates last. Home chooses one of these franchises randomly. Explore shows five then eight with its existing Load More button. |
| Cached person detail/acted/directed films | TMDB person detail and movie credits; duplicate roles for the same movie are consolidated and director credits are filtered by `job=Director`. |
| Related cached people | Collaborators from the person's three highest-rated movie credits, fetched concurrently, ranked by shared appearances within that bounded sample; subject excluded, maximum fifteen. This is not an exhaustive career-wide collaborator score. |

These replacements deliberately remove the old accidental dependence on cache population. The UI layout, routes and social identity remain unchanged. The featured collection inventory is curated, not an exhaustive catalogue collection index.

TMDB list cards do not include director credits; those optional list subtitles are no longer populated from an arbitrary cached MoviePerson row. Actual director names remain available on the detail response. We do not fetch every list item's complete credits merely to populate that optional subtitle.

Official contracts checked: [discover](https://developer.themoviedb.org/reference/discover-movie), [movie credits](https://developer.themoviedb.org/reference/movie-credits), [person movie credits](https://developer.themoviedb.org/reference/person-movie-credits), [collections](https://developer.themoviedb.org/reference/collection-details), [trending](https://developer.themoviedb.org/reference/trending-movies), [popular people](https://developer.themoviedb.org/reference/person-popular-list), and [append](https://developer.themoviedb.org/docs/append-to-response).

## API and frontend boundary

- `GET /api/tmdb/movies?kind=top-rated|latest|popular|trending|genre&page=1&limit=10`, with `tmdb_genre_id` required for genre.
- `GET /api/tmdb/movies/featured?limit=5`.
- `GET /api/tmdb/genres`.
- `GET /api/tmdb/collections?random_one=false` and `/collection/{tmdb_collection_id}`.
- `GET /api/tmdb/people/featured`.
- `GET /api/tmdb/movie/{tmdb_movie_id}` and `/{tmdb_movie_id}/recommendations`.
- `GET /api/tmdb/person/{tmdb_person_id}`, `/{tmdb_person_id}/filmography` and `/{tmdb_person_id}/related`.

Gateway responses expose `tmdb_id`, never a local catalogue `id`. IDs must be positive; list pages are 1–500, sizes 1–20, hero sizes 1–5. Logical pages of 10/18/20 items are translated into TMDB's twenty-item pages, fetching at most two pages concurrently without skipping rows across boundaries. Search retains its existing five-result autocomplete contract.

`front/src/services/catalogueAdapters.ts` adapts typed gateway responses to existing presentation types. Their transitional `id` string now equals the TMDB ID for gateway objects; it is not a MovieGraph database identity. Catalogue navigation and social calls use `tmdb_id` explicitly. Presentation adapters do not write data. Movie runtime is displayed in minutes; the gateway's explicit `trailer_youtube_key` maps to the existing presentation field `trailer_url`, which historically contains a video key rather than a full URL.

The existing Axios client and host are reused, with a sibling `/api/tmdb` namespace. No frontend secret, new HTTP library, database URL or PyCharm configuration is needed. Movie detail uses appended cast directly rather than fetching the same movie twice. Collection Explore uses the already returned parts instead of per-collection serial requests. Home/detail secondary requests settle independently: an unavailable social endpoint cannot turn a valid movie into Not Found. Detail effects reject stale results after navigation.

Shared timeout/authentication/error sanitization remains unchanged. Featured movie/collection batches retain successful responses when individual upstream requests fail; related people tolerate individual failed credit requests, but report an error if every selected movie fails. No persistent or process-global catalogue cache is introduced.

## Real runtime verification

Ran the actual local Python Worker via `pywrangler`, with the existing ignored `.dev.vars` TMDB credential and no Hyperdrive/database binding. The following fourteen live requests all returned HTTP 200:

| Request suffix under `/api/tmdb/` | Returned items |
| --- | --- |
| `movies?kind=top-rated&limit=10` | 10 |
| `movies?kind=latest&limit=10` | 10 |
| `movies?kind=genre&tmdb_genre_id=18&limit=18` | 18 |
| `genres` | 19 |
| `movie/550` | 1 movie, appended cast/director/trailer |
| `movie/550/recommendations` | 20 |
| `collection/10` | 9 parts |
| `collections` | 8 |
| `collections?random_one=true` | 1 |
| `people/featured` | 15 |
| `person/287` | 1 |
| `person/287/filmography` | 113 acted credits |
| `person/287/related` | 15 |
| `movies/featured?limit=5` | 5 |

Then launched the unchanged Preview workflow (`scripts/run_preview.py`: Worker 8787 + Vite 5173) and automated Chromium through Playwright CLI. Home, `/movie/550`, `/person/287`, `/genres`, `/genre/Drama`, `/top-rated`, `/latest`, `/collections` rendered catalogue images/headings. Load More doubled Drama's 18 items to 36 and top-rated/latest's 10 to 20. No observed `/api/tmdb/` request failed. The movie remained visible when comments returned the expected 404 from the catalogue-only Preview. The corrected trailer iframe URL matched a YouTube embed plus video key, not a nested watch URL. These checks do not claim that external YouTube playback is guaranteed.

The initial browser check incorrectly expected a Top Rated heading that the existing UI does not contain; the check was corrected to its actual card layout and rerun successfully. The browser also caught a trailer key/full-URL mismatch, fixed before final validation. The initial malformed-person fixture exposed an uncaught AttributeError; it now maps to the shared sanitized 502 response.

This proves real local Worker outbound TMDB behavior, not a new production deployment or Neon query-log audit. Database import-blocking tests separately prove the catalogue cannot initialize SQLAlchemy, sessions, models or legacy importers even for unseen entities. Existing real social/Hyperdrive verification is documented separately.

## Validation and commands

Commands executed from the project root unless noted:

```powershell
npx.cmd -y modern-web-guidance@latest search "React fetch catalogue data with cancellation" --skill-version 2026_05_16-c5e7870
npx.cmd -y modern-web-guidance@latest list
npx.cmd -y modern-web-guidance@latest retrieve deprioritize-background-fetches
# From back, targeted gateway / new catalogue suite, then complete suite:
..\.venv\Scripts\python.exe -m unittest discover -s tests -p test_tmdb.py -v
..\.venv\Scripts\python.exe -m unittest discover -s tests -p test_catalogue_browse.py -v
..\.venv\Scripts\python.exe -m unittest discover -s tests -v
# Temporary live Worker, stopped after verification:
.venv\Scripts\python.exe -m pywrangler dev --ip 127.0.0.1 --port 8790
# Invoke-WebRequest loop against the fourteen suffixes recorded above, TimeoutSec 60.
.venv\Scripts\python.exe scripts/run_preview.py
npx.cmd --yes --package @playwright/cli playwright-cli -s=moviegraph-catalogue open http://127.0.0.1:5173/
npx.cmd --yes --package @playwright/cli playwright-cli -s=moviegraph-catalogue snapshot
npx.cmd --yes --package @playwright/cli playwright-cli -s=moviegraph-catalogue goto http://127.0.0.1:5173/movie/550
npx.cmd --yes --package @playwright/cli playwright-cli -s=moviegraph-catalogue goto http://127.0.0.1:5173/person/287
npx.cmd --yes --package @playwright/cli playwright-cli -s=moviegraph-catalogue run-code --filename .wrangler/catalogue-browser-check.js
npx.cmd --yes --package @playwright/cli playwright-cli -s=moviegraph-catalogue run-code --filename .wrangler/catalogue-trailer-check.js
npx.cmd --yes --package @playwright/cli playwright-cli -s=moviegraph-catalogue requests
npx.cmd --yes --package @playwright/cli playwright-cli -s=moviegraph-catalogue console debug
npx.cmd --yes --package @playwright/cli playwright-cli -s=moviegraph-catalogue close
# From front:
npm.cmd run lint
npm.cmd run build
# From root:
git diff --check
```

Playwright helper snippets are temporary verification artifacts under ignored `.wrangler`, not a new frontend test framework. No package dependency was added. Python commands use PyCharm's configured project interpreter. The web-guidance package warns that the installed skill version is outdated; no project configuration was changed to upgrade an unrelated IDE skill.

Automated tests cover source mapping, page boundaries, validation, safe upstream failures, combined details, deduplication, partial batch failures, collaborator ordering and complete database-import isolation. Final validation: **65 backend tests pass** (including nine new catalogue tests), frontend lint has **zero errors and four pre-existing warnings** in FollowContext/LikeContext, frontend TypeScript/Vite build succeeds (483 modules), and `git diff --check` passes. No frontend test framework was introduced.

Changed files: `back/app/catalogue/{client,routes,schemas}.py`, `back/tests/test_catalogue_browse.py`, `front/src/services/{tmdbService,moviesService,peopleService,catalogueAdapters}.ts`, `front/src/hooks/{useHomeData,genre/useExploreGenres,genre/useMoviesByGenre,movie/useMovieDetail,person/usePersonDetail}.ts`, `front/src/pages/categories/CollectionsPage.tsx`, `front/src/types/movie.ts`, `front/src/utils/youtubeHelpers.ts`, `scripts/run_preview.py`, README and the local/gateway/catalogue reports. Changes from the preceding social Worker phase remain separate in the same uncommitted workspace.

## Rollback and remaining work

This phase has no database rollback. Reverting its gateway/frontend changes restores the previous catalogue callers but those would again require the legacy backend/cache; do not deploy only one side of that rollback. Existing social Worker changes and development schema are independent and must not be reverted as part of a catalogue rollback.

Use **MovieGraph Preview** in PyCharm to try catalogue browsing with the current `.dev.vars`. No new URL/configuration is required. The Preview still does not mount registration/login, follows or social persistence; their absence is not a TMDB catalogue failure. Next phases: authenticated account/runtime integration, deliberately refactor MovieGraph recommendations/preferences/follows to the social schema, then remove obsolete importer/route/model dependencies and finally catalogue tables through a separately approved migration. Static-assets production deployment remains pending.
