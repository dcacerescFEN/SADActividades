# Aprovisionamiento de Keycloak para SADActividades

Este documento describe los objetos que deben existir en Keycloak para que el sitio funcione. La configuración incluida en `appsettings.json` y `appsettings.Development.json` contiene **solo identificadores públicos**: URL, realm y client ID. No incluye secretos, porque el frontend es un cliente público con PKCE.

## Valores configurados

| Entorno | URL | Realm | Client ID |
| --- | --- | --- | --- |
| Desarrollo | `https://sso-dev.fen.uchile.cl` | `FenUChile` | `SADActividades` |
| Publicado | `https://sso-dev.fen.uchile.cl` | `FenUChile` | `SADActividades-iis` |

El sitio no reutiliza el cliente de otra aplicación: los permisos y roles se validan únicamente contra el cliente configurado.

## Objetos que debe crear la administración de Keycloak

Estos pasos requieren acceso administrativo al realm. **No los ejecuta la aplicación** y no están automatizados.

1. Crear el cliente `SADActividades` (desarrollo) y `SADActividades-iis` (publicado) como cliente **público** con flujo *Standard flow* habilitado, PKCE `S256`, y las URL de origen/redirección del sitio.
2. Crear los roles de cliente:

| Rol | Descripción |
| --- | --- |
| `ROLE_ACTIVITY_ADMIN` | Otorga acceso completo a las funcionalidades del módulo Actividades, sin autorizar suplantación de usuarios. |
| `ROLE_ACTIVITY_SUPERADMIN` | Otorga acceso completo al módulo Actividades; la capacidad estándar de suplantación no se implementa en esta migración. |

3. Crear los permisos como **roles de cliente** con los identificadores estandarizados del catálogo `docs/permission-equivalences.md`. Los mínimos para la consulta actual son:

- `PERMISSION_ACTIVITY_ACCESS_MODULE` — permite acceder al módulo de Actividades.
- `PERMISSION_ACTIVITY_VIEW_CALENDAR` — permite consultar el calendario, el detalle y los catálogos.

Los demás permisos del catálogo se asignan cuando se habiliten las operaciones de escritura.

4. Asignar los roles a los usuarios o grupos que correspondan.

Los nombres heredados de SAD (`Viñeta Actividades`, `agregar actividades docentes`, etc.) **no se aceptan** como claims: existen solo como trazabilidad documental.

## Comportamiento sin configuración válida

- La aplicación inicia y expone `/api/health`.
- El endpoint público de configuración responde `503` sanitizado en lugar de publicar valores parciales.
- Los endpoints protegidos fallan cerrados con `401` y el frontend muestra el aviso de autenticación no disponible dentro del shell.

## Verificación manual

```sh
dotnet run --project src/Web/WebApi
```

1. Abrir `https://localhost:4200`; debe redirigir a Keycloak.
2. Autenticarse con un usuario que tenga `PERMISSION_ACTIVITY_ACCESS_MODULE` y `PERMISSION_ACTIVITY_VIEW_CALENDAR`.
3. En `/api/auth/me` deben aparecer los permisos efectivos del cliente configurado.
4. Un usuario sin `PERMISSION_ACTIVITY_VIEW_CALENDAR` debe recibir `403` al consultar `/api/activities`.

## Pendiente

- Crear los clientes y roles en el realm; requiere administración de Keycloak.
- Cargar la cadena de conexión `ConnectionStrings:Sad` mediante configuración externa o gestor de secretos. No se versiona.
