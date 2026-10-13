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

## Prioridad media

### S5. Identidad pública basada en email

`front/src/routes/AppRouter.tsx:18` usa `/user/:email`; `front/src/components/layout/Header.tsx:67` inserta el email en el enlace, y `back/app/social/routes.py:203` permite buscarlo directamente. Esto divulga el email en URLs, historial y enlaces compartidos. Introducir identificador público estable para perfiles y relaciones nuevas; conservar una transición para enlaces existentes.

### S6. JWT persistido en localStorage

`front/src/services/session.ts:5` guarda el Bearer token en localStorage. Un XSS en el mismo origen podría leerlo. Es una mejora futura explícita en `AGENTS.md`: mantener la migración de autenticación separada de la de catálogo; mientras tanto, revisar encabezados CSP y cualquier inclusión de scripts externos. No se ha demostrado un XSS en este análisis.

## Verificaciones y límites

- El JWT exige expiración y asunto en `back/app/social/routes.py:45`; las rutas de modificación social extraen el usuario del token.
- La configuración de producción no aplica CORS comodín (`back/app/application.py:65`).
- La guía actual de Cloudflare confirma `pg8000`, SQLAlchemy síncrono y serialización mediante lock para Python Workers: https://developers.cloudflare.com/hyperdrive/examples/python-workers/
- La recomendación de OWASP sobre el límite de 72 bytes de bcrypt y protección ante intentos está documentada en https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html y https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html.
