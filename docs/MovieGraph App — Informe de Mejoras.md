# MovieGraph App — Informe de Mejoras

Oct 9, 2026 · @Observatoriocamara

## Resumen ejecutivo

MovieGraph es una app social de cine funcional y bien estructurada: React 19 + TypeScript + Vite en frontend, FastAPI sobre Cloudflare Workers en backend, PostgreSQL (Neon) como base de datos, y TMDB como catálogo. La arquitectura es sólida (factory pattern multi-entorno, capas separadas, Context API), pero hay gaps importantes en seguridad, rendimiento, testing y calidad de código que conviene abordar antes de considerar el producto listo para producción real.

Este informe organiza los hallazgos por área y prioridad, con recomendaciones concretas y un roadmap de acción al final.

## Seguridad

### Crítico

| Problema | Ubicación | Impacto | Solución propuesta |
| --- | --- | --- | --- |
| Token JWT en localStorage | `AuthProvider.tsx` | Vulnerable a XSS: cualquier script inyectado roba tokens de todos los usuarios | Migrar a httpOnly cookies con flag `Secure` y `SameSite=Strict` |
| Sin validación de contraseña | `schemas/user.py` | Usuarios pueden registrarse con contraseñas de 1 carácter | Añadir validadores Pydantic: mínimo 8 chars, mayúscula, número, carácter especial |
| Comentarios sin límite de longitud | `schemas/comment.py` | DoS por payload masivo, posible agotamiento de memoria/storage | `Field(max_length=2000)` en el schema + truncado en frontend |
| Enumeración de usuarios | `follows.py` `/list` | Endpoint público devuelve emails y usernames de TODOS los usuarios | Requirir autenticación, paginar, y limitar campos expuestos |

### Alto

| Problema | Ubicación | Impacto | Solución propuesta |
| --- | --- | --- | --- |
| Sin rate limiting | Endpoints `/login`, `/register` | Ataques de fuerza bruta viables | Implementar rate limiting por IP (slowapi o Cloudflare rules) |
| Sin protección CSRF | Operaciones POST/DELETE | Acciones no autorizadas si CORS mal configurado | Tokens CSRF o migrar auth a cookies httpOnly |
| Errores de BD expuestos | `database.py` | `str(exc)` en HTTP 503 filtra detalles internos (tablas, queries) | Mensajes genéricos en producción, logging interno del error real |
| python-jose sin mantenimiento | `requirements.txt` | Librería JWT abandonada, vulnerabilidades sin parchear | Migrar a PyJWT (activamente mantenida) |
| Algoritmo JWT débil | `config.py` | HS256 (simétrico) — si la SECRET\_KEY se filtra, cualquiera firma tokens | Considerar RS256 (asimétrico) en producción |

## Rendimiento y base de datos

### Queries N+1

Varios servicios cargan relaciones en bucles sin eager loading, generando una query por iteración:

| Servicio | Archivo | Problema |
| --- | --- | --- |
| Follow | `follow_service.py:50-61` | `get_following()` accede a `u.favorite_genres` por cada usuario → query extra por usuario |
| Recommendations | `recommendation_service.py:60-62` | Loop por `liked_movies` y sus `movie_persons` → múltiples queries |
| Person | `person_service.py:94-131` | Construye `PersonWithRoleResponse` iterando `movie_persons` → N+1 |

Solución: usar `joinedload()` o `selectinload()` en las queries SQLAlchemy para cargar relaciones en batch.

### Índices faltantes

| Columna | Modelo | Uso | Impacto |
| --- | --- | --- | --- |
| `username` | User | Búsqueda por username | Full table scan en cada búsqueda |
| `name` | Person | `ilike()` en búsquedas | Lento con volumen alto |
| `name` | Genre | Lookups frecuentes | Menor impacto pero fácil de añadir |

### Frontend

- **Cola secuencial en `/api/v1/`** (`api.ts:11-27`): todas las requests sociales se serializan. Previene race conditions pero crea cuello de botella cuando hay requests independientes. Considerar serializar solo operaciones de escritura.
- **Comentarios sin paginación**: se carga la lista completa. Con volumen alto, impacto en tiempo de carga y memoria. Implementar paginación server-side.
- **Sin análisis de bundle**: no hay `vite-plugin-visualizer` ni similar para detectar dependencias pesadas o code splitting subóptimo.

## Calidad de código y mantenibilidad

### Duplicación de lógica

El hashing de contraseñas está implementado en tres sitios distintos:

