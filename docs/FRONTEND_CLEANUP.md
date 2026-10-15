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

## Novena fase: estructura y archivos sin uso

La estructura comparte ahora un único `components/layout/`: `MainLayout` pasa allí desde `src/layout/`, junto a la cabecera y los contenedores. Se elimina `components/common/`, repartiendo sus piezas por responsabilidad: `LikeButton` en `movie/`, `NavItem` en `layout/`, y `CountryFlag` y `RatingDisplay` en `ui/`. `LoadingSpinner` también pasa de `layout/` a `ui/`. Se actualizan todos los imports sin mantener archivos puente.

Se retiran `App.css` y los iconos de plantilla React/Vite, las copias de iconos sin referencias de `src/assets/`, el archivo vacío `ProfileEdit.tsx` y los componentes sin consumidores `UserMenu` y `ScrollToTop`. El router activo ya usa `ScrollRestoration`; el perfil activo ofrece logout desde `UserProfileCard`. Se eliminan las carpetas que quedan vacías: `src/layout/`, `src/assets/` y `components/common/`. Se conservan los recursos públicos de marca y `vite-env.d.ts`, incluido por TypeScript aunque no tenga un import explícito.

`front/README.md` documenta las carpetas y dónde colocar componentes nuevos. La selección de archivos eliminados se basa en el grafo de imports desde `main.tsx`, comprobado con el parser de TypeScript, y en búsquedas de referencias en código, HTML, configuración y documentación. El script local `output/frontend/structure-audit.cjs`, ignorado por Git, comprueba también imports relativos sin resolver.

Este cambio solo reorganiza archivos y retira código que no participa en la aplicación. Catálogo TMDB y estado social MovieGraph conservan servicios, identificadores, URLs y comportamiento. No se modifican esquemas ni se migran datos. Validación: lint, build y auditoría de imports; no se añaden nuevos escenarios funcionales porque no cambia la lógica de ejecución.

## Décima fase: composición y carga de Home

El diseño inicial de esta fase se sustituye por el ajuste de carga global documentado más abajo.

`Home` compone las secciones en el orden existente: películas destacadas, estrenos, personas, colección y mejor valoradas. `HomeFeaturedSection`, `HomePeopleSection` y `HomeCollectionSection` poseen sus lecturas; `HomeMovieSection` comparte la presentación y lectura de los dos carruseles de películas con sus títulos, subtítulos y cargadores estables.

Se elimina `useHomeData`, con sus seis estados, promesa retenida, conversión de resultados de `Promise.allSettled` y control manual de desmontaje. Las cinco lecturas reutilizan `useAsyncResource` y `AsyncSection`, ya usados en detalles y géneros. No se añaden nuevos hooks de carga ni un segundo mecanismo de estados asíncronos.

Cambios visibles deliberados: cada sección aparece al llegar sus datos; una lectura lenta ya no retrasa toda la página. Un fallo muestra el error y un reintento propio, sin volver a pedir las otras cuatro secciones. Las secciones vacías continúan ocultas. Las lecturas de destacados, colección aleatoria y personas aceptan `AbortSignal` opcional, por lo que navegar cancela el trabajo pendiente. Una respuesta vacía de colecciones se transforma en `null` y no intenta adaptar un elemento inexistente.

Los tamaños siguen siendo cinco películas destacadas, diez estrenos y diez mejor valoradas; se conservan títulos, subtítulos, orden y selección de colección aleatoria. Todo el contenido es catálogo TMDB leído por `/api/tmdb/*`. No se modifican contratos HTTP, estado social, esquemas ni datos persistidos.

Validación: `npm run lint`, `npm run build` y auditoría de imports pasan. Playwright comprueba con respuestas simuladas carga independiente mientras otra petición sigue pendiente, fallo parcial, reintento de una sola sección, colección vacía, parámetros de lectura, orden de los cinco bloques, viewport móvil, catálogo completamente vacío, cinco errores recuperables y cancelación al navegar por la SPA. Script local: `output/playwright/home-sections-check.cjs`, ignorado por Git. Queda pendiente comprobar estos estados contra TMDB/Worker reales.

