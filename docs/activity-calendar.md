# Calendario de Actividades (solo lectura)

Este documento describe la primera migración funcional de la pestaña Actividades: consulta del calendario diario heredado de `SAD/Actividades/default.aspx`. No incluye creación, edición, eliminación, suspensión, asignación de salas ni notificaciones.

## Alcance

- Consulta del calendario de un día con los mismos filtros del sistema legado.
- Detalle de una actividad por folio.
- Catálogos necesarios para los filtros: categoría, tipo, sector y ubicación.

La administración de aforos y los reportes Crystal permanecen **fuera de alcance** por decisión del usuario.

## Endpoints

Todos exigen identidad válida y los permisos `PERMISSION_ACTIVITY_ACCESS_MODULE` y `PERMISSION_ACTIVITY_VIEW_CALENDAR`. Los roles `ROLE_ACTIVITY_ADMIN` y `ROLE_ACTIVITY_SUPERADMIN` del cliente configurado conceden acceso completo al módulo.

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/api/activities?date=AAAA-MM-DD&category=-100\|0\|1&sector=…&location=…` | Actividades del día. |
| `GET` | `/api/activities/{id}` | Detalle de la actividad; `404` cuando el folio no existe. |
| `GET` | `/api/activities/catalogs?category=DOCENCIA\|OTRO\|TODAS&sector=…` | Tipos, sectores y ubicaciones disponibles. |

Respuestas:

- Entrada inválida: `400` con un mensaje en español y sin leer datos.
- Fallo de datos o configuración: `503` sanitizado, sin detalles SQL.
- Sin identidad: `401`. Sin permiso o cliente equivocado: `403`.

## Semántica de filtros

La consulta diaria conserva la invocación legada de `spRec_Actividades` (`SAD/Actividades/default.aspx.vb:172-182`):

| Parámetro | Valor |
| --- | --- |
| `@Fecha` | `yyyyMMdd` + `" 0:00"` |
| `@Periodo` | `DIA` |
| `@Estado` | `TODOS` |
| `@SoloDocentes` | `-100` todas, `1` docentes, `0` no docentes |
| `@SoloFEN` | `-100` |
| `@SoloPublicas` | `-100` |
| `@Ubicacion` | Ubicación seleccionada |
| `@Sector` | Sector seleccionado; el valor enviado es el nombre del sector, como en el calendario legado |

Consultar días pasados es válido: la restricción de fechas pasadas del sistema legado aplica a la creación de actividades, no a la consulta.

Los filtros conservan la representación legada: el sector viaja como **nombre** del sector (`DataValueField="NombreSector"` en `SAD/Actividades/default.aspx:154`) y la ubicación como código. Cambiar el sector recarga las ubicaciones disponibles para ese sector.

## Adaptadores de datos

- Los procedimientos se invocan mediante wrappers tipados sobre `ISadContextProcedures`; cada llamada usa parámetros, no SQL concatenado.
- El catálogo de sectores usa LINQ sobre `ISadContext` con la tabla `Sector` y solo registros activos.
- El tiempo máximo de comando es de 15 segundos.

## Configuración

La conexión de lectura se toma de `ConnectionStrings:Sad`. El valor real no se versiona: debe provenir de la configuración del entorno o del gestor de secretos del despliegue.

Sin una conexión utilizable la aplicación inicia igualmente, pero las consultas fallan cerradas con `503`.

## Permisos

Las equivalencias con el sistema legado están en `docs/permission-equivalences.md` y en el catálogo central `Permisos/Equivalencias-Permisos.md`.

- El acceso al módulo proviene de la viñeta legada `Viñeta Actividades`.
- `PERMISSION_ACTIVITY_VIEW_CALENDAR` es una definición nueva de la migración: el sistema legado no tenía un permiso separado de consulta. No se concede por tener `ACCESS` ni por permisos de creación, edición o salas.
- El catálogo no crea ni asigna roles o permisos en Keycloak.

## Verificación

```sh
dotnet test SADActividades.slnx
cd src/Web/WebUI && pnpm test && pnpm build
cd ../../..
dotnet build SADActividades.slnx
node scripts/stage-spa.mjs
SMOKE_SPA=1 node --test tests/*.test.mjs
dotnet publish src/Web/WebApi -c Release -o .artifacts/publish
SMOKE_PUBLISHED=1 SMOKE_SPA=1 node ./tests/smoke.test.mjs
```

Las pruebas automatizadas usan un adaptador simulado y un servidor de identidad local; **no** acreditan paridad contra la base SAD real. Esa comparación requiere una conexión autorizada y una muestra acordada, y permanece pendiente.

## Pendiente

- Contraste con datos reales de SAD en una muestra aprobada.
- Búsqueda en pantalla y ordenamiento por columna del calendario legado, aún no migrados.
- Creación, edición, recurrencia, suspensión, eliminación y asignación de salas.
- Auditoría e integraciones de correo y reservas.
