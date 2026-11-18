using Microsoft.AspNetCore.Authorization;
using Microsoft.OpenApi;
using Scalar.AspNetCore;
using WebApi.Authentication;

namespace WebApi.OpenApi;

/// <summary>Documentación OpenAPI y explorador Scalar, disponibles solo en desarrollo.</summary>
public static class ApiDocumentation
{
    public static IServiceCollection AddApiDocumentation(this IServiceCollection services)
    {
        services.AddOpenApi("v1", options =>
        {
            options.AddDocumentTransformer((document, context, _) =>
            {
                document.Info = new OpenApiInfo { Title = "SADActividades API", Version = "1.0" };
                var configuration = context.ApplicationServices
                    .GetRequiredService<KeycloakConfigurationState>().PublicConfiguration;
                // Sin identidad configurada no se publica un esquema de seguridad incompleto.
                if (configuration is null) return Task.CompletedTask;

                var authority = $"{configuration.Url}/realms/{configuration.Realm}";
                document.Components ??= new OpenApiComponents();
                document.Components.SecuritySchemes = new Dictionary<string, IOpenApiSecurityScheme>
                {
                    ["Keycloak"] = new OpenApiSecurityScheme
                    {
                        Type = SecuritySchemeType.OAuth2,
                        Flows = new OpenApiOAuthFlows
                        {
                            AuthorizationCode = new OpenApiOAuthFlow
                            {
                                AuthorizationUrl = new Uri($"{authority}/protocol/openid-connect/auth"),
                                TokenUrl = new Uri($"{authority}/protocol/openid-connect/token"),
                                Scopes = new Dictionary<string, string>
                                {
                                    ["openid"] = "Identidad del usuario",
                                    ["profile"] = "Perfil del usuario",
                                },
                            },
                        },
                    },
                };
                return Task.CompletedTask;
            });
            // Solo los endpoints realmente protegidos muestran el candado.
            options.AddOperationTransformer((operation, context, _) =>
            {
                var metadata = context.Description.ActionDescriptor.EndpointMetadata;
                var requiresIdentity = metadata.OfType<IAuthorizeData>().Any()
                    && !metadata.OfType<IAllowAnonymous>().Any();
                if (!requiresIdentity || context.Document.Components?.SecuritySchemes is null) return Task.CompletedTask;
                operation.Security = [new OpenApiSecurityRequirement
                {
                    [new OpenApiSecuritySchemeReference("Keycloak", context.Document)] = ["openid", "profile"],
                }];
                return Task.CompletedTask;
            });
        });
        return services;
    }

    public static void MapDevelopmentDocumentation(this WebApplication app)
    {
        // Nunca se expone en entornos publicados: evita revelar el contrato interno.
        if (!app.Environment.IsDevelopment()) return;
        app.MapOpenApi("/openapi/v1.json");
        var configuration = app.Services.GetRequiredService<KeycloakConfigurationState>().PublicConfiguration;
        app.MapScalarApiReference(options =>
        {
            options.WithTitle("SADActividades API");
            if (configuration is null) return;
            options.AddPreferredSecuritySchemes("Keycloak")
                .AddAuthorizationCodeFlow("Keycloak", flow =>
                {
                    flow.ClientId = configuration.ClientId;
                    flow.Pkce = Pkce.Sha256;
                    flow.SelectedScopes = ["openid", "profile"];
                });
        });
    }
}
