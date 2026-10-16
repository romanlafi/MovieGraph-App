# Documentación

## Guías actuales

- [Arquitectura y reglas de migración](CLOUDFLARE_MIGRATION.md)
- [Desarrollo local y PyCharm](LOCAL_DEVELOPMENT.md)
- [Entornos, secretos y despliegues](ENVIRONMENTS.md)
- [Autenticación sin cambiar de plan](AUTH_FREE_PLAN.md)
- [CI, cobertura y SonarCloud](SONARCLOUD.md)
- [Limpieza previa a producción y validación](PREPRODUCTION_CLEANUP.md)
- [Organización del frontend](../front/README.md)

## Planes, auditorías e historial

Los informes de fase describen el estado de su revisión, no instrucciones de
despliegue actuales. Conservarlos para revisar la migración de producción.

- [Inventario y auditoría de datos](MIGRATION_AUDIT.md)
- [Backend](BACKEND_CLEANUP.md) y [frontend](FRONTEND_CLEANUP.md): informes de fase
- [Catálogo](CATALOGUE_READ_MIGRATION.md) y [estado social](SOCIAL_TMDB_ID_MIGRATION.md): informes de fase
- [Runtime PostgreSQL](DATABASE_RUNTIME_REPORT.md): informe de fase
- [Plan de refactor](CLOUDFLARE_MIGRATION.md) y [auditoría inicial](MIGRATION_AUDIT.md): documentos de planificación, no estado operativo actual
- [Autenticación Worker](WORKER_AUTH_MIGRATION.md), [follows](WORKER_FOLLOWS_MIGRATION.md), [IDs públicos](WORKER_PUBLIC_USER_IDS_MIGRATION.md), [gateway TMDB](TMDB_GATEWAY_REPORT.md) y [recomendaciones](RECOMMENDATIONS_TMDB_MIGRATION.md): informes de fases
- [Historial de entornos e incidentes](archive/ENVIRONMENTS_HISTORY.md)
- [Revisión de seguridad histórica](archive/SECURITY_REVIEW.md)

Los modelos de `back/migrations/legacy_models` no son código muerto: sostienen
el inventario y las migraciones. No eliminarlos antes de migrar producción.
