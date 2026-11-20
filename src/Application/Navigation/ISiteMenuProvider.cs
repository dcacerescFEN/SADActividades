namespace Application.Navigation;

/// <summary>Proveedor del menú de navegación del sitio publicado por AppConfig.</summary>
public interface ISiteMenuProvider
{
    /// <summary>Obtiene los pares de configuración del menú ya normalizados a camelCase.</summary>
    /// <param name="cancellationToken">Token de cancelación de la solicitud.</param>
    /// <returns>Diccionario de nombre de campo a valor configurado.</returns>
    Task<IReadOnlyDictionary<string, string?>> GetMenuAsync(CancellationToken cancellationToken);
}

/// <summary>
/// Campos del menú compartidos por la barra de navegación. Cada sitio declara su URL y el client ID
/// de Keycloak con el que debe autenticarse.
/// </summary>
public static class SiteMenuFields
{
    /// <summary>Nombres canónicos de los nueve pares de URL y client ID.</summary>
    public static IReadOnlyList<string> Names { get; } = Array.AsReadOnly(
    [
        "StudentsMenuUrl", "TeachersMenuUrl", "CoursesMenuUrl", "ExamsMenuUrl",
        "ActivitiesMenuUrl", "AssistantsMenuUrl", "ProcessesMenuUrl", "ReportsMenuUrl", "AdministrationMenuUrl",
        "StudentsMenuClientId", "TeachersMenuClientId", "CoursesMenuClientId", "ExamsMenuClientId",
        "ActivitiesMenuClientId", "AssistantsMenuClientId", "ProcessesMenuClientId", "ReportsMenuClientId",
        "AdministrationMenuClientId",
    ]);

    /// <summary>
    /// Nombres legados que AppConfig todavía conserva para Alumnos y Profesores; se aceptan solo
    /// cuando el nombre canónico no está configurado.
    /// </summary>
    public static IReadOnlyDictionary<string, string> LegacyAliases { get; } =
        new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["StudentsMenuUrl"] = "StudentUrl",
            ["TeachersMenuUrl"] = "TeacherUrl",
            ["StudentsMenuClientId"] = "StudentClientId",
            ["TeachersMenuClientId"] = "TeacherClientId",
        };
}
