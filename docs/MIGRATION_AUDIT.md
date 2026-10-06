# MovieGraph migration audit

Audited 2026-10-02. Baseline: repository before the limited configuration/Worker foundation in this pass. **TMDB owns catalogue; Neon owns MovieGraph state.** No schema/data migration or table deletion is performed by this audit. SQL below is a future review/runbook, not an executed migration.

## 1. Scope, evidence and limits

Read `AGENTS.md` and `docs/CLOUDFLARE_MIGRATION.md` completely. Inspected tracked backend modules, frontend source, configuration, manifests/lockfile, Docker/nginx files, resources and HTTP examples. Public SVGs/CSS are presentation assets, not persistence inputs. No Alembic history, automated test suite, CI, Worker configuration or deployed database schema existed at baseline. IDE call hierarchy could not resolve the Python importer FQN; dependency maps below were established by inspecting imports, function bodies and frontend invocations.

No database credentials, TMDB credential, Hyperdrive configuration or Cloudflare account were supplied. Actual table presence, counts, schema drift, catalogue completeness and live user behaviour remain unverified. In particular, declared SQLAlchemy metadata is not proof of deployed schema. Existing untracked `.idea/`, `AGENTS.md` and migration-plan docs were preserved.

## 2. Architecture and entrypoints

- `back/app/main.py`: module-global FastAPI, imports six routers, mounts all under `/api/v1`; wildcard credentialed CORS. Importing routes imports configuration, auth, models and the global synchronous SQLAlchemy engine.
- `back/app/db/database.py`: `create_engine(DATABASE_URL)`, default application pool, `SessionLocal`, declarative `Base`; `get_db` yields a session and always closes it. No explicit rollback in dependency; services commit individually.
- `back/app/core/config.py`: import-time `load_dotenv`, environment constants, no required-value validation; missing token duration raises `int(None)` before startup.
- `back/app/deps/auth.py`: OAuth2 Bearer dependency, JWT verification/expiry through python-jose, email in `sub` resolves current user. Login is a form endpoint, not JSON.
- `services/postgres/`: sync business logic and catalogue importing. `services/tmdb_service.py`: synchronous `httpx.get`, 10-second timeout per request, API key query param, response transformation. Non-200 responses frequently become empty results/None; transport exceptions propagate.
- `back/Dockerfile`: Python 3.11 Linux, installs requirements/native tooling, starts `resources/create_tables.py` then Uvicorn `app.main:app`. Automatic schema creation is not an acceptable production migration path.
- `back/resources/create_tables.py`: imports all eight mapped models, including unused `Like`, then `Base.metadata.create_all`. Not executed during this audit.
- `back/resources/populate_via_api.py`: standalone mutating seed script against hard-coded LAN host. Default main calls `search_movies_only`, causing movie detail imports. Other functions seed users, follows, likes and comments. Not executed.
- `back/resources/docker_create.txt`: stale Neo4j launch example; no Neo4j implementation/dependency in application.
- `docker-compose.yml`: Postgres 15 with local credentials/volume, backend host port 8001, nginx frontend host port 3001; DB not published to host. README incorrectly advertises 3000/8000/5432.
- `front/src/main.tsx` → `App.tsx` → auth/follow/like providers and `AppRouter` → `MainLayout`/pages. React 19, React Router 7, TypeScript 5.7, Vite 6, Tailwind 4. One Axios instance with localStorage Bearer interceptor. API base only `VITE_API_PROD_URL`, expected to include `/api/v1`; undefined base sends namespace-incomplete relative paths. No browser TMDB credential use found.
- `front/Dockerfile` copies an already-built `dist` to nginx; `nginx.conf` only SPA fallback, no API proxy. No same-origin Worker/static deployment at baseline.

## 3. Complete HTTP inventory and frontend callers

Paths below have prefix `/api/v1`. `A` means Bearer-authenticated. Unmarked operations are public. All except `/movies/tmdb_search` have DB dependencies directly or through auth. Caller paths are relative to `front/src/`; frontend service names identify the exact request builder. There are **41 application operations**.

| Method/path | Backend function → service/operation | Frontend service → consumer | Identity |
|---|---|---|---|
| POST `/users/` | users.register → create_user | authService.registerUser → RegisterForm | new internal user; genre names |
| POST `/users/login` | users.login → authenticate_user/create_access_token | authService.loginUser → LoginForm | email form username |
| GET `/users/me` A | users.get_me → current user | authService.fetchUser → AuthProvider | JWT email |
| GET `/follows/search` A | follows.search_users → search_users_by_username_or_email | followService.searchUsers → SocialPage | query username/email |
| POST `/follows/` A | follows.follow → follow_user | followService.followUser → FollowContext → FollowButton | target email |
| DELETE `/follows/` A | follows.unfollow → unfollow_user | followService.unfollowUser → FollowContext → FollowButton | target email body |
| GET `/follows/following` A | follows.get_my_following → get_following | followService.getMyFollowing → FollowContext, SocialPage, UserPage | current internal user |
| GET `/follows/followers` A | follows.get_my_followers → get_followers | followService.getMyFollowers → SocialPage, UserPage | current internal user |
| GET `/follows/list` | follows.get_users → list_all_users | followService.getAllUsers exported; no invoking frontend consumer | internal users |
| GET `/follows/by_email` | follows.get_user_by_email → get_user_response_by_email | followService.getUserByEmail → UserPage | email |
| GET `/movies/search` | movies.search_movies_endpoint → search_movies | no frontend method; seed search_and_like | query; returns local and TMDB IDs |
| GET `/movies/by_genre` | movies.get_movies_by_genre → Genre name lookup/search_movies_by_genre | moviesService.getMoviesByGenre → useMoviesByGenre, useExploreGenres | name → local genre ID |
| GET `/movies/` | movies.get_movie → get_movie_by_id | no frontend caller | local movie_id |
| POST `/movies/like` A | movies.like_movie → User.likes append/commit | moviesService.likeMovie → LikeContext → LikeButton/MovieCard | local movie_id |
| DELETE `/movies/like` A | movies.unlike_movie → User.likes remove/commit | moviesService.unlikeMovie → LikeContext | local movie_id |
| GET `/movies/likes` A | movies.get_user_likes → User.likes/transform | moviesService.getUserLikes → LikeContext | local ID in results |
| GET `/movies/genres` | movies.get_genres → Genre ordered name | moviesService.getGenres → useExploreGenres, RegisterForm | local genre ID |
| GET `/movies/related` | movies.related_movies → get_related_movies_by_people_and_genres | moviesService.getRelatedMovies → useMovieDetail | local movie_id |
| GET `/movies/tmdb_search` | movies.search_tmdb_movies → search_tmdb_only | moviesService.searchTmdbMovies → SearchBar; seed search_movies_only | TMDB-only result, no local ID |
| GET `/movies/detail` | movies.get_movie_by_tmdb_id → get_or_fetch_movie_by_tmdb_id | moviesService.getMovieByTmdbId → useMovieDetail; seed search_movies_only | TMDB input, local output ID |
| GET `/movies/random` | movies.get_random_movies_endpoint → get_random_movies | moviesService.getRandomMovies → useHomeData | local cache results |
| GET `/movies/random_collection` | movies.get_random_collection → get_random_collection_with_movies | moviesService.getRandomCollection → useHomeData | local collection + local movies |
| GET `/movies/collections` | movies.get_collections → Collection join/group | moviesService.getCollections → CollectionsPage | local + TMDB collection IDs |
| GET `/movies/by_collection` | movies.get_movies_by_collection → Movie.collection_id query | moviesService.getMoviesByCollection → CollectionsPage, useMovieDetail | local collection_id |
| GET `/movies/top_rated` | movies.get_top_rated → get_top_rated_movies | moviesService.getTopRatedMovies → useTopRatedMovies, useHomeData | local cache |
| GET `/movies/latest` | movies.get_latest → get_latest_movies | moviesService.getLatestMovies → useLatestMovies, useHomeData | local cache |
| GET `/people/` | people.search → search_people | no frontend caller | local person search only |
| GET `/people/detail` | people.get_person → get_person_detail | no frontend caller | local person_id |
| GET `/people/filmography` | people.get_filmography → get_person_filmography | no frontend caller | local person_id |
| GET `/people/acted` | people.acted_movies → get_filmography_as_actor | peopleService.getActedMovies → usePersonDetail | local person_id |
| GET `/people/directed` | people.directed_movies → get_filmography_as_director | peopleService.getDirectedMovies → usePersonDetail | local person_id |
| GET `/people/movie` | people.get_people_for_movie → list_people_by_movie_id | peopleService.getPeopleForMovie → useMovieDetail | local movie_id |
| GET `/people/by_tmdb` | people.get_person_by_tmdb_id → get_or_fetch_person_by_tmdb_id | peopleService.getPersonByTmdbId → usePersonDetail | TMDB input, local person output |
| GET `/people/related` | people.related_people → get_related_people_by_person_id | peopleService.getRelatedPeople → usePersonDetail | local person_id |
| GET `/people/random` | people.get_random_people → get_random_people_list | peopleService.getRandomPeople → useHomeData | local cache |
| GET `/recommendations/hero` A | recommendations.get_hero → get_hero_recommendations | recommendationsService.getHeroRecommendations → RecommendationsPage | current user/local graph |
| GET `/recommendations/by_likes` A | recommendations.get_recommendations_from_likes → get_recommendations_by_likes | recommendationsService.getRecommendationsFromLikes → RecommendationsPage | current user/local graph |
| GET `/recommendations/friends` A | recommendations.get_friend_based_recommendations → get_recommendations_by_friends | recommendationsService.getFriendsRecommendations → RecommendationsPage | followed users/local likes |
| GET `/recommendations/people` A | recommendations.get_recommended_people_route → get_recommended_people | recommendationsService.getRecommendedPeople → RecommendationsPage | local people |
| POST `/comments/` A | comments.comment_movie → create_comment | commentService.postComment → useMovieDetail → CommentSection/CommentForm; seed insert_comments | local movie_id body |
| GET `/comments/` | comments.get_movie_comments → list_movie_comments | commentService.getCommentsByMovie → useMovieDetail → CommentCarousel/Card | local movie_id query |

