# Repository cleanup — 16 October 2026

## Scope

- Removed the obsolete application Docker/nginx deployment, placeholder HTTP
  requests and unused Tailwind configuration. `compose.local.yaml` remains.
- Removed unused direct PostCSS/Tailwind build dependencies. A later compatible
  `npm audit fix` updated the lockfile to address transitive advisories; package
  manifest constraints remain unchanged.
- Untracked IDE settings and old browser captures. Local files, including the
  owner's modified PyCharm module, remain unchanged on disk. Shared `.run`
  configurations remain versioned.
- Replaced contradictory environment instructions with a current operational
  guide, archived the original history and security report, and added an index.
- Added the existing frontend tests to CI.

No authentication, runtime, API, schema or data changes. No migration, production
deployment, secret rotation or catalogue-table removal. Legacy migration models
and inventory/verifier tooling are intentionally retained.

## Validation

- Backend unittest discovery: 111 tests, 110 passed and one optional integration
  test skipped. This run did not execute that PostgreSQL integration test.
- Frontend clean install, eight tests, lint and production build passed after the
  compatible lockfile updates.
- Generated CSS SHA-256 is unchanged:
  `E877B0CAD83BAB5D731C09C86367F8FC5E727D454B19C99AC0A83A10476EAB67`.
  The JavaScript asset name changed because Vite was updated.
- `npm audit` reports zero vulnerabilities after the compatible lockfile update.
- Production migrations were separately applied to the previously empty PROD
  database; see [the migration report](PRODUCTION_MIGRATION.md).

Production code promotion and post-deploy checks remain pending in
[the environment guide](ENVIRONMENTS.md#antes-de-pasar-a-main). The general
migration command still rejects production; only the guarded admin runner can
target the verified production endpoint.
