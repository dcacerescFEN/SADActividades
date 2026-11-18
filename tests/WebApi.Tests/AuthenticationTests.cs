using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text.Json;
using System.Text.RegularExpressions;
using Domain.Constants;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Protocols;
using Microsoft.IdentityModel.Protocols.OpenIdConnect;
using Microsoft.IdentityModel.Tokens;
using Xunit;

namespace WebApi.Tests;

public sealed class AuthenticationTests : IDisposable
{
    private const string Url = "https://identity.example.test";
    private const string Realm = "activities";
    private const string ClientId = "SADActividades";
    private const string Issuer = Url + "/realms/" + Realm;
    private readonly RSA _rsa = RSA.Create(2048);

    [Fact]
    public async Task Missing_configuration_keeps_health_public_and_fails_authentication_closed()
    {
        // Se anula explícitamente la configuración publicada para probar el comportamiento sin identidad.
        using var factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Testing");
            builder.UseSetting("Keycloak:Url", string.Empty);
            builder.UseSetting("Keycloak:Realm", string.Empty);
            builder.UseSetting("Keycloak:ClientId", string.Empty);
        });
        using var client = factory.CreateClient();

        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/health")).StatusCode);
        var configuration = await client.GetAsync("/api/config/keycloak");
        Assert.Equal(HttpStatusCode.ServiceUnavailable, configuration.StatusCode);
        Assert.Equal("La autenticación no está disponible.",
            JsonDocument.Parse(await configuration.Content.ReadAsStringAsync()).RootElement.GetProperty("title").GetString());
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/auth/me")).StatusCode);
    }

    [Theory]
    [InlineData("http://identity.example.test", Realm, ClientId)]
    [InlineData("https://user:password@identity.example.test", Realm, ClientId)]
    [InlineData("https://identity.example.test?tenant=other", Realm, ClientId)]
    [InlineData("https://identity.example.test#fragment", Realm, ClientId)]
    [InlineData(Url, "activities?other=realm", ClientId)]
    [InlineData(Url, "activities#fragment", ClientId)]
    [InlineData(Url, "activities\\other", ClientId)]
    [InlineData(Url, "activities%2Fother", ClientId)]
    [InlineData(Url, "activities%3Fother", ClientId)]
    [InlineData(Url, ".", ClientId)]
    [InlineData(Url, "..", ClientId)]
    [InlineData(Url, "", ClientId)]
    [InlineData(Url, Realm, "")]
    public async Task Invalid_public_configuration_returns_only_a_sanitized_503(string url, string realm, string clientId)
    {
        using var factory = CreateFactory(url, realm, clientId);
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/api/config/keycloak");
        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        if (url.Length > 0) Assert.DoesNotContain(url, body);
        if (realm.Length > 2) Assert.DoesNotContain(realm, body);
        if (clientId.Length > 2) Assert.DoesNotContain(clientId, body);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync("/api/health")).StatusCode);
    }

    [Fact]
    public async Task Public_configuration_contains_only_validated_public_values()
    {
        using var factory = CreateFactory(Url + "/", Realm, ClientId);
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/api/config/keycloak");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal(new[] { "clientId", "realm", "url" },
            body.RootElement.EnumerateObject().Select(property => property.Name).Order().ToArray());
        Assert.Equal(Url, body.RootElement.GetProperty("url").GetString());
        Assert.Equal(Realm, body.RootElement.GetProperty("realm").GetString());
        Assert.Equal(ClientId, body.RootElement.GetProperty("clientId").GetString());
    }

    [Fact]
    public async Task Public_configuration_preserves_a_legitimate_https_base_path()
    {
        using var factory = CreateFactory(Url + "/auth/", Realm, ClientId);
        using var client = factory.CreateClient();

        var response = await client.GetAsync("/api/config/keycloak");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal(Url + "/auth", body.RootElement.GetProperty("url").GetString());
    }

    [Fact]
    public async Task Valid_token_returns_only_the_server_validated_identity()
    {
        using var factory = CreateFactory(Url, Realm, ClientId);
        using var client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new("Bearer", CreateToken());

        var response = await client.GetAsync("/api/auth/me");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal(new[] { "username" }, body.RootElement.EnumerateObject().Select(property => property.Name).ToArray());
        Assert.Equal("usuario-prueba", body.RootElement.GetProperty("username").GetString());
        Assert.DoesNotContain("private-value", body.RootElement.GetRawText());
    }

    [Theory]
    [InlineData("audience")]
    [InlineData("issuer")]
    [InlineData("signature")]
    [InlineData("expired")]
    [InlineData("future")]
    [InlineData("unsigned")]
    [InlineData("malformed")]
    public async Task Invalid_tokens_never_return_identity(string defect)
    {
        using var factory = CreateFactory(Url, Realm, ClientId);
        using var client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new("Bearer", CreateToken(defect));

        var response = await client.GetAsync("/api/auth/me");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal(string.Empty, await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task All_standardized_permissions_authorize_while_every_legacy_identifier_is_rejected()
    {
        var mappings = ReadDocumentedMappings();
        using var factory = CreateFactory(Url, Realm, ClientId, mapPermissionProbes: true);
        using var client = factory.CreateClient();

        foreach (var mapping in mappings)
        {
            client.DefaultRequestHeaders.Authorization = new("Bearer", CreateToken(roles: [mapping.NewIdentifier]));
            Assert.Equal(HttpStatusCode.OK, (await client.GetAsync(Probe(mapping.NewIdentifier))).StatusCode);

            foreach (var rejected in new[] { mapping.OldIdentifier, "PERMISSION_" + mapping.OldIdentifier })
            {
                client.DefaultRequestHeaders.Authorization = new("Bearer", CreateToken(roles: [rejected]));
                var response = await client.GetAsync(Probe(mapping.NewIdentifier));
                Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
                Assert.Equal(string.Empty, await response.Content.ReadAsStringAsync());
            }
        }
    }

    [Theory]
    [InlineData(Role.ActivityAdmin, ClientId, HttpStatusCode.OK)]
    [InlineData(Role.ActivitySuperAdmin, ClientId, HttpStatusCode.OK)]
    [InlineData("ROLE_REPORT_ADMIN", ClientId, HttpStatusCode.Forbidden)]
    [InlineData("ROLE_ACTIVITY_ADMIN_EXTRA", ClientId, HttpStatusCode.Forbidden)]
    [InlineData("MY_ROLE_ACTIVITY_SUPERADMIN", ClientId, HttpStatusCode.Forbidden)]
    [InlineData(Role.ActivityAdmin, "OtherClient", HttpStatusCode.Forbidden)]
    [InlineData(Permission.EditTeachingActivity, "OtherClient", HttpStatusCode.Forbidden)]
    public async Task Only_exact_activity_administrative_roles_from_the_configured_client_override_permissions(
        string role, string roleClient, HttpStatusCode expected)
    {
        using var factory = CreateFactory(Url, Realm, ClientId, mapPermissionProbes: true);
        using var client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new("Bearer", CreateToken(roles: [role], roleClient: roleClient));

        var response = await client.GetAsync(Probe(Permission.EditTeachingActivity));
        Assert.Equal(expected, response.StatusCode);
        Assert.Equal(expected == HttpStatusCode.OK ? "allowed" : string.Empty,
            await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Permission_boundary_rejects_anonymous_requests_and_preserves_activity_404s()
    {
        using var factory = CreateFactory(Url, Realm, ClientId, mapPermissionProbes: true);
        using var client = factory.CreateClient();

        Assert.Equal(HttpStatusCode.Unauthorized,
            (await client.GetAsync(Probe(Permission.EditTeachingActivity))).StatusCode);
        // La consulta existe y falla cerrada sin identidad; la escritura sigue sin implementarse.
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync("/api/activities?date=2026-01-05&category=0")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.PostAsync("/api/activities", null)).StatusCode);
    }

    [Fact]
    public void Catalog_and_documentation_cover_every_standardized_described_mapping()
    {
        var mappings = ReadDocumentedMappings();
        Assert.Equal(14, Permission.Definitions.Count);
        Assert.Equal(Permission.Definitions.Count, mappings.Count);
        Assert.Equal(Permission.Definitions.Select(item => item.Identifier).Order(),
            mappings.Select(item => item.NewIdentifier).Order());
        Assert.All(Permission.Definitions, definition =>
        {
            Assert.Matches("^PERMISSION_ACTIVITY_(CREATE|EDIT|DELETE|VIEW|ACCESS)_[A-Z0-9_]+$", definition.Identifier);
            Assert.False(string.IsNullOrWhiteSpace(definition.Description));
            Assert.DoesNotContain(' ', definition.Identifier);
        });
        Assert.Equal(new[] { Role.ActivityAdmin, Role.ActivitySuperAdmin },
            Role.Definitions.Select(definition => definition.Identifier));
        Assert.All(Role.Definitions, definition => Assert.False(string.IsNullOrWhiteSpace(definition.Description)));
        var documentation = File.ReadAllText(FindRepositoryRoot().FullName + "/docs/permission-equivalences.md");
        Assert.All(Role.Definitions, definition =>
        {
            Assert.Contains(definition.Identifier, documentation);
            Assert.Contains(definition.Description, documentation);
        });
        Assert.Equal(14, Permission.Definitions.Select(item => item.Identifier).Distinct().Count());
        Assert.All(mappings, mapping => Assert.False(string.IsNullOrWhiteSpace(mapping.Description)));
        // Los doce permisos de acción heredados conservan su evidencia exacta en el calendario legado.
        var legacyActions = mappings
            .Where(mapping => mapping.Source.Contains("Actividades/default.aspx.vb:", StringComparison.Ordinal))
            .ToArray();
        Assert.Equal(12, legacyActions.Length);
        Assert.Equal(12, legacyActions.Select(mapping => mapping.OldIdentifier).Distinct(StringComparer.Ordinal).Count());
        Assert.All(legacyActions, mapping =>
            Assert.Matches("^SAD/Actividades/default\\.aspx\\.vb:(52|53|54|55|56|57|60|61|62|63|110|111)$", mapping.Source));
        // El acceso al módulo proviene de la viñeta del encabezado; la consulta es una definición nueva.
        Assert.Contains(mappings, mapping => mapping.NewIdentifier == Permission.AccessModule
            && mapping.Source == "SAD/comunes/Header.ascx.vb:99");
        Assert.Contains(mappings, mapping => mapping.NewIdentifier == Permission.ViewCalendar);
        Assert.Equal(new[] { Role.ActivityAdmin, Role.ActivitySuperAdmin },
            Role.Definitions.Select(item => item.Identifier).ToArray());
        Assert.All(Role.Definitions, role => Assert.False(string.IsNullOrWhiteSpace(role.Description)));
    }

    private WebApplicationFactory<Program> CreateFactory(
        string? url = null, string? realm = null, string? clientId = null, bool mapPermissionProbes = false) =>
        new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Testing");
            if (url is not null) builder.UseSetting("Keycloak:Url", url);
            if (realm is not null) builder.UseSetting("Keycloak:Realm", realm);
            if (clientId is not null) builder.UseSetting("Keycloak:ClientId", clientId);
            builder.ConfigureServices(services =>
            {
                var key = new RsaSecurityKey(_rsa) { KeyId = "test-key" };
                services.PostConfigure<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme, options =>
                {
                    var configuration = new OpenIdConnectConfiguration { Issuer = Issuer };
                    configuration.SigningKeys.Add(key);
                    options.ConfigurationManager = new StaticConfigurationManager<OpenIdConnectConfiguration>(configuration);
                });
                if (mapPermissionProbes) services.AddSingleton<IStartupFilter, PermissionProbeStartupFilter>();
            });
        });

    private string CreateToken(string? defect = null, string[]? roles = null, string roleClient = ClientId)
    {
        if (defect == "malformed") return "invalid-token";
        using var otherRsa = RSA.Create(2048);
        var signingKey = new RsaSecurityKey(defect == "signature" ? otherRsa : _rsa) { KeyId = "test-key" };
        var now = DateTime.UtcNow;
        var access = JsonSerializer.Serialize(new Dictionary<string, object>
        {
            [roleClient] = new { roles = roles ?? [Permission.EditTeachingActivity] },
        });
        var token = new JwtSecurityToken(
            issuer: defect == "issuer" ? "https://other.invalid/realms/other" : Issuer,
            audience: defect == "audience" ? "OtherClient" : ClientId,
            claims:
            [
                new Claim("sub", "test-user"),
                new Claim("preferred_username", "usuario-prueba"),
                new Claim("private_claim", "private-value"),
                new Claim("resource_access", access, JsonClaimValueTypes.Json),
            ],
            notBefore: defect == "future" ? now.AddMinutes(5) : now.AddMinutes(-10),
            expires: defect == "expired" ? now.AddMinutes(-5) : now.AddMinutes(10),
            signingCredentials: defect == "unsigned" ? null : new SigningCredentials(signingKey, SecurityAlgorithms.RsaSha256));
        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static string Probe(string permission) => "/test/permission/" + permission;

    private static IReadOnlyList<PermissionMapping> ReadDocumentedMappings()
    {
        var lines = File.ReadAllLines(Path.Combine(FindRepositoryRoot().FullName, "docs", "permission-equivalences.md"));
        return lines
            .Where(line => line.StartsWith("| `", StringComparison.Ordinal))
            .Select(line => line.Split('|', StringSplitOptions.TrimEntries))
            .Where(parts => parts.Length == 6 && parts[2].StartsWith('`'))
            .Select(parts => new PermissionMapping(
                parts[1].Trim('`'), parts[2].Trim('`'), parts[3], parts[4].Trim('`')))
            .ToArray();
    }

    private static DirectoryInfo FindRepositoryRoot()
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);
        while (directory is not null && !File.Exists(Path.Combine(directory.FullName, "docs", "permission-equivalences.md")))
            directory = directory.Parent;
        Assert.NotNull(directory);
        return directory!;
    }

    public void Dispose() => _rsa.Dispose();

    private sealed record PermissionMapping(
        string OldIdentifier, string NewIdentifier, string Description, string Source);

    private sealed class PermissionProbeStartupFilter : IStartupFilter
    {
        public Action<IApplicationBuilder> Configure(Action<IApplicationBuilder> next) => app =>
        {
            next(app);
            app.UseEndpoints(endpoints =>
            {
                foreach (var definition in Permission.Definitions)
                {
                    endpoints.MapGet(Probe(definition.Identifier), () => "allowed")
                        .RequireAuthorization(definition.Identifier);
                }
            });
        };
    }
}
