# MovieGraph

React + TypeScript + Vite, FastAPI sobre Cloudflare Python Workers, PostgreSQL
y Hyperdrive. TMDB es dueño del catálogo; MovieGraph guarda cuentas y relaciones
sociales por ID TMDB, no una copia del catálogo.

## Desarrollar

Abre Docker Desktop, selecciona **MovieGraph Local** en PyCharm y pulsa Play.
Abre <http://127.0.0.1:5173/>. El run prepara el esquema local con Alembic y
arranca Worker + frontend. Mantén la credencial TMDB en `.dev.vars`; las claves
de PostgreSQL/JWT locales se generan automáticamente. No necesitas una URL Neon.

- Desarrollo: PostgreSQL local aislado.
- `staging`: Cloudflare Preview → Hyperdrive PRE → Neon PRE.
- `main`: Worker de producción → Hyperdrive PROD → Neon producción (rollout pendiente de verificar).

Guías actuales: [desarrollo local](docs/LOCAL_DEVELOPMENT.md) y
[entornos/configuración/despliegue](docs/ENVIRONMENTS.md).

## Límites actuales

Local incluye registro/login, follows, comentarios, likes y catálogo TMDB.
Cuentas/follows remotos requieren todavía su rollout y validación de runtime;
no basta con que funcionen localmente. No se han eliminado las tablas legacy.
`docker-compose.yml` describe el stack antiguo, no el despliegue Cloudflare.

## Informes del refactor

- [Plan y arquitectura](docs/CLOUDFLARE_MIGRATION.md)
- [Catálogo TMDB](docs/CATALOGUE_READ_MIGRATION.md)
- [Estado social por IDs TMDB](docs/SOCIAL_TMDB_ID_MIGRATION.md)
- [Runtime Hyperdrive/Neon](docs/DATABASE_RUNTIME_REPORT.md)
- [Autenticación Worker](docs/WORKER_AUTH_MIGRATION.md)
- [Follows Worker](docs/WORKER_FOLLOWS_MIGRATION.md)
- [Recomendaciones](docs/RECOMMENDATIONS_TMDB_MIGRATION.md)
