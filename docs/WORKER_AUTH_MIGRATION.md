# Worker account migration — 2026-10-07

## Scope and implementation

The limited MovieGraph Worker now has an optional account API for the existing
frontend contract:

- `POST /api/v1/users/` registers email, username, password, birthdate, bio and
  favorite genre names.
- `POST /api/v1/users/login` accepts the existing URL-encoded email/password
  form and returns the existing Bearer JWT shape.
- `GET /api/v1/users/me` returns the existing account profile and preferences.

The implementation uses the social SQLAlchemy Core tables, not the legacy ORM
or catalogue graph. Registration keeps duplicate email/username conflicts and
does not create a `Movie`, `Genre`, or other catalogue row. JWT subject remains
the account email, and the existing expiry/signature validation remains in
place. The API is opt-in through `include_account_api`; it defaults off in the
Worker entrypoints until the database rollout gate below is complete.

Passwords use direct bcrypt calls with cost 12. Verification accepts existing
`$2a$`/`$2b$` bcrypt hashes; a fixed historical `$2a$` test vector passes. Input
bytes are truncated at the bcrypt 72-byte limit, preserving the legacy bcrypt
behavior. Passlib remains in the local legacy runtime only. Cloudflare's current
[Python package documentation](https://developers.cloudflare.com/workers/languages/python/packages/)
lists Pyodide-supported packages; bcrypt 5.0.0 is included in the matching
Pyodide package set. The locked Worker package uses the PyEmscripten wheel.

## Migration and preference preservation

Alembic revision `20261007_00` follows `20261006_01`. It is additive and:

- refuses missing/partial `users` schemas and duplicate usernames;
- adds a unique username index;
- creates `user_genre_preferences(user_id, genre_name)`;
- copies legacy `user_genres -> genres.name` preferences without dropping the
  legacy tables;
- verifies the expected and target preference sets both ways;
- refuses downgrade rather than silently deleting new preferences.

Names are retained exactly because the current UI and account API use genre
names and the audit has not established safe TMDB-ID mappings for every
historical preference. This is a transitional MovieGraph preference relation,
not a catalogue mirror; a later phase can map known names to TMDB genre IDs and
preserve unmatched custom values.

The actual Neon DEV database remains at revision `20261006_01` with the prior
recorded empty social baseline. This revision has **not** been applied to DEV,
PRE, or PROD. No account records were created or modified in Neon. Apply it only
through the documented trusted migration process after a PRE schema/branch
check; never run migrations during a Worker request.

## Runtime gate

The development-only `/api/internal/password-runtime` probe is protected by the
existing probe token and is installed only by `social_probe_worker.py`. In local
Workerd it verified both a historical bcrypt hash and newly generated hashes
with HTTP 200. That request took **34.9 seconds** for three bcrypt operations
(one cost-10 verification and cost-12 hash plus verification). This is runtime
compatibility evidence, not acceptable login latency or deployed CPU evidence.
Cloudflare documents a 10 ms CPU limit on Workers Free and a 30 second default
on Workers Paid; the account plan and per-operation CPU usage have not been
verified. See [Workers limits](https://developers.cloudflare.com/workers/platform/limits/).

Therefore account endpoints stay disabled by default. Do not enable them in
PRE until a single-operation cost-12 registration/login measurement succeeds
under the actual Worker plan and the new migration is applied. Authentication
is not bypassed, hashes are not rewritten, and production was not deployed.

## Validation

- Backend suite: **86 tests passed** from `back` with
  `..\.venv\Scripts\python.exe -m unittest discover -s tests -v`.
- Migration fixtures preserve preference names and refuse duplicate usernames.
- Worker route tests cover registration, login, wrong password, profile, JWT,
  duplicate identities, preference round-trip and bcrypt legacy verification.
- Actual local Workerd password probe: HTTP 200 for legacy verification and new
  hash generation; no database binding or Neon request was made.
- Actual local Worker + local PostgreSQL flow on 2026-10-07: registration HTTP
  201, login HTTP 200, profile HTTP 200 with saved genre preferences; follows
  create/list/unfollow and followed-movie-like listing all passed. Two disposable
  fixture users and their social rows were removed afterward. This verifies the
  local runtime only; PRE migrations, deployment and production CPU limits remain
  unverified.
- Frontend lint: zero errors, four existing warnings. Frontend production build
  passed.
- Neon migration/operation tests: **not run**. Cloudflare remote deployment:
  **not run**. `git diff --check`: passed.

Commands used:

```powershell
..\.venv\Scripts\python.exe -m unittest discover -s tests -v
& '.\.venv\Scripts\uvx.exe' --from workers-py pywrangler dev --config wrangler.password-probe.jsonc --port 8791
curl.exe --silent --show-error --max-time 30 --write-out "`nHTTP %{http_code}`n" --header "Authorization: Bearer password-probe-test-only" http://127.0.0.1:8791/api/internal/password-runtime
npm.cmd run lint
npm.cmd run build
```

Package synchronization also passed with the project's configured interpreter
and its Scripts directory on `PATH` using `python -m pywrangler sync`.

The temporary `wrangler.password-probe.jsonc` contained only a disposable test
token and was removed after the local request. No Neon URL, production secret,
or user credential was printed.

## Rollback and next step

Keep revision `20261007_00` and its data if application code is rolled back;
the additive table/index do not affect the legacy account routes. The migration
intentionally refuses an automatic downgrade. After confirming the target PRE
branch, apply this migration, verify preference set equality, measure bcrypt
CPU/latency on the deployed plan, then explicitly enable the account API and run
registration/login/profile with a disposable test user. Do not use production
for this test.
