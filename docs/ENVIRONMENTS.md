# Entornos y despliegues

## Estado remoto comprobado — 14 de octubre de 2026

### Resultado del refactor en dev

La limpieza actual retira las rutas/importadores legacy y unifica el entrypoint
desplegado en `app/worker.py`. Se publicó exclusivamente en la preview `dev`.
El esquema remoto `20261009_00` está comprobado mediante el Worker de diagnóstico
y Hyperdrive PRE; SELECT, INSERT, UPDATE, rollback, cierre de sesiones y borrado
de registros de prueba pasan. No se ejecutaron migraciones ni se borraron tablas.

Registro, conflicto de identidad, contraseña incorrecta, login y perfil pasan
en la preview. El login de una segunda cuenta reproduce `exceededCpu`, confirmado
mediante un Tail Worker temporal. Cloudflare rechaza un presupuesto CPU explícito
con error `100328` porque la cuenta está en Workers Free. La validación del flujo
autenticado completo requiere Workers Paid; no se ha cambiado la facturación.
Se conserva bcrypt con coste 12.

El inventario y los resultados actuales están en
[BACKEND_CLEANUP.md](BACKEND_CLEANUP.md). La instantánea siguiente describe el
estado anterior a esta limpieza y se conserva como evidencia histórica.

Esta comprobación de solo lectura usa la sesión OAuth existente de Wrangler,
la API de Cloudflare y peticiones GET a los endpoints públicos. Distingue el
código del repositorio de las versiones publicadas. Los informes de cada fase
conservan sus resultados históricos; este apartado registra el estado observado
en esta fecha.

| Destino | Versión publicada observada | Resultado |
| --- | --- | --- |
| Preview `dev`, rama de trabajo actual | Despliegue 11, `b6903b37-4f9c-47bc-a9ce-1e2c8699ebd2`, 14 de octubre de 2026 | `preview_worker.py`, Hyperdrive PRE y ambos limitadores de login. Health, OpenAPI y comentarios responden JSON. |
| Producción, `moviegraph-app` | `f71a479c-cba4-4438-a232-5d63f0b03bab`, 24 de septiembre de 2026 | `/api/health` devuelve HTTP 200 con `text/html`; no confirma la API Python actual. |
| Preview `staging` | Despliegue 11, `d005cf89-1332-4775-b397-c3d8f14afd09`, 8 de octubre de 2026 | `preview_worker.py`, `python_workers`, fecha de compatibilidad `2026-10-02`, Hyperdrive PRE. |

La preview de trabajo comprobada es
<https://dev-moviegraph-app.romanoscense10.workers.dev>, publicada a las
06:19:07 UTC. Su OpenAPI incluye cuentas, follows, comentarios/likes y catálogo,
incluido `/api/v1/follows/users/{public_id}`. `/api/health` y
`/api/v1/movies/550/comments` responden 200 JSON; `/api/v1/users/me` sin token
responde 401. Tiene los bindings `LOGIN_IP_RATE_LIMITER` y
`LOGIN_ACCOUNT_RATE_LIMITER`. Usa Hyperdrive `24054140a3aa418ba1bd24b015f3d04b`,
el destino PRE compartido por las previews, no una base Neon DEV independiente.
La rama Git `dev` y el nombre del entorno de base de datos son conceptos distintos.

También se comprobó la preview histórica
<https://staging-moviegraph-app.romanoscense10.workers.dev>.
Su OpenAPI monta `/api/tmdb/*`, cuentas (`/api/v1/users/*`), follows
(`/api/v1/follows/*`) y comentarios/likes (`/api/v1/movies/*`).
No monta los endpoints legacy de recomendaciones ni el nuevo endpoint
`/api/v1/follows/users/{public_id}` del repositorio.

Comprobaciones HTTP en la preview `staging`:

- `/api/health`: 200, JSON `{"status":"ok"}`.
- `/openapi.json`: 200, con los grupos anteriores.
- `/api/tmdb/movie/550`: 200, JSON de TMDB para Fight Club.
- `/api/v1/users/me` sin token: 401.
- `/api/v1/movies/550/comments`: 200. No se registran aquí comentarios ni
  información de usuarios.

El despliegue `staging` tiene `APP_ENV`, `ASSETS`, `HYPERDRIVE`, `JWT_ALGORITHM`,
`SECRET_KEY` y `TMDB_READ_ACCESS_TOKEN`. Los valores de los secretos no se leen
ni se registran. No tiene `LOGIN_IP_RATE_LIMITER` ni
`LOGIN_ACCOUNT_RATE_LIMITER`, que sí exige el login del código actual en PRE.

Estas lecturas no verifican la revisión Alembic, la columna `users.public_id`, las
escrituras autenticadas, el rendimiento de bcrypt ni el presupuesto efectivo
de CPU. La siguiente validación corresponde a `dev`: comprobar el esquema
`20261009_00` y su columna `users.public_id`. Los limitadores ya están presentes
en esta preview. Después deben
validarse registro/login, perfil, follow/unfollow, comentarios y likes en el
runtime remoto, con limpieza de las cuentas de prueba y medición de CPU.

