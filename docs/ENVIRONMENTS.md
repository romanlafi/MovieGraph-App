# Entornos y despliegues

Guía operativa actualizada el 16 de octubre de 2026. El
[historial de investigación](archive/ENVIRONMENTS_HISTORY.md) conserva las
incidencias y mediciones anteriores; sus instrucciones no sustituyen esta guía.

## Entornos

| Entorno | Ejecución | Base de datos |
| --- | --- | --- |
| Local | Vite + Worker local | PostgreSQL aislado de `compose.local.yaml` |
| `dev` | Cloudflare Preview | Hyperdrive PRE → Neon PRE |
| `staging` | Cloudflare Preview | Hyperdrive PRE → Neon PRE |
| `main` | Worker de producción | Hyperdrive PROD → Neon producción |

Dev y staging comparten datos PRE: no son bases independientes. La configuración
autoritativa es [`wrangler.jsonc`](../wrangler.jsonc). `deploy` selecciona los
bindings superiores; `preview` selecciona `previews`. Los entrypoints mantienen
`back` como `base_dir` para importar el mismo paquete `app` en local y Workers.

## Configuración y secretos

- `SECRET_KEY` y `TMDB_READ_ACCESS_TOKEN` permanecen en Cloudflare, nunca en Git
  ni en variables `VITE_*`. Las previews heredan esos bindings de su base PRE.
- Tras cambiar secretos de Previews Base, crear/verificar nuevos despliegues;
  no asumir que una preview existente ya incorpora el cambio.
- PRE usa `APP_ENV=pre`, `JWT_ALGORITHM=HS256` y
  `PASSWORD_HASH_BACKEND=postgres`. No rotar la clave JWT durante una limpieza:
  invalidaría las sesiones existentes.
- Hyperdrive PRE tiene query caching desactivado y conecta a Neon PRE con TLS.
  No cambiarlo por una URL de producción para realizar pruebas.
- Local usa `.dev.vars`; consultar [desarrollo local](LOCAL_DEVELOPMENT.md).
  Tokens administrativos, informes y credenciales locales no se versionan.

## Builds y despliegues

Cloudflare Builds parte de la raíz del repositorio:

| Acción | Comando |
| --- | --- |
| Build command de Cloudflare | `npm run build` |
| Build local completo (incluye tooling Worker) | `npm run build:cloudflare` |
| Publicar dev/staging | `npm run deploy:preview` |
| Publicar producción, solo tras preparar su base | `npm run deploy:production` |

`.node-version` fija Node; el script raíz instala las dependencias bloqueadas
de `front` antes de invocar TypeScript/Vite, igual que requiere el build aislado
de Cloudflare. `requirements-build.txt` fija el tooling Python local.
Pywrangler empaqueta el Worker. Ningún build, despliegue o petición ejecuta
migraciones automáticamente. La SPA sirve los assets y no absorbe `/api/*`.
No se utiliza el antiguo stack Docker/nginx/Uvicorn para desplegar.

## Estado verificado

Neon PRE está en `20261016_00` con `pgcrypto`. Bcrypt coste 12 se ejecuta en
PostgreSQL y conserva los hashes existentes; ver [autenticación](AUTH_FREE_PLAN.md).
El Worker conserva la tarea ASGI completa ante desconexiones, serializa las
sesiones SQL y precarga el driver PostgreSQL antes del snapshot. Mantener estas
protecciones: forman parte del arreglo de concurrencia y arranque en frío.

La última validación funcional previa a la limpieza corresponde al código
`04eedd6`: dev `7af12052`, staging `750fd16d`. Staging supera 72 comprobaciones
remotas, incluyendo recuperación tras 15 peticiones interrumpidas. No quedaron
fixtures ni Workers temporales; PRE recuperó usuarios 2, comentarios 0,
follows 1, likes 16 y preferencias 3. El histórico posterior no mostró 5xx
durante esa validación. Esto no garantiza ausencia futura de límites de CPU.

Verificación remota desde el entorno Python del proyecto:

```powershell
.venv\Scripts\python.exe scripts/verify_neon_social.py --preview-url https://staging-moviegraph-app.romanoscense10.workers.dev
```

El verificador crea y elimina exclusivamente fixtures propios en PRE; no es
una prueba de solo lectura. La validación local/CI figura en
[CI y cobertura](SONARCLOUD.md) y [desarrollo local](LOCAL_DEVELOPMENT.md).

## Antes de pasar a main

El inventario previo confirmó que el Neon PROD enlazado por Hyperdrive no tenía
tablas ni filas de aplicación; las migraciones están ahora en `20261016_00` y
`pgcrypto` está disponible. El Worker `moviegraph-app` tiene sus dos secretos
requeridos y Hyperdrive PROD tiene query caching desactivado. El commit
`798b7bd` está en `main` y se desplegó manualmente con Pywrangler. Detalles en
[el informe de migración de producción](PRODUCTION_MIGRATION.md).

1. Revisar el [audit de migración](MIGRATION_AUDIT.md) y confirmar el backup
   Neon antes de seguir operando sobre la base ya inicializada.
2. Confirmar en `wrangler.jsonc` `PASSWORD_HASH_BACKEND=postgres`; los dos
   secretos ya están configurados y sus valores no se pueden releer.
3. Completar la prueba funcional con una cuenta controlada: registro/login,
   sesión y operaciones sociales. No se creó una cuenta de prueba en PROD.
4. Corregir el check de Cloudflare Workers Builds, que falló al compilar desde el
   push a `main`; el despliegue manual de Pywrangler sí terminó correctamente.
   El Quality Gate de SonarCloud también quedó en fallo para métricas de código
   nuevo; revisar antes de depender del merge/deploy automático.

Las migraciones de producción ya se aplicaron; no ejecutar de nuevo el
procedimiento de inicialización durante el despliegue.
