using Application;
using Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Scalar.AspNetCore;
using WebApi;
using WebApi.Authentication;
using WebApi.Endpoints.Activities;
using WebApi.Endpoints.Config;
using WebApi.Extension;
using WebApi.OpenApi;
using WebApi.Services;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddApplicationServices();
builder.Services.AddInfrastructureServices(builder.Configuration);
builder.Services.AddWebApiServices(builder.Configuration);
builder.Services.AddEndpoints(typeof(Program).Assembly);

var app = builder.Build();

app.UseDefaultFiles();
app.UseStaticFiles();


app.UseHttpsRedirection();

// Las rutas de API con separadores codificados no deben llegar a la SPA.
app.Use(async (context, next) =>
{
    var decodedPath = Uri.UnescapeDataString(context.Request.Path.Value ?? string.Empty);
    if (!context.Request.Path.StartsWithSegments("/api")
        && (decodedPath.Equals("/api", StringComparison.OrdinalIgnoreCase)
            || decodedPath.StartsWith("/api/", StringComparison.OrdinalIgnoreCase)))
    {
        context.Response.StatusCode = StatusCodes.Status404NotFound;
        return;
    }

    await next();
});

app.UseAuthentication();
app.UseAuthorization();

// APIs mínimas asignadas automáticamente
app.MapEndpoints();

// Una ruta de API desconocida responde 404 y nunca recibe la SPA.
app.Map("/api/{**path}", () => Results.NotFound());

app.MapDevelopmentDocumentation();

app.MapFallbackToFile("/index.html");

app.Run();

public partial class Program;
