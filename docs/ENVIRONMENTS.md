# Entornos y despliegues

## Resultado actual — 16 de octubre de 2026

Neon PRE está en Alembic `20261016_00` y confirma `pgcrypto` disponible.
`PASSWORD_HASH_BACKEND=postgres` está activo en las previews dev y staging.
El log posterior de staging `895e7ad8` registra peticiones autenticadas canceladas,
después un exceso de CPU y errores de Pyodide que afectan también al catálogo.
Las peticiones aisladas y la navegación sin autenticar no detectaban este fallo.

La aplicación conserva ahora la tarea ASGI con `workers.wait_until` y espera su
resultado con `asyncio.shield`. Así, desconectar el navegador permite terminar
las operaciones SQL, cerrar sus sesiones y liberar el bloqueo. La espera del
bloqueo sigue usando temporizadores propios de cada petición, con intervalos de
100 ms en lugar de 10 ms para reducir el trabajo del event loop.
Cloudflare documenta que `waitUntil` mantiene la ejecución hasta 30 segundos
después de desconectar el cliente: [ciclo de vida de peticiones](https://developers.cloudflare.com/workers/runtime-apis/context/#waituntil).

La validación remota de staging `9e08deff` pasa registro, login, perfil,
operaciones sociales, 15 lecturas autenticadas simultáneas y tres cargas
simultáneas de catálogo con 15 peticiones autenticadas interrumpidas en total.
Después de cada carga se vuelven a verificar perfil, likes y follows.
`scripts/verify_neon_social.py --preview-url https://staging-moviegraph-app.romanoscense10.workers.dev`
reproduce estas comprobaciones y elimina exclusivamente sus cuentas temporales;
el inventario PRE vuelve al estado inicial. Las 110 pruebas de backend pasan
(una integración opcional omitida). No se ha aplicado ninguna migración adicional.

Las secciones inferiores conservan el historial anterior a esta validación.

## Corrección para Workers Free

No se contratará Workers Paid. Se ha preparado un backend bcrypt en PostgreSQL
que mantiene coste 12 y hashes existentes, sin calcular bcrypt en el Worker.
La prueba con PostgreSQL 17 real pasa, pero PRE todavía no tiene `pgcrypto`.
Falta aplicar la migración administrativa `20261016_00` y activar
`PASSWORD_HASH_BACKEND=postgres` exclusivamente en staging. La conexión directa
de Neon PRE no está configurada localmente. No se ha activado ni desplegado
este nuevo backend y producción sigue intacta. Procedimiento y pruebas en
[AUTH_FREE_PLAN.md](AUTH_FREE_PLAN.md). Las referencias históricas a necesitar
Paid quedan sustituidas por esta alternativa pendiente de validación remota.

## Login y sesiones en staging — 16 de octubre de 2026

La corrección local sobre `835a235` está publicada en
<https://staging-moviegraph-app.romanoscense10.workers.dev>, despliegue
`880850bd`. Utiliza Hyperdrive PRE. Los cambios de código siguen pendientes de
commit; deben incorporarse a la rama antes del siguiente build automático.

El registro y el login cierran su sesión SQL y liberan el bloqueo antes de
calcular bcrypt. Los limitadores y la creación de JWT también quedan fuera
del bloqueo. Las sesiones SQL conservan rollback y cierre explícitos.
La espera del bloqueo utiliza temporizadores de la propia petición y un máximo
de cinco segundos; así no se comparten futuros de espera entre invocaciones de
Workers. El cliente HTTP tiene un timeout de 30 segundos.

Wrangler Preview 4.148.0 eliminaba los secretos de la nueva versión al publicar
sin `--secrets-file`. `previews.unsafe.bindings` declara ahora `SECRET_KEY` y
`TMDB_READ_ACCESS_TOKEN` como `inherit`: sus valores se conservan desde el
último despliegue del propio preview, sin incluirlos en el repositorio. Esta
compatibilidad debe revisarse cuando Preview admita directamente la conservación
de secretos requeridos. Un preview nuevo debe aprovisionarse con un archivo de
secretos seguro mediante `--secrets-file`; sus valores no se guardan en Git.
La clave JWT de staging es exclusiva y se ha rotado durante la reparación.
El archivo temporal utilizado se eliminó; la clave permanece en Cloudflare.

La prueba real verificó registro 201, identidad duplicada 409, contraseña
incorrecta 401, login 200 y perfil 200. Un JWT emitido antes de republicar
staging siguió devolviendo perfil 200 después, sin volver a cargar secretos.
Tres lotes de cinco peticiones simultáneas a perfil, likes, following,
followers y perfil público devolvieron los quince HTTP 200.

La verificación completa sigue pendiente: el segundo login devolvió 503 y la
lectura de perfil inmediatamente posterior devolvió 500. Cloudflare rechazó
el presupuesto de CPU de cinco segundos porque la cuenta continúa en Workers
Free, con error `100328`. Se conserva bcrypt coste 12. Los logs históricos
confirmaron `exceededCpu` en ese flujo; el intento de observación de esta
ejecución falló con error API `10013`, por lo que no se atribuye un outcome
concreto a los nuevos 503 sin más evidencia. Después se republicó staging para
restablecer su runtime; health y TMDB respondieron 200 y ambos secretos seguían
presentes. Debe repetirse la suite completa con un presupuesto compatible antes
de promover a producción.

Las cuentas de prueba y sus relaciones se eliminaron por sus UUID exactos.
La comprobación final recuperó los recuentos iniciales de PRE: users 2,
comments 0, user_movie_likes 16, user_follows 1, user_genre_preferences 3 y
alembic_version 1. Se eliminaron todos los Workers temporales y se retiró el
observador. No se ejecutaron migraciones ni cambios en producción.

Validación reproducible, incluyendo conservación de JWT entre publicaciones:

```powershell
.venv/Scripts/python.exe scripts/verify_neon_social.py --preview-url https://staging-moviegraph-app.romanoscense10.workers.dev --verify-redeploy
```

Si una comprobación se interrumpe durante la limpieza, el informe ignorado
`output/backend-dev-verification.json` identifica `pending_fixture_cleanup`.
`--cleanup-fixture <UUID>` permite limpiar exclusivamente esos fixtures mediante
un Worker temporal nuevo, sin ejecutar migraciones ni truncar tablas.

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