FastAPI infrastructure routes: GET `/openapi.json`, GET `/docs`, GET `/docs/oauth2-redirect`, GET `/redoc` (automatic HEAD where supplied by framework). No frontend callers. Baseline has no `/`, `/hello/{name}` or health route; `back/test_main.http` requests nonexistent examples. No delete-comment route, profile update endpoint, person-follow endpoint, watchlist or user rating feature exists.

## 4. Every declared table, column and relationship

PK/FK identifiers and indexes are infrastructure within the classifications below. No explicit database ON DELETE rules are declared. Association composite primary keys imply non-null/unique pairs. Only comments declare ORM delete-orphan cascades, from BOTH User and Movie: deleting a legacy movie through ORM can delete user comments.

| Table / definition | Columns, constraints, FKs | ORM relationships | Ownership |
|---|---|---|---|
| `users` / models/user.py User | id PK/index; email unique/index/not-null; username/password not-null; birthdate Date, bio String nullable | favorite_genres ↔ Genre.users through user_genres; comments ↔ Comment.user cascade all/delete-orphan; likes ↔ Movie.liked_by through user_likes; following self-join follower_id→followed_id, backref followers | MovieGraph-owned values, password is hash; relationships mixed until migration |
| `user_follows` / user.py Table | follower_id FK users.id + followed_id FK users.id, composite PK | User.following/followers | MovieGraph-owned |
| `user_likes` / user.py Table | user_id FK users.id + movie_id FK movies.id, composite PK | User.likes/Movie.liked_by | MovieGraph-owned, catalogue-coupled |
| `likes` / like.py Like | id PK/index; user_id nullable FK users.id; movie_id nullable FK movies.id; unique_user_movie_like(user_id,movie_id) | none | MovieGraph-owned candidate; unused by routes, may contain legacy data |
| `comments` / comment.py Comment | id PK/index; movie_id not-null FK movies.id; user_id not-null FK users.id; text not-null Text; created_at DateTime nullable, Python datetime.utcnow default | user ↔ User.comments; movie ↔ Movie.comments | MovieGraph-owned, catalogue-coupled |
| `movies` / movie.py Movie | id PK/index; tmdb_id unique/index/not-null; title not-null; year Integer; poster_url/released/runtime/box_office/website/trailer_url/tagline/backdrop_url/origin_country String; plot Text; rating Float; collection_id nullable FK collections.id | genres ↔ Genre.movies via movie_genres; movie_persons ↔ MoviePerson.movie; comments ↔ Comment.movie cascade all/delete-orphan; liked_by ↔ User.likes via user_likes; collection ↔ Collection.movies | TMDB mirror; social relationships create mixed dependency |
| `persons` / person.py Person | id PK/index; tmdb_id unique/index but nullable; name not-null; photo_url/birthday/place_of_birth String; biography Text | movie_roles ↔ MoviePerson.person | TMDB mirror |
| `movie_persons` / movie_person.py MoviePerson | id PK/index; nullable movie_id FK movies.id; nullable person_id FK persons.id; role/character String nullable; no credit-pair uniqueness | movie ↔ Movie.movie_persons; person ↔ Person.movie_roles | TMDB mirror (role ACTOR/DIRECTOR and character) |
| `collections` / collection.py Collection | id PK; tmdb_id unique/not-null; name not-null; poster_url/backdrop_url nullable | movies ↔ Movie.collection | TMDB mirror, not user collections/watchlist |
| `genres` / genre.py Genre | id PK; name unique nullable; NO TMDB genre ID | movies ↔ Movie.genres via movie_genres; users ↔ User.favorite_genres via user_genres | mixed: imported catalogue names AND user-created preference names |
| `movie_genres` / genre.py Table | movie_id FK movies.id + genre_id FK genres.id, composite PK | Movie.genres/Genre.movies | TMDB mirror |
| `user_genres` / genre.py Table | user_id FK users.id + genre_id FK genres.id, composite PK | User.favorite_genres/Genre.users | MovieGraph-owned preferences, mixed name vocabulary |

Total: 8 mapped classes + 4 Table associations = 12 tables when create_tables imports all models. `Like` is not imported by live route graph, so runtime metadata may omit `likes`. No persisted recommendation table/scores exist. No migration version table exists at baseline.

## 5. Local/TMDB identifier inventory

The line-level appendix enumerates direct identifier occurrences at baseline. This section also covers implicit relationship traversal and response consumers (where an ORM ID is used without spelling `Movie.id`).

### Every local Movie ID dependency

- models: Movie.id; comments.movie_id; Like.movie_id; user_likes.movie_id; movie_genres.movie_id; MoviePerson.movie_id; User.likes and Movie.liked_by; Comment.movie/User.comments/Movie.comments cascades.
- schemas/movie.py: movie_to_response casts local ID to **str**; movie_to_list_response returns local **int**. Both emit tmdb_id separately. Collection response uses local collection ID and a separate TMDB ID. MovieCreate exists without a create route.
- api/v1/movies.py: local get `/`; like/unlike lookups; likes serialization; related lookup; collection count(Movie.id); collection filtering returns locally identified movies. All other local list routes serialize IDs through movie_to_list_response.
- services/postgres/movie_service.py: importer MoviePerson.movie_id=movie.id for director/cast; get_movie_by_id; related query looks up local ID, excludes self, deduplicates `m.id`; random collection count. Search, genre, random, top/latest and collection lists return IDs through transformers.
- services/postgres/person_service.py: filmography/acted/directed join MoviePerson.movie_id; movie credit lookup by Movie.id; related people subquery over local movie IDs; all filmography outputs use movie_to_list_response.
- services/postgres/comment_service.py: resolve input movie_id through local Movie; create new comment with movie.id; list by local movie_id. schemas/comment.py requests local movie_id.
- services/postgres/recommendation_service.py: liked local IDs/exclusion, friend likes join/query/subquery, same-collection/people/genre candidates and result serialization. All results are local Movies.
- resources/populate_via_api.py: search_and_like reads response['id'] then likes it; insert_comments hard-codes movie_id=577922 although the API expects a local ID (cannot assume it is a valid local/TMDB mapping).
- frontend: types/movie.ts `id`; moviesService likeMovie/unlikeMovie/getRelatedMovies; peopleService.getPeopleForMovie; commentService.getCommentsByMovie/postComment; useMovieDetail passes movieData.id to cast/related/comments and movie.id to new comments; LikeContext stores local IDs, compares strict equality; MovieCard passes movie.id to LikeButton. Lists/pages/cards that merely render Movie also carry both identities.

### Every Movie.tmdb_id dependency

- models/movie.py unique external lookup column; schemas/movie.py MovieBase, MovieListResponse, MovieSearchResponse and both ORM transformers.
- services/postgres/movie_service.py: search maps TMDB result `r['id']` to filter_by(tmdb_id=...); register_movie_from_data checks/constructs external ID; get_or_fetch_movie_by_tmdb_id finds cache or imports. api/v1/movies.py `/detail` takes tmdb_id; `/tmdb_search` returns it.
- services/tmdb_service.py: search_tmdb_only maps public `id`→tmdb_id; fetch_movie_data_by_tmdb interpolates movie/credits/videos URLs and returns movie.get('id')→tmdb_id. Actor/director/collection tmdb_id fields are different external namespaces.
- seed search_movies_only uses tmdb_id set and detail requests.
- frontend types/movie.ts, moviesService.getMovieByTmdbId, SearchBar selection/results keys, MovieCard navigation, MovieHorizontalCard navigation, MovieGrid/MovieCarouselOverlay keys, HeroMovieSlider navigation/keys, TopRatedPage/LatestReleasesPage keys. useMovieDetail route `id` is a TMDB ID despite generic name. Other Movie consumers carry this field without converting it.

