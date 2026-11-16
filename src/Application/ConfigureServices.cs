using Application.Common.Interfaces;
using Application.Common.Services;
using Microsoft.Extensions.DependencyInjection;

namespace Application;

/// <summary>Registro de casos de uso y servicios de aplicación.</summary>
public static class ConfigureServices
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        services.AddScoped<IRequestDispatcher, RequestDispatcher>();
        services.AddScoped<IApiResponseService, ApiResponseService>();
        var assembly = typeof(ConfigureServices).Assembly;
        foreach (var implementation in assembly.GetTypes().Where(type => !type.IsAbstract && !type.IsInterface))
        foreach (var contract in implementation.GetInterfaces().Where(type => type.IsGenericType
                     && type.GetGenericTypeDefinition() == typeof(IRequestHandler<,>)))
            services.AddScoped(contract, implementation);
        return services;
    }
}
