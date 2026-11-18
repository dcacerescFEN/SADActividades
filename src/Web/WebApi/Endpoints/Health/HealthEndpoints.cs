using Microsoft.AspNetCore.Authorization;
using WebApi.Extension;

namespace WebApi.Endpoints.Health;

/// <summary>Estado público del servicio, sin datos internos.</summary>
public sealed class HealthEndpoints : IEndpoint
{
    public void MapEndpoint(IEndpointRouteBuilder app)
    {
        app.MapGet("/api/health", () => Results.Ok(new { application = "SADActividades", status = "ok" }))
            .AllowAnonymous()
            .WithTags("Salud");
    }
}
