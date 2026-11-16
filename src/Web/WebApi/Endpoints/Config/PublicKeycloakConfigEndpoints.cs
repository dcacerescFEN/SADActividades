using WebApi.Authentication;

namespace WebApi.Endpoints.Config;

public static class PublicKeycloakConfigEndpoints
{
    public static IEndpointRouteBuilder MapPublicKeycloakConfiguration(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/config/keycloak", (KeycloakConfigurationState state) =>
        {
            var configuration = state.PublicConfiguration;
            return configuration is null
                ? Results.Problem(
                    title: "La autenticación no está disponible.",
                    statusCode: StatusCodes.Status503ServiceUnavailable)
                : Results.Ok(new
                {
                    url = configuration.Url,
                    realm = configuration.Realm,
                    clientId = configuration.ClientId,
                });
        }).AllowAnonymous();
        return app;
    }
}
