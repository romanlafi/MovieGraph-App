# Migración de Neon producción — 16 de octubre de 2026

La migración se realizó desde un entorno administrativo local tras verificar
el destino exacto y el inventario de solo lectura.

## Destino e inventario

- Proyecto Neon `silent-unit-49892869`, rama primaria `production`, base
  `moviegraph`.
- El origen de Hyperdrive PROD `4cbe52bd629d47c8b2b69a3529691f78` coincide con
  el endpoint directo `ep-dawn-boat-b23e2xzc.c-6.eu-central-1.aws.neon.tech`.
- Antes de migrar no había tablas ni filas de aplicación en ningún esquema de
  usuario; solo estaba instalada la extensión `plpgsql`.
- La verificación posterior confirma todas las tablas de estado social vacías
  y Alembic `20261016_00`.

## Revisiones aplicadas

`20261006_00` → `20261006_01` → `20261007_00` → `20261008_00` →
`20261009_00` → `20261016_00`.

La primera revisión creó el esquema social para una base vacía. Las posteriores
añadieron preferencias, follows, identificadores públicos y `pgcrypto`; no se
migraron ni modificaron cuentas, comentarios o likes porque la base no contenía
filas de aplicación. La vía administrativa
[`initialize_neon_prod.py`](../back/resources/initialize_neon_prod.py) verifica
el host, nombre de base, TLS y confirmación explícita; la validación de migración
general sigue rechazando PROD sin dichas autorizaciones.

La inspección de Hyperdrive encontró query caching habilitado en PROD, contrario
a la configuración requerida. Se deshabilitó el 16 de octubre a las 10:38 UTC;
el origen conserva TLS `require`.

## Preparación y estado del despliegue

- Al preparar la promoción, el Worker `moviegraph-app` no tenía secretos. Se
  cargaron `SECRET_KEY` (clave nueva, independiente de PRE/local) y
  `TMDB_READ_ACCESS_TOKEN` desde el entorno administrativo. Wrangler confirma
  ambos nombres; sus valores no se pueden consultar.
- `wrangler.jsonc` establece `PASSWORD_HASH_BACKEND=postgres` en producción,
  que ya dispone de `pgcrypto`.
- La auditoría del frontend se corrigió mediante actualizaciones compatibles;
  `npm audit` informa cero vulnerabilidades. La instalación, tests, lint y build
  pasan; el bundle de JS cambió por la actualización de Vite.
- El código aún debe promoverse desde `dev`/`staging` a `main`. Después del
  despliegue, verificar health/API, TMDB, registro/login, sesión y flujos sociales
  antes de considerar completado el lanzamiento.
