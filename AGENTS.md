# Convenciones de SADActividades

Estas reglas se aplican a todo este repositorio. Definen cómo organizar y verificar la migración de Actividades; no reemplazan las reglas de seguridad, permisos, alcance ni revisión del trabajo.

## Estado actual y alcance

- El repositorio contiene el scaffold, autenticación Keycloak y la base de autorización por acción.
- Las consultas, comandos, persistencia, formularios y tablas descritos más abajo son convenciones obligatorias para componentes futuros; no implican que esas funcionalidades ya existan.
- La administración de aforos y los reportes Crystal permanecen excluidos.
- No agregar secretos, credenciales, tokens persistentes ni aprovisionamiento automático de Keycloak.
- Los commits deben seguir Conventional Commits y redactarse en español.
- Todos los comentarios de código escritos en este repositorio (`//`, `/* */` y documentación XML como `summary` y `param`) deben estar en español. Los identificadores de código permanecen en inglés.

## Backend

### Capas

- Las dependencias apuntan hacia adentro: Domain <- Application <- Infrastructure; WebApi referencia Application e Infrastructure.
- Application contiene casos de uso y contratos, no implementaciones de base de datos.
- Infrastructure implementa persistencia e integraciones externas.
- WebApi compone servicios, autenticación, autorización y endpoints; no contiene reglas de negocio ni acceso directo a datos.

### Módulos y casos de uso futuros

Cada módulo de Actividades bajo `src/Application` expone cada operación mediante carpetas `Commands` y `Queries`:

```text
Activities/
  Commands/
    <Action><Name>/
      <Action><Name>.cs
      <Name>DTO.cs
      ...
  Queries/
    Get<Name>/
      Get<Name>.cs
      <Name>DTO.cs
      ...
```

- Los comandos comienzan con `Create`, `Update`, `Delete`, `Upload` o `Download`. Ejemplo futuro: `Commands/CreateActivity/CreateActivity.cs`.
- Las consultas comienzan con `Get`. Ejemplo futuro: `Queries/GetActivities/GetActivities.cs`.
- Mantener una solicitud y un handler por acción; no agrupar acciones en archivos compartidos `*Queries.cs` o `*Commands.cs`.
- Los endpoints despachan solicitudes mediante `IRequestDispatcher`; los handlers devuelven `ApiResponse<T>` mediante `IApiResponseService`.
- Las consultas compartidas permanecen en el módulo propietario. No invocar un handler desde otro handler.
- La validación realmente transversal y sin propietario pertenece a `Application/Common`.

### DTO

- Los DTO son tipos `public sealed record`.
- Cada DTO vive junto a la acción que lo utiliza, en su propio archivo `<Name>DTO.cs`.
- Solicitudes, respuestas, filtros y formas de filas también son DTO.
- No mover contratos específicos de Actividades a `Common`.

### Contexto, consultas y procedimientos

Estas reglas aplican cuando se implemente persistencia:

- `ISadContext` en Application expone tablas mapeadas como getters `DbSet<T>` de solo lectura y creación genérica de transacciones.
- `SadContext` en Infrastructure implementa el contrato, posee los mappings y abre transacciones sobre la misma conexión utilizada por los wrappers de procedimientos.
- Una transacción no confirmada debe revertirse al disponerla; no colocar consultas del módulo ni reglas de negocio en `SadContext`.
- Tomar nuevos mappings únicamente de los modelos canónicos en `MappingDB/Models`; agregar solo tablas y columnas utilizadas por la funcionalidad.
- Las consultas usan LINQ sobre `ISadContext`. Los handlers consumen `ISadContextProcedures` para procedimientos tipados.
- Application puede depender de EF Core, pero no de Infrastructure, contextos concretos, SqlClient ni SQL ad hoc.
- Los procedimientos permanecen en `SadContextProcedures` e implementan `ISadContextProcedures`.
- Seguir los wrappers canónicos: parámetros nullable tipados, tamaños, `DBNull`, `OutputParameter<int>` opcional y cancelación.
- Las lecturas usan `SqlQueryAsync<T>` y las operaciones sin filas usan `ExecuteSqlRawAsync`; nunca concatenar valores ni confundir filas afectadas con códigos de retorno.
- Los comandos definen límites de transacción, aislamiento y postcondiciones. La configuración común, incluido `XACT_ABORT ON`, pertenece a `SadContext.BeginTransactionAsync`.
- Conservar el aislamiento requerido y la participación en la misma conexión cuando una operación futura abarque varios pasos.
- La identidad de auditoría y la dirección del cliente provienen del contexto autenticado del servidor, nunca del JSON de la solicitud.

