using Microsoft.AspNetCore.Authorization;
using WebApi.Authentication;
using WebApi.OpenApi;
using WebApi.Services;

namespace WebApi;

public static class ConfigureServices
{
    public static IServiceCollection AddWebApiServices(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddKeycloakAuthentication(configuration);
        services.AddSingleton<IAuthorizationPolicyProvider, PermissionPolicyProvider>();
        services.AddApiDocumentation();
        return services;
    }
}
