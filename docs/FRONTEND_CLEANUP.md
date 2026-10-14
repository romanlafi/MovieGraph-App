# Limpieza del frontend

Este trabajo conserva React, TypeScript, Vite, el router actual y el comportamiento del producto. Cada fase debe tener un alcance concreto y validarse antes de continuar.

## Revisión inicial

Revisión estática de servicios, tipos, contextos, hooks de catálogo, búsqueda y composición de rutas. No constituye una auditoría funcional completa del frontend.

- El cliente Axios está centralizado en `front/src/services/api.ts`.
- Los servicios de catálogo usan `/api/tmdb/*`, con adaptación a los tipos de la interfaz en `catalogueAdapters.ts`.
- Likes y follows son estado de MovieGraph; los likes ya usan IDs de TMDB y los follows usan `public_id` de usuario.
- `useLatestMovies` y `useTopRatedMovies` duplican la lógica de paginación. La carga por género tiene una variante similar.
- El manejo de errores y la protección frente a respuestas tardías varían entre hooks. En búsqueda, cancelar el temporizador no evita que una petición ya enviada actualice resultados de una consulta anterior.
- Los tipos de catálogo conservan `id` junto a `tmdb_id` y mezclan números y strings. Las rutas de detalle todavía llaman `id` a sus parámetros.
- Los contratos `CatalogueMovie`, `CataloguePerson` y `CatalogueCollection` están definidos en el módulo de adaptadores; conviene evaluar su traslado al área de tipos cuando se revise esa frontera.
- No hay script de tests en el `package.json` actual.

## Primera fase: contextos sociales

Separados `FollowContext` y `LikeContext` de sus proveedores y hooks, siguiendo la separación que ya usa autenticación:

- `contexts/*Context.ts`: contrato y contexto.
- `contexts/*Provider.tsx`: estado y operaciones.
- `hooks/user/useFollow.ts` y `hooks/movie/useLikes.ts`: acceso al contexto.

Actualizados los imports en `App`, `LikeButton` y `FollowButton`. Se conservan las operaciones, la comprobación del proveedor y el orden de proveedores. Esta fase no modifica esquemas ni migra datos.

Validación inicial: `npm run lint` pasa con dos avisos de Fast Refresh en los contextos sociales; `npm run build` pasa. Tras la separación, ambos comandos pasan sin esos avisos. La validación funcional de login, likes y follows en navegador sigue pendiente.

## Segunda fase: paginación de películas

`usePaginatedMovies` concentra la carga inicial, páginas sucesivas, estado de carga y errores. Los hooks de estrenos, mejor valoradas y género conservan sus nombres y delegan en él. Se mantienen tamaños de 10, 10 y 18 películas respectivamente, el orden recibido y el criterio anterior de fin de lista: una página con menos resultados que el tamaño solicitado.

- Una sola petición puede estar pendiente por listado, incluso ante llamadas simultáneas antes del siguiente render.
- La página avanza únicamente tras una respuesta correcta. Un fallo conserva las películas cargadas y permite reintentar la misma página, incluida la primera.
- Los servicios aceptan un `AbortSignal` opcional y lo transmiten al cliente de catálogo, también durante la resolución del género.
- Cambiar de género o desmontar cancela la petición. Se comprueba además la identidad del listado y la cancelación antes de aplicar respuestas.
- `MoviePagination` comparte el control de carga, el aviso accesible de error y el botón de reintento entre las tres páginas. Un error inicial ya no se presenta como una lista vacía.

Son lecturas de catálogo TMDB. No se modifican rutas de API, autenticación, esquemas de base de datos ni datos persistidos.