## Undécima fase: capas de formularios de autenticación

`LoginForm` y `RegisterForm` se ocupan de presentar campos, validación nativa y navegación. El estado, las modificaciones de valores, el envío y los mensajes de error pasan a `useLoginForm` y `useRegistrationForm`. Los campos se actualizan por claves tipadas, evitando interpretar cualquier `name` del DOM como una propiedad válida del formulario. No se introduce un framework de formularios ni una capa genérica de mutaciones.

El registro agrupa envío, error y éxito en un estado explícito. Ambos hooks bloquean envíos simultáneos mediante una referencia síncrona, incluso antes de que React actualice el botón. Los mensajes de registro se extraen de datos `unknown`, comprobando cadenas y `detail.message` sin afirmar mediante un cast que cualquier respuesta tiene ese formato. Respuestas de validación con listas u objetos inesperados conservan el mensaje de fallback.

`RegistrationGenres` reutiliza `useAsyncResource` para consultar géneros y cancelar al desmontar. Conserva el fieldset, la selección por nombres y el aviso no bloqueante si el catálogo está vacío o falla. Las preferencias enviadas son estado MovieGraph; las opciones visibles siguen siendo catálogo TMDB.

`authService` declara las respuestas de registro, login y perfil con los contratos de la API real; `types/auth.ts` incluye `RegistrationResult` y `LoginResponse`. `birthdate` es obligatorio en el tipo de registro, de acuerdo con el formulario y el backend existentes. No cambian las URLs, el JSON de registro, el envío URL-encoded de login ni el almacenamiento de sesión. El enlace a `/register` pasa a ser un enlace único, eliminando el botón anidado.

Validación: lint y build pasan. Playwright con respuestas simuladas comprueba login 401/503/correcto, codificación de credenciales, validación nativa de email, selección y deselección de géneros, bloqueo de doble envío, JSON exacto de registro, errores de texto/anidados/validación/malformados, éxito sin login automático, persistencia de sesión y cierre del panel al entrar, fallo no bloqueante del catálogo y cancelación al navegar. Script local: `output/playwright/auth-layers-check.cjs`, ignorado por Git. Las mutaciones de prueba son simuladas; no hay cambios de esquema ni migración de datos. Queda pendiente comprobar contra Worker real.

## Ajuste de Home: carga global y menos coordinación

Se recupera el loader de página mientras las cinco lecturas están pendientes y el contenido aparece junto al terminar. `useHomeData` reúne cinco recursos cancelables de `useAsyncResource`, entrega datos preparados para los componentes y deriva `loading` y `error` de sus estados. Los fallos también terminan la espera. Un único aviso con reintento sustituye los cinco bloques de error por sección; el botón consulta solo los recursos fallidos y utiliza el loader global.

Se eliminan el `Set` de secciones completadas, cinco callbacks, cuatro efectos de aviso y el contenido montado pero oculto. También se retiran los cuatro componentes de `components/home/`, que solo envolvían componentes ya reutilizables. `Home` compone directamente los carruseles y los heroes existentes, sin bloques `AsyncSection` repetidos. No cambian las peticiones, los tamaños, el orden, los IDs TMDB ni la persistencia. No hay cambios de esquema ni migración de datos.

Validación: lint, build y auditoría de imports. Los escenarios anteriores de aparición progresiva ya no describen el comportamiento deseado.

## Duodécima fase: páginas legibles y datos preparados

Se aplica el criterio acordado para Home a cuatro páginas. `RecommendationsPage` compone los componentes existentes sin comprobar de nuevo arrays vacíos que esos componentes ya ocultan. Su hook reutiliza `useAsyncResource` para carga y cancelación, entrega arrays preparados y expone un aviso con reintento si falla la operación completa; antes ese fallo solo se registraba en consola. El algoritmo de recomendaciones sigue en el servicio, sin alterar sus fuentes ni sus resultados.

