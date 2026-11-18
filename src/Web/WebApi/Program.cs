using Application;
using Infrastructure;
using Microsoft.AspNetCore.Authorization;
using WebApi.Authentication;
using WebApi.Authorization;
using WebApi.Endpoints.Auth;
using WebApi.Endpoints.Config;
using WebApi.Endpoints.Activities;
using WebApi.OpenApi;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddKeycloakAuthentication(builder.Configuration);
builder.Services.AddSingleton<IAuthorizationPolicyProvider, PermissionPolicyProvider>();
builder.Services.AddApplicationServices();
builder.Services.AddInfrastructureServices(builder.Configuration);
builder.Services.AddApiDocumentation();

var app = builder.Build();

app.Use(async (context, next) =>
{
    var decodedPath = Uri.UnescapeDataString(context.Request.Path.Value ?? string.Empty);
    var isEncodedApiPath = !context.Request.Path.StartsWithSegments("/api")
        && (decodedPath.Equals("/api", StringComparison.OrdinalIgnoreCase)
            || decodedPath.StartsWith("/api/", StringComparison.OrdinalIgnoreCase));

    if (isEncodedApiPath)
    {
        context.Response.StatusCode = StatusCodes.Status404NotFound;
        return;
    }

    await next();
});
app.UseDefaultFiles();
app.UseStaticFiles();
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/api/health", () => Results.Ok(new { application = "SADActividades", status = "ok" }));
app.MapPublicKeycloakConfiguration();
app.MapSessionEndpoints();
app.MapActivityEndpoints();
// Documentación interactiva (solo desarrollo) antes del fallback de la SPA.
app.MapDevelopmentDocumentation();
// Las rutas de API no implementadas no deben llegar a la SPA ni exponer datos legados.
app.Map("/api/{**path}", () => Results.NotFound());
app.MapFallbackToFile("index.html");
app.Run();

public partial class Program;
