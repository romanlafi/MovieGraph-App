# Local, PRE and PROD

## Environment boundary

| Environment | Application | Database path | Status |
| --- | --- | --- | --- |
| Local | Local Python Worker + Vite | Wrangler's local Hyperdrive emulation -> local PostgreSQL | Configured in this phase |
| PRE | Separate deployed Worker | Real PRE Hyperdrive -> Neon development branch | Existing DEV social runtime verified; permanent PRE deployment still pending |
| PROD | Separate deployed Worker | Separate PROD Hyperdrive -> Neon production branch | Not configured by this phase |

The existing Neon branch/resource names remain unchanged. No production or PRE
credentials, branches, databases or Hyperdrive resources are modified here.
Wrangler local emulation connects directly to PostgreSQL: it does **not** test
Cloudflare's deployed Hyperdrive pool. Use **MovieGraph Verify Neon DEV** for
that separate integration check.

## Local setup in PyCharm

1. Start Docker Desktop. Keep the existing TMDB credential in root `.dev.vars`.
2. Run **MovieGraph Setup Local DB** once, and again when Alembic gains revisions.
3. Stop **MovieGraph Preview** if running: it uses the same ports.
4. Run **MovieGraph Local** and open <http://127.0.0.1:5173/>.

No Neon URL or Hyperdrive resource ID needs to be pasted for local development.
The launcher generates an ignored `.local.env` for the local database password
and an ignored `.dev.vars.local` for a separate local JWT secret plus the TMDB
credential copied from `.dev.vars`. It never copies the PRE JWT/database secrets.
Keep `.local.env`: the persistent PostgreSQL volume retains the original password.
Do not commit these files, share their contents, or reset the volume to fix a
configuration problem without first checking whether local data must be kept.

Local database: `127.0.0.1:5442`, database/user `moviegraph_local`, isolated Compose
project `moviegraph-local`, volume `moviegraph-local_postgres_data`.
The old `docker-compose.yml` and its database are untouched.

`wrangler.local.jsonc` has a placeholder Hyperdrive ID and is **local-only**.
The launcher overrides `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE`
with the local connection, even if the parent process has a different value.
Never deploy this configuration. Deployed environments use real resource IDs
and Cloudflare secrets, not local generated files.

### What works, and what remains

Catalogue reads use `/api/tmdb/*`. Authenticated comments/likes use the limited
`/api/v1/*` slice and local PostgreSQL, referring directly to TMDB IDs. The schema
has no catalogue tables. Registration/login, follows and personalized
recommendations are **not mounted** in this Worker yet. This launcher does not
claim that the complete account UI is operational. Login/account runtime support
is the next application phase; authentication is not bypassed in the meantime.

PostgreSQL uses SCRAM-SHA-256, not trust/MD5. The local Worker entrypoint supplies
a narrowly scoped SCRAM PBKDF2-HMAC-SHA256 adapter because the current Pyodide
runtime lacks `hashlib.pbkdf2_hmac`. It preserves the server's iteration count,
SCRAM verification and SASLprep through scramp. It does not patch the standard
library or alter the deployed Worker entrypoint. Tests compare derived bytes
against CPython/OpenSSL, including PostgreSQL's 4096 iterations.
See [Pyodide's OpenSSL change](https://blog.pyodide.org/posts/314-release/) and
[Python's hashlib implementation](https://github.com/python/cpython/blob/main/Lib/hashlib.py).

## Explicit migrations

Setup invokes `python -m alembic upgrade head` from `back` with an explicit
`local-development` target. The guard permits only the dedicated loopback
database/user/port. Normal Run checks the current Alembic head; it does **not**
migrate. No web request creates schemas or applies migrations.

The existing baseline `20261006_00` and social revision `20261006_01` initialize
the fresh local database. No new revision or catalogue-table deletion was added.
Existing Neon migration guards still require an explicitly authorized direct
Neon endpoint with TLS. Production migration is not enabled by this launcher.

## Commands

From the repository root, using the project's configured Python interpreter:

```powershell
.\.venv\Scripts\python.exe scripts/run_local.py --setup-db
.\.venv\Scripts\python.exe scripts/run_local.py --check-db
.\.venv\Scripts\python.exe scripts/run_local.py
```

For isolated real HTTP verification while Preview occupies port 8787:

```powershell
.\.venv\Scripts\python.exe scripts/run_local.py --worker-only --worker-port 8791
# In a second terminal:
.\.venv\Scripts\python.exe scripts/verify_local_social.py --port 8791
```

The verifier creates its own temporary test user, signs a short-lived local JWT,
checks unauthenticated rejection, posts/reads a comment, likes twice, reads state
and IDs, unlikes twice, and confirms absence afterward. It deletes only its own
fixture and compares all social table counts with the baseline. This is not a
login/password-hashing Worker test and does not touch Neon.

Stopping the launcher stops its Worker/Vite children, not unrelated processes.
PostgreSQL data stays in the local volume. To stop the dedicated container:

```powershell
docker compose --project-name moviegraph-local --env-file .local.env --file compose.local.yaml stop
```

## Runtime evidence (2026-10-07)

On this development machine, Setup applied the two existing Alembic revisions
to the dedicated fresh PostgreSQL 17 container. Actual tables were
`alembic_version`, `users`, `comments`, `user_movie_likes`; head `20261006_01`.
All three social table baseline counts were zero. No catalogue tables existed.

The actual Python Worker ran on port 8791, leaving the user's existing Preview
on 8787 untouched. `verify_local_social.py --port 8791` passed all ten authenticated
HTTP operations with status 200 and confirmed unauthenticated like requests
return 401. Movie 550 had no local movie row or catalogue table; its comment
was persisted/read back with the correct test username, internal user ID, TMDB
ID and text. Like creation, duplicate creation, state/list, unlike and repeated
unlike all passed. Cleanup returned users/comments/likes to 0/0/0.
Health returned `ok`; the same Worker's real TMDB detail request returned movie
550 (`Fight Club`). The test Worker was stopped afterward; the local PostgreSQL
container/volume remains ready. No Neon migration or test was run in this phase.

Initial local runtime verification exposed missing `hashlib.pbkdf2_hmac` during
SCRAM; the local-only adapter resolved it without changing PostgreSQL auth.
The verifier was corrected to follow the existing `comment_id`/`username`
response and `{tmdb_movie_id, liked}` state contract; no API change was made.
A test invocation from the repository root initially lacked the backend import
path; the complete suite was subsequently run correctly from `back`.

Validation commands executed, in addition to Setup and the integration commands
above:

```powershell
# From back:
..\.venv\Scripts\python.exe -m unittest discover -s tests -p test_local_scram.py
..\.venv\Scripts\python.exe -m unittest discover -s tests -v
# From front:
npm.cmd run lint
npm.cmd run build
# From repository root:
git diff --check
git check-ignore .local.env .dev.vars.local
Invoke-RestMethod http://127.0.0.1:8791/api/health
Invoke-RestMethod http://127.0.0.1:8791/api/tmdb/movie/550
```

Results: 77 backend tests passed, including gateway, database runtime, password,
social historical/zero-catalogue and new local configuration/SCRAM tests.
Frontend lint: zero errors, four existing hook/fast-refresh warnings. Frontend
build passed; diff whitespace check passed. Both generated secret files are
ignored. This is local HTTP evidence, not new deployed Hyperdrive evidence and
not an end-to-end browser login test.

## Rollback

Stop **MovieGraph Local** and select the unchanged **MovieGraph Preview** for
catalogue-only development. Keep the local volume/secrets for later reuse.
No Neon rollback is necessary: this phase changes no remote schema or data.
