using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

namespace WebApi.Authentication;

public sealed record PublicKeycloakConfiguration(string Url, string Realm, string ClientId);

public static class KeycloakAuthentication
{
    public static IServiceCollection AddKeycloakAuthentication(
        this IServiceCollection services, IConfiguration configuration)
    {
        var url = configuration["Keycloak:Url"];
        var realm = configuration["Keycloak:Realm"];
        var clientId = configuration["Keycloak:ClientId"];
        // Se valida de forma estricta: una URL o un realm manipulados producirían un emisor falso.
        if (!Uri.TryCreate(url?.Trim(), UriKind.Absolute, out var uri)
            || uri.Scheme != Uri.UriSchemeHttps
            || string.IsNullOrWhiteSpace(uri.Host)
            || !string.IsNullOrEmpty(uri.UserInfo)
            || !string.IsNullOrEmpty(uri.Query)
            || !string.IsNullOrEmpty(uri.Fragment)
            || string.IsNullOrWhiteSpace(realm)
            || realm is "." or ".."
            || !realm.Trim().All(character => char.IsAsciiLetterOrDigit(character)
                || character is '-' or '_' or '.' or '~')
            || string.IsNullOrWhiteSpace(clientId)
            || clientId.Any(char.IsWhiteSpace))
            throw new InvalidOperationException("La configuración pública de Keycloak es inválida.");
        realm = realm.Trim();
        clientId = clientId.Trim();

        var publicConfiguration = new PublicKeycloakConfiguration(url!.TrimEnd('/'), realm, clientId);
        var authority = $"{publicConfiguration.Url}/realms/{realm}";
        services.AddSingleton(publicConfiguration);
        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(options =>
        {
            options.Authority = authority;
            options.Audience = clientId;
            options.RequireHttpsMetadata = true;
            options.MapInboundClaims = false;
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidIssuer = authority,
                ValidateAudience = true,
                ValidAudience = clientId,
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
}
