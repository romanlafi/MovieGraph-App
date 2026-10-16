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
| Compilar | `npm run build:cloudflare` |
| Publicar dev/staging | `npm run deploy:preview` |
| Publicar producción, solo tras preparar su base | `npm run deploy:production` |

`.node-version` fija Node; `requirements-build.txt` fija el tooling Python.
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

Producción todavía no se ha migrado ni promovido. La última inspección encontró
la versión antigua del 24 de septiembre y `/api/health` devolviendo HTML.

1. Inventariar y respaldar la base de producción; revisar el
   [audit de migración](MIGRATION_AUDIT.md) y preservar usuarios, comentarios y likes.
2. Preparar un procedimiento administrativo explícito para producción: el
   comando de desarrollo actual rechaza ese destino. No desactivar su protección
   ni reutilizar una URL PROD en el comando de PRE.
3. Aplicar y verificar las migraciones revisadas, incluido `pgcrypto`, desde un
   entorno de confianza. Los modelos legacy siguen siendo necesarios.
4. Verificar TLS, query caching desactivado, secretos y bindings PROD; activar
   `PASSWORD_HASH_BACKEND=postgres` solo cuando su migración esté comprobada.
5. Promover el código y comprobar catálogo, login, sesión y operaciones sociales
   en el despliegue real. Tener preparado el rollback compatible con el esquema.

Esta limpieza no autoriza ni realiza esos pasos de producción.