La limpieza de efectos sigue la [documentación oficial de React](https://react.dev/reference/react/useEffect); la propagación de `AbortSignal` sigue la [cancelación de Axios](https://axios-http.com/docs/cancellation).

Validación: `npm run lint`, `npm run build` y `git diff --check -- front docs/FRONTEND_CLEANUP.md` pasan. Comprobaciones con Playwright sobre Vite y respuestas simuladas:

- Fallo inicial y reintento; fallo de la siguiente página y conservación de resultados; reintento de la misma página.
- Clics repetidos durante una carga y llamadas síncronas simultáneas al hook.
- Fin de paginación con página corta o vacía y conservación de tamaños de página.
- Estrenos y cambio de género durante una petición pendiente, con cancelación comprobada.
- Strict Mode, respuesta tardía de un cargador que ignora la cancelación, desactivación del hook y desmontaje.

Los scripts de comprobación local están en `output/playwright/pagination-check.cjs` y `output/playwright/pagination-hook-check.cjs`, dentro del directorio de artefactos ignorado por Git. No sustituyen una comprobación contra el Worker/TMDB reales. Se conserva la limitación previa de inferir el fin del catálogo por la cantidad de resultados filtrados, ya que la API actual entrega arrays sin metadatos de paginación.

## Tercera fase: búsqueda de películas

`useMovieSearch` gestiona consulta, debounce de 300 ms, petición, resultados, errores y reintentos. `SearchBar` conserva la navegación y apertura/cierre del desplegable. `MovieSearchResults` presenta resultados o estados de carga, vacío y error.

- Se mantiene el mínimo de dos caracteres, la selección mediante ID de TMDB y el filtro de películas con póster y puntuación. Ahora se ignoran espacios exteriores y el input limita la entrada a los 200 caracteres admitidos por la API.
- Cambiar o limpiar la consulta cancela inmediatamente la petición y elimina resultados anteriores. El efecto limpia también el temporizador al cambiar la consulta o desmontar.
- Las respuestas y errores tardíos se ignoran aunque el transporte no respete la cancelación. Repetir exactamente la consulta actual conserva el estado existente.
- Los fallos muestran un aviso y permiten repetir la consulta. La búsqueda informa de carga y ausencia de resultados, con una región de estado para tecnología de asistencia.
- Los resultados siguen siendo botones accesibles con Tab y Enter, dentro de una lista. Escape desde el input o los resultados limpia la búsqueda y devuelve el foco al input; en móvil el Header conserva su cierre del panel.
- El cierre exterior usa `pointerdown`, antes de que un clic de reintento pueda retirar el botón del DOM y confundirse con una interacción fuera del buscador.
- `searchTmdbMovies` acepta `AbortSignal` y reutiliza `getTmdbCatalogue`, eliminando la duplicación de construcción del URL del catálogo.

Se trata de catálogo TMDB. No cambian rutas de API, contratos de respuesta, autenticación, esquemas ni datos persistidos.

Validación con Playwright sobre Vite y respuestas simuladas: debounce y mínimo de caracteres, cambio rápido de consulta, filtros, carga/vacío/error/reintento, cancelación al cerrar o acortar la consulta, teclado, navegación al ID correcto, selección y desmontaje del buscador móvil. Comprobación aislada del hook en Strict Mode con un transporte que ignora la cancelación: respuesta tardía correcta y fallida, limpieza del temporizador, repetición de consulta y desmontaje.

Los scripts locales están en `output/playwright/search-check.cjs` y `output/playwright/search-hook-check.cjs`, ignorados por Git. Se ejecutan además `npm run lint`, `npm run build` y comprobación de diff. Queda pendiente la comprobación contra Worker/TMDB reales y con lector de pantalla.

## Cuarta fase: contratos e identidad del catálogo

Los tipos de la UI `Movie`, `Person`, `Collection`, `Genre` y `MovieSearchResult` tienen una única identidad: `tmdbId: number`. Se eliminan las copias ambiguas `id`, los IDs de catálogo almacenados como strings y el uso de `tmdb_id` en componentes y hooks.

- `types/tmdb.ts` concentra los contratos de respuesta del gateway: películas, personas, colecciones, géneros, búsqueda y filmografía. Conservan los nombres que entrega la API, incluido `tmdb_id`.
- `catalogueAdapters.ts` concentra la conversión a los tipos de la UI, también en géneros y búsqueda. Conserva los filtros y formatos anteriores de imágenes, puntuaciones, fechas, duración y valores nulos.
- Los servicios de detalle, filmografía y colecciones reciben IDs numéricos. La filmografía tiene un contrato explícito de UI en `types/person.ts`.
- Rutas y parámetros usan `tmdbMovieId` y `tmdbPersonId`. Las URLs públicas continúan siendo `/movie/550` y `/person/287`.
- `parseTmdbId` convierte los parámetros de texto a enteros positivos seguros. Los parámetros inválidos muestran 404 sin enviar una petición de catálogo.
- Se actualizan tarjetas, carruseles, búsqueda, detalles, registro, exploración de géneros/colecciones y recomendaciones. Las claves y los mapas de catálogo usan IDs numéricos.
- El algoritmo de recomendaciones conserva fuentes, exclusiones, desempates y orden; su mapa de personas ahora usa IDs numéricos de TMDB.

Todos estos valores pertenecen al catálogo TMDB. Los IDs y contratos de usuarios, comentarios y preferencias persistidas de MovieGraph se mantienen: las preferencias de género continúan enviando los nombres que espera la API actual. No se modifican modelos, tablas, rutas de API ni datos persistidos.

Validación: `npm run lint` y `npm run build` pasan. Playwright comprueba con respuestas simuladas navegación película/persona, filmografía, colecciones, géneros, likes/unlikes, publicación y consulta de comentarios y selección de preferencias durante registro. Comprueba también rutas inválidas, identidad numérica anidada, eliminación de aliases, transformación de valores nulos y conservación del ranking/deduplicación de recomendaciones.

Se vuelven a ejecutar las comprobaciones de búsqueda y paginación, incluidos los hooks en Strict Mode, adaptando las fixtures a `tmdbId`. Los nuevos scripts locales son `output/playwright/catalogue-ids-check.cjs` y `output/playwright/catalogue-adapters-check.cjs`, ignorados por Git. Los tests no escriben en el backend real; queda pendiente comprobar los flujos con Worker/TMDB reales.

## Quinta fase: páginas y componentes compartidos

Se extrae únicamente el patrón de scroll horizontal idéntico entre carruseles de películas y personas a `components/layout/HorizontalScroller.tsx`. Los componentes de dominio conservan sus tarjetas, títulos, subtítulos, roles y tratamiento de listas vacías. Los contenedores, clases de scroll, espacios y snap mantienen el mismo DOM que antes.

`components/ui/LoadMoreButton.tsx` comparte el botón centrado, el estado deshabilitado y la etiqueta de carga entre paginación de películas y exploración de géneros/colecciones. Conserva las etiquetas de cada página.

Las recomendaciones se cargan en `hooks/movie/usePersonalizedRecommendations.ts`, usando un solo estado con los cuatro grupos que devuelve el servicio. La página se ocupa de presentarlos y conserva el orden, la ocultación de grupos vacíos y la cancelación durante desmontaje. El algoritmo del servicio no cambia.

Colecciones usa `hooks/collection/useCollections.ts`: una única lista de colecciones con sus películas, carga cancelable, errores, reintento y contador de elementos visibles. Se elimina el mapa que copiaba las películas ya presentes en cada colección. Se mantienen bloques de cinco y el orden recibido. Se elimina la espera artificial de 300 ms al revelar datos que ya están en memoria; cargar más ahora es inmediato y no genera peticiones adicionales. Un fallo de carga muestra un error y permite reintentar; una respuesta vacía muestra un mensaje específico.

Los títulos de carruseles que enlazan a géneros usan un `Link` dentro del encabezado, sustituyendo el click en un `h2`. Conservan el destino y ahora admiten Tab/Enter y las funciones habituales de un enlace. Los títulos de recomendaciones y filmografía continúan sin enlazar a géneros.

Propiedad de los datos: colecciones y carruseles son catálogo TMDB; recomendaciones combina referencias y estado MovieGraph con catálogo en memoria. No se modifican APIs salvo aceptar una señal opcional de cancelación en `getCollections`; no cambian esquemas, autenticación ni datos persistidos.

Validación: `npm run lint` y `npm run build` pasan. Playwright con respuestas simuladas comprueba error/reintento/lista vacía de colecciones, bloques de 5/10/12, ausencia de nuevas peticiones al revelar elementos, cancelación al navegar dentro de la SPA, enlaces de género con teclado, orden y listas vacías de recomendaciones y scroll de películas/personas en móvil. Los hooks se comprueban en Strict Mode, incluyendo transporte que ignora cancelación, respuestas tardías y desmontaje.

Scripts locales: `output/playwright/pages-check.cjs` y `output/playwright/page-hooks-check.cjs`, ignorados por Git. Se repiten además las comprobaciones de paginación y de flujos de catálogo/sociales afectados por los componentes compartidos. Sigue pendiente validación contra Worker/TMDB reales.

## Sexta fase: composición modular de detalles y géneros

Las páginas de película y persona se ocupan ahora del parámetro de ruta, la ficha principal y la composición. Las secciones poseen sus lecturas y reintentos de forma independiente:

- Película: `MovieCastSection`, `MovieCollectionSection`, `MovieRelatedSection` y `MovieCommentsSection`.
- Persona: `PersonFilmographySection` y `PersonCollaboratorsSection`.
- Géneros: `GenreMoviesSection` por cada género visible; `useExploreGenres` gestiona el listado, el orden y los bloques de tres.

Reutilización efectiva: `useAsyncResource` comparte cancelación, errores, reintento y aislamiento de respuestas entre lecturas. Conserva datos válidos al reintentar o fallar y evita mostrar datos de otro recurso cuando cambia el cargador. `AsyncSection` comparte carga, error y vacío por sección, conservando el contenido parcial. `ErrorState` comparte aviso y botón de reintento entre detalles, géneros, comentarios y colecciones.

Cambios de comportamiento deliberados:

- Una incidencia de red/servidor en la ficha principal muestra error con reintento; solo un ID inválido o un 404 real muestra la página 404.
- La ficha de persona se presenta al llegar su información principal, sin esperar a filmografía y colaboradores. Estas secciones cargan en paralelo y muestran sus propios estados.
- Fallos en relacionados, colección, filmografía o colaboradores no ocultan la ficha ni el contenido correcto de las otras secciones. Reintentar no recarga toda la página.
- La exploración sigue mostrando géneros en orden alfabético y bloques de tres. Se bloquea cargar otro bloque mientras hay géneros pendientes; los géneros correctos aparecen sin esperar al que falla.
- La selección aleatoria por género pasa a `genreMoviesService.ts`, conservando páginas de 20, hasta tres páginas, umbral de diez candidatos y mezcla. Si falla una página posterior, se conservan los candidatos ya obtenidos y se avisa del fallo parcial.
- Los comentarios no muestran cero resultados durante carga o fallo. El formulario conserva su independencia de la lectura y sus errores de publicación. `useMovieComments` combina comentarios publicados con la lectura, sin duplicarlos ni perderlos ante respuestas tardías; una publicación iniciada en otra película no altera la ficha actual.

TMDB sigue siendo propietario de ficha, créditos, colección, filmografía y géneros. Comentarios sigue siendo estado MovieGraph y usa `/api/v1/movies/{tmdbMovieId}/comments`. Los servicios de lectura afectados aceptan `AbortSignal` opcional; no cambian URLs ni contratos de API, autenticación, esquemas o datos persistidos.

Validación: `npm run lint`, `npm run build` y comprobación de diff pasan. Playwright comprueba fallos y reintentos independientes, 404 frente a incidencia del servidor, orden del reparto, comentarios conservados/deduplicados, cancelación al cambiar de persona y géneros con datos parciales y carga por bloques. El recurso compartido se prueba en Strict Mode, con transporte que ignora la cancelación, reintento con datos previos, cambio/desactivación/reactivación del cargador, fallo síncrono y desmontaje. Se repiten flujos de catálogo, likes, comentarios y preferencias.

Scripts locales: `output/playwright/detail-sections-check.cjs` y `output/playwright/async-resources-check.cjs`, ignorados por Git. Las comprobaciones de fallos y publicaciones usan respuestas simuladas; queda pendiente validación completa contra Worker/TMDB reales y con lector de pantalla.

## Séptima fase: cabeceras de detalle

`MovieHeaderCard` compone `MovieMedia` y `MovieMetadata`; `MovieMetadata` combina datos técnicos en `MovieFacts` con puntuación, like, géneros y argumento. `PersonHeaderCard` compone el retrato existente `PersonImage` con `PersonMetadata`, que presenta nombre, nacimiento, lugar y biografía.

`DetailMediaLayout` comparte entre ambas cabeceras la fila responsive y el marco de imagen, eliminando la duplicación sin introducir nuevos contenedores en el DOM. Las cabeceras conservan el panel y sus clases. Los componentes siguen reutilizando `Title`, `Text`, `GenreBadge`, `RatingDisplay`, `CountryFlag`, `LikeButton` y los helpers de formato e imágenes.

Es una separación de presentación: se conservan prioridades/tamaños de imágenes, fallback de retrato, selección de tráiler frente a backdrop, URL y autoplay del iframe, datos opcionales, formato de recaudación, destinos de enlaces y comportamiento de likes. No cambian servicios, contratos, autenticación, esquema ni datos persistidos. La información mostrada procede del catálogo TMDB y el like sigue siendo estado MovieGraph.

Validación: `npm run lint`, `npm run build` y comprobación de diff pasan. Antes y después se comparan el HTML completo de cada cabecera y las posiciones/tamaños de sus elementos en 1280 y 390 px, con seis escenarios: película con tráiler, película con backdrop, película con metadatos ausentes, persona con retrato, persona sin retrato y retrato que falla. Las doce comparaciones conservan el DOM y la geometría. Se repiten navegación de fichas, likes/unlikes, comentarios, filmografía, colecciones, géneros y preferencias con respuestas simuladas.

Script local: `output/playwright/header-layout-check.cjs`, ignorado por Git; el baseline se guarda en el navegador de comprobación. Sigue pendiente la revisión visual con datos reales y lector de pantalla.

## Octava fase: búsqueda y red social

`SocialPage` compone `SocialSessionState`, `UserSearchSection` y `UserNetworkSection`. El perfil conserva su lectura, compatibilidad con enlaces antiguos y autorización de presentación; su red pasa a `ProfileNetworkSection`.

Reutilización efectiva: `useUserNetwork` carga seguidores y seguidos tanto en social como en el perfil propio, usando `useAsyncResource` para cancelación, aislamiento por sesión y reintento. El perfil de otra persona no carga la red privada. `UserGrid` comparte las tarjetas y su layout responsive entre búsqueda, red social y ambas listas del perfil. Los cambios de follow refrescan las dos listas sin cambiar el proveedor global ni las mutaciones existentes.

`useUserSearch` conserva el envío manual, el recorte de espacios, el mínimo de dos caracteres, los mensajes y la protección frente a envíos duplicados. Cancela la lectura al editar o desmontar y descarta respuestas tardías incluso si el transporte ignora la cancelación. La sección de búsqueda se reinicia al cambiar de sesión: también desaparece el texto de la consulta anterior, evitando conservar búsquedas de otra cuenta.

Usuarios y follows pertenecen a MovieGraph; navegación y mutaciones siguen usando `public_id`. Las tres lecturas de `followService` aceptan ahora `AbortSignal` opcional y respuestas tipadas. Se conservan URLs, contratos, controles de sesión, mensajes, selectores y diseño. No hay cambios de esquema, migraciones de datos ni escrituras sobre el backend real durante la validación.

Validación: `npm run lint`, `npm run build` y comprobación de diff pasan. Playwright con respuestas simuladas comprueba visitante anónimo, restauración y reintento de sesión, error/reintento de red, contadores y selectores, consultas inválidas/recortadas/vacías/fallidas, enlaces de perfil, ausencia de self-follow, follow/unfollow con refresco, respuesta tardía, layout móvil, perfil propio/ajeno, cambio de cuenta y logout. Los hooks se comprueban en Strict Mode con transporte que ignora cancelación, envío duplicado, reintento, desactivación y desmontaje.

Scripts locales: `output/playwright/social-modules-check.cjs` y `output/playwright/social-hooks-check.cjs`, ignorados por Git. Sigue pendiente validación contra Worker real y revisión con lector de pantalla.

## Siguientes fases propuestas

1. Revisar accesibilidad de tarjetas y navegación, preservando la interacción con likes y follows.
2. Revisar la composición de Home y los estados compartidos de carga y error restantes.

Cada fase ejecutará `npm run lint` y `npm run build`. Los cambios de comportamiento asíncrono necesitarán además validación de éxito, fallo y cambio de ruta o consulta durante la petición.
