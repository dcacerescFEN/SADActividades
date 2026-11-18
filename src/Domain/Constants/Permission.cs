namespace Domain.Constants;

/// <summary>
/// Permisos estandarizados del módulo de Actividades. Cada constante es el nombre corto del
/// permiso; Keycloak lo publica como rol anteponiendo el prefijo PERMISSION_
/// </summary>
public static class Permission
{

    public const string ACTIVITY_ACCESS = "ACTIVITY_ACCESS_MODULE";
    public const string VIEW_CALENDAR = "ACTIVITY_VIEW_CALENDAR";
    public const string CREATE_TEACHING_ACTIVITY = "ACTIVITY_CREATE_TEACHING_ACTIVITY";
    public const string CREATE_NON_TEACHING_ACTIVITY = "ACTIVITY_CREATE_NON_TEACHING_ACTIVITY";
    public const string EDIT_TEACHING_ACTIVITY_SUSPENSION_STATE = "ACTIVITY_EDIT_TEACHING_ACTIVITY_SUSPENSION_STATE";
    public const string EDIT_TEACHING_ACTIVITY = "ACTIVITY_EDIT_TEACHING_ACTIVITY";
    public const string DELETE_TEACHING_ACTIVITY = "ACTIVITY_DELETE_TEACHING_ACTIVITY";
    public const string EDIT_NON_TEACHING_ACTIVITY_SUSPENSION_STATE = "ACTIVITY_EDIT_NON_TEACHING_ACTIVITY_SUSPENSION_STATE";
    public const string EDIT_NON_TEACHING_ACTIVITY = "ACTIVITY_EDIT_NON_TEACHING_ACTIVITY";
    public const string DELETE_NON_TEACHING_ACTIVITY = "ACTIVITY_DELETE_NON_TEACHING_ACTIVITY";
    public const string EDIT_ROOM_ASSIGNMENT = "ACTIVITY_EDIT_ROOM_ASSIGNMENT";
    public const string EDIT_POSTGRADUATE_ROOM_ASSIGNMENT = "ACTIVITY_EDIT_POSTGRADUATE_ROOM_ASSIGNMENT";
    public const string EDIT_GENESIS_ROOM_ASSIGNMENT = "ACTIVITY_EDIT_GENESIS_ROOM_ASSIGNMENT";
    public const string EDIT_UNDERGRADUATE_SPACE_ROOM_ASSIGNMENT = "ACTIVITY_EDIT_UNDERGRADUATE_SPACE_ROOM_ASSIGNMENT";

    public static IReadOnlyList<PermissionDefinition> Definitions { get; } =
    [
        new(ACTIVITY_ACCESS, "Permite acceder al módulo de Actividades."),
        new(VIEW_CALENDAR, "Permite consultar el calendario, detalle y catálogos de Actividades."),
        new(CREATE_TEACHING_ACTIVITY, "Permite crear actividades docentes."),
        new(CREATE_NON_TEACHING_ACTIVITY, "Permite crear actividades no docentes."),
        new(EDIT_TEACHING_ACTIVITY_SUSPENSION_STATE, "Permite editar el estado de suspensión o reactivación de actividades docentes."),
        new(EDIT_TEACHING_ACTIVITY, "Permite editar actividades docentes existentes."),
        new(DELETE_TEACHING_ACTIVITY, "Permite eliminar actividades docentes."),
        new(EDIT_NON_TEACHING_ACTIVITY_SUSPENSION_STATE, "Permite editar el estado de suspensión o reactivación de actividades no docentes."),
        new(EDIT_NON_TEACHING_ACTIVITY, "Permite editar actividades no docentes existentes."),
        new(DELETE_NON_TEACHING_ACTIVITY, "Permite eliminar actividades no docentes."),
        new(EDIT_ROOM_ASSIGNMENT, "Permite editar la asignación de salas del servicio general de actividades."),
        new(EDIT_POSTGRADUATE_ROOM_ASSIGNMENT, "Permite editar la asignación de salas del servicio de postgrado."),
        new(EDIT_GENESIS_ROOM_ASSIGNMENT, "Permite editar la asignación de salas del servicio Genesis."),
        new(EDIT_UNDERGRADUATE_SPACE_ROOM_ASSIGNMENT, "Permite editar la asignación de salas del servicio de espacios de pregrado."),
    ];
}

/// <summary>Nombre corto del permiso y su descripción obligatoria en español.</summary>
/// <param name="Identifier">Nombre corto del permiso; el rol de Keycloak se compone con <see cref="Permission.ToRoleIdentifier"/>.</param>
/// <param name="Description">Propósito y alcance redactados en español.</param>
public sealed record PermissionDefinition(string Identifier, string Description);