1. `core/security.py` — funciones `hash_password` / `verify_password`
2. `services/postgres/auth_service.py` — su propia implementación
3. `social/passwords.py` — variante para Workers

Consolidar en un solo módulo con adaptador por entorno (bcrypt local vs Worker).

### Magic strings

Roles como `"ACTOR"` y `"DIRECTOR"` aparecen hardcodeados en múltiples archivos. Extraer a un `enum` Python y constantes TypeScript compartidas.

### Manejo de errores inconsistente

- Backend: `UserNotFoundError`, `EmailConflictError` usan formatos de `detail` distintos (`{error, message}` vs string plano). Estandarizar a un formato único.
- Frontend: `postComment` en `commentService.ts` no verifica respuesta ni lanza errores significativos — fallos silenciosos.
- `useMovieDetail.ts:58`: `void Promise.all(enrichmentRequests)` ignora rechazos de promesas.
- Interceptor de errores en `api.ts:40-46` no propaga estado correctamente.

### Console logging en producción

16 llamadas `console.log/error` en el frontend. Reemplazar con un wrapper de logging que se desactive en producción o use un servicio de error tracking (Sentry, etc.).

### Tipos débiles

- Modelos Pydantic sin restricciones de longitud en campos string (username, bio, título de película).
- `tsconfig` con `skipLibCheck: true` — oculta problemas de tipos en dependencias.
- Falta `noImplicitReturns` y `exactOptionalPropertyTypes` en la config de TypeScript.

## Testing y fiabilidad

### Estado actual

| Área | Cobertura | Detalle |
| --- | --- | --- |
| Backend — Social API | Parcial | Tests de integración para social worker, passwords, TMDB, auth migration |
| Backend — Core services | Ninguna | Sin tests para recommendation engine, búsqueda, comentarios, follows |
| Backend — Error recovery | Ninguna | Fallos de conexión a BD y timeouts de TMDB sin verificar |
| Frontend — Componentes | Ninguna | Cero tests unitarios o de integración |
| Frontend — Servicios | Ninguna | Sin tests para API services, hooks, o contextos |
| E2E | Ninguna | Sin tests end-to-end (Playwright, Cypress) |

### Recomendaciones

1. **Frontend inmediato**: Añadir Vitest + React Testing Library. Priorizar tests para AuthProvider, LikeContext, FollowContext (lógica crítica de negocio).
2. **Backend servicios**: Tests unitarios para `recommendation_service`, `follow_service`, `comment_service` con BD de test.
3. **E2E crítico**: Implementar Playwright para flujos críticos: registro → login → like → comentar → follow.
4. **CI pipeline**: Configurar GitHub Actions o Cloudflare Builds para correr tests en cada PR. Actualmente no hay CI de tests.
5. **Error recovery**: Tests específicos para timeouts de TMDB API, desconexiones de BD, tokens expirados.

## Frontend: UX, accesibilidad y estado

### Accesibilidad (a11y)

| Componente | Problema | Fix |
| --- | --- | --- |
| LikeButton | Sin `aria-label` — lectores de pantalla no saben qué hace el botón | Añadir `aria-label="Me gusta"` / `aria-pressed` |
| Header | Botón "Retry" sin contexto — no explica qué se reintenta | `aria-label="Reintentar conexión"` |
| SearchBar | Resultados del dropdown no se anuncian a screen readers | `aria-live="polite"` en el contenedor de resultados |
| Forms | Login/Register no gestionan foco tras submit (éxito o error) | Focus al primer error o redirect con anuncio |

### Gestión de estado

Context API funciona bien para el tamaño actual del proyecto. Puntos de mejora:

- **Optimistic updates**: `toggleLike` y `toggleFollow` esperan respuesta del server antes de actualizar UI. Actualizar estado local inmediatamente y revertir si falla → UX más responsiva.
- **Cache de catálogo**: Las búsquedas TMDB no se cachean. Misma búsqueda = misma request. Considerar `react-query` (TanStack Query) para cache automático, deduplicación y revalidación.
- **Loading states granulares**: Algunos hooks usan un solo `isLoading` para múltiples fetches. Desglosar para mostrar contenido parcial mientras se cargan secciones secundarias.
- **Error boundaries**: No hay React Error Boundaries. Un error en un componente hijo tumba toda la página. Añadir boundaries al menos en layout y en cada página.

### UX

- Sin feedback visual al hacer like/follow (solo cambia estado). Añadir animación o transición.
- Formulario de registro no muestra requisitos de contraseña (porque no existen — ver Seguridad).
- Sin skeleton loaders — pantalla en blanco durante carga inicial.

