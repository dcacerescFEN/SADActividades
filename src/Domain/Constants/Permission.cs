namespace Domain.Constants;

/// <summary>Permisos estandarizados del módulo de Actividades.</summary>
public static class Permission
{
    public const string AccessModule = "PERMISSION_ACTIVITY_ACCESS_MODULE";
    public const string ViewCalendar = "PERMISSION_ACTIVITY_VIEW_CALENDAR";
    public const string CreateTeachingActivity = "PERMISSION_ACTIVITY_CREATE_TEACHING_ACTIVITY";
    public const string CreateNonTeachingActivity = "PERMISSION_ACTIVITY_CREATE_NON_TEACHING_ACTIVITY";
    public const string EditTeachingActivitySuspensionState = "PERMISSION_ACTIVITY_EDIT_TEACHING_ACTIVITY_SUSPENSION_STATE";
    public const string EditTeachingActivity = "PERMISSION_ACTIVITY_EDIT_TEACHING_ACTIVITY";
    public const string DeleteTeachingActivity = "PERMISSION_ACTIVITY_DELETE_TEACHING_ACTIVITY";
    public const string EditNonTeachingActivitySuspensionState = "PERMISSION_ACTIVITY_EDIT_NON_TEACHING_ACTIVITY_SUSPENSION_STATE";
    public const string EditNonTeachingActivity = "PERMISSION_ACTIVITY_EDIT_NON_TEACHING_ACTIVITY";
    public const string DeleteNonTeachingActivity = "PERMISSION_ACTIVITY_DELETE_NON_TEACHING_ACTIVITY";
    public const string EditRoomAssignment = "PERMISSION_ACTIVITY_EDIT_ROOM_ASSIGNMENT";
    public const string EditPostgraduateRoomAssignment = "PERMISSION_ACTIVITY_EDIT_POSTGRADUATE_ROOM_ASSIGNMENT";
    public const string EditGenesisRoomAssignment = "PERMISSION_ACTIVITY_EDIT_GENESIS_ROOM_ASSIGNMENT";
    public const string EditUndergraduateSpaceRoomAssignment = "PERMISSION_ACTIVITY_EDIT_UNDERGRADUATE_SPACE_ROOM_ASSIGNMENT";

    public static IReadOnlyList<PermissionDefinition> Definitions { get; } =
    [
        new(AccessModule, "Permite acceder al módulo de Actividades."),
        new(ViewCalendar, "Permite consultar el calendario, detalle y catálogos de Actividades."),
        new(CreateTeachingActivity, "Permite crear actividades docentes."),
        new(CreateNonTeachingActivity, "Permite crear actividades no docentes."),
        new(EditTeachingActivitySuspensionState, "Permite editar el estado de suspensión o reactivación de actividades docentes."),
        new(EditTeachingActivity, "Permite editar actividades docentes existentes."),
        new(DeleteTeachingActivity, "Permite eliminar actividades docentes."),
        new(EditNonTeachingActivitySuspensionState, "Permite editar el estado de suspensión o reactivación de actividades no docentes."),
        new(EditNonTeachingActivity, "Permite editar actividades no docentes existentes."),
        new(DeleteNonTeachingActivity, "Permite eliminar actividades no docentes."),
        new(EditRoomAssignment, "Permite editar la asignación de salas del servicio general de actividades."),
        new(EditPostgraduateRoomAssignment, "Permite editar la asignación de salas del servicio de postgrado."),
        new(EditGenesisRoomAssignment, "Permite editar la asignación de salas del servicio Genesis."),
        new(EditUndergraduateSpaceRoomAssignment, "Permite editar la asignación de salas del servicio de espacios de pregrado."),
    ];

    public static IReadOnlySet<string> All { get; } = Definitions
        .Select(definition => definition.Identifier)
        .ToHashSet(StringComparer.Ordinal);
}

/// <summary>Identificador del permiso y su descripción obligatoria en español.</summary>
/// <param name="Identifier">Identificador estandarizado del permiso.</param>
/// <param name="Description">Propósito y alcance redactados en español.</param>
public sealed record PermissionDefinition(string Identifier, string Description);
