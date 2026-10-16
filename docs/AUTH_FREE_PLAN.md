# Authentication on Workers Free

## Current state — 16 October 2026

Do not upgrade the Cloudflare plan to fix authentication. TaskManager uses a
JavaScript Worker with bcryptjs cost 10; MovieGraph previously calculated bcrypt
cost 12 inside Python/WebAssembly. These were not equivalent workloads.
Historical MovieGraph logs confirmed `exceededCpu`; separate concurrent-read
failures involved cross-request lock futures.

The active alternative keeps bcrypt cost 12 but runs its expensive work in
PostgreSQL using `pgcrypto`. FastAPI, Hyperdrive, Neon, JWTs, account IDs,
passwords and existing hashes stay unchanged. There is no new service, database
or paid subscription. Passwords are bound query parameters, never interpolated.
Hyperdrive must keep origin TLS enabled and query caching disabled. Neon already
stores authentication data; it also processes submitted passwords in this mode.

The switch is explicit: `PASSWORD_HASH_BACKEND=postgres`. The default remains
`python` so deployments do not break before their migration. There is no fallback
to expensive Worker bcrypt if SQL hashing fails. Auth fails closed and releases
the database session. `pgcrypto` uses `$2a$`; the verifier normalizes `$2b$`/`$2y$`
salt prefixes in memory without rewriting stored hashes or reducing their cost.
Null characters and passwords above 72 UTF-8 bytes are rejected, not truncated.

## Verified previews

The owner applied `20261016_00` to Neon PRE from the trusted PyCharm migration
configuration. It enabled `pgcrypto` in `public`; no password hashes or other
application rows were rewritten. `previews.vars` sets
`PASSWORD_HASH_BACKEND=postgres`; production variables remain unchanged.

Both previews were deployed from the working tree and passed the remote checks:

   ```powershell
   .venv/Scripts/python.exe scripts/verify_neon_social.py --preview-url https://dev-moviegraph-app.romanoscense10.workers.dev --verify-redeploy
   .venv/Scripts/python.exe scripts/verify_neon_social.py --preview-url https://staging-moviegraph-app.romanoscense10.workers.dev --verify-redeploy
   ```

Registration, duplicate and invalid login, repeated login, follows, likes,
comments, concurrent reads and JWT after redeploy passed. See
[current environment status](ENVIRONMENTS.md) for deployment evidence and the
later interrupted-request/cold-start fixes.

The verifier removed disposable accounts and social rows after each run;
Neon PRE returned to users 2, comments 0, likes 16, follows 1 and preferences 3.
Production needs its own reviewed migration and backend switch. The development
admin command rejects production targets; the Worker never runs migrations.

## Evidence and remaining limitation

The real PRE capability check returns `password_crypto_available: true`.
Production has not been migrated or deployed.

The backend suite includes one optional PostgreSQL integration test skipped
by default. That integration test was also run
separately against real local PostgreSQL 17 and passed. It executes and rolls
back the extension migration and checks existing bcrypt variants, Unicode,
72-byte passwords and Python/SQL interoperability. Unit tests also check that
the SQL backend never calls Python bcrypt, repeated logins work, and SQL errors
release the lock without breaking subsequent reads.

Sources: [PostgreSQL password hashing](https://www.postgresql.org/docs/current/pgcrypto.html#PGCRYPTO-PASSWORD-HASHING-FUNCS),
[Neon pgcrypto support](https://neon.com/blog/ten-most-popular-postgres-extensions),
[Cloudflare Python/Hyperdrive concurrency](https://developers.cloudflare.com/hyperdrive/examples/python-workers/#concurrency-and-async-safety).
