# Equivalencias de permisos de Actividades

Este catálogo aplica el estándar `Permisos/Estandarizacion-Permisos.md`. Los identificadores legados se conservan únicamente como trazabilidad documental: **no se aceptan como claims alternativos ni como fallback de autorización**.

## Permisos

| Identificador legado exacto | Identificador estandarizado | Propósito y alcance | Fuente |
| --- | --- | --- | --- |
| `suspender actividades docentes` | `PERMISSION_ACTIVITY_EDIT_TEACHING_ACTIVITY_SUSPENSION_STATE` | Permite editar el estado de suspensión o reactivación de actividades docentes. | `SAD/Actividades/default.aspx.vb:52` |
| `modificar actividades docentes` | `PERMISSION_ACTIVITY_EDIT_TEACHING_ACTIVITY` | Permite editar actividades docentes existentes. | `SAD/Actividades/default.aspx.vb:53` |
| `eliminar actividades docentes` | `PERMISSION_ACTIVITY_DELETE_TEACHING_ACTIVITY` | Permite eliminar actividades docentes. | `SAD/Actividades/default.aspx.vb:54` |
| `suspender actividades no docentes` | `PERMISSION_ACTIVITY_EDIT_NON_TEACHING_ACTIVITY_SUSPENSION_STATE` | Permite editar el estado de suspensión o reactivación de actividades no docentes. | `SAD/Actividades/default.aspx.vb:55` |
| `modificar actividades no docentes` | `PERMISSION_ACTIVITY_EDIT_NON_TEACHING_ACTIVITY` | Permite editar actividades no docentes existentes. | `SAD/Actividades/default.aspx.vb:56` |
| `eliminar actividades no docentes` | `PERMISSION_ACTIVITY_DELETE_NON_TEACHING_ACTIVITY` | Permite eliminar actividades no docentes. | `SAD/Actividades/default.aspx.vb:57` |
| `Asignar Sala` | `PERMISSION_ACTIVITY_EDIT_ROOM_ASSIGNMENT` | Permite editar la asignación de salas del servicio general de actividades. | `SAD/Actividades/default.aspx.vb:60` |
| `Asignar Sala Postgrado` | `PERMISSION_ACTIVITY_EDIT_POSTGRADUATE_ROOM_ASSIGNMENT` | Permite editar la asignación de salas del servicio de postgrado. | `SAD/Actividades/default.aspx.vb:61` |
| `Asignar Sala Genesis` | `PERMISSION_ACTIVITY_EDIT_GENESIS_ROOM_ASSIGNMENT` | Permite editar la asignación de salas del servicio Genesis. | `SAD/Actividades/default.aspx.vb:62` |
| `Asignar Salas Espacios pregrado` | `PERMISSION_ACTIVITY_EDIT_UNDERGRADUATE_SPACE_ROOM_ASSIGNMENT` | Permite editar la asignación de salas del servicio de espacios de pregrado. | `SAD/Actividades/default.aspx.vb:63` |
| `agregar actividades docentes` | `PERMISSION_ACTIVITY_CREATE_TEACHING_ACTIVITY` | Permite crear actividades docentes. | `SAD/Actividades/default.aspx.vb:110` |
| `agregar actividades no docentes` | `PERMISSION_ACTIVITY_CREATE_NON_TEACHING_ACTIVITY` | Permite crear actividades no docentes. | `SAD/Actividades/default.aspx.vb:111` |

## Roles administrativos del módulo

| Rol | Descripción en español |
| --- | --- |
| `ROLE_ACTIVITY_ADMIN` | Otorga acceso completo a las funcionalidades del módulo Actividades, sin autorizar suplantación de usuarios. |
| `ROLE_ACTIVITY_SUPERADMIN` | Otorga acceso completo al módulo Actividades; la capacidad estándar de suplantación no se implementa en esta migración. |

Estos roles satisfacen las políticas del módulo ACTIVITY sin permisos individuales, pero no omiten validaciones de negocio. No se reconocen sufijos arbitrarios ni roles de otros módulos o clientes.

## Asignación

Este catálogo no crea ni asigna automáticamente roles o permisos en Keycloak. La provisión corresponde a la administración de identidad y debe utilizar exactamente los identificadores estandarizados.
