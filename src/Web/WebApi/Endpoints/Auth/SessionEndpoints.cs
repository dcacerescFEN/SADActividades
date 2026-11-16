using System.Security.Claims;

namespace WebApi.Endpoints.Auth;

public static class SessionEndpoints
{
    public static IEndpointRouteBuilder MapSessionEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/auth/me", (ClaimsPrincipal user) => Results.Ok(new
        {
            username = user.FindFirstValue("preferred_username") ?? string.Empty,
        })).RequireAuthorization();
        return app;
    }
}