## Arquitectura y dependencias

### Arquitectura — lo que funciona bien

- Factory pattern multi-entorno (`create_app`) con flags claros — permite local, Worker y preview con el mismo código base.
- Separación limpia en capas: routes → schemas → services → models → DB.
- Catálogo TMDB como gateway read-only sin persistencia local — decisión acertada que simplifica el modelo de datos.
- Request-time DB config para Workers stateless — bien resuelto con `DatabaseConfig` y `NullPool`.
- Proxy de Vite para desarrollo local — transparente para el frontend.

### Arquitectura — puntos de mejora

- **API dual (legacy v1 + social)**: Dos conjuntos de rutas para funcionalidad solapada genera confusión. Consolidar en una API única cuando la migración a Workers esté completa.
- **Sin versionado real de API**: El prefijo `/api/v1/` existe pero no hay v2. Si se rompe compatibilidad, no hay mecanismo de migración para clientes.
- **Variables de entorno sin documentar**: No hay un `.env.example` completo con todas las variables requeridas y sus descripciones. Los docs mencionan algunas pero no todas.
- **Sin health check de BD**: `/api/health` no toca la base de datos — no detecta problemas de conexión reales.

### Dependencias — riesgos

| Dependencia | Versión | Riesgo | Acción |
| --- | --- | --- | --- |
| python-jose | 3.4.0 | Sin mantenimiento activo, CVEs sin parchear | Migrar a PyJWT |
| passlib | 1.7.4 | Proyecto casi abandonado (último release 2020) | Usar bcrypt directamente |
| psycopg2-binary | 2.9.10 | Binary wheel no recomendado en producción | Usar psycopg2 compilado o psycopg 3 |
| React 19 | 19.0.0 | Relativamente nuevo, posibles breaking changes en ecosystem | Monitorizar compatibilidad de dependencias |

### Dependencias — ausencias notables

- **Backend**: Sin rate limiter (slowapi), sin structured logging (structlog), sin monitoring (sentry-sdk).
- **Frontend**: Sin testing framework (Vitest), sin query cache (TanStack Query), sin bundle analyzer, sin Sentry o similar para error tracking.

## Roadmap de prioridades

### Fase 1 — Seguridad (urgente)

- [ ] Migrar JWT de localStorage a httpOnly cookies
- [ ] Añadir validación de contraseña (min 8 chars, complejidad)
- [ ] Limitar longitud de comentarios y campos de texto
- [ ] Proteger endpoint `/follows/list` (autenticación + paginación)
- [ ] Implementar rate limiting en login/register
- [ ] Reemplazar python-jose por PyJWT
- [ ] Sanitizar mensajes de error en producción (no exponer detalles de BD)

### Fase 2 — Estabilidad y testing

- [ ] Configurar Vitest + React Testing Library en frontend
- [ ] Tests unitarios para AuthProvider, LikeContext, FollowContext
- [ ] Tests de servicios backend: recommendations, follows, comments
- [ ] Añadir Error Boundaries en React (layout + páginas)
- [ ] Configurar CI pipeline (GitHub Actions) para tests en PRs
- [ ] Health check con conexión real a BD

### Fase 3 — Rendimiento

- [ ] Resolver N+1 queries con eager loading (joinedload/selectinload)
- [ ] Añadir índices en username (User), name (Person, Genre)
- [ ] Implementar paginación server-side para comentarios
- [ ] Evaluar TanStack Query para cache de catálogo TMDB
- [ ] Serializar solo escrituras en cola de requests (lecturas en paralelo)
- [ ] Añadir bundle analyzer para optimizar tamaño

### Fase 4 — Calidad y DX

- [ ] Consolidar hashing de contraseñas en un módulo
- [ ] Extraer roles a enums (ACTOR, DIRECTOR)
- [ ] Estandarizar formato de errores API
- [ ] Reemplazar console.log por logging estructurado
- [ ] Añadir Field constraints en modelos Pydantic
- [ ] Documentar variables de entorno en .env.example
- [ ] Consolidar API legacy + social en una sola

### Fase 5 — UX y accesibilidad

- [ ] Añadir aria-labels a botones interactivos
- [ ] Implementar skeleton loaders
- [ ] Optimistic updates para likes y follows
- [ ] Animaciones de feedback en interacciones
- [ ] Gestión de foco en formularios
- [ ] aria-live para resultados de búsqueda
