using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text.Encodings.Web;
using System.Text.Json;
using Application.Common.Interfaces;
using Application.Common.Models;
using Domain.Entities.Sad.Sp;
using Domain.Entities.Sad.Tables;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System.IdentityModel.Tokens.Jwt;

namespace WebApi.Tests;

public sealed class ActivityTestFactory : WebApplicationFactory<Program>
{
    public FakeProcedures Procedures { get; } = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseSetting("Keycloak:Url", "https://identity.example.test");
        builder.UseSetting("Keycloak:Realm", "activities");
        builder.UseSetting("Keycloak:ClientId", "SADActividades");
        builder.ConfigureServices(services =>
        {
            services.AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = "Test";
                options.DefaultChallengeScheme = "Test";
            }).AddScheme<AuthenticationSchemeOptions, HeaderAuthenticationHandler>("Test", _ => { });
            services.Remove(services.Single(item => item.ServiceType == typeof(ISadContextProcedures)));
            services.Remove(services.Single(item => item.ServiceType == typeof(IActivitySectorReader)));
            services.AddSingleton<ISadContextProcedures>(Procedures);
            services.AddSingleton<IActivitySectorReader>(new FakeSectorReader());
        });
    }

    public HttpClient CreateAuthorizedClient(params string[] roles)
    {
        var client = CreateClient();
        client.DefaultRequestHeaders.Add("X-Test-Roles", string.Join(',', roles));
        return client;
    }

    private sealed class FakeSectorReader : IActivitySectorReader
    {
        public Task<IReadOnlyList<Application.Activities.Queries.GetActivityCatalogs.CatalogOptionDTO>> GetActiveAsync(CancellationToken cancellationToken) =>
            Task.FromResult<IReadOnlyList<Application.Activities.Queries.GetActivityCatalogs.CatalogOptionDTO>>([]);
    }

    private sealed class HeaderAuthenticationHandler(IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger, UrlEncoder encoder) : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
    {
        protected override Task<AuthenticateResult> HandleAuthenticateAsync()
        {
            if (!Request.Headers.TryGetValue("X-Test-Roles", out var roles)) return Task.FromResult(AuthenticateResult.NoResult());
            var client = Request.Headers["X-Test-Client"].FirstOrDefault() ?? "SADActividades";
            var access = JsonSerializer.Serialize(new Dictionary<string, object>
            {
                [client] = new { roles = roles.ToString().Split(',', StringSplitOptions.RemoveEmptyEntries)
                    .Select(ToKeycloakRole).ToArray() },
            });
            var identity = new ClaimsIdentity([new Claim("resource_access", access, JsonClaimValueTypes.Json)], "Test");
            return Task.FromResult(AuthenticateResult.Success(new AuthenticationTicket(new ClaimsPrincipal(identity), "Test")));
        }

        /// <summary>
        /// Emula a Keycloak: los permisos se publican como PERMISSION_ + nombre corto y los roles
        /// administrativos del módulo se conservan exactamente como se indican.
        /// </summary>
        private static string ToKeycloakRole(string role) =>
            role.StartsWith("ROLE_", StringComparison.Ordinal) ? role : "PERMISSION_" + role;
    }
}

public sealed class FakeProcedures : ISadContextProcedures
{
    public int Calls { get; private set; }
    public (string? Date, string? Period, string? State, int? Category, int? Fen, int? Public, string? Location, string? Sector)? LastFilters { get; private set; }
    public bool Fail { get; set; }
    public List<SpRecActividadesResult> Activities { get; } = [];
    public List<SpRecActividadResult> Details { get; } = [];
    public List<SpRecActividadesTiposResult> Types { get; } = [];
    public List<SpRecActividadesSalasResult> Locations { get; } = [];

    public Task<List<SpRecActividadesResult>?> SpRecActividadesAsync(string? fecha, string? periodo, string? estado, int? soloDocentes,
        int? soloFen, int? soloPublicas, string? ubicacion, string? sector, OutputParameter<int>? returnValue = null,
        CancellationToken? cancellationToken = default)
    {
        Read(); LastFilters = (fecha, periodo, estado, soloDocentes, soloFen, soloPublicas, ubicacion, sector);
        return Task.FromResult<List<SpRecActividadesResult>?>(Activities);
    }
    public Task<List<SpRecActividadResult>?> SpRecActividadAsync(int? actividad, OutputParameter<int>? returnValue = null, CancellationToken? cancellationToken = default)
        { Read(); return Task.FromResult<List<SpRecActividadResult>?>(Details.Where(item => item.Folio == actividad).ToList()); }
    public Task<List<SpRecActividadesTiposResult>?> SpRecActividadesTiposAsync(string? categoria, OutputParameter<int>? returnValue = null, CancellationToken? cancellationToken = default)
        { Read(); return Task.FromResult<List<SpRecActividadesTiposResult>?>(Types); }
    public Task<List<SpRecActividadesSalasResult>?> SpRecActividadesSalasAsync(string? sector, OutputParameter<int>? returnValue = null, CancellationToken? cancellationToken = default)
        { Read(); return Task.FromResult<List<SpRecActividadesSalasResult>?>(Locations); }
    private void Read() { Calls++; if (Fail) throw new InvalidOperationException("sql private detail"); }
}
