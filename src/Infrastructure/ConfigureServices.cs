using Application.Common.Interfaces;
using Infrastructure.Data;
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
        return services;
    }
}
