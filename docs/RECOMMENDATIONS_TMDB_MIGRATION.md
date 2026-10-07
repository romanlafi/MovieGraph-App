# Movie recommendations from TMDB

## Ownership and behavior

Recommendation results are not persisted. MovieGraph reads the signed-in
user's liked `tmdb_movie_id` values and distinct liked TMDB IDs from followed
users; the frontend asks the existing `/api/tmdb/movie/{id}/recommendations`
and movie-detail gateway to enrich those IDs. No recommendation reads a local
`Movie`, `Person`, `Genre`, or `MoviePerson` row, and no TMDB response is
written to Neon.

The existing four sections remain: a hero chosen from recommendations for the
user's liked movies, a larger “Because You Liked These” carousel, people found
in the user's liked-film credits, and a friends carousel based on followed
users' liked films. The source set is capped at three movies per section to
bound upstream fan-out. Duplicate recommendations are merged; movies the user
already likes are excluded. The people carousel ranks cast by appearances and
requires a TMDB profile image.

The likes and followed-like-ID API calls go to MovieGraph; catalogue details
and recommendations go to TMDB. Calls are parallel, aborted when the page
unmounts, and settled independently so one failed TMDB source does not erase
the other sections. `user_movie_likes` has no timestamp by design, so this
phase does not claim to recommend from “recent” likes; it uses a bounded,
deterministic subset of stored IDs.

## Rollout boundary

The Worker exposes followed users' liked TMDB IDs at
`GET /api/v1/follows/movie-likes`. It requires authentication and is mounted
only when `include_follows_api=True`. Revision `20261008_00` must be applied to
the intended database before enabling that router. Until then the friends
source fails independently and that carousel may be empty; the user's own
like-based recommendations and people can still load.

The recommendations page no longer calls the legacy
`/api/v1/recommendations/*` routes. No legacy recommendation table is added and
no catalogue rows are deleted. The old backend endpoints remain available to
other deployed clients until a later retirement phase.

## Validation boundary

Backend tests verify that the friend-like-ID route returns only distinct
TMDB IDs from followed users, requires authentication, and does not join the
catalogue. Frontend validation is the TypeScript/Vite build and ESLint; the
repository does not currently define a frontend unit-test suite. No live Neon
data or deployed recommendation page was exercised in this phase.
