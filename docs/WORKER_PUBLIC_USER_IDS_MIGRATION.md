# Public user IDs migration

Revision `20261009_00` follows `20261008_00`. It adds a random UUID `public_id`
to each existing account, verifies that every row was backfilled, and adds a
unique index. Existing internal user IDs and follow relations remain unchanged.

Apply this migration from a trusted admin environment before deploying the new
Worker code to PRE. Do not run it from a request or deploy the code first: the
new profile and follow queries require `users.public_id`. Verify that the
Alembic head is `20261009_00`, the user count is unchanged, no public IDs are
null, and the unique index exists before enabling the updated frontend/Worker.
No production database migration has been performed as part of this code
change.

Public profile responses and social search/follower lists now use `public_id`
and omit email and internal database IDs. New follow/unfollow requests target
`public_id`. `/api/v1/follows/by_email` and email-based follow request bodies
remain temporarily available for old profile links/clients; old `/user/{email}`
links resolve through that authenticated compatibility endpoint and replace
the browser URL with `/user/{public_id}`. Remove the compatibility API and
redirect after old links/clients have been retired.

Validation uses SQLite fixtures to verify UUID backfill and uniqueness, plus
authenticated Worker route tests for lookup, follow/unfollow, public response
fields, and legacy email-link resolution. Those fixtures do not verify remote
Neon data or deployment state.
