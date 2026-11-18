# Paridad estructural del frontend con SADInformes

Este documento describe la base del frontend de SADActividades: qué se alineó con SADInformes, qué queda para la unidad del shell y cómo se ejecuta el servidor de desarrollo con HTTPS. No describimos aquí pantallas de reportes ni componentes de matrícula, porque no forman parte de este proyecto.

## Paridad aplicada en esta unidad

La base del frontend toma el sistema de diseño, la configuración de build y el arranque de SADInformes. SADActividades conserva su propio nombre de proyecto Angular (`webui`), sus rutas de Actividades y sus credenciales públicas.

| Área | Decisión |
| --- | --- |
| Estilos | `src/variables.scss` contiene la paleta y `src/styles.scss` los tokens y las clases compartidas: `page-header`/`page-title`/`page-subtitle`, `form-section`/`section-title`, `form-floating`, `btn-create`/`btn-search`/`btn-clear`/`btn-back`, tabla (`app-table`, esqueletos, celdas destacadas) y `ng-select-container-custom`/`floating-label`/`ng-select-custom`. |
| Dependencias visuales | Bootstrap 5.3.8, bootstrap-icons 1.13.1, `@popperjs/core` 2.11.8, `sweetalert2`, tema por defecto de `@ng-select/ng-select` y `@angular/localize` se cargan desde `angular.json`. |
| Estilos en componentes | Los componentes nuevos usan `style: "scss"` por defecto (`schematics`), igual que la referencia. |
| Activos públicos | `public/` contiene solo `favicon.ico`; `index.html` declara el título `SADActividades`, el favicon y `lang="es"`. |
| Arranque | `src/app/app.config.ts` concentra `provideZonelessChangeDetection`, el cliente HTTP con `authInterceptor`, el inicializador de `AuthService` y el router. `src/main.ts` solo arranca la aplicación y muestra un mensaje en español si falla. |
| Pruebas | `src/test-setup.ts` se declara como `setupFiles` del builder de pruebas y provee un `localStorage` en memoria para el entorno de Node. |
| Proxy | `src/proxy.conf.json` envía `/api` a `https://localhost:7070` con `secure` y `changeOrigin` activos, el puerto del perfil de desarrollo del backend. |
| Scripts | `prestart` exporta el certificado de desarrollo y `start` levanta Angular por HTTPS en `localhost:4200`; `build` y `test` coinciden con la referencia. |

Selector eliminado a propósito: los botones de exportación (`btn-export-excel`, `btn-export-pdf`), los botones de disponibilidad, las pestañas compartidas y los popovers de observaciones/auditoría pertenecen a pantallas de reportes o de matrícula de SADInformes y no tienen consumidor en Actividades.

## Qué queda fuera (unidad del shell)

El armazón visual se implementa en su propia unidad y no en la paridad de base. Mientras no exista, la pantalla de Actividades se apoya en los tokens y las clases de `src/styles.scss` y en el `header`/`main` actuales.

| Pendiente | Unidad |
| --- | --- |
| `app.scss` con `layout-shell`/`layout-body`/`layout-content`, header, sidebar y `background-task-host` | Shell de aplicación |
| Componente compartido `app/shared/components/table.ts` y sus pruebas | Shell de aplicación |
| `theme-store` que alterna `data-theme` sobre los tokens ya definidos | Shell de aplicación |
| `WebUI.esproj` con `SpaProxy`, perfiles de lanzamiento y publicación integrada | Integración .NET del SPA |

## Cómo ejecutar el desarrollo con HTTPS

1. `pnpm install` en `src/Web/WebUI`.
2. `pnpm start` (ejecuta `prestart` y luego `start-dev.js`).
3. Abrir `https://localhost:4200/actividades`.

`prestart` exporta el certificado de desarrollo de .NET en `.certs/localhost.pem` y `.certs/localhost.key` con `dotnet dev-certs https --export-path`. Esa carpeta está ignorada por Git y el certificado nunca se versiona.

`start-dev.js` inicia `ng serve` con `--ssl`, ese certificado y ese par de claves, y define `NODE_EXTRA_CA_CERTS` para confiar en la misma autoridad local. Si el backend no está escuchando en `https://localhost:7070`, la aplicación carga igual y las llamadas a `/api` responden error del proxy.

## Verificación

```sh
cd src/Web/WebUI
pnpm install
pnpm test
pnpm build
```

Desde la raíz del repositorio, `node scripts/stage-spa.mjs && SMOKE_SPA=1 node --test tests/*.test.mjs` confirma que el SPA compilado se publica y responde con el título `SADActividades`. La integración de publicación con .NET pertenece a la unidad de integración del SPA.
