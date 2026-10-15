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
- `dev`: preview de trabajo → Hyperdrive PRE → Neon PRE compartido.
- `staging`: Cloudflare Preview → Hyperdrive PRE → Neon PRE.
- `main`: Worker de producción → Hyperdrive PROD → Neon producción (rollout pendiente de verificar).

Guías actuales: [desarrollo local](docs/LOCAL_DEVELOPMENT.md) y
[entornos/configuración/despliegue](docs/ENVIRONMENTS.md).

La configuración de GitHub Actions, los informes de cobertura y los pasos para
activar SonarCloud están en [CI y cobertura](docs/SONARCLOUD.md).

Cloudflare Builds se ejecuta desde la raíz del repositorio (`/`) con
`npm run build:cloudflare`, que instala las herramientas y construye React.
Producción usa `npm run deploy:production`; las ramas de preview usan
`npm run deploy:preview`. La rama de trabajo actual es `dev`.
Pywrangler empaqueta Python al desplegar. `wrangler.jsonc` selecciona Hyperdrive
PROD con `deploy` y PRE con `preview`. Configuración exacta en la guía de entornos.

## Límites actuales

Local incluye registro/login, follows, comentarios, likes y catálogo TMDB.
Trabajamos en la rama `dev`. Su preview, desplegada el 14 de octubre, monta esas
rutas, los IDs públicos y ambos limitadores de login. Usa Hyperdrive PRE,
compartido con las demás previews. El esquema `20261009_00` y las transacciones
Hyperdrive/Neon están verificados. El login requiere Workers Paid: en Free se
ha reproducido `exceededCpu` al validar bcrypt, por lo que el flujo remoto completo
sigue pendiente del cambio de plan. Producción sigue en
una versión del 24 de septiembre y `/api/health` responde HTML.
Estado comprobado en [entornos y despliegues](docs/ENVIRONMENTS.md).
No se han eliminado las tablas legacy.
`docker-compose.yml` describe el stack antiguo, no el despliegue Cloudflare.

## Informes del refactor

La API social en `back/app/social/` separa las rutas de cuentas (`accounts.py`),
follows (`follows.py`) y comentarios/likes (`movies.py`). `dependencies.py`
centraliza autenticación y sesiones por petición; `routes.py` instala los grupos
habilitados. `repositories/accounts.py`, `repositories/follows.py` y
`repositories/movies.py` contienen las consultas de cada dominio. Los contratos
son explícitos y los errores de dominio se traducen a HTTP en la API. El catálogo está en
`back/app/catalogue/`, sin persistir datos de TMDB.

Local y Workers importan el mismo paquete `app` con imports explícitos.
Wrangler usa `back` como `base_dir` para conservar el paquete `app`.
`app/worker.py` es el entrypoint desplegado, `app/local_worker.py` añade el
adaptador PostgreSQL local y `app/diagnostics_worker.py` agrupa los diagnósticos
protegidos. `app.main` sirve la API actual en CPython si se necesita.
Las rutas e importadores legacy se han retirado; sus modelos permanecen solo
para inventario y pruebas de migración. Docker no crea el esquema al arrancar.

- [Plan y arquitectura](docs/CLOUDFLARE_MIGRATION.md)
- [Inventario y limpieza del backend](docs/BACKEND_CLEANUP.md)
- [Catálogo TMDB](docs/CATALOGUE_READ_MIGRATION.md)
- [Estado social por IDs TMDB](docs/SOCIAL_TMDB_ID_MIGRATION.md)
- [Runtime Hyperdrive/Neon](docs/DATABASE_RUNTIME_REPORT.md)
- [Autenticación Worker](docs/WORKER_AUTH_MIGRATION.md)
- [Follows Worker](docs/WORKER_FOLLOWS_MIGRATION.md)
- [Recomendaciones](docs/RECOMMENDATIONS_TMDB_MIGRATION.md)
