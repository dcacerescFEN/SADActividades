# Plan de paridad visual con SADInformes

Objetivo: que el shell de SADActividades se vea y se comporte como el de SADInformes, conservando solo el alcance de Actividades.

Estado actual: la base visual (tema, Bootstrap, iconos, ng-select, SweetAlert, localize, HTTPS de desarrollo y proxy) ya está. Falta la **barra de navegación completa**, el **gestor de modo oscuro** y el **bloque de usuario al pie de la sidebar**.

## Diferencias a cerrar

| # | Elemento | SADInformes | SADActividades hoy |
| --- | --- | --- | --- |
| 1 | Toggle de sidebar (escritorio y móvil) | `header.ts:16-27`, dos botones con `data-sidebar-mode` | ausente |
| 2 | Marca con logo | `<img src="/logo-fen-white-letters.svg">` (`header.ts:28-30`) | texto, sin asset |
| 3 | Menú colapsable móvil | `[ngbCollapse]` (`header.ts:31-35`) | ausente |
| 4 | Enlaces de navegación | `navigation.links()` con icono, `aria-current` (`header.ts:38-49`) | ausente |
| 5 | Gestor de modo oscuro | `ThemeStore` + dropdown Claro/Oscuro/Auto (`theme-store.ts:7-41`, `header.ts:52-63`) | ausente |
| 6 | Accesos externos | Correo FEN con tooltip, Cambiar Contraseña (`header.ts:64-80`) | ausente |
| 7 | Menú de usuario y cierre de sesión | `#userMenu` con logout y alerta de estado (`header.ts:68-90`) | logout suelto |
| 8 | Secciones de sidebar con iconos y buscador | `reports-sidebar.ts:55-140` | una entrada simple |
| 9 | Modo colapsado con flyout por hover/focus | `reports-sidebar.ts:85-116` | solo `collapsed` |
| 10 | Favoritos persistidos | clave `sadinformes.sidebar.favorite-routes` | ausente |
| 11 | Drawer móvil | `NgbOffcanvas` (`reports-sidebar.ts:326-337`) | panel manual sin foco atrapado |
| 12 | Bloque de usuario al pie | `sidebar-profile` con iniciales, usuario y nombre (`reports-sidebar.ts:141-147`) | ausente |
| 13 | Dependencia de UI | `@ng-bootstrap/ng-bootstrap 21.0.0` | no instalada |
| 14 | Host de tareas en segundo plano | `background-task-host` en `app.ts` | no aplica todavía |

## Trabajo propuesto

### Unidad 1 — Modo oscuro (tema)

- Crear `src/app/core/layout/theme-store.ts`: `ThemePreference = 'light' | 'dark' | 'auto'`, señales `preference` y `resolvedTheme`, `setPreference()`, persistencia en `sadactividades-theme-preference`, escucha de `prefers-color-scheme` con limpieza vía `DestroyRef`, y aplicación a `document.documentElement` (`data-bs-theme`, `data-theme`, `style.colorScheme`).
- Verificar que `styles.scss` ya define los tokens oscuros (`:root[data-theme='dark']`); completar lo que falte.
- Opcional recomendado: script mínimo en `index.html` que aplique la preferencia antes del arranque para evitar el destello blanco.
- Pruebas: resolución de `auto`, persistencia entre instancias, rechazo de valores inválidos y `setPreference` actualizando el DOM.

### Unidad 2 — Barra de navegación completa

- Instalar `@ng-bootstrap/ng-bootstrap 21.0.0` (para `NgbCollapse`, `NgbDropdown`, `NgbTooltip`, `NgbOffcanvas`).
- Crear `core/navigation/navigation-service.ts` con los enlaces del módulo: Calendario de Actividades; las entradas futuras se agregan cuando existan sus permisos.
- Reescribir `core/layout/header.ts` al patrón de referencia: toggle escritorio/móvil, marca con logo, menú colapsable, enlaces con icono y estado activo, dropdown de tema, accesos externos (Correo FEN y Cambiar Contraseña, configurables), menú de usuario con cierre de sesión y alerta de error.
- Copiar `public/logo-fen-white-letters.svg` como asset institucional.
- Pruebas: render del menú autenticado, cambio de tema desde el header, cierre de sesión invocando `AuthService`, y `aria` de los toggles.

### Unidad 3 — Sidebar con secciones y usuario al pie

- Reescribir `core/layout/activities-sidebar.ts`: secciones con icono (hoy: Calendario), buscador, favoritos persistidos, acordeón en modo expandido y flyout por hover/focus en modo colapsado, estado vacío, y **bloque de usuario al pie** con iniciales, nombre de usuario y nombre completo desde `AuthService`.
- Drawer móvil con `NgbOffcanvas` (position start, backdrop, foco gestionado).
- Pruebas: usuario y nombre con datos y con valores vacíos, favoritos que persisten, cierre del drawer al navegar.

### Unidad 4 — Cierre

- Revisión visual en `https://localhost:4200` contra SADInformes (claro y oscuro, escritorio y móvil).
- Cadena completa: `dotnet test`, `pnpm test`, `pnpm build`, staging, smoke y artefacto publicado.
- Documentar en `docs/frontend-parity.md` lo que queda fuera: host de tareas en segundo plano (llega con las integraciones) y enlaces de módulos que aún no existen.

## Fuera de alcance

- Páginas de informes, catálogos de reportes y sus slugs.
- Suplantación de usuarios y capacidades de SUPERADMIN.
- Host de tareas en segundo plano hasta que existan tareas reales (correo de actividades).

## Riesgos

- `ng-bootstrap` agrega dependencia y peso al bundle: el aviso de presupuesto de 500 kB ya existe por el CSS del tema; no se bajará el presupuesto para ocultarlo.
- El bloc de usuario y el tema leen `AuthService`; sin Keycloak configurado deben mostrar valores por defecto sin romper el shell.
- Copiar selectores de la referencia puede arrastrar estilos de informes; se adaptan por nombre y se eliminan los ajenos.

## Verificación esperada

- Pruebas de `ThemeStore`, `Header`, `ActivitiesSidebar` y `App` en verde.
- `pnpm build` sin errores y sin superar el presupuesto de error de 1 MB.
- Captura comparativa claro/oscuro y escritorio/móvil antes de cerrar.
