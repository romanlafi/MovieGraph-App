# Revisión de seguridad de MovieGraph

13 de octubre de 2026. Revisión del código actual y de la API local; no se ha verificado el despliegue remoto. Los hallazgos afectan al Worker social activo salvo donde se indique lo contrario.

## Resumen

La separación TMDB/Neon, los JWT obligatorios para escrituras sociales y la ausencia de CORS abierto en producción son buenas bases. La exposición de datos personales y la falta de límites de entrada son las prioridades antes del despliegue.

## Alta prioridad

### S1. Listado público de cuentas con datos personales

`back/app/social/routes.py:198` publica `GET /api/v1/follows/list` sin autenticación ni paginación. `back/app/social/store.py:115` consulta todas las cuentas y `back/app/schemas/auth.py:23` incluye email, fecha de nacimiento, biografía, géneros e ID interno. Una petición local sin token devolvió HTTP 200, dos registros y esos seis campos. Impacto: extracción masiva de datos personales. Exigir autenticación para búsquedas sociales, paginar y limitar el contrato público a identificador público, nombre y campos optativos. Revisar también `by_email` (`back/app/social/routes.py:203`) y la exposición de fecha de nacimiento en todas las respuestas públicas.

### S2. Contraseñas largas aceptadas y truncadas silenciosamente

`back/app/schemas/auth.py:9` no limita la contraseña y `back/app/social/passwords.py:6` usa solo los primeros 72 bytes UTF-8. Dos contraseñas con el mismo prefijo de 72 bytes se verifican igual; la prueba actual confirma explícitamente ese comportamiento en `back/tests/test_passwords.py:32`. Impacto: el usuario puede creer que la parte final de su contraseña le protege cuando se ignora. Rechazar entradas que excedan el límite de bcrypt en bytes, con mensaje claro, y definir una longitud mínima razonable. Mantener la verificación de hashes existentes y planificar la transición antes de cambiar el algoritmo.

### S3. Entradas sociales sin longitud máxima

`back/app/schemas/comment.py:5` acepta texto sin límite; `back/app/schemas/auth.py:7` y `back/app/schemas/auth.py:12` tampoco acotan nombre, biografía ni lista de géneros. `back/app/social/store.py:180` persiste comentarios directamente. Impacto: peticiones y filas desproporcionadas, uso excesivo de CPU/memoria y abuso visible. Establecer límites en Pydantic y en la base de datos donde corresponda; agregar restricciones de longitud y un tamaño máximo de cuerpo a nivel de plataforma.

### S4. Protección ante intentos de login no visible

`back/app/social/routes.py:113` verifica credenciales y devuelve 401, pero no hay control de intentos o frecuencia en la aplicación revisada. Puede existir en Cloudflare y no se ha comprobado su configuración. Antes del despliegue, verificar y configurar un límite por IP/cuenta con respuestas uniformes; evitar bloqueos permanentes fáciles de provocar.

**Estado (13 de octubre de 2026):** implementado para el Worker. `wrangler.jsonc` define límites Cloudflare separados de 30 intentos/minuto por IP y 8 intentos/minuto por cuenta; el login usa claves hash y responde 429 uniforme con `Retry-After: 60`. `production` y `pre` tienen espacios de límite separados; la ruta falla cerrada con 503 si falta cualquiera de los bindings. La configuración local valida y empaqueta; el despliegue remoto y la unicidad de los `namespace_id` en la cuenta Cloudflare aún deben verificarse antes de publicar.

## Prioridad media

### S5. Identidad pública basada en email

`front/src/routes/AppRouter.tsx` y las tarjetas de usuario usaban el email en las rutas; la consulta `by_email` también permitía localizar perfiles por ese dato. Esto divulga el email en URLs, historial y enlaces compartidos.

**Estado (13 de octubre de 2026):** implementado en código con `public_id` UUID aleatorio y revisión Alembic `20261009_00`, que rellena identificadores para las cuentas existentes y añade unicidad. Las nuevas rutas, respuestas sociales y acciones follow usan el UUID; las respuestas públicas ya no exponen email ni ID interno y la búsqueda social solo usa username. Los enlaces `/user/{email}` se resuelven temporalmente mediante el endpoint autenticado legado y redirigen con `replace` a `/user/{public_id}`. El endpoint y el cuerpo legado `email` siguen activos para compatibilidad; la migración aún debe aplicarse/verificarse en Neon PRE antes de desplegar el código.

### S6. JWT persistido en localStorage

`front/src/services/session.ts:5` guarda el Bearer token en localStorage. Un XSS en el mismo origen podría leerlo. Es una mejora futura explícita en `AGENTS.md`: mantener la migración de autenticación separada de la de catálogo; revisar CSP y cualquier inclusión de scripts externos. No se ha demostrado un XSS en este análisis.

**Estado parcial (13 de octubre de 2026):** `front/public/_headers` añade CSP y otras cabeceras al sitio estático. La política bloquea scripts externos; permite `unsafe-inline` para estilos por el estilo dinámico existente, además de los hosts de fuentes, imágenes TMDB/banderas y embeds de YouTube usados por la interfaz. No se migró el token desde `localStorage` ni se verificaron las cabeceras en un despliegue remoto.

## Verificaciones y límites

- El JWT exige expiración y asunto en `back/app/social/routes.py:45`; las rutas de modificación social extraen el usuario del token.
- La configuración de producción no aplica CORS comodín (`back/app/application.py:65`).
- La guía actual de Cloudflare confirma `pg8000`, SQLAlchemy síncrono y serialización mediante lock para Python Workers: https://developers.cloudflare.com/hyperdrive/examples/python-workers/
- La recomendación de OWASP sobre el límite de 72 bytes de bcrypt y protección ante intentos está documentada en https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html y https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html.