Validación del código local en esta comprobación: 15 pruebas sociales pasan;
la suite completa ejecuta 99 pruebas y detecta dos fallos: una expectativa de
URL en `test_catalogue_browse` y la versión bcrypt fijada a `4.0.1` por
`test_passwords`. No se publicaron cambios ni se ejecutaron migraciones o
escrituras de prueba remotas.

## Destinos

| Entorno | Rama Git | Wrangler | PostgreSQL |
| --- | --- | --- | --- |
| Producción | `main` | `wrangler.jsonc`, nivel superior | Hyperdrive `moviegraph-postgres`, `4cbe52bd629d47c8b2b69a3529691f78` → Neon PROD |
| Desarrollo remoto | `dev` | `wrangler.jsonc`, bloque `previews`, preview `dev` | Hyperdrive `moviegraph-pre`, `24054140a3aa418ba1bd24b015f3d04b` → Neon PRE compartido |
| Staging | `staging` | `wrangler.jsonc`, bloque `previews` | Hyperdrive `moviegraph-pre`, `24054140a3aa418ba1bd24b015f3d04b` → Neon PRE |
| Local | Cualquier rama | `wrangler.local.jsonc` | Compose `compose.local.yaml`, `127.0.0.1:5442/moviegraph_local` |

Un único Worker `moviegraph-app` sirve la API y los assets React en producción.
Su preview `staging` sirve el código de esa rama con el Hyperdrive PRE.
`deploy` utiliza los bindings superiores; `preview` utiliza `previews`.
El Wrangler local no contiene ningún ID Hyperdrive remoto.

Los assets y el fallback SPA los sirve directamente Cloudflare. En el despliegue,
`assets.run_worker_first` solo incluye `/api`, `/api/*` y las rutas de documentación
FastAPI; `/`, las rutas React y los archivos estáticos no ejecutan Python.
Esto evita que un fallo del runtime API impida servir el frontend y conserva
los 404 de API sin convertirlos en HTML.

### Diagnóstico de CPU y Pyodide

El preview del 9 de octubre de 2026 se compiló y publicó correctamente. Los logs
aportados muestran una petición de like con `outcome: exceededCpu` y 32 ms de CPU,
seguida de errores `Cannot enter a promising task from inside another running
promising task` al inicializar instancias Python. La secuencia es compatible con
un runtime afectado tras la interrupción, pero no demuestra qué operación agotó
la CPU ni confirma un defecto concreto de Pyodide.

Comprobar el plan Workers y el límite efectivo del Worker/preview. Workers Free
ofrece 10 ms de CPU por petición; Workers Paid permite configurar un presupuesto
mayor. No confundir esos milisegundos con el tiempo esperando a Neon o TMDB.
Perfilar una petición social y registro/login en el runtime remoto antes de
declarar el problema resuelto; bcrypt con coste 12 también requiere validación.
El cambio de routing protege el frontend, pero no elimina el exceso de CPU en API.
No reducir el coste de contraseñas para ocultar este fallo.

Referencias: [límites de CPU](https://developers.cloudflare.com/workers/platform/limits/#cpu-time)
y [routing selectivo](https://developers.cloudflare.com/workers/static-assets/routing/worker-script/#run-worker-first-for-selective-paths).

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
Todos los previews usan Hyperdrive PRE. La rama de trabajo actual es `dev`, con
su propia preview. `staging` mantiene otra preview con el mismo destino de datos.

`.node-version` fija Node 24.18.0 para Workers Builds; Cloudflare usa su Python
predeterminado para instalar el proyecto. Pywrangler selecciona la versión Python
del Worker desde su fecha de compatibilidad. `requirements-build.txt` fija uv y
Pywrangler; `package-lock.json` fija Wrangler en la raíz. El frontend conserva
su propio lockfile. Si el dashboard tiene `NODE_VERSION` o `PYTHON_VERSION`,
retirar esos overrides. No hace falta añadir variables de compilación.
Si ya existe `SKIP_DEPENDENCY_INSTALL=1`, puede quedarse: el script de build
instala explícitamente todas las dependencias.

`npm run build:cloudflare` instala el toolchain Python y las dependencias npm,
y construye React. `npm run build` conserva el build frontend local.
Cloudflare instala el proyecto Python raíz antes del build. `pyproject.toml`
declara que es un paquete solo de metadatos, así esa instalación conserva sus
dependencias sin intentar empaquetar `back/`, `front/` o `node_modules`.
Pywrangler empaqueta las dependencias Python de `pyproject.toml`/`pylock.toml`
al ejecutar `deploy` o `preview`.
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

El entrypoint de la rama `staging` monta catálogo, comentarios, likes, cuentas,
follows y assets, igual que el Worker local. PRE debe estar en `20261009_00`
antes del despliegue. Producción no cambia con esta activación y no está auditada.
Ver [cuentas](WORKER_AUTH_MIGRATION.md), [follows](WORKER_FOLLOWS_MIGRATION.md) y
[IDs públicos de usuario](WORKER_PUBLIC_USER_IDS_MIGRATION.md).
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