### Every local Person ID dependency

- models/person.py Person.id, MoviePerson.person_id FK, Person.movie_roles/MoviePerson.person relationships.
- movie_service importer `_get_or_create_person` supplies person.id to director/actor links; related movie/recommendation candidate sets use MoviePerson.person_id.
- person_service: search/detail/by_tmdb response id=p.id/person.id; local detail lookup; filmography/acted/directed and related filter MoviePerson.person_id; list_people_by_movie_id groups by mp.person.id and emits it; random/related responses emit p.id.
- recommendation_service: person counter keyed by local ORM Person, output id=person.id; likes-derived person_ids use local credit person_id.
- schemas/person.py PersonResponse.id (integer); api/v1/people.py local detail/filmography/acted/directed/related inputs.
- frontend types/person.ts optional string id; usePersonDetail requires returned personData.id then calls getActedMovies/getDirectedMovies/getRelatedPeople with it. peopleService uses ambiguous personId for BOTH TMDB and local operations. PersonCard navigation/PersonCarousel keys use tmdb_id instead.

### Ambiguous frontend boundaries and type mismatches

| File(s) | Present meaning / risk |
|---|---|
| routes/AppRouter.tsx; pages/detail/MovieDetail.tsx, PersonDetail.tsx | `/movie/:id`, `/person/:id` mean TMDB, while returned `.id` means DB |
| types/movie.ts | id string though list API is int, detail string; tmdb_id number; search response lacks required id; year string vs API int; box_office number vs stored String |
| types/person.ts; services/peopleService.ts; hooks/person/usePersonDetail.ts | id optional string vs API int; tmdb_id string vs API int; personId alternates namespaces |
| types/collection.ts; services/moviesService.ts; hooks/movie/useMovieDetail.ts; pages/categories/CollectionsPage.tsx | collection.id is local, tmdb_id external; both typed string vs backend int; local id used as cache key and by_collection input |
| types/genre.ts; hooks/genre/useExploreGenres.ts; pages/genre/ExploreGenresPage.tsx; components/auth/RegisterForm.tsx; components/genre/GenreSelector.tsx | genre.id is local string-typed int; preference submission uses names, not IDs; inline RegisterForm genre interface duplicates type |
| services/commentService.ts; hooks/movie/useMovieDetail.ts; contexts/LikeContext.tsx; components/common/LikeButton.tsx; components/movie/MovieCard.tsx | generic movieId means local, strict string/int comparison may fail when mixing list and detail results |
| services/moviesService.ts searchTmdbMovies | advertises Movie[] but API MovieSearchResponse is a smaller shape without local id |
| components/search/SearchBar.tsx; components/movie/{MovieCard,MovieHorizontalCard,MovieGrid,MovieCarouselOverlay}.tsx; components/hero/HeroMovieSlider.tsx | correctly use TMDB for catalogue navigation/keys; MovieCard separately uses DB identity for heart |
| components/person/{PersonCard,PersonCarousel}.tsx | catalogue navigation/keys TMDB; payload also carries local id |
| types/user.ts, types/comment.ts; user/comment components and social pages | IDs exclusively internal (not TMDB), but declared strings vs backend integers; keep independent of catalogue IDs |

Remaining React routes: `/` home, `/register`, `/user/:email`, `/social`, `/genres`, `/genre/:genre` (name), `/collections`, `/recommendations`, `/top-rated`, `/latest`, catch-all NotFound. They hold catalogue list types but introduce no additional external ID namespace.

## 6. Every catalogue write path

1. GET `/movies/search` → search_movies: first DB title ILIKE, then TMDB search until limit; for unseen results fetch_movie_data_by_tmdb → register_movie_from_data.
2. GET `/movies/detail?tmdb_id=...` → get_or_fetch_movie_by_tmdb_id: read cached movie or fetch/import. UI opening a new movie and default seed script both trigger this.
3. register_movie_from_data: finds/creates Collection by external ID (name/images), creates full Movie mirror, finds/creates Genre by **name**, appends movie_genres, `_get_or_create_person` finds/creates Person by external ID (name/profile path), creates one director and top ten cast MoviePerson records (roles/character), commit and refresh Movie. All intermediate flushes belong to that session transaction. No conflict retry for concurrent imports.
4. GET `/people/by_tmdb` → get_or_fetch_person_by_tmdb_id: returns local Person only if photo, biography AND birthday are truthy; otherwise fetches TMDB and inserts or overwrites all mapped person fields, commits, refreshes. Persons missing real birthdays/biographies can refetch on every opening.
5. POST `/users/` → create_user: creates missing Genre names from client favorite_genres. This is a preference-vocabulary write, not a TMDB fetch; it shares the catalogue Genre table and must be separated carefully.

`tmdb_service.py` itself has no DB writes. `/movies/tmdb_search` already makes no DB read/write. Other catalogue queries/recommendations read mirrors without writing. Seed/search helpers route into these import paths; create_tables creates structure, not catalogue data.

## 7. Exact feature dependency maps and preserved semantics

| Feature | Current request → dependency graph → rendering/semantics | Required future replacement (not implemented) |
|---|---|---|
| Search (UI) | Header/SearchBarWrapper→SearchBar (300ms debounce, min 2 chars)→searchTmdbMovies→GET tmdb_search→search_tmdb_only→TMDB search page 1; filter poster+truthy vote_average+overview not None, first 5→MovieSearchResponse→navigate TMDB movie URL | thin `/api/tmdb/search/movie`; preserve useful filters/UX |
| Search (legacy API) | GET search→DB title ILIKE first limit (no offset)→if short, TMDB pages starting 1, title-lower dedup→existing tmdb row or import full movie→list responses | direct TMDB search, intentional pagination; currently supplied page ignored |
| Movie detail | MovieDetail→useMovieDetail(TMDB route id)→getMovieByTmdbId→GET detail→DB lookup/import→MovieResponse; then parallel people/movie, movies/related, comments by returned LOCAL ID; then by_collection with LOCAL collection ID→header/trailer/genres/cast/collection/related/comments | TMDB detail/credits and independent social state; avoid requiring local catalogue |
| Person detail | PersonDetail→usePersonDetail→getPersonByTmdbId→GET by_tmdb→DB lookup/fetch/update→PersonResponse; then parallel acted/directed/related by LOCAL id→MoviePerson/Movie/Person graph→bio+two filmographies+collaborators | TMDB person/credits plus deliberate collaborator sampling |
| Comments | CommentSection shows form only with token→useMovieDetail.postComment(local id)→POST comments→JWT user+Movie existence→Comment commit; re-fetch GET comments→Comment.user username, newest first→CommentCarousel/Card | TMDB movie reference, same user ownership/order; no deletion feature to preserve |
| Likes/favourites | AuthProvider token→LikeProvider→GET likes→User.likes/user_likes/Movie→MovieListResponse; MovieCard→LikeButton(local id)→context strict `.id` comparison→POST/DELETE like→JWT User+local Movie lookup→association append/remove commit→refresh | unique(user_id,tmdb_movie_id); preserve all legacy sources before cleanup |
| Follows | SocialPage/UserPage/FollowButton→FollowContext→followService→JWT current email + target email→User self many-to-many user_follows; following/followers public profile response, search excludes current user→user cards | keep internal IDs/email contract; no TMDB involvement |
| Recommendations: hero/likes | RecommendationsPage sequential hero/by_likes/people/friends requests→JWT User.likes→get_related_movies_from_likes: exclude liked local IDs; match (any liked person AND any liked genre) OR any liked collection; DISTINCT local Movie, random order, limit hero=3/likes default=10 max=50→MovieListResponse | application-generated algorithm, not TMDB recommendations; fetch metadata in memory, explicitly preserve/revise criteria |
| Recommendations: friends | following internal IDs→Movie join liked_by→followed users' likes excluding own→distinct, random, limit 20 | user relationships in Neon; TMDB enrichment for union of liked IDs |
| Recommendations: people | count each MoviePerson.person across user's liked movies; most_common(10)→PersonResponse | preserve role counting/tie semantics intentionally; no person preference/follow table exists |
| Home hero/random | Home→useHomeData Promise.all(random5,latest10,top10,random_collection,random_people)→local Movie with nonempty backdrop AND tagline, ORDER BY random limit5→HeroMovieSlider | deliberate TMDB pool, retain backdrop/tagline requirements; one rejected home request currently prevents setting all results |
| Home random people | same Promise.all→Person nonempty photo, random limit15→PersonCarousel | intentional TMDB-backed pool |
| Top rated | home/useTopRatedMovies→GET top_rated→local Movie rating DESC offset/limit→carousel/ranked MovieHorizontalCard; page size10 | TMDB rated/discover pool; cached population is not world ranking; NULL ordering currently unspecified |
| Latest | home/useLatestMovies→GET latest→released IS NOT NULL, String released DESC offset/limit→Just Dropped/latest ranked cards | define release geography/date window; future dates currently possible; not automatically TMDB /movie/latest (single item) |
| Collections | CollectionsPage→getCollections→local Collection join Movie, group id, count Movie.id>=2, name sort; first5 displayed, each fetch by_collection(local id,limit20), local movies year ASC; Home random collection chooses uniformly from eligible local collections and includes all associated local movies; detail by_collection defaults limit10→HeroCollection computes mean TMDB ratings/movie count | intentional franchise selection + TMDB collection parts; preserve UI and choose pool deliberately |
| Related movies | detail→GET related(local id)→movie_service: union same-person and same-genre local Movies; exclude self; when collection exists excludes that collection (SQL != also excludes NULL collection candidates); distinct each query then dict local-id dedup, first20, no ranking→carousel | union semantics differ from recommendations; TMDB similar/recs is a product change requiring an explicit decision |
| Genres | name route→Genre lookup→join movie_genres/Movie order title page; Explore loads 3 genres at a time and queries each; registration submits names via same Genre vocabulary | TMDB genre catalogue, separate user preferences including noncanonical names |

