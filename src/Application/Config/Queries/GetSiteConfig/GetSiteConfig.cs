using Application.Common.Interfaces;
using Application.Common.Models;
using Application.Navigation;

namespace Application.Config.Queries.GetSiteConfig;

/// <summary>Consulta la configuración de navegación publicada para el sitio.</summary>
public sealed record GetSiteConfig : IRequest<ApiResponse<SiteConfigDTO>>;

/// <summary>Manejador que compone el DTO desde el menú leído de AppConfig.</summary>
public sealed class GetSiteConfigHandler(ISiteMenuProvider provider, IApiResponseService responses)
    : IRequestHandler<GetSiteConfig, ApiResponse<SiteConfigDTO>>
{
    /// <inheritdoc />
    public async Task<ApiResponse<SiteConfigDTO>> Handle(GetSiteConfig request, CancellationToken cancellationToken)
    {
        var menu = await provider.GetMenuAsync(cancellationToken);
        return responses.Success(new SiteConfigDTO
        {
            StudentsMenuUrl = RequiredUrl(menu, "studentsMenuUrl"),
            TeachersMenuUrl = RequiredUrl(menu, "teachersMenuUrl"),
            CoursesMenuUrl = RequiredUrl(menu, "coursesMenuUrl"),
            ExamsMenuUrl = RequiredUrl(menu, "examsMenuUrl"),
            ActivitiesMenuUrl = RequiredUrl(menu, "activitiesMenuUrl"),
            AssistantsMenuUrl = RequiredUrl(menu, "assistantsMenuUrl"),
            ProcessesMenuUrl = RequiredUrl(menu, "processesMenuUrl"),
            ReportsMenuUrl = RequiredUrl(menu, "reportsMenuUrl"),
            AdministrationMenuUrl = RequiredUrl(menu, "administrationMenuUrl"),
            StudentsMenuClientId = menu.GetValueOrDefault("studentsMenuClientId"),
            TeachersMenuClientId = menu.GetValueOrDefault("teachersMenuClientId"),
            CoursesMenuClientId = menu.GetValueOrDefault("coursesMenuClientId"),
            ExamsMenuClientId = menu.GetValueOrDefault("examsMenuClientId"),
            ActivitiesMenuClientId = menu.GetValueOrDefault("activitiesMenuClientId"),
            AssistantsMenuClientId = menu.GetValueOrDefault("assistantsMenuClientId"),
            ProcessesMenuClientId = menu.GetValueOrDefault("processesMenuClientId"),
            ReportsMenuClientId = menu.GetValueOrDefault("reportsMenuClientId"),
            AdministrationMenuClientId = menu.GetValueOrDefault("administrationMenuClientId"),
        });
    }

    /// <summary>
    /// Una URL ausente o vacía no se publica: la barra de navegación no debe ofrecer enlaces sin destino.
    /// El endpoint traduce este fallo en un 503 saneado.
    /// </summary>
    private static string RequiredUrl(IReadOnlyDictionary<string, string?> menu, string key) =>
        menu.TryGetValue(key, out var value) && !string.IsNullOrWhiteSpace(value)
            ? value
            : throw new InvalidOperationException($"La configuración de navegación '{key}' no está disponible.");
}
