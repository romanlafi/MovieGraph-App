# API abuse protection

Admission control runs before FastAPI routing, body parsing, authentication DB
lookups, Hyperdrive sessions and TMDB calls. It applies to every `/api` path
(including unknown paths, redirects, health and OPTIONS) and API documentation.
Static assets and React navigation do not consume API quotas.

| Binding | Requests per 60 seconds | Key |
| --- | ---: | --- |
| API_IP_RATE_LIMITER | 180 | IP across the entire API and docs |
| SOCIAL_IP_RATE_LIMITER | 60 | IP across `/api/v1/*` |
| WRITE_IP_RATE_LIMITER | 20 | IP across social POST/PUT/PATCH/DELETE |
| REGISTER_IP_RATE_LIMITER | 3 | IP for registration, with or without trailing slash |
| SOCIAL_GLOBAL_RATE_LIMITER | 600 | Shared social admission circuit breaker |
| CATALOGUE_IP_RATE_LIMITER | 120 | IP across `/api/tmdb/*` |
| LOGIN_IP_RATE_LIMITER | 30 | IP for login (also subject to the write limit) |
| LOGIN_ACCOUNT_RATE_LIMITER | 8 | Normalized account name for login |

Quotas accumulate across movie IDs, query strings, endpoints and bearer tokens.
Only Cloudflare's `CF-Connecting-IP` identifies the network client;
`X-Forwarded-For`, request user IDs and unverified tokens cannot reset a quota.
Missing IP headers share an `unknown` bucket. Keys hash IPs and login account
names; limiter failures log only the binding name and exception class.

All exceeded quotas return JSON HTTP 429 with `Retry-After: 60` and
`Cache-Control: no-store`. Production and PRE fail closed with HTTP 503 when a
required binding is missing or unavailable. Local development without bindings
skips remote quotas; configured local bindings are still enforced. No counters
are stored in Neon, and no additional database or cache service is introduced.

API bodies are limited to 16 KiB, including chunked bodies and bodies without a
Content-Length header. Query strings are limited to 2 KiB. Rejections happen
before downstream dependencies. Registration, login, comments, likes and follows
keep their existing contracts within these limits. There are no schema changes,
data migrations or changes to persisted social relationships.

## Operations and limits

Thresholds live in `wrangler.jsonc`; production and previews use separate
namespaces. Dev and staging intentionally share PRE quotas. Deploy bindings and
code together through `dev` then `staging` then `main`; a missing binding blocks
requests instead of allowing unprotected database usage. Observe HTTP 429/503
rates in Workers logs and tune the thresholds against legitimate usage. Shared
IP networks share quotas, so these defaults are deliberately above ordinary UI
bursts. Do not exempt authenticated requests from admission control.

The shared social breaker protects against IP rotation, but temporarily rejects
legitimate social traffic too when its allowance is exhausted. Catalogue and
assets remain independent of that breaker. It counts requests, not SQL queries:
some admitted requests perform multiple SQL operations.

Cloudflare rate limiting bindings are approximate and local to each Cloudflare
location. They reduce abuse but do not impose a strict worldwide spending cap or
stop traffic before the Worker starts. Distributed attacks can exceed these
thresholds across locations. If strict budget enforcement becomes necessary,
design that separately rather than treating these counters as billing limits.
See the [official rate limiting reference](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/).

## Validation

`back/tests/test_rate_limits.py` checks admission across all registered API
routes/methods, rejected requests before DB dependencies, shared buckets, IP and
token rotation, independent catalogue traffic, missing/failing bindings, Python
to JavaScript option conversion, production/PRE namespaces, and chunked bodies.
Existing backend social and catalogue tests protect successful request behavior.
Run backend unittest discovery and frontend lint/build/tests before promotion.
Remote smoke tests should check bindings, health, catalogue, unauthenticated
social authorization and a short health-only burst until HTTP 429; do not flood
Hyperdrive to validate the limiter.
