# Organización del frontend

React, TypeScript y Vite. Los comandos se ejecutan desde `front/`:

```sh
npm run dev
npm run lint
npm run build
```

## Responsabilidades

```text
src/
  components/
    auth/        Formularios de autenticación
    comment/     Comentarios de películas
    genre/       Selección y exploración de géneros
    hero/        Presentaciones destacadas de catálogo
    layout/      Layout de rutas, cabecera y contenedores compartidos
    movie/       Tarjetas, likes y secciones de películas
    person/      Tarjetas y secciones de personas
    search/      Búsqueda de películas
    ui/          Elementos visuales compartidos y campos de formulario
    user/        Perfiles, follows y búsqueda de usuarios
  contexts/      Contratos de contexto y proveedores de sesión/estado social
  data/          Configuración y contenido estático
  hooks/         Lecturas y estado; subcarpetas por dominio
  pages/         Composición de páginas y parámetros de ruta
  routes/        Router y URLs públicas
  services/      Cliente HTTP, contratos externos y adaptadores
  types/         Tipos de dominio y respuestas de API
  utils/         Funciones sin estado de presentación y validación
  index.css      Estilos globales y tema
```

Coloca cada componente en el dominio que representa. Usa `ui/` para piezas
visuales compartidas y `layout/` para estructura, navegación y composición.
Por ejemplo, `LikeButton` pertenece a `movie/`, `NavItem` a `layout/` y
`LoadingSpinner` a `ui/`.

Las páginas componen secciones; los hooks gestionan lecturas y estado, y los
servicios centralizan el acceso a la API. Los archivos `.d.ts` pueden ser
incluidos por TypeScript sin imports explícitos: `vite-env.d.ts` aporta los
tipos de Vite.

El criterio de limpieza es que una página permita entender de un vistazo qué
muestra: loader, aviso si hace falta y composición de secciones. Los hooks
entregan datos preparados para mostrar y reúnen carga, errores y acciones.
Reutiliza los componentes que ya existen; extrae un componente cuando represente
un bloque visual completo o elimine repetición real. Los estados que se puedan
calcular no necesitan otro estado, efecto o callback de coordinación.
Conserva el comportamiento de carga y la presentación al reorganizar código.

`useHomeData` reúne las lecturas cancelables del inicio y calcula la carga
global a partir de sus estados. `Home` muestra el loader de página hasta que
terminan y compone los componentes de catálogo existentes. Un único aviso reúne
los fallos; su botón reintenta solo las peticiones fallidas con el loader global.

En autenticación, `LoginForm` y `RegisterForm` presentan los campos;
`useLoginForm` y `useRegistrationForm` gestionan valores, envío y errores;
`authService` define las llamadas HTTP y `types/auth.ts` sus contratos.
`RegistrationGenres` posee la lectura cancelable del catálogo de géneros.

En la cabecera, `Header` compone marca, búsqueda, navegación y paneles.
`useHeaderPanels` gestiona apertura, cierre, cambios de ruta y foco;
`HeaderSessionNav` presenta los accesos según el estado de sesión.

Usa `@/` para imports entre carpetas y rutas relativas para archivos vecinos.
Vite y TypeScript comparten el alias `@` hacia `src/`.

`public/` conserva recursos con URL pública estable y los archivos de marca.
Elimina archivos sin uso después de comprobar imports, rutas de recursos y
configuración. Crea carpetas cuando tengan contenido concreto.

El catálogo se consulta por `/api/tmdb/*` y usa IDs TMDB. Cuentas y relaciones
sociales se consultan por `/api/v1/*`; los usuarios se identifican con `public_id`.
El cliente Axios sigue centralizado en `services/api.ts`.

El historial de cambios y validaciones está en
[`docs/FRONTEND_CLEANUP.md`](../docs/FRONTEND_CLEANUP.md).
