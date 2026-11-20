using Application.Common.Interfaces;
using Application.Config.Queries.GetSiteConfig;
using Domain.Constants;
using WebApi.Extension;

namespace WebApi.Endpoints.Config;

/// <summary>Configuración de navegación que consume la barra del sitio.</summary>
public sealed class ConfigEndpoints : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/config").RequireAuthorization().WithTags("Config");
        group.MapGet("/site", GetSiteConfig)
            .RequireAuthorization(Permission.ACTIVITY_ACCESS)
            .WithSummary("Obtiene la configuración de navegación del sitio");
    }

    private static async Task<IResult> GetSiteConfig(IRequestDispatcher dispatcher,
        CancellationToken cancellationToken)
    {
        try
        {
            return Results.Ok(await dispatcher.Send(new GetSiteConfig(), cancellationToken));
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested) { throw; }
        catch (InvalidOperationException)
        {
            // Sin detalles internos: la barra de navegación simplemente no está disponible.
            return Results.Problem(statusCode: StatusCodes.Status503ServiceUnavailable,
                title: "La navegación no está disponible.");
        }
    }
}
