# Propuesta de presentación de Actividades

## Contexto

El calendario diario de SAD es una grilla de un día con filtros de categoría, sector y ubicación. La consulta ya funciona en la API; lo que resta es decidir **cómo se muestran** los datos en pantalla.

Mi recomendación es una vista de **agenda del día** como pantalla principal, con la tabla como vista alterna, porque la operación real es "qué pasa hoy en qué sala" y no "listar registros".

## Estructura propuesta

```
┌──────────────────────────────────────────────────────────────┐
│ Encabezado: SADActividades · tema · usuario                  │
├───────────────┬──────────────────────────────────────────────┤
│ Sidebar       │ Calendario de Actividades                    │
│ · Calendario  │ Consulta diaria de actividades docentes y    │
│               │ no docentes                                  │
│               │                                              │
│               │ ┌─ Filtros ────────────────────────────────┐ │
│               │ │ [Fecha] [Categoría] [Sector] [Ubicación] │ │
│               │ │                          [Limpiar][Consultar] │
│               │ └──────────────────────────────────────────┘ │
│               │                                              │
│               │ 12 actividades · 8 publicadas · 1 suspendida │
│               │                                              │
│               │ ┌─ Agenda ─────────────────────────────────┐ │
│               │ │ 08:30  Cátedra · Cálculo I               │ │
│               │ │        ICI-101 · Prof. Rojas · Sala A1   │ │
│               │ │        ── publicada ──                   │ │
│               │ │ 10:00  No docente · Charla bienestar     │ │
│               │ │        Auditorio · Sin publicar          │ │
│               │ └──────────────────────────────────────────┘ │
│               │                                              │
└───────────────┴──────────────────────────────────────────────┘
                                             [Detalle lateral] ➤
```

## Pantalla principal: agenda del día

Misma información que la grilla legada, ordenada por hora de inicio y agrupada por bloque:

1. **Cabecera de la página**: título, subtítulo y fecha activa con navegación `‹ hoy ›` para moverse entre días sin volver a los filtros.
2. **Barra de filtros**: fecha (`form-floating`), categoría, sector y ubicación con `ng-select` buscable, y acciones **Limpiar** / **Consultar** alineadas a la derecha.
3. **Resumen**: tres contadores — total, publicadas y suspendidas — que responden de un vistazo la pregunta operativa.
4. **Cuerpo**: agenda en tarjetas agrupadas por hora de inicio. Cada tarjeta muestra título de la actividad, tipo, curso y sección, profesor, salas, y dos indicadores discretos: publicada y suspendida.
5. **Detalle**: panel lateral con descripción completa, período, módulo, escuela, usuario de préstamo y salas delimitadas.

Estados obligatorios: esqueleto de carga, "No hay actividades para este día.", error sanitizado, y aviso específico cuando falta el permiso de consulta.

## Vista alterna: tabla

Se mantiene la tabla para quien necesita comparar filas o exportar. Columnas, en este orden:

| Columna | Origen |
| --- | --- |
| Hora | `Inicio`–`Termino` |
| Tipo | `Tipo` |
| Actividad | `Titulo` |
| Curso / sección | `Curso`, `Cod_Seccion` |
| Profesor | `Profesor` |
| Categoría | `Categoria` |
| Ubicación | `Salas` |
| Publicada | `Publicar` |
| Suspendida | `Suspendida` |
| Acciones | detalle (icono con tooltip) |

El selector agenda/tabla se recuerda en `localStorage`, igual que los favoritos de la sidebar.

## Vista semanal (opcional, fase posterior)

Rejilla de siete columnas con las actividades de cada día, útil para detectar choques de salas. Requiere resolver el volumen por día y no bloquea la entrega actual.

## Decisiones que necesito de vos

1. **¿Agenda del día como pantalla principal o tabla?** Yo recomiendo agenda; la tabla queda a un clic.
2. **¿Mostrar actividades suspendidas por defecto?** En la grilla legada aparecen con su marca. Recomiendo mostrarlas atenuadas y permitir ocultarlas con un filtro.
3. **¿Los contadores y la navegación de días entran ahora** o preferís primero paridad estricta con la grilla legada?

## Lo que falta del legado

Estas funciones existen en SAD y no están migradas: búsqueda en pantalla, ordenamiento por columna y, cuando lleguen las escrituras, creación, edición, suspensión, eliminación y reasignación de salas.

## Siguiente paso

Con tus respuestas ajusto la propuesta y la implemento sobre la base actual, reutilizando `app-table`, el tema claro/oscuro y el layout de la sidebar.

## Nota de implementación

La API ya devuelve lo necesario para las tres variantes (`/api/activities` y `/api/activities/{id}`), así que la elección no exige cambios de backend.
