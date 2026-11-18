namespace Domain.Constants;

/// <summary>Roles administrativos reconocidos para el módulo de Actividades.</summary>
public static class Roles
{
    public const string Administrator = "ROLE_ACTIVITY_ADMIN";
    public const string SuperAdmin = "ROLE_ACTIVITY_SUPERADMIN";

    public static IReadOnlyList<RoleDefinition> Definitions { get; } =
    [
        new(Administrator, "Otorga acceso completo a las funcionalidades del módulo Actividades, sin autorizar suplantación de usuarios."),
        new(SuperAdmin, "Otorga acceso completo al módulo Actividades; la capacidad estándar de suplantación no se implementa en esta migración."),
    ];
}

/// <summary>Identificador del rol y su descripción obligatoria en español.</summary>
/// <param name="Identifier">Identificador estandarizado del rol.</param>
/// <param name="Description">Propósito y alcance redactados en español.</param>
public sealed record RoleDefinition(string Identifier, string Description);
