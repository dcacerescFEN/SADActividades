using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

namespace WebApi.Authentication;

public sealed record PublicKeycloakConfiguration(string Url, string Realm, string ClientId);

public sealed record KeycloakConfigurationState(PublicKeycloakConfiguration? PublicConfiguration)
{
    public bool IsAvailable => PublicConfiguration is not null;
}

public static class KeycloakAuthentication
{
    public static IServiceCollection AddKeycloakAuthentication(
        this IServiceCollection services, IConfiguration configuration)
    {
        var state = new KeycloakConfigurationState(ReadPublicConfiguration(configuration));
        services.AddSingleton(state);
        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(options =>
        {
            options.RequireHttpsMetadata = true;
            options.MapInboundClaims = false;
            var publicConfiguration = state.PublicConfiguration;
            var authority = publicConfiguration is null
                ? "https://unconfigured.invalid/realms/unconfigured"
                : $"{publicConfiguration.Url}/realms/{publicConfiguration.Realm}";
            if (publicConfiguration is not null)
            {
                options.Authority = authority;
                options.Audience = publicConfiguration.ClientId;
            }
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidIssuer = authority,
                ValidateAudience = true,
                ValidAudience = publicConfiguration?.ClientId ?? "unconfigured",
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                RequireSignedTokens = true,
                RequireExpirationTime = true,
                NameClaimType = "preferred_username",
                ClockSkew = TimeSpan.FromSeconds(30),
            };
        });
        services.AddAuthorization();
        return services;
    }

    private static PublicKeycloakConfiguration? ReadPublicConfiguration(IConfiguration configuration)
    {
        var rawUrl = configuration["Keycloak:Url"];
        var realm = configuration["Keycloak:Realm"]?.Trim();
        var clientId = configuration["Keycloak:ClientId"]?.Trim();
        if (!Uri.TryCreate(rawUrl?.Trim(), UriKind.Absolute, out var url)
            || url.Scheme != Uri.UriSchemeHttps
            || string.IsNullOrWhiteSpace(url.Host)
            || !string.IsNullOrEmpty(url.UserInfo)
            || !string.IsNullOrEmpty(url.Query)
            || !string.IsNullOrEmpty(url.Fragment)
            || string.IsNullOrWhiteSpace(realm)
            || realm is "." or ".."
            || !realm.All(character => char.IsAsciiLetterOrDigit(character)
                || character is '-' or '_' or '.' or '~')
            || string.IsNullOrWhiteSpace(clientId)
            || clientId.Any(char.IsWhiteSpace))
            return null;

        return new PublicKeycloakConfiguration(url.AbsoluteUri.TrimEnd('/'), realm, clientId);
    }
}
