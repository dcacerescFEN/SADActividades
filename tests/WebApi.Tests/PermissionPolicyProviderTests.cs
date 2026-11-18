using System.Security.Claims;
using System.Text.Json;
using Domain.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using WebApi.Authentication;
using WebApi.Services;
using Xunit;

namespace WebApi.Tests;

/// <summary>
/// El nombre de la política es el nombre corto del permiso (la constante de dominio) y el
/// rol de Keycloak es PERMISSION_ + ese nombre corto. El proveedor construye toda política
/// con el prefijo del módulo, igual que la aplicación de referencia: un nombre de política
/// inexistente no debe pasar desapercibido hasta el middleware.
/// </summary>
public sealed class PermissionPolicyProviderTests
{
    private const string ClientId = "SADActividades";
    private const string EditPolicy = "ACTIVITY_EDIT_TEACHING_ACTIVITY";

    private static PermissionPolicyProvider CreateProvider() => new(
        Options.Create(new AuthorizationOptions()),
        new PublicKeycloakConfiguration("https://identity.example.test", "activities", ClientId));

    [Fact]
    public async Task Every_catalogued_permission_uses_a_short_name_and_resolves_to_a_policy()
    {
        var provider = CreateProvider();

        foreach (var permission in Permission.All)
        {
            Assert.StartsWith("ACTIVITY_", permission, StringComparison.Ordinal);
            var policy = await provider.GetPolicyAsync(permission);
            Assert.NotNull(policy);
            Assert.Contains(policy!.Requirements, requirement => requirement is not null);
        }
    }

    [Fact]
    public async Task Unknown_or_legacy_policy_names_are_not_invented()
    {
        var provider = CreateProvider();

        // El identificador estandarizado completo es el rol de Keycloak, no el nombre de la política.
        Assert.Null(await provider.GetPolicyAsync("PERMISSION_" + EditPolicy));
        Assert.Null(await provider.GetPolicyAsync("PERMISSION_ACTIVITY_UNKNOWN_ACTION"));
        Assert.Null(await provider.GetPolicyAsync("suspender actividades docentes"));
        Assert.Null(await provider.GetPolicyAsync("viñeta actividades"));
        // Cualquier nombre del módulo obtiene política, como en la referencia; el rol exacto decide.
        Assert.NotNull(await provider.GetPolicyAsync("ACTIVITY_UNKNOWN_ACTION"));
    }

    [Theory]
    [InlineData("PERMISSION_ACTIVITY_EDIT_TEACHING_ACTIVITY", true)]
    [InlineData("ACTIVITY_EDIT_TEACHING_ACTIVITY", false)]
    [InlineData("PERMISSION_PERMISSION_ACTIVITY_EDIT_TEACHING_ACTIVITY", false)]
    [InlineData("PERMISSION_ACTIVITY_EDIT_TEACHING_ACTIVITY_EXTRA", false)]
    [InlineData("PERMISSION_REPORT_ACCESS_MODULE", false)]
    [InlineData("suspender actividades docentes", false)]
    public async Task A_short_policy_authorizes_only_the_exact_keycloak_role(string role, bool expected) =>
        Assert.Equal(expected, await AuthorizeAsync(EditPolicy, ClientId, role));

    [Theory]
    [InlineData(Roles.Administrator, ClientId, true)]
    [InlineData(Roles.SuperAdmin, ClientId, true)]
    [InlineData("ROLE_REPORT_ADMIN", ClientId, false)]
    [InlineData("ROLE_ACTIVITY_ADMIN_EXTRA", ClientId, false)]
    [InlineData("MY_ROLE_ACTIVITY_SUPERADMIN", ClientId, false)]
    [InlineData(Roles.Administrator, "OtherClient", false)]
    public async Task Only_exact_module_administrative_roles_from_the_configured_client_override_the_permission(
        string role, string roleClient, bool expected) =>
        Assert.Equal(expected, await AuthorizeAsync(EditPolicy, roleClient, role));

    [Fact]
    public async Task A_policy_named_with_a_permission_constant_accepts_the_standardized_role_identifier() =>
        Assert.True(await AuthorizeAsync(Permission.EDIT_TEACHING_ACTIVITY, ClientId,
            Permission.ToRoleIdentifier(Permission.EDIT_TEACHING_ACTIVITY)));

    [Fact]
    public void The_provider_is_registered_as_the_policy_provider()
    {
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddSingleton(new PublicKeycloakConfiguration("https://identity.example.test", "activities", ClientId));
        services.AddSingleton<IAuthorizationPolicyProvider, PermissionPolicyProvider>();
        using var provider = services.BuildServiceProvider();

        Assert.IsType<PermissionPolicyProvider>(provider.GetRequiredService<IAuthorizationPolicyProvider>());
    }

    /// <summary>Evalúa una política del módulo con un token simulado que solo aporta roles del cliente.</summary>
    private static async Task<bool> AuthorizeAsync(string policyName, string roleClient, params string[] roles)
    {
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddAuthorization();
        services.AddSingleton(new PublicKeycloakConfiguration("https://identity.example.test", "activities", ClientId));
        services.AddSingleton<IAuthorizationPolicyProvider, PermissionPolicyProvider>();
        using var provider = services.BuildServiceProvider();

        var user = User(roleClient, roles);
        var authorization = provider.GetRequiredService<IAuthorizationService>();
        return (await authorization.AuthorizeAsync(user, null, policyName)).Succeeded;
    }

    /// <summary>Construye una identidad con los roles que Keycloak publica para el cliente indicado.</summary>
    private static ClaimsPrincipal User(string roleClient, string[] roles)
    {
        var access = JsonSerializer.Serialize(new Dictionary<string, object>
        {
            [roleClient] = new { roles },
        });
        return new ClaimsPrincipal(new ClaimsIdentity([new Claim("resource_access", access)], "Test"));
    }
}