No recommendations are persisted, and favorite_genres is NOT currently used by the recommendation algorithm. Person filmographies/collaborators only reflect imported movies; movie importer only stores top 10 actors and one director. Do not silently replace these application algorithms with a TMDB endpoint.

## 8. Proposed target schema (derived from current features)

Keep users columns/password hashes unchanged and `user_follows(follower_id,followed_id)` composite PK/FKs to users. Keep comments internal id, user_id FK, text, created_at; replace movie_id with positive non-null `tmdb_movie_id`, index(tmdb_movie_id), index(user_id). No FK to external movie catalogue.

Consolidate likes only after checking both existing tables: `user_movie_likes(user_id FK users.id, tmdb_movie_id INTEGER NOT NULL CHECK >0, PRIMARY KEY(user_id,tmdb_movie_id))`. Add tmdb_movie_id index for inverse lookup if required. Existing likes have no timestamp; do not invent historical liked_at. A new timestamp can be nullable for legacy records or explicitly marked migration time.

Preferences require a real mapping: `user_genre_preferences(user_id FK users.id, tmdb_genre_id INTEGER NOT NULL CHECK >0, PRIMARY KEY(user_id,tmdb_genre_id))` for canonical TMDB preferences. Preserve unmatched custom genre strings through an explicitly application-owned custom preference relation, or keep legacy user_genres+Genre until decisions resolve them. Examples in the seed/UI such as Sci-Fi/Biography/Sport cannot be blindly mapped by name. Do not drop preferences to satisfy a no-mirror goal.

No Movie/Person/Collection catalogue table. No new recommendation storage, watchlist or ratings table is necessary for current behaviour. If recommendation persistence is later justified, store only user_id, tmdb_movie_id (or tmdb_person_id for a separate people recommendation), score/reason/version/generated_at; avoid title/image metadata. No mirror data qualifies as an immutable activity snapshot in current features. Alembic version metadata is infrastructure, introduced explicitly in a later phase.

## 9. Safe future migration sequence

1. Inspect real PostgreSQL catalog/FKs and both likes tables; reconcile schema drift. Snapshot/Neon branch and record exact row sets/counts for users, follows, comments, user_genres and both likes sources. Never run create_all as a migration.
2. Introduce reviewed Alembic baseline from actual schema. Add nullable comments.tmdb_movie_id and nullable tmdb_movie_id to active user_likes; if likes exists add there too or stage it separately with source ID provenance. Keep old keys/FKs/code working.
3. Backfill each relation by `relation.movie_id = movies.id`, copy **movies.tmdb_id**, not the local number. Keep unmapped/null/nonpositive rows intact and block cutover until manually resolved. Check nullable users in unused likes too.
4. Compare complete comment payloads (id/user/text/timestamp/external mapping), not just counts. Stage likes source ledger with source table, likes.id where present, user_id, local_movie_id, mapped_tmdb_movie_id. Null/duplicate inactive records must remain recoverable. Identify overlap between sources and obtain a documented interpretation before consolidation; do not assume unused means empty.
5. Roll out backend/frontend TMDB social boundaries coherently, using transitional dual-write/read contracts or a brief write pause. Backfill repeatedly under write controls, compare again at cutover. Existing social readers continue working until all callers move. No TMDB-ID Movie FK.
6. Add positive/non-null constraints/indexes and unique user/external movie pair only after checks pass. Where both sources represent the same like, preserve source provenance rather than pretending raw count should equal unique target count. Verify UNION set equality both ways; preserve distinct original users/films.
7. Map all user genre preferences, retain unresolved names. Follows/users remain unchanged. There is no recommendation state to backfill, but compute fixture parity for the existing algorithm before moving candidate selection to TMDB.
8. Stop catalogue import writes, migrate read paths/navigation, and explicitly replace home random/top/latest/collections/people/related/filmography semantics. This may proceed incrementally before social cutover with compatibility endpoints; never remove a social prerequisite first.
9. Remove old catalogue-dependent ORM relationships/cascades and FKs only after behaviour tests and row-set checks. Keep old ID mapping/provenance through rollback window. Stop every old code/seed/admin write path.
10. In a separate explicit migration after audit review: drop mirror association tables, then movies/persons/collections/catalogue-only genres when real catalog shows no dependants. No CASCADE shortcut. Do not drop users, comments, follows/preferences or any unreconciled likes data. Restore/rollback rehearsal is required.

## 10. Integrity queries and acceptance gates

Run on a trusted admin environment/Neon branch; not from web requests. **None were run against a live DB in this pass.** Check table existence first; the optional `likes` queries run only if it exists. Adapt schema qualifier if not public.

```sql
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
SELECT conrelid::regclass AS child, conname, pg_get_constraintdef(oid)
FROM pg_constraint WHERE contype = 'f' ORDER BY conrelid::regclass::text, conname;
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

SELECT 'users' AS entity, count(*) FROM users UNION ALL
SELECT 'user_follows', count(*) FROM user_follows UNION ALL
SELECT 'comments', count(*) FROM comments UNION ALL
SELECT 'user_likes', count(*) FROM user_likes UNION ALL
SELECT 'user_genres', count(*) FROM user_genres UNION ALL
SELECT 'movies', count(*) FROM movies UNION ALL
SELECT 'persons', count(*) FROM persons UNION ALL
SELECT 'movie_persons', count(*) FROM movie_persons UNION ALL
SELECT 'collections', count(*) FROM collections UNION ALL
SELECT 'genres', count(*) FROM genres UNION ALL
SELECT 'movie_genres', count(*) FROM movie_genres;
-- Optional: SELECT count(*) FROM likes;

SELECT c.id, c.user_id, c.movie_id FROM comments c
LEFT JOIN users u ON u.id=c.user_id LEFT JOIN movies m ON m.id=c.movie_id
WHERE u.id IS NULL OR m.id IS NULL OR m.tmdb_id IS NULL OR m.tmdb_id<=0;
SELECT l.* FROM user_likes l
LEFT JOIN users u ON u.id=l.user_id LEFT JOIN movies m ON m.id=l.movie_id
WHERE u.id IS NULL OR m.id IS NULL OR m.tmdb_id IS NULL OR m.tmdb_id<=0;
-- Repeat previous query for likes, including its nullable user_id/movie_id.
SELECT tmdb_id, count(*) FROM movies GROUP BY tmdb_id
HAVING tmdb_id IS NULL OR tmdb_id<=0 OR count(*)>1;
SELECT tmdb_id, count(*) FROM persons GROUP BY tmdb_id
HAVING tmdb_id IS NULL OR tmdb_id<=0 OR count(*)>1;
SELECT l.user_id, m.tmdb_id, count(*) FROM user_likes l
JOIN movies m ON m.id=l.movie_id GROUP BY l.user_id,m.tmdb_id HAVING count(*)>1;

-- After additive backfill, all mismatch counts must equal zero.
SELECT count(*) FROM comments c LEFT JOIN movies m ON m.id=c.movie_id
WHERE c.tmdb_movie_id IS NULL OR c.tmdb_movie_id<=0
OR c.tmdb_movie_id IS DISTINCT FROM m.tmdb_id;
SELECT count(*) FROM user_likes l LEFT JOIN movies m ON m.id=l.movie_id
WHERE l.tmdb_movie_id IS NULL OR l.tmdb_movie_id<=0
OR l.tmdb_movie_id IS DISTINCT FROM m.tmdb_id;

-- Cross-source collisions; optional likes must exist for this statement.
WITH sources AS (
 SELECT 'user_likes' AS source, l.user_id,m.tmdb_id FROM user_likes l
 LEFT JOIN movies m ON m.id=l.movie_id
 UNION ALL
 SELECT 'likes',l.user_id,m.tmdb_id FROM likes l
 LEFT JOIN movies m ON m.id=l.movie_id
)
SELECT user_id,tmdb_id,count(*),array_agg(source) FROM sources
GROUP BY user_id,tmdb_id HAVING count(*)>1 OR user_id IS NULL OR tmdb_id IS NULL;

-- Target equals mapped UNION of sources in both directions.
-- Remove optional likes arm only after verifying it is absent/empty.
WITH expected AS (
 SELECT l.user_id,m.tmdb_id AS tmdb_movie_id FROM user_likes l
 JOIN movies m ON m.id=l.movie_id
 UNION
 SELECT l.user_id,m.tmdb_id FROM likes l JOIN movies m ON m.id=l.movie_id
)
SELECT * FROM expected EXCEPT SELECT user_id,tmdb_movie_id FROM user_movie_likes;
WITH expected AS (
 SELECT l.user_id,m.tmdb_id AS tmdb_movie_id FROM user_likes l JOIN movies m ON m.id=l.movie_id
 UNION SELECT l.user_id,m.tmdb_id FROM likes l JOIN movies m ON m.id=l.movie_id
)
SELECT user_id,tmdb_movie_id FROM user_movie_likes EXCEPT SELECT * FROM expected;

-- Preference preservation and mapping blockers.
SELECT ug.user_id,ug.genre_id,g.name FROM user_genres ug
LEFT JOIN users u ON u.id=ug.user_id LEFT JOIN genres g ON g.id=ug.genre_id
WHERE u.id IS NULL OR g.id IS NULL OR g.name IS NULL;
SELECT DISTINCT g.id,g.name FROM genres g JOIN user_genres ug ON ug.genre_id=g.id;
SELECT f.* FROM user_follows f LEFT JOIN users a ON a.id=f.follower_id
LEFT JOIN users b ON b.id=f.followed_id WHERE a.id IS NULL OR b.id IS NULL;
```