`LatestReleasesPage` recibe los grupos mensuales preparados y memoizados desde `useLatestMovies`. `TopRatedPage` compone `MovieRanking` y la paginación. El componente de ranking concentra el podio y la lista, conserva posiciones, clases y encabezados accesibles, y elimina la conversión de índice a rango mediante un cast.

`UserPage` delega en `useUserProfile` la lectura cancelable, la distinción entre UUID y enlace antiguo por email, la redirección canónica, el 404, el reintento, la identificación del perfil propio y el cierre de sesión con navegación. Reutiliza `useAsyncResource`, eliminando estados y control de desmontaje duplicados. La página conserva la presentación y la red privada solo para el propietario. Las dos lecturas de perfil en `followService` declaran su respuesta `User` en Axios.

Catálogo y agrupaciones siguen siendo datos TMDB; perfiles y relaciones son estado MovieGraph. No hay cambios de esquema, migración de datos ni modificaciones de endpoints. Las páginas de detalle, social, géneros y colecciones ya tienen una composición breve y se conservan en esta fase.

Validación: lint, build, auditoría de imports y comprobación de whitespace pasan. Navegador con API simulada: perfil propio/ajeno, red privada, enlace por email, 503 y reintento, 404, respuesta tardía al cambiar de perfil, ranking/paginación/vacío/error/móvil, grupos por mes tras paginar y recomendaciones con secciones vacías. Script local: `output/playwright/clean-pages-check.cjs`. La comprobación existente `output/playwright/page-hooks-check.cjs` confirma Strict Mode, respuestas tardías y cancelación de recomendaciones. No se realizan escrituras ni peticiones al backend real. Queda pendiente la validación contra Worker real.

## Decimotercera fase: responsabilidades de la cabecera

`Header` compone marca, búsqueda, navegación y paneles. El estado y los efectos de apertura/cierre pasan a `useHeaderPanels`: cierre al navegar, clic fuera, Escape con devolución de foco y cierre de la búsqueda móvil al pasar a escritorio. El estado sigue siendo una única selección de panel; no se añaden estados paralelos ni coordinación por callbacks entre componentes.

`HeaderSessionNav` reúne los accesos de sesión: login anónimo, restauración pendiente o fallida con reintento, enlace al perfil y acceso social. Consume el contexto existente, sin nuevas lecturas HTTP. La cabecera deja de mezclar esas ramas con los controles de búsqueda y categorías. Los paneles conservan su markup, clases, identificadores y atributos ARIA; `CategoryOverlay` sigue siendo el mismo diálogo nativo.

Es una reorganización de presentación y control de interfaz. El catálogo sigue perteneciendo a TMDB y las cuentas a MovieGraph. No cambian contratos HTTP ni hay cambios de esquema o migración de datos.

Validación: lint, build, auditoría de imports y comprobación de whitespace pasan. Playwright con API simulada comprueba exclusión entre paneles, foco y Escape, clic fuera, búsqueda móvil/escritorio, selección de película, menú con teclado, bloqueo y restauración de scroll, cierre al navegar, sesión pendiente/fallida/reintento y destino del perfil. Script local: `output/playwright/header-panels-check.cjs`. También pasa la regresión existente de autenticación `output/playwright/auth-layers-check.cjs`, incluidos login correcto y cierre del panel. No se realizan peticiones ni escrituras al backend real. Queda pendiente validación con lector de pantalla y Worker real.

## Siguientes fases propuestas

1. Revisar accesibilidad de tarjetas y navegación, preservando la interacción con likes y follows.
2. Revisar utilidades y exports de servicios sin consumidores.

Cada fase ejecutará `npm run lint` y `npm run build`. Los cambios de comportamiento asíncrono necesitarán además validación de éxito, fallo y cambio de ruta o consulta durante la petición.
