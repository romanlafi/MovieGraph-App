# Worker follows migration

## Scope

This phase moves the existing follows API implementation into the limited
MovieGraph Worker without changing its public route paths or email-based
frontend contract. The Worker queries `users` and `user_follows` directly;
it does not import the legacy ORM or catalogue mirror. The frontend's
`/api/v1/follows/*` calls need no ID-semantic change.

Routes are opt-in through `include_follows_api` and remain disabled by default.
Enable them only after the schema check below passes on the intended target.
Existing auth requirements are preserved: search, follow, unfollow, following
and followers require Bearer auth; `/list` and `/by_email` remain public like
the legacy endpoints. Duplicate follows and repeated unfollows are idempotent.
Follow and unfollow retain the legacy empty response body.

## Database revision

Alembic revision `20261008_00` follows `20261007_00`. It validates the existing
`user_follows(follower_id, followed_id)` schema and rows. If the table is absent
(for a fresh social-only schema), it creates it with user foreign keys and a
unique pair key. Existing follow pairs are not copied or deleted. The migration
fails before enabling Worker routes if users are missing, the table has an
unexpected shape, there are orphan user references, or duplicate pairs exist.
It adds a `followed_id` index and compares the before/after pair sets both ways.

The migration has **not** been applied to Neon DEV, PRE or PROD. The deployed
schema and historical follow counts have not been re-inspected for this phase.
Do not enable the Worker routes on a remote environment until revision
`20261008_00` is applied through the documented trusted migration process and
the preserved row set is verified on PRE. No production migration was run.

## Validation status

SQLite migration fixtures and authenticated Worker route tests cover existing
pair preservation, clean bootstrap, orphan rejection, user search, follow,
unfollow, following/follower lists, authentication, and duplicate/idempotent
operations. These are automated fixtures, not evidence of real Neon data.

No real Neon operations, Cloudflare deployment, or frontend changes were part
of this phase. Existing `user_follows` remains the source of truth; the later
recommendation phase can use these social IDs while TMDB enrichment stays a
separate catalogue read.

## Rollback

Keep the additive revision and table/index if Worker code is rolled back. Do
not drop or rewrite follow rows. Disable `include_follows_api` to restore the
legacy route implementation; retain `user_follows` for the existing ORM until
the legacy API is deliberately retired.