### Endpoints, permisos y errores

- Declarar autorización explícitamente y asignar el permiso específico de cada acción.
- Los permisos usan `PERMISSION_ACTIVITY_<ACCION_DESCRIPTIVA>`; solo `ROLE_ACTIVITY_ADMIN` y `ROLE_ACTIVITY_SUPERADMIN` conceden acceso completo al módulo.
- Los nombres legados existen solo en el catálogo de equivalencias y no se aceptan como claims alternativos.
- No inferir `ACCESS` como equivalente a `VIEW`, creación, edición, eliminación o asignación de salas.
- Las reglas de roles no eliminan validaciones de negocio y no implementan suplantación.
- Mantener las equivalencias centrales en `Permisos/Equivalencias-Permisos.md` mediante el flujo controlado del workspace; el repositorio conserva su catálogo en `docs/permission-equivalences.md`.
- Rechazar entrada inválida antes de leer datos y devolver el envelope compartido cuando existan casos de uso.
- Los fallos de almacenamiento devuelven un `503` sanitizado sin SQL, secretos ni detalles internos.
- La configuración pública de Keycloak contiene solo URL HTTPS validada, realm y client ID; no publicar credenciales.

## Frontend

### Base Angular

- Usar Angular 22, componentes standalone, rutas lazy, `ChangeDetectionStrategy.OnPush` y signals para estado.
- Mantener tokens solo en memoria; nunca usar `localStorage` ni otro almacenamiento persistente para tokens.
- Enviar bearer tokens únicamente a rutas relativas del mismo origen bajo `/api/`.
- Consumir `{ success, message, data }`, mostrar errores sanitizados y nunca imprimir detalles SQL.

### Componentes futuros

Cuando se implementen tablas, filtros y formularios de Actividades:

- Reutilizar `app-table`, el layout `page-header`/`page-title`/`page-subtitle` y el `NotificationService` estilo SADAlumnos.
- Los inputs nativos de texto, número, fecha, hora y textarea usan `form-floating`: control con `form-control`, placeholder y `<label for="...">`.
- Todos los selectores usan `ng-select` con búsqueda habilitada; no usar `<select>` nativo.
- Los filtros conservan `ng-select-container-custom`, `floating-label` y `ng-select-custom`.
- Los selectores dentro de tablas usan `ng-select-custom ng-select-custom-plain` y `[searchable]="true"`.
- Dentro de una sección o tabla con scroll, usar `appendTo="body"` para evitar scrollbars internos.
- No agregar dependencias solo para anticipar estas reglas; incorporarlas cuando el componente autorizado realmente las necesite.

### Acciones, notificaciones y estado

- Alinear acciones de formulario a la derecha con `justify-content-end`, en orden **Cancelar** y luego **Guardar**.
- **Cancelar** usa `btn btn-clear` con `bi-x-circle`; **Guardar** usa `btn-create` o `btn-save` con `bi-save`.
- Una pantalla con origen anterior muestra **Volver a {pantalla anterior}**, alineado a la derecha, con `btn btn-clear` y `bi-arrow-left`.
- Las acciones de fila son solo iconos con tooltip; usar `TableAction.iconOnly` y describirlas mediante `label`/`ariaLabel`.
- Los guardados exitosos usan `NotificationService.showSuccess` como toast superior de tres segundos; los errores usan `showError`.
- Toda escritura destructiva o académica requiere confirmación explícita y no debe reenviar una selección obsoleta después del diálogo.
- Deshabilitar acciones mediante flags autoritativos del servidor, no por inferencias exclusivas del cliente.
- Los cambios de filtros descartan candidatos y selecciones obsoletos; una respuesta HTTP antigua no puede sobrescribir estado más reciente.

### Exportaciones futuras

- Los CSV usan BOM UTF-8, separador punto y coma y escaping seguro.
- Neutralizar valores que puedan activar fórmulas de hoja de cálculo.

## Verificación

Desde la raíz de `SADActividades`:

```sh
dotnet test SADActividades.slnx
node --test tests/*.test.mjs
cd src/Web/WebUI && pnpm test && pnpm build
cd ../../..
dotnet build SADActividades.slnx
node scripts/stage-spa.mjs
SMOKE_SPA=1 node --test tests/*.test.mjs
dotnet publish src/Web/WebApi -c Release -o .artifacts/publish
SMOKE_PUBLISHED=1 SMOKE_SPA=1 node --test tests/smoke.test.mjs
```

Si un proceso en ejecución bloquea los DLL predeterminados, usar `--artifacts-path .artifacts/<nombre>` en lugar de detener el proceso del usuario.
