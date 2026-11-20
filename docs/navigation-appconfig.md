# Navegación desde AppConfig

La barra de navegación no tiene las URL en el código del SPA: las lee de la base `AppConfig`, igual que SADInformes.

## Cómo funciona

1. Al arrancar, la API consulta `Configurations` uniendo `Applications` y `Environments`, exigiendo que las tres filas estén activas y que coincidan con `ConfigureSite:ApplicationName` y `ConfigureSite:EnvironmentName`.
2. El resultado se guarda una sola vez en un snapshot en memoria (`SiteSettings`). Cambiar valores en `AppConfig` requiere reiniciar la API.
3. `GET /api/config/site` (protegido por `PERMISSION_ACTIVITY_ACCESS_MODULE`) devuelve el sobre habitual con nueve URL y nueve client ID.
4. El SPA arma los nueve destinos, descarta los que no tengan URL válida y solo muestra cada enlace si el token trae roles de ese cliente.

Si la base no responde o no hay configuración, el menú queda no disponible y el endpoint responde `503` sanitizado mientras el resto de la API sigue operativa.

## Claves esperadas

| URL | Client ID |
| --- | --- |
| `studentsMenuUrl` | `studentsMenuClientId` |
| `teachersMenuUrl` | `teachersMenuClientId` |
| `coursesMenuUrl` | `coursesMenuClientId` |
| `examsMenuUrl` | `examsMenuClientId` |
| `activitiesMenuUrl` | `activitiesMenuClientId` |
| `assistantsMenuUrl` | `assistantsMenuClientId` |
| `processesMenuUrl` | `processesMenuClientId` |
| `reportsMenuUrl` | `reportsMenuClientId` |
| `administrationMenuUrl` | `administrationMenuClientId` |

Alias heredados aceptados para Alumnos y Profesores: `StudentUrl`, `StudentClientId`, `TeacherUrl`, `TeacherClientId`.

## Estado actual de la base

La aplicación `SADActividades` **no tiene filas configuradas** en `AppConfig`. Por eso se aplican los valores por defecto de desarrollo que ya trae el código, tal como ocurre hoy con `SADInformes`.

Para publicar valores propios, administración debe insertar las filas activas con `ApplicationName = 'SADActividades'` y `EnvironmentName` correspondiente, y luego reiniciar la API.

## Acceso por cliente

Cada enlace se muestra solo si el token incluye `resource_access` para el client ID configurado, con el rol `PERMISSION_<permiso corto>` o `ROLE_<MÓDULO>_ADMIN` / `ROLE_<MÓDULO>_SUPERADMIN`. El sufijo `-iis` se recorta únicamente para buscar la política, nunca para leer roles.

El propio módulo usa `PERMISSION_ACTIVITY_ACCESS_MODULE`; los demás clientes conservan sus permisos de acceso.

## Configuración

- `ConnectionStrings:AppConfig` se entrega por secretos de usuario o configuración del entorno. No se versiona.
- `ConfigureSite:ApplicationName` = `SADActividades`.
- `ConfigureSite:EnvironmentName` = `DEV` en desarrollo.

## Verificación

```sh
cd src/Web/WebApi
dotnet user-secrets set "ConnectionStrings:AppConfig" "<cadena>"
```

Con sesión iniciada, `GET /api/config/site` debe devolver las nueve parejas. Sin sesión responde `401`; sin configuración disponible, `503`.
