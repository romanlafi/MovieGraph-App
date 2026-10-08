# Entornos y despliegues

## Destinos

| Entorno | Rama Git | Wrangler | PostgreSQL |
| --- | --- | --- | --- |
| Producción | `main` | `wrangler.jsonc`, nivel superior | Hyperdrive `moviegraph-postgres`, `4cbe52bd629d47c8b2b69a3529691f78` → Neon PROD |
| Staging | `staging` | `wrangler.jsonc`, bloque `previews` | Hyperdrive `moviegraph-pre`, `24054140a3aa418ba1bd24b015f3d04b` → Neon PRE |
| Local | Cualquier rama | `wrangler.local.jsonc` | Compose `compose.local.yaml`, `127.0.0.1:5442/moviegraph_local` |

Un único Worker `moviegraph-app` sirve la API y los assets React en producción.
Su preview `staging` sirve el código de esa rama con el Hyperdrive PRE.
`deploy` utiliza los bindings superiores; `preview` utiliza `previews`.
El Wrangler local no contiene ningún ID Hyperdrive remoto.

## Cloudflare Workers Builds

Cambiar el directorio raíz de **ambas** configuraciones del dashboard a `/`.
La configuración anterior desde `/front` queda retirada.

| Campo | Producción | Base de previews |
| --- | --- | --- |
| Directorio raíz | `/` | `/` |
| Rama de producción | `main` | Previews habilitados |
| Comando de compilación | `npm run build:cloudflare` | El mismo |
| Comando de despliegue | `npm run deploy:production` | `npm run deploy:preview` |
| Include paths | `*` | `*` |
| Exclude paths | `node_modules/**, front/node_modules/**, .git/**` | El mismo |

Cloudflare lanza builds de preview para todas las ramas distintas de `main`.
Cada rama genera su propio preview, cuyo nombre selecciona Wrangler automáticamente.
Todos los previews usan Hyperdrive PRE. El entorno de pruebas habitual es `staging`.

`.node-version` fija Node 24.18.0 y `.python-version` fija Python 3.14.2 para
Workers Builds. `requirements-build.txt` fija uv y Pywrangler; `package-lock.json`
fija Wrangler en la raíz. El frontend conserva su propio lockfile.
Si el dashboard tiene `NODE_VERSION` o `PYTHON_VERSION`, retirar esos overrides
o alinearlos con los archivos. No hace falta añadir variables de compilación.
Si ya existe `SKIP_DEPENDENCY_INSTALL=1`, puede quedarse: el script de build
instala explícitamente todas las dependencias.

`npm run build:cloudflare` instala el toolchain Python y las dependencias npm,
y construye React. `npm run build` conserva el build frontend local.
Pywrangler empaqueta las dependencias Python
de `pyproject.toml`/`pylock.toml` al ejecutar `deploy` o `preview`.
No hay `postbuild` Python en Vite, preparador personalizado ni wrapper de despliegue.
No se ejecutan migraciones de base de datos durante build, deploy o peticiones.

Estos ajustes del dashboard no cambian al editar el repositorio. Los archivos
deben estar presentes en `main` y `staging` antes de lanzar sus respectivos builds.

Referencias oficiales: [Python y Pywrangler](https://developers.cloudflare.com/workers/languages/python/packages/),
[imagen de build](https://developers.cloudflare.com/workers/ci-cd/builds/build-image/),
[ramas](https://developers.cloudflare.com/workers/ci-cd/builds/build-branches/) y
[bindings de previews](https://developers.cloudflare.com/workers/previews/configuration/).

## Secretos

Configurar en runtime, por separado en Production y en Previews Base:

- `TMDB_READ_ACCESS_TOKEN` o `TMDB_API_KEY`.
- `SECRET_KEY`: independiente en PROD y PRE.

Los cambios de secretos de Previews Base solo se aplican a nuevos previews.
Actualizar también los secretos del preview `staging` si ya existe.
No hacen falta secretos TMDB/JWT ni URLs Neon como variables de compilación.
El binding Hyperdrive proporciona la conexión remota; ninguna credencial va en Vite.

## Desarrollo local

Usar **MovieGraph Local** en PyCharm con Docker Desktop abierto.
El launcher y su tarea de setup mantienen PostgreSQL local y Alembic separados
del despliegue. La credencial TMDB se lee de `.dev.vars`; `.local.env` y
`.dev.vars.local` contienen las credenciales locales generadas y se ignoran en Git.
Conservar `.local.env` mientras exista el volumen PostgreSQL.
Ver [desarrollo local](LOCAL_DEVELOPMENT.md).

## Estado de la aplicación

El entrypoint remoto actual conserva catálogo, comentarios, likes y assets.
Cuentas/follows remotos requieren las migraciones `20261007_00` y `20261008_00`
y validación de bcrypt en Workers antes de habilitarlos. Local ya los monta.
PRE se verificó históricamente en `20261006_01`; producción no está auditada.
Ver [cuentas](WORKER_AUTH_MIGRATION.md) y [follows](WORKER_FOLLOWS_MIGRATION.md).
Revisar la caché de consultas Hyperdrive antes de validar lecturas sociales:
el inventario anterior tenía PRE sin caché y PROD sin desactivación registrada.

Esta limpieza reemplaza los preparadores de los commits `4a90904`/`bb5e0b5` en
el estado actual de los archivos; no reescribe el historial Git ni publica cambios.

Validación de esta configuración: build local y lint OK (dos warnings de Fast
Refresh), 12 tests de configuración local OK y build completo en Linux limpio
con Python 3.14.2. Pywrangler empaquetó Python/assets y su dry-run mostró el
Hyperdrive PROD; el comando de staging se verificó con `--help`, sin publicación.
El Worker local respondió health 200 y el PostgreSQL de Compose estaba healthy.
La suite general anterior detectó un test legacy que exige bcrypt 4.0.1 en un
intérprete con otra versión; sigue pendiente y no afecta a esta configuración.
