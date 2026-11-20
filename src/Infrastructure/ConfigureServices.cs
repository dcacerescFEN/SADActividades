using Application.Common.Interfaces;
using Application.Navigation;
using Infrastructure.Configuration;
using Infrastructure.Data;
using Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Infrastructure;

/// <summary>Registro del adaptador configurado de lectura SAD.</summary>
public static class ConfigureServices
{
    public static IServiceCollection AddInfrastructureServices(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<SadContext>(options => options.UseSqlServer(
            configuration.GetConnectionString("Sad"), sql => sql.CommandTimeout(15)));
        services.AddScoped<ISadContext>(provider => provider.GetRequiredService<SadContext>());
        services.AddScoped<ISadContextProcedures, SadContextProcedures>();
        services.AddScoped<IActivitySectorReader, ActivitySectorReader>();

        // La cadena de AppConfig no se versiona. Si falta, el menú queda no disponible (503) y la API
        // sigue sirviendo health y sesión en lugar de impedir el arranque.
        services.AddDbContext<AppConfigContext>(options =>
        {
            var connectionString = configuration.GetConnectionString("AppConfig");
            if (string.IsNullOrWhiteSpace(connectionString))
                throw new InvalidOperationException("La cadena de conexión 'AppConfig' no está configurada.");
            options.UseSqlServer(connectionString, sql => sql.CommandTimeout(10));
        });
        services.AddSingleton<SiteSettings>();
        services.AddScoped<ConfigurationInitialiser>();
        services.AddScoped<ISiteMenuProvider, SiteMenuProvider>();
        return services;
    }
}
