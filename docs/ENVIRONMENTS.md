# Entornos de MovieGraph

Esta es la referencia de configuración actual. Los informes de migración registran
evidencia histórica; no son instrucciones para arrancar la aplicación.

## Tres entornos, sin mezclar bases de datos

| Uso | Rama Git | Configuración | Base de datos |
| --- | --- | --- | --- |
| Desarrollo en PyCharm | Cualquier rama de trabajo, normalmente `cloudflare-refactor` | `wrangler.local.jsonc` | PostgreSQL local, `127.0.0.1:5442/moviegraph_local` |
| Staging en Cloudflare | `staging` | `wrangler.preview.jsonc`, comando `preview --name staging` | Hyperdrive `moviegraph-pre` → Neon PRE |
| Producción en Cloudflare | `main` | `wrangler.jsonc`, comando `deploy` | Hyperdrive `moviegraph-postgres` → endpoint de producción previsto |

La rama Git no cambia automáticamente el destino de Wrangler. El comando de
despliegue selecciona el archivo. `scripts/deploy_worker.py` comprueba esa rama y
rechaza staging desde otra rama o producción desde una rama distinta de `main`.
No hace merges, commits, pushes ni migraciones.

Inventario real de Cloudflare consultado el 2026-10-07 con
`npx.cmd --yes wrangler hyperdrive list`:

| Recurso | ID | Database | Caché de consultas |
| --- | --- | --- | --- |
| `moviegraph-pre` | `24054140a3aa418ba1bd24b015f3d04b` | `moviegraph` | Desactivada |
| `moviegraph-postgres` | `4cbe52bd629d47c8b2b69a3529691f78` | `moviegraph` | No figura desactivada |

Son endpoints Neon diferentes. La API de Hyperdrive no identifica la rama Neon:
el recurso de producción queda configurado, pero su correspondencia con la rama
PROD debe contrastarse en Neon antes del primer despliegue con escritura.
No se ha conectado ni escrito en esa base durante esta limpieza. Antes de activar
el API social en producción, desactivar la caché de consultas de su Hyperdrive:
likes, sesiones y follows no deben devolver lecturas obsoletas.

## PyCharm: un Play para desarrollar

Selecciona **MovieGraph Local**. Su tarea Before launch ejecuta
**MovieGraph Setup Local DB**, exclusivamente sobre la base local aislada.
Después arranca Worker + Vite y comprueba `/api/health` y que `/users/me` está
protegido (401, no 404). Abre <http://127.0.0.1:5173/>.

Las configuraciones restantes están agrupadas:

- **Maintenance / MovieGraph Setup Local DB**: actualización explícita de Alembic local.
- **Maintenance / MovieGraph Migrate Neon PRE**: administración remota, pide URL oculta y confirmación; nunca se ejecuta como tarea de Local.
- **Diagnostics / MovieGraph Verify Neon PRE**: despliega un Worker temporal, usa su propio usuario de prueba y lo limpia; no migra el esquema.

Los antiguos Preview local sin cuentas y los runs Uvicorn/frontend/compound se
han retirado para evitar arrancar una API diferente por accidente. El Compose
legacy y sus datos se conservan, pero no forman parte del arranque recomendado.
Los probes de Wrangler están en `tools/diagnostics/`, fuera de los tres archivos
de entorno habituales. El nombre interno `neon-development` de las herramientas
Alembic se conserva por compatibilidad: significa PRE, no desarrollo local.

## Dónde va cada configuración

| Archivo o recurso | Contenido | Se versiona |
| --- | --- | --- |
| `.dev.vars` | Credencial TMDB local; fuente para el launcher | No |
| `.dev.vars.local` | Credencial TMDB copiada y JWT local independiente, generado | No |
| `.local.env` | Contraseña del PostgreSQL local, generada | No |
| Configuraciones Wrangler | IDs Hyperdrive, nombres, entrypoints y variables no secretas | Sí |
| Cloudflare Production secrets | `TMDB_READ_ACCESS_TOKEN` y `SECRET_KEY` de PROD | No, se gestionan en Cloudflare |
| Cloudflare Previews Base secrets | `TMDB_READ_ACCESS_TOKEN` y `SECRET_KEY` de PRE | No, se gestionan en Cloudflare |
| URL directa Neon | Solo herramientas administrativas/migraciones, entrada oculta | Nunca en Git o Vite |

No hay que pegar una URL Neon para desarrollar. El launcher fuerza la conexión
local aunque el proceso padre tenga una variable Hyperdrive distinta. Conserva
`.local.env` y el volumen: no regeneres la contraseña de una base ya creada.
No copies secretos PRE/PROD al JWT local ni uses variables `VITE_*` para secretos.

## Cloudflare Workers Builds

Se conserva el nombre `moviegraph-app` utilizado por el candidato Preview. Ambos
archivos remotos sirven los assets `front/dist` y el API limitado en un origen.
El binding PRE está exclusivamente en `previews.hyperdrive` de
`wrangler.preview.jsonc`; el binding PROD solo en `wrangler.jsonc`.

