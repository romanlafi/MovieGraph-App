# Desarrollo local

## Arranque normal

1. Abre Docker Desktop.
2. En PyCharm selecciona **MovieGraph Local** y pulsa Play.
3. Abre <http://127.0.0.1:5173/>.

Ese único run ejecuta primero la tarea administrativa **MovieGraph Setup Local
DB** (Alembic local), después arranca el Python Worker en 8787 y Vite en 5173.
Comprueba también que la API de cuentas está montada antes de anunciar que está
listo. No necesitas arrancar frontend/backend por separado ni configurar Neon.

Si PyCharm conserva en memoria los runs antiguos tras esta limpieza, reabre el
proyecto para recargar `.run`. El run privado `pywrangler`, si lo creaste en el
IDE, no forma parte de las configuraciones compartidas: usa **MovieGraph Local**.

Requisitos iniciales: intérprete Python >=3.13 del proyecto con las dependencias
de desarrollo instaladas, Node/npm, Docker Desktop y `npm.cmd ci` en `front`.
El toolchain Worker usa `workers-py`, `workers-runtime-sdk` y `uv`; Alembic,
python-dotenv y los paquetes de tests se instalan desde `back/requirements.txt`.
No ejecutes pywrangler desde `back`: su raíz es la del repositorio.

## Secretos locales

Mantén `TMDB_READ_ACCESS_TOKEN` (o `TMDB_API_KEY`) en `.dev.vars` de la raíz.
Puedes partir de `.dev.vars.example`. No se pone en el frontend.
El launcher genera `.dev.vars.local` con un JWT local estable e independiente
y copia solo las claves TMDB. Genera `.local.env` con la contraseña PostgreSQL.
Ambos están ignorados por Git. No borres `.local.env` mientras exista su volumen.

La base usa `127.0.0.1:5442`, usuario/base `moviegraph_local`, Compose
`compose.local.yaml`, proyecto `moviegraph-local`. Solo Docker aloja PostgreSQL;
la API corre en Wrangler, no Uvicorn. El catálogo viene de TMDB y no se guarda
en PostgreSQL. Los detalles de PRE/PROD están en [ENVIRONMENTS.md](ENVIRONMENTS.md).

## Terminal y comprobaciones

Desde la raíz, con el intérprete del proyecto:

```powershell
.\.venv\Scripts\python.exe scripts/run_local.py --setup-db
.\.venv\Scripts\python.exe scripts/run_local.py
```

La CLI normal solo comprueba el esquema; en PyCharm la tarea Before launch
realiza el setup. No se ejecutan migraciones dentro de peticiones Worker.

```powershell
.\.venv\Scripts\python.exe scripts/run_local.py --check-db
Invoke-RestMethod http://127.0.0.1:8787/api/health
.\.venv\Scripts\python.exe scripts/verify_local_social.py
```

El verificador crea y limpia exclusivamente su usuario de prueba. Comprueba
comentarios/likes sin catálogo; no prueba el formulario ni el coste bcrypt del
login. Para una prueba aislada sin tocar el run abierto:

```powershell
.\.venv\Scripts\python.exe scripts/run_local.py --worker-only --worker-port 8791
# En otra terminal:
.\.venv\Scripts\python.exe scripts/verify_local_social.py --port 8791
```

## Parar y resolver problemas

Stop detiene los hijos Worker/Vite del launcher; no elimina datos. PostgreSQL
queda disponible. Para detener solo su contenedor:

```powershell
docker compose --project-name moviegraph-local --env-file .local.env --file compose.local.yaml stop
```

Si hay un puerto ocupado, para el run anterior; el launcher no mata procesos
ajenos ni elige silenciosamente otro puerto. Si Docker no está activo, el mensaje
indica arrancar Docker Desktop. Si la revisión no está al día usando CLI, ejecuta
`--setup-db`; PyCharm lo hace con su tarea explícita Before launch.

Un 401 de `/users/me` sin token es correcto; un 404 indica otro entrypoint.
Un token guardado en el navegador para PRE no es válido en local: inicia sesión
con una cuenta local. Sin credencial TMDB, el catálogo devuelve 503.

## Validación

```powershell
# Desde back:
..\.venv\Scripts\python.exe -m unittest discover -s tests -v
# Desde front:
npm.cmd run lint
npm.cmd run build
# Desde la raíz:
git diff --check
```

El Compose legacy, Uvicorn y las pruebas de Neon son herramientas distintas,
no alternativas al Play habitual. Los informes anteriores mantienen sus comandos
históricos; no uses sus runs eliminados para arrancar la aplicación actual.
