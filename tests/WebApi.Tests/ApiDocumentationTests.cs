using System.Net;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace WebApi.Tests;

/// <summary>
/// La documentación interactiva solo puede existir en desarrollo: publicarla revelaría
/// el contrato interno de la API.
/// </summary>
public sealed class ApiDocumentationTests
{
    private static WebApplicationFactory<Program> Create(string environment) =>
        new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment(environment);
            builder.UseSetting("Keycloak:Url", "https://identity.example.test");
            builder.UseSetting("Keycloak:Realm", "activities");
            builder.UseSetting("Keycloak:ClientId", "SADActividades");
        });

    [Fact]
    public async Task Development_exposes_the_openapi_document_and_the_scalar_explorer()
    {
        using var factory = Create("Development");
        using var client = factory.CreateClient();

        var document = await client.GetAsync("/openapi/v1.json");
        Assert.Equal(HttpStatusCode.OK, document.StatusCode);
        Assert.Contains("SADActividades API", await document.Content.ReadAsStringAsync());

        var explorer = await client.GetAsync("/scalar/v1");
        Assert.Equal(HttpStatusCode.OK, explorer.StatusCode);
    }

    [Theory]
    [InlineData("Production")]
    [InlineData("Staging")]
    public async Task Published_environments_do_not_serve_the_documentation(string environment)
    {
        using var factory = Create(environment);
        using var client = factory.CreateClient();

        // Sin documentación mapeada, estas rutas caen al fallback de la SPA: lo que no debe
        // ocurrir es que se sirva el contrato OpenAPI ni el explorador interactivo.
        var document = await client.GetAsync("/openapi/v1.json");
        Assert.DoesNotContain("\"openapi\"", await document.Content.ReadAsStringAsync());

        var explorer = await client.GetAsync("/scalar/v1");
        Assert.DoesNotContain("SADActividades API", await explorer.Content.ReadAsStringAsync());
        Assert.DoesNotContain("api-reference", await explorer.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Documentation_keeps_the_api_guard_and_the_health_endpoint_public()
    {
        using var factory = Create("Development");
        using var client = factory.CreateClient();

        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/health")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync("/api/no-existe")).StatusCode);
    }
}