Configuración objetivo del Worker conectado a Git:

- Production branch: `main`.
- Preview builds: únicamente `staging`; desarrollar en `cloudflare-refactor` no debe desplegar automáticamente al PRE compartido.
- Root directory: `/front` (se mantiene el layout anterior).
- Build command:

```sh
npm ci && npm run build && cd .. && pip install uv==0.12.23 && uvx --from workers-py pywrangler sync
```

- Deploy command (main):

```sh
cd .. && python scripts/deploy_worker.py production
```

- Preview command (staging):

```sh
cd .. && python scripts/deploy_worker.py staging
```

Las opciones de Builds y los secrets del dashboard no se cambian al editar
archivos locales. Esta limpieza no ha modificado esos ajustes ni desplegado
Workers. Verifica que los comandos del dashboard coinciden antes del siguiente
push de rollout. Los secretos de Previews Base se aplican a previews nuevos;
un preview existente puede necesitar actualización de sus propios secretos.
Referencia: [Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)
y [configuración de Previews](https://developers.cloudflare.com/workers/previews/configuration/).

## Estado de funcionalidades y migraciones

Local monta catálogo TMDB, registro/login, follows, comentarios y likes.
Las recomendaciones combinan relaciones sociales con el gateway TMDB, sin
persistir catálogo. La compatibilidad SCRAM del PostgreSQL local solo se instala
en `local_worker.py`, no en los entrypoints remotos.

Los Workers remotos mantienen el API social ya verificado (comentarios/likes).
No se habilitan cuentas/follows remotos por esta limpieza: requieren aplicar
`20261007_00` y `20261008_00` a PRE y verificar bcrypt bajo los límites reales de
Cloudflare. Ver [cuentas](WORKER_AUTH_MIGRATION.md) y [follows](WORKER_FOLLOWS_MIGRATION.md).
El head local es `20261008_00`. PRE se verificó en `20261006_01`; no se afirma que
las revisiones posteriores estén aplicadas allí. Producción no se ha auditado.

Ninguna petición HTTP migra o crea tablas. La tarea local Before launch es un
comando administrativo Alembic separado, restringido a loopback, usuario/base
`moviegraph_local` y puerto 5442. Producción sigue excluida de estas herramientas.
No se elimina ninguna tabla de catálogo ni ningún volumen.

## Evidencia anterior y rollback

Validación de esta limpieza (2026-10-07): suite backend completa final, 95 tests OK;
lint sin errores (cuatro warnings anteriores), build frontend OK y
`git diff --check` OK. Setup local confirmó head `20261008_00`. Un Worker propio
en 8791 comprobó health 200, cuentas protegidas 401 y las diez operaciones HTTP
de `verify_local_social.py` con 200. El frontend existente respondió 200.
Baseline y limpieza: users=1, comments=0, user_movie_likes=0; el usuario existente
se conservó y no había tablas de catálogo. No se probó el formulario de login
ni un despliegue remoto. El primer chequeo Docker agotó su timeout; se amplió
la espera y se añadió un mensaje específico. El segundo Setup pasó.

Comandos de esta validación: `python -m unittest discover -s tests -v` desde
`back`, `npm.cmd run lint`, `npm.cmd run build` desde `front`, `git diff --check`,
`npx.cmd --yes wrangler hyperdrive list`, `python scripts/run_local.py --setup-db`,
`python scripts/run_local.py --worker-only --worker-port 8791` y
`python scripts/verify_local_social.py --port 8791`, usando el intérprete del
proyecto. La prueba automatizada también comprueba el Before launch de PyCharm
y el rechazo de ramas incorrectas; no equivale a pulsar Play en el IDE.

Tras añadir el caso de timeout Docker, los 13 tests de configuración local
pasaron. `python -m pywrangler deploy --config wrangler.jsonc --dry-run` también
pasó: empaquetó API/assets y mostró exclusivamente el binding Hyperdrive PROD,
sin subir ni desplegar el Worker. El Worker propio de prueba en 8791 se detuvo;
se conservaron los procesos del usuario en 8787/5173.

El 2026-10-07 se verificó Worker local real en 8791 con head `20261006_01`:
comentario y like de TMDB 550 sin tablas de catálogo, operaciones idempotentes,
rechazo 401 y limpieza a users/comments/likes=0/0/0. La suite de esa fase pasó
77 tests; no era una prueba de login. La evidencia desplegada Hyperdrive → Neon
se conserva en [DATABASE_RUNTIME_REPORT.md](DATABASE_RUNTIME_REPORT.md) y
[SOCIAL_TMDB_ID_MIGRATION.md](SOCIAL_TMDB_ID_MIGRATION.md).

Para revertir esta limpieza, restaura archivos/configuraciones desde Git; no
restaures ni borres volúmenes. No hay rollback remoto: no se ha desplegado ni
migrado Neon. No uses el antiguo Preview sin cuentas como solución a un fallo
de login; arrancaría deliberadamente otra API.