Store a migration baseline `comments_before(id,user_id,tmdb_movie_id,text,created_at)` in the trusted migration workspace/backup. Compare that tuple against final comments with `EXCEPT` in **both directions** while writes are paused (or compare baseline IDs only when legitimate new writes are allowed). Both results must be empty and original IDs/counts unchanged. Similarly compare complete users, follows and preference tuples. Match likes raw counts to the provenance ledger and distinct mapped pairs to target count. Zero unmapped/orphaned original records and zero unexplained loss are hard gates. Verify all PK/unique/check/index constraints in pg_catalog, no FK to removed tables, and application retrieval of historical comments/likes by the correct TMDB ID. Add behavioural registration/login/follow/comment/like tests and zero-catalogue-write tests before cutover.

## 11. Eventual deletion candidates — retained now

- models/{movie,person,movie_person,collection}.py only after callers/FKs gone; catalogue portion of genre.py/movie_genres, not preference data.
- models/like.py only after deployed `likes` contents reconciled; User.likes secondary graph after TMDB-ID relation is active.
- importer functions in services/postgres/movie_service.py; cache-filling get_or_fetch functions in movie/person services, replaced local-only list/graph helpers after intentional feature replacements. These files contain useful responsibilities: no blanket deletion.
- catalogue-dependent schemas/ORM transformers in schemas/movie.py/person.py/genre.py; retain/adapt frontend response contracts until switch.
- unused schemas/friend.py after usage proof; seed script's importer behaviour and hard-coded IDs; stale Neo4j resource example after review.
- back/Dockerfile production command, front/Dockerfile/nginx.conf, compose production guidance, local psycopg2/Uvicorn dependencies only when their replacement is verified. Docker may stay for local PostgreSQL.
- frontend obsolete methods/types only after new services/hooks are in use. No UI/framework/router replacement proposed.

## 12. Cloudflare compatibility findings and official sources

Verified official pages on 2026-10-02:

- [FastAPI/ASGI](https://developers.cloudflare.com/workers/languages/python/packages/fastapi/): native Workers ASGI adapter and Python pyproject workflow. Minimal shell should use `workers.asgi`, not launch Uvicorn.
- [Python package support](https://developers.cloudflare.com/workers/languages/python/packages/): Python/PyEmscripten/Pyodide package constraints; development tooling is workers-py + workers-runtime-sdk/pywrangler. A CPython installation is not runtime proof.
- [Python Workers + Hyperdrive](https://developers.cloudflare.com/hyperdrive/examples/python-workers/): date >=2026-09-08; PostgreSQL asyncpg, pg8000 and psycopg listed, synchronous SQLAlchemy supported; no async SQLAlchemy greenlet support. Binding provides host/port/user/password/database. Concurrency serialization guidance must be evaluated for request sessions.

Risks: legacy psycopg2-binary native package is not the documented psycopg driver; global eager engine/import graph blocks credential-free health; sync FastAPI routes/dependencies may exercise threadpool behaviours under Workers; bcrypt/passlib and JWT native/transitive packages need Worker validation; synchronous httpx network calls and request time/resource limits need checks. Do not replace drivers or ORM until SELECT/DML/rollback/session cleanup tests prove a chosen runtime path. Prefer pg8000 as a future pure-Python candidate, not an already-verified application driver.

Configuration presently depends on implicit dotenv/import-time constants, production CORS is wildcard+credentials, static routing/API exclusion absent, schema creation coupled to Docker startup, no trusted migration tooling, and no Hyperdrive/Neon binding. No deployed Worker, real TMDB requests, DB transaction suite or Static Assets behaviour has been tested. No credential leaks found in frontend source, but built deployment configuration needs independent verification.

## 13. Baseline validation and existing defects

Environment: Windows PowerShell, Node 24.19.0/npm 11.17.0; PyCharm initially had no interpreter and its tool created `.venv` Python 3.13.5/pip. No uv/pywrangler command initially present. Dependencies installed into that isolated venv; frontend installed from existing lockfile, no dependency manifest changes.

| Check | Exact result |
|---|---|
| `npm ci` (front) | exit 0; 234 packages installed, 235 audited; 21 advisories (3 low, 3 moderate, 14 high, 1 critical); no automatic upgrade applied |
| `npm run lint` (front) | exit 0, 0 errors, 6 pre-existing warnings: FollowContext(2), LikeContext(2), useMoviesByGenre(1), CollectionsPage(1) |
| `npm run build` (front) | exit 0; tsc + Vite 6.3.2; 481 modules, JS 388.19 kB, CSS 32.31 kB |
| `python -m pip install -r back/requirements.txt` using configured executable | exit 0; resolved bcrypt 5.0.0/passlib 1.7.4 |
| Import existing app with placeholder env (no DB connection) | succeeded, 41 application operations; Pydantic V2 warns GenreResponse orm_mode renamed |
| Existing password hashing smoke (`get_password_hash('audit-password')`) | FAILED: bcrypt version lookup warning then ValueError claiming password >72 bytes for a short password; existing unbounded bcrypt/passlib compatibility defect, not redesigned/fixed in this pass |
| Existing backend/frontend automated tests | none found; test_main.http only two stale examples, seed script is not a test |
| Live DB / TMDB / Cloudflare / Hyperdrive | not available; not claimed successful |

Other existing defects kept separate from migration: search page ignored/title-only dedup; likes missing Movie may append None/error; no follow self-check; request favorite_genres may be null despite iteration; profile edit button has no implementation; /users/me returns Genre objects where frontend expects strings; Person photo transformations sometimes return full URL while frontend prepends base again; movie list 'director' assumes first credit instead of filtering role; missing trailer helper produces embed/undefined; future/NULL dates/ratings and related NULL collection exclusion require deliberate decisions. No changes to these behaviours are authorized here.

## 14. First-pass foundation and next phase

No schema changes/data backfill performed. Recommended next: review this audit, introduce the coherent TMDB read gateway with no DB imports/writes, migrate search/detail callers incrementally while retaining legacy social compatibility, and separately establish a verified Worker-compatible PostgreSQL/Hyperdrive transaction harness before mounting the legacy API in Workers. Comments/likes migration remains additive and later; catalogue deletion remains explicitly deferred.

### Files created in this pass

- `docs/MIGRATION_AUDIT.md` (this audit, integrity runbook and line evidence).
- `docs/LOCAL_DEVELOPMENT.md` (real setup, runtime boundary and blockers).
- Root `.gitignore`, `.dev.vars.example`, `pyproject.toml`, generated `pylock.toml`, `wrangler.jsonc`.
- `back/.env.example`, `front/.env.example` (placeholder/public configuration only).
- `back/app/application.py` (shared factory and async liveness endpoint), `back/app/worker.py` (native Workers ASGI adapter).
- `back/tests/test_foundation.py` (7 meaningful tests, no live external services).

Modified: `back/app/core/config.py` (explicit env, clear required-value/expiry validation, restricted configurable CORS), `back/app/main.py` (factory preserving all six legacy routers), `README.md` (accurate transitional status and documentation links). No tracked model/service/schema/frontend logic/dependency manifest was changed. Temporary new back/pyproject.toml, back/wrangler.jsonc, back/.dev.vars.example and back/worker.py were relocated to the final paths above; no pre-existing file was deleted.

### Behaviour and runtime status

Local `app.main:app` keeps the 41 existing operations and adds GET `/api/health`; its import requires explicit env, no implicit dotenv. Local origins must be configured when not in defaults; production has no CORS unless explicit origins are supplied. JWT, social persistence, recommendation computation, catalogue import and UI semantics are unchanged. Schema changes = **none**; data migration = **none**; no DB/TMDB request was performed.

Worker uses the shared factory with **legacy API disabled**. It starts in local Wrangler and GET `/api/health` returns 200 `{"status":"ok"}`. GET `/api/v1/users/me` returns 404 in Worker, intentionally documenting the incomplete migration. The phase-2 plan's existing-endpoint-on-Worker acceptance remains **not met**. Native legacy packages and live database validation block mounting it; no driver/ORM replacement was attempted. A healthy shell is not proof of deployed app readiness. No Cloudflare deployment was executed.

### Exact validation/runtime commands and results

Commands below are PowerShell, executable paths chosen from PyCharm environment tools. Those tools initially configured root `.venv`, then briefly configured `back/.venv` after project metadata changed; final configured interpreter returned to root `.venv`. Both are ignored generated local environments. Tool calls also read instruction/source files, enumerated `git ls-files`/`rg --files`, searched identifiers (`rg -n` appendix), inspected package/tool configuration and fetched the linked official pages. They did not mutate external services. Validation commands are reproduced here, including failed attempts.

From repository root unless a different cwd is stated:

```powershell
node --version
npm --version
Get-Command uv,pywrangler,docker -ErrorAction SilentlyContinue
git status --short
git ls-files
git diff --stat
git diff --check
& 'C:/Proyectos/MovieGraph-App/.venv/Scripts/python.exe' -m pip install -r back/requirements.txt
```

Versions: Node 24.19.0, npm 11.17.0. Initial uv/pywrangler absent; Docker executable present (daemon not tested). pip exit 0. git diff --check exit 0 (line-ending notices only). Inspections/reads succeeded apart from an initial attempt to read a nonexistent root .gitignore (subsequently created). No destructive commands.

From `front`:

```powershell
npm ci
npm run lint
npm run build
```

All exit 0; exact warning/advisory/build totals in baseline section. These checks preceded implementation and remain applicable because no frontend source/build config/dependency file was modified. No frontend test script exists.

Baseline smoke, cwd root (placeholder env; no connection):

```powershell
$env:PYTHONPATH='C:/Proyectos/MovieGraph-App/back'; $env:SECRET_KEY='audit-placeholder-not-a-secret'; $env:ACCESS_TOKEN_EXPIRE_MINUTES='30'; $env:JWT_ALGORITHM='HS256'; $env:TMDB_API_KEY='audit-placeholder'; $env:DATABASE_URL='postgresql://audit:audit@127.0.0.1:5432/audit'; @'
from app.main import app
print('API operations:', sum(len(r.methods - {'HEAD', 'OPTIONS'}) for r in app.routes if r.path.startswith('/api/v1')))
from app.services.postgres.user_service import get_password_hash
try:
    get_password_hash('audit-password')
    print('Password hashing: PASS')
except Exception as exc:
    print('Password hashing:', type(exc).__name__, str(exc))
'@ | & 'C:/Proyectos/MovieGraph-App/.venv/Scripts/python.exe' -
```

Process exit 0 because smoke caught the exception; **hash check FAILED**, not a passing auth test. 41 API operations imported.

Tooling installs (both exit 0; requirements auto-installed by IDE in back environment):

```powershell
& 'C:/Proyectos/MovieGraph-App/.venv/Scripts/python.exe' -m pip install workers-py workers-runtime-sdk uv
& 'C:/Proyectos/MovieGraph-App/back/.venv/Scripts/python.exe' -m pip install workers-py workers-runtime-sdk uv
```

Resolved CLI workers-py 1.17.6, workers-runtime-sdk 1.9.2, uv 0.12.22; retained runtime lockfile records Pyodide-compatible packages. No local pip packages were added to requirements.txt.

Foundation suite, cwd `back`:

```powershell
& 'C:/Proyectos/MovieGraph-App/back/.venv/Scripts/python.exe' -m unittest discover -s tests -v
& 'C:/Proyectos/MovieGraph-App/.venv/Scripts/python.exe' -m unittest discover -s tests -v
```

Both exit 0, **7/7 tests pass** (4.649s first, 2.712s final after entrypoint/config relocation). CPython emits an existing platform-library-prefix warning; subprocess tests still pass. Tests cover liveness/import isolation, 41 local operations and HTTP 401/422 validations, secret-free error messages, expiry validation, local CORS allow/deny, no production CORS and wildcard rejection. They do not validate database transactions or real login.

Failed tooling attempts:

```powershell
# cwd back
$env:PATH='C:/Proyectos/MovieGraph-App/back/.venv/Scripts;' + $env:PATH; & 'C:/Proyectos/MovieGraph-App/back/.venv/Scripts/uv.exe' run --no-sync pywrangler dev
$env:PATH='C:/Proyectos/MovieGraph-App/back/.venv/Scripts;' + $env:PATH; & 'C:/Proyectos/MovieGraph-App/back/.venv/Scripts/python.exe' -m pywrangler dev
```

First exit 1: uv isolated interpreter query fails missing encodings. Second exit 1: pywrangler rejects a requirements.txt beside pyproject. Fixed working-directory conflict by keeping root Worker configuration and preserving back/requirements.txt for local API. Additional diagnostic commands read pyvenv.cfg/installed CLI source and printed Python sys.base_prefix/sys.path; no system Python installation was modified.

Root startup attempts:

```powershell
$env:PATH='C:/Proyectos/MovieGraph-App/back/.venv/Scripts;' + $env:PATH; & 'C:/Proyectos/MovieGraph-App/back/.venv/Scripts/python.exe' -m pywrangler dev
$env:PATH='C:/Proyectos/MovieGraph-App/.venv/Scripts;' + $env:PATH; & 'C:/Proyectos/MovieGraph-App/.venv/Scripts/python.exe' -m pywrangler dev *> .wrangler/health-dev.log
```

First root run reached Ready and health 200 but bundled the back venv. An intermediate rule experiment (same second command) failed configuration validation: PythonModule is not a permitted custom rule type; rule removed. Final entrypoint moved to back/app/worker.py; second command then reached Ready, health verified again; local server stopped with Ctrl-C. CLI selected managed CPython 3.14.8 and Pyodide 3.14.2 for compatibility date, generated runtime pylock.toml and ignored tooling directories. No cloud account needed for these local checks. Logs are ignored. Standard `uv run pywrangler dev` remains unverified on this machine because of isolated CPython discovery; direct module invocation worked.

Actual HTTP probes, cwd root (run against both successful local Worker starts):

```powershell
Invoke-RestMethod -Uri http://127.0.0.1:8787/api/health -TimeoutSec 15 | ConvertTo-Json -Compress
try { Invoke-WebRequest -Uri http://127.0.0.1:8787/api/v1/users/me -UseBasicParsing -TimeoutSec 15 } catch { Write-Output ('Legacy Worker request HTTP status: ' + [int]$_.Exception.Response.StatusCode) }
```

Health HTTP 200 / status ok; legacy Worker HTTP 404. Full DB-backed API endpoint success in Worker, SELECT/DML/rollback/session-cleanup, real registration/login, live TMDB errors, Neon/Hyperdrive, production deployment, static assets/SPA fallback and SQL integrity checks were **not run**. No backend lint/typecheck tool is configured; none is claimed.

### Current blockers and assumptions to verify

- Real PostgreSQL schema/data inventory, optional likes table contents and mappings, genre preference vocabulary and integrity query outcomes.
- Worker-compatible driver/SQLAlchemy session transactions, synchronous route scheduling, secret/binding configuration and native auth package compatibility.
- Existing passlib 1.7.4/bcrypt 5.0.0 short-password hashing failure; 21 npm advisories; baseline Pydantic warning and six lint warnings.
- TMDB/Neon/Hyperdrive/Cloudflare credentials and binding identifiers absent; deployed behaviour remains unverified.
- Deliberate TMDB-backed home/collections/latest/related/collaborator pool semantics and recommendation parity decisions; no silent algorithm replacement.
- Root and back virtual environments were generated by IDE tooling; Windows interpreter discovery still needs repair for normal uv launch. Worker liveness via direct module invocation is proven locally, not in production.

## 15. Baseline line-level identifier evidence

Direct references supplement the implicit relationship/caller inventory above. Captured before runtime/config edits.

```text
back/resources\populate_via_api.py:254:                    params={"movie_id": id},
back/resources\populate_via_api.py:259:    seen_tmdb_ids = set()
back/resources\populate_via_api.py:265:                tmdb_id = result.get("tmdb_id")
back/resources\populate_via_api.py:266:                if tmdb_id and tmdb_id not in seen_tmdb_ids:
back/resources\populate_via_api.py:267:                    detail_resp = httpx.get(f"{BASE_URL}/movies/detail", params={"tmdb_id": tmdb_id})
back/resources\populate_via_api.py:270:                        seen_tmdb_ids.add(tmdb_id)
back/resources\populate_via_api.py:273:                    print(f"Already saved or missing tmdb_id for: {title}")
back/resources\populate_via_api.py:294:                "movie_id": 577922,
back/app\services\tmdb_service.py:23:            tmdb_id=m["id"],
back/app\services\tmdb_service.py:32:def fetch_movie_data_by_tmdb(tmdb_id: int) -> Optional[dict]:
back/app\services\tmdb_service.py:33:    movie_url = f"{TMDB_BASE_URL}/movie/{tmdb_id}"
back/app\services\tmdb_service.py:34:    credits_url = f"{TMDB_BASE_URL}/movie/{tmdb_id}/credits"
back/app\services\tmdb_service.py:35:    videos_url = f"{TMDB_BASE_URL}/movie/{tmdb_id}/videos"
back/app\services\tmdb_service.py:59:            "tmdb_id": cast.get("id"),
back/app\services\tmdb_service.py:70:        "tmdb_id": movie.get("id"),
back/app\services\tmdb_service.py:78:            "tmdb_id": director_data.get("id") if director_data else None,
back/app\services\tmdb_service.py:93:            "tmdb_id": collection["id"],
back/app\services\tmdb_service.py:100:def fetch_person_data_by_tmdb(tmdb_id: int) -> Optional[dict]:
back/app\services\tmdb_service.py:101:    url = f"{TMDB_BASE_URL}/person/{tmdb_id}"
back/app\services\tmdb_service.py:111:        "tmdb_id": p.get("id"),
back/app\services\postgres\recommendation_service.py:27:    liked_ids = {m.id for m in user.likes}
back/app\services\postgres\recommendation_service.py:33:        db.query(Movie.id)
back/app\services\postgres\recommendation_service.py:36:        .filter(~Movie.id.in_(liked_ids))
back/app\services\postgres\recommendation_service.py:43:        .filter(Movie.id.in_(select(subquery)))
back/app\services\postgres\recommendation_service.py:68:            id=person.id,
back/app\services\postgres\recommendation_service.py:69:            tmdb_id=person.tmdb_id,
back/app\services\postgres\recommendation_service.py:80:    liked_ids = {m.id for m in liked_movies}
back/app\services\postgres\recommendation_service.py:85:    person_ids = {mp.person_id for m in liked_movies for mp in m.movie_persons}
back/app\services\postgres\recommendation_service.py:90:        db.query(Movie.id)
back/app\services\postgres\recommendation_service.py:92:            Movie.id.notin_(liked_ids),
back/app\services\postgres\recommendation_service.py:95:                    Movie.movie_persons.any(MoviePerson.person_id.in_(person_ids)),
back/app\services\postgres\recommendation_service.py:107:        .filter(Movie.id.in_(select(subquery.c.id)))
back/app\services\postgres\person_service.py:20:            id=p.id,
back/app\services\postgres\person_service.py:21:            tmdb_id=p.tmdb_id,
back/app\services\postgres\person_service.py:27:def get_or_fetch_person_by_tmdb_id(tmdb_id: int, db: Session) -> PersonResponse:
back/app\services\postgres\person_service.py:28:    person = db.query(Person).filter_by(tmdb_id=tmdb_id).first()
back/app\services\postgres\person_service.py:32:            id=person.id,
back/app\services\postgres\person_service.py:33:            tmdb_id=person.tmdb_id,
back/app\services\postgres\person_service.py:41:    data = fetch_person_data_by_tmdb(tmdb_id)
back/app\services\postgres\person_service.py:56:        id=person.id,
back/app\services\postgres\person_service.py:57:        tmdb_id=person.tmdb_id,
back/app\services\postgres\person_service.py:65:def get_person_detail(person_id: int, db: Session) -> PersonResponse:
back/app\services\postgres\person_service.py:66:    person = db.query(Person).filter(Person.id == person_id).first()
back/app\services\postgres\person_service.py:70:        id=person.id,
back/app\services\postgres\person_service.py:71:        tmdb_id=person.tmdb_id,
back/app\services\postgres\person_service.py:76:def get_person_filmography(person_id: int, db: Session) -> List[MovieListResponse]:
back/app\services\postgres\person_service.py:77:    roles = db.query(Movie).join(MoviePerson).filter(MoviePerson.person_id == person_id).all()
back/app\services\postgres\person_service.py:80:def get_filmography_as_actor(person_id: int, db: Session) -> List[MovieListResponse]:
back/app\services\postgres\person_service.py:82:        MoviePerson.person_id == person_id,
back/app\services\postgres\person_service.py:87:def get_filmography_as_director(person_id: int, db: Session) -> List[MovieListResponse]:
back/app\services\postgres\person_service.py:89:        MoviePerson.person_id == person_id,
back/app\services\postgres\person_service.py:94:def list_people_by_movie_id(movie_id: int, db: Session) -> List[PersonWithRoleResponse]:
back/app\services\postgres\person_service.py:95:    movie = db.query(Movie).filter(Movie.id == movie_id).first()
back/app\services\postgres\person_service.py:106:        pid = mp.person.id
back/app\services\postgres\person_service.py:110:                "tmdb_id": mp.person.tmdb_id,
back/app\services\postgres\person_service.py:124:            tmdb_id=p["tmdb_id"],
back/app\services\postgres\person_service.py:133:def get_related_people_by_person_id(person_id: int, db: Session) -> List[PersonResponse]:
back/app\services\postgres\person_service.py:134:    movie_ids = db.query(MoviePerson.movie_id).filter(
back/app\services\postgres\person_service.py:135:        MoviePerson.person_id == person_id
back/app\services\postgres\person_service.py:139:        MoviePerson.movie_id.in_(select(movie_ids)),
back/app\services\postgres\person_service.py:140:        MoviePerson.person_id != person_id
back/app\services\postgres\person_service.py:147:            id=p.id,
back/app\services\postgres\person_service.py:148:            tmdb_id=p.tmdb_id,
back/app\services\postgres\person_service.py:166:            id=p.id,
back/app\services\postgres\person_service.py:167:            tmdb_id=p.tmdb_id,
back/app\services\postgres\movie_service.py:42:            existing = db.query(Movie).filter_by(tmdb_id=r["id"]).first()
back/app\services\postgres\movie_service.py:65:    # Verificar si ya existe por tmdb_id
back/app\services\postgres\movie_service.py:66:    existing = db.query(Movie).filter_by(tmdb_id=data["tmdb_id"]).first()
back/app\services\postgres\movie_service.py:72:        collection = db.query(Collection).filter_by(tmdb_id=data["collection"]["tmdb_id"]).first()
back/app\services\postgres\movie_service.py:75:                tmdb_id=data["collection"]["tmdb_id"],
back/app\services\postgres\movie_service.py:85:        tmdb_id=data["tmdb_id"],
back/app\services\postgres\movie_service.py:118:            person_id=person.id,
back/app\services\postgres\movie_service.py:119:            movie_id=movie.id,
back/app\services\postgres\movie_service.py:128:            person_id=person.id,
back/app\services\postgres\movie_service.py:129:            movie_id=movie.id,
back/app\services\postgres\movie_service.py:140:    person = db.query(Person).filter_by(tmdb_id=person_data["tmdb_id"]).first()
back/app\services\postgres\movie_service.py:145:        tmdb_id=person_data["tmdb_id"],
back/app\services\postgres\movie_service.py:166:def get_movie_by_id(movie_id: int, db: Session) -> MovieResponse:
back/app\services\postgres\movie_service.py:167:    movie = db.query(Movie).filter(Movie.id == movie_id).first()
back/app\services\postgres\movie_service.py:173:def get_related_movies_by_people_and_genres(movie_id: int, db: Session) -> List[Movie]:
back/app\services\postgres\movie_service.py:174:    movie = db.query(Movie).filter(Movie.id == movie_id).first()
back/app\services\postgres\movie_service.py:178:    people_ids = [mp.person_id for mp in movie.movie_persons]
back/app\services\postgres\movie_service.py:183:        MoviePerson.person_id.in_(people_ids),
back/app\services\postgres\movie_service.py:184:        Movie.id != movie.id
back/app\services\postgres\movie_service.py:188:        Movie.id != movie.id
back/app\services\postgres\movie_service.py:211:    all_related = {m.id: m for m in related_by_people + related_by_genres}.values()
back/app\services\postgres\movie_service.py:215:def get_or_fetch_movie_by_tmdb_id(tmdb_id: int, db: Session) -> MovieResponse:
back/app\services\postgres\movie_service.py:216:    movie = db.query(Movie).filter_by(tmdb_id=tmdb_id).first()
back/app\services\postgres\movie_service.py:220:    data = fetch_movie_data_by_tmdb(tmdb_id)
back/app\services\postgres\movie_service.py:243:        .having(func.count(Movie.id) >= 2)
back/app\services\postgres\movie_service.py:253:        tmdb_id=selected.tmdb_id,
front/src\contexts\LikeContext.tsx:32:            if (likes.some((m) => m.id === movieId)) {
front/src\contexts\LikeContext.tsx:43:    const isLiked = (movieId: string) => likes.some((m) => m.id === movieId);
back/app\services\postgres\comment_service.py:12:    movie = db.query(Movie).filter_by(id=comment.movie_id).first()
back/app\services\postgres\comment_service.py:21:        movie_id=movie.id,
back/app\services\postgres\comment_service.py:35:def list_movie_comments(db: Session, movie_id: int):
back/app\services\postgres\comment_service.py:38:        .filter_by(movie_id=movie_id)
front/src\types\person.ts:3:    tmdb_id: string;
front/src\types\movie.ts:5:    tmdb_id: number;
front/src\hooks\movie\useMovieDetail.ts:68:            await postComment(movie.id, text);
front/src\hooks\movie\useMovieDetail.ts:69:            const updatedComments = await getCommentsByMovie(movie.id);
front/src\pages\categories\TopRatedPage.tsx:17:                        key={movie.tmdb_id}
front/src\pages\categories\LatestReleasesPage.tsx:17:                        key={movie.tmdb_id}
front/src\types\collection.ts:5:    tmdb_id: string;
front/src\services\commentService.ts:6:    const res = await api.get(API_COMMENTS, { params: { movie_id: movieId } });
front/src\services\commentService.ts:11:    await api.post(API_COMMENTS, { movie_id: movieId, text });
back/app\api\v1\comments.py:24:    movie_id: int = Query(...),
back/app\api\v1\comments.py:27:    return list_movie_comments(db, movie_id)
front/src\services\peopleService.ts:7:    const res = await api.get(`${API_PEOPLE}movie`, { params: { movie_id: movieId } });
front/src\services\peopleService.ts:12:    const res = await api.get(`${API_PEOPLE}by_tmdb`, { params: { tmdb_id: personId } });
front/src\services\peopleService.ts:17:    const res = await api.get(`${API_PEOPLE}acted`, { params: { person_id: personId } });
front/src\services\peopleService.ts:22:    const res = await api.get(`${API_PEOPLE}directed`, { params: { person_id: personId } });
front/src\services\peopleService.ts:27:    const res = await api.get(`${API_PEOPLE}related`, { params: { person_id: personId } });
back/app\schemas\person.py:10:    tmdb_id: int
back/app\api\v1\people.py:12:    list_people_by_movie_id,
back/app\api\v1\people.py:18:    get_or_fetch_person_by_tmdb_id,
back/app\api\v1\people.py:19:    get_related_people_by_person_id, get_random_people_list
back/app\api\v1\people.py:32:def get_person(person_id: int = Query(...), db: Session = Depends(get_db)):
back/app\api\v1\people.py:33:    return get_person_detail(person_id, db)
back/app\api\v1\people.py:36:def get_filmography(person_id: int = Query(...), db: Session = Depends(get_db)):
back/app\api\v1\people.py:37:    return get_person_filmography(person_id, db)
back/app\api\v1\people.py:40:def acted_movies(person_id: int = Query(...), db: Session = Depends(get_db)):
back/app\api\v1\people.py:41:    return get_filmography_as_actor(person_id, db)
back/app\api\v1\people.py:44:def directed_movies(person_id: int = Query(...), db: Session = Depends(get_db)):
back/app\api\v1\people.py:45:    return get_filmography_as_director(person_id, db)
back/app\api\v1\people.py:49:        movie_id: int = Query(...),
back/app\api\v1\people.py:52:    return list_people_by_movie_id(movie_id, db)
back/app\api\v1\people.py:55:def get_person_by_tmdb_id(
back/app\api\v1\people.py:56:    tmdb_id: int = Query(...),
back/app\api\v1\people.py:59:    return get_or_fetch_person_by_tmdb_id(tmdb_id, db)
back/app\api\v1\people.py:63:    person_id: int = Query(...),
back/app\api\v1\people.py:66:    return get_related_people_by_person_id(person_id, db)
back/app\api\v1\movies.py:26:    get_or_fetch_movie_by_tmdb_id,
back/app\api\v1\movies.py:55:def get_movie(movie_id: int = Query(...), db: Session = Depends(get_db)):
back/app\api\v1\movies.py:56:    movie = get_movie_by_id(movie_id, db)
back/app\api\v1\movies.py:63:        movie_id: int = Query(...),
back/app\api\v1\movies.py:68:    movie = db.query(Movie).filter(Movie.id == movie_id).first()
back/app\api\v1\movies.py:76:        movie_id: int = Query(...),
back/app\api\v1\movies.py:81:    movie = db.query(Movie).filter(Movie.id == movie_id).first()
back/app\api\v1\movies.py:101:        movie_id: int = Query(...),
back/app\api\v1\movies.py:104:    movies = get_related_movies_by_people_and_genres(movie_id, db)
back/app\api\v1\movies.py:112:def get_movie_by_tmdb_id(
back/app\api\v1\movies.py:113:    tmdb_id: int = Query(...),
back/app\api\v1\movies.py:116:    return get_or_fetch_movie_by_tmdb_id(tmdb_id, db)
back/app\api\v1\movies.py:137:        .having(func.count(Movie.id) >= 2)
back/app\schemas\movie.py:10:    tmdb_id: int
back/app\schemas\movie.py:21:    tmdb_id: int
back/app\schemas\movie.py:28:    tmdb_id: int
back/app\schemas\movie.py:55:    tmdb_id: int
back/app\schemas\movie.py:63:        id=str(movie.id),
back/app\schemas\movie.py:64:        tmdb_id=movie.tmdb_id,
back/app\schemas\movie.py:81:            tmdb_id=movie.collection.tmdb_id,
back/app\schemas\movie.py:96:        id=movie.id,
back/app\schemas\movie.py:97:        tmdb_id=movie.tmdb_id,
back/app\schemas\comment.py:5:    movie_id: int
front/src\services\moviesService.ts:37:        params: { movie_id: movieId },
front/src\services\moviesService.ts:44:        params: { tmdb_id: tmdbId },
front/src\services\moviesService.ts:73:        params: { movie_id: movieId },
front/src\services\moviesService.ts:80:        params: { movie_id: movieId },
front/src\components\hero\HeroMovieSlider.tsx:23:        navigate(`/movie/${movies[currentIndex].tmdb_id}`);
front/src\components\hero\HeroMovieSlider.tsx:74:                        key={movie.tmdb_id}
back/app\models\comment.py:13:    movie_id = Column(Integer, ForeignKey("movies.id"), nullable=False)
front/src\components\search\SearchBar.tsx:37:    const handleSelect = (tmdb_id: number) => {
front/src\components\search\SearchBar.tsx:38:        navigate(`/movie/${tmdb_id}`);
front/src\components\search\SearchBar.tsx:67:                            key={movie.tmdb_id}
front/src\components\search\SearchBar.tsx:68:                            onClick={() => handleSelect(movie.tmdb_id)}
back/app\models\movie.py:11:    tmdb_id = Column(Integer, unique=True, index=True, nullable=False)
front/src\components\movie\MovieCard.tsx:16:        navigate(`/movie/${movie.tmdb_id}`);
front/src\components\movie\MovieCard.tsx:32:                <LikeButton movieId={movie.id}/>
front/src\components\movie\MovieCarouselOverlay.tsx:15:                    <div key={movie.tmdb_id} className="snap-start shrink-0">
back/app\models\like.py:10:    movie_id = Column(Integer, ForeignKey("movies.id"))
back/app\models\like.py:12:    __table_args__ = (UniqueConstraint("user_id", "movie_id", name="unique_user_movie_like"),)
back/app\models\user.py:19:    Column("movie_id", Integer, ForeignKey("movies.id"), primary_key=True),
back/app\models\collection.py:11:    tmdb_id = Column(Integer, unique=True, nullable=False)
back/app\models\movie_person.py:11:    movie_id = Column(Integer, ForeignKey("movies.id"))
back/app\models\movie_person.py:12:    person_id = Column(Integer, ForeignKey("persons.id"))
back/app\models\person.py:11:    tmdb_id = Column(Integer, unique=True, index=True)
front/src\components\movie\MovieGrid.tsx:16:                    <MovieCard key={movie.tmdb_id} movie={movie} />
back/app\models\genre.py:8:    Column("movie_id", ForeignKey("movies.id"), primary_key=True),
front/src\components\person\PersonCarousel.tsx:22:                        <div key={person.tmdb_id} className="snap-start shrink-0">
front/src\components\person\PersonCard.tsx:15:        navigate(`/person/${person.tmdb_id}`);
front/src\components\movie\MovieHorizontalCard.tsx:28:            onClick={() => navigate(`/movie/${movie.tmdb_id}`)}
```
