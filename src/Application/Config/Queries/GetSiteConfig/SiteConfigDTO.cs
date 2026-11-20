namespace Application.Config.Queries.GetSiteConfig;

/// <summary>URLs y client IDs de Keycloak que alimentan la barra de navegación del sitio.</summary>
public sealed record SiteConfigDTO
{
    /// <summary>URL del sitio de Alumnos.</summary>
    public string StudentsMenuUrl { get; init; } = string.Empty;

    /// <summary>URL del sitio de Profesores.</summary>
    public string TeachersMenuUrl { get; init; } = string.Empty;

    /// <summary>URL del sitio de Cursos.</summary>
    public string CoursesMenuUrl { get; init; } = string.Empty;

    /// <summary>URL del sitio de Exámenes.</summary>
    public string ExamsMenuUrl { get; init; } = string.Empty;

    /// <summary>URL del sitio de Actividades.</summary>
    public string ActivitiesMenuUrl { get; init; } = string.Empty;

    /// <summary>URL del sitio de Ayudantes.</summary>
    public string AssistantsMenuUrl { get; init; } = string.Empty;

    /// <summary>URL del sitio de Procesos.</summary>
    public string ProcessesMenuUrl { get; init; } = string.Empty;

    /// <summary>URL del sitio de Informes.</summary>
    public string ReportsMenuUrl { get; init; } = string.Empty;

    /// <summary>URL del sitio de Administración.</summary>
    public string AdministrationMenuUrl { get; init; } = string.Empty;

    /// <summary>Client ID de Keycloak usado por el sitio de Alumnos.</summary>
    public string? StudentsMenuClientId { get; init; }

    /// <summary>Client ID de Keycloak usado por el sitio de Profesores.</summary>
    public string? TeachersMenuClientId { get; init; }

    /// <summary>Client ID de Keycloak usado por el sitio de Cursos.</summary>
    public string? CoursesMenuClientId { get; init; }

    /// <summary>Client ID de Keycloak usado por el sitio de Exámenes.</summary>
    public string? ExamsMenuClientId { get; init; }

    /// <summary>Client ID de Keycloak usado por el sitio de Actividades.</summary>
    public string? ActivitiesMenuClientId { get; init; }

    /// <summary>Client ID de Keycloak usado por el sitio de Ayudantes.</summary>
    public string? AssistantsMenuClientId { get; init; }

    /// <summary>Client ID de Keycloak usado por el sitio de Procesos.</summary>
    public string? ProcessesMenuClientId { get; init; }

    /// <summary>Client ID de Keycloak usado por el sitio de Informes.</summary>
    public string? ReportsMenuClientId { get; init; }

    /// <summary>Client ID de Keycloak usado por el sitio de Administración.</summary>
    public string? AdministrationMenuClientId { get; init; }
}
