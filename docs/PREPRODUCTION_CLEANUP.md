# Repository cleanup — 16 October 2026

## Scope

- Removed the obsolete application Docker/nginx deployment, placeholder HTTP
  requests and unused Tailwind configuration. `compose.local.yaml` remains.
- Removed unused direct PostCSS/Tailwind build dependencies without upgrading
  existing dependency versions. Tailwind uses the Vite plugin and CSS theme.
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
- Frontend clean install, eight tests, lint and production build passed.
- Generated CSS SHA-256 is unchanged:
  `E877B0CAD83BAB5D731C09C86367F8FC5E727D454B19C99AC0A83A10476EAB67`.
  The JavaScript asset also retains its name `index-Dnq8zgb-.js`.
- Existing locked dependency versions remain unchanged; current-guide relative
  links and Git whitespace checks were checked.
- npm reports 31 dependency vulnerabilities (3 low, 3 moderate, 24 high and
  1 critical). No automatic audit fix or unrelated dependency upgrade was applied.
  These findings require a separate reviewed dependency update before treating
  the application as production-ready.

Production rollout still requires the reviewed migration procedure and checks
in [the environment guide](ENVIRONMENTS.md#antes-de-pasar-a-main). The current
development migration command intentionally rejects production targets.
