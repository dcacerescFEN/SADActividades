using Application.Common.Interfaces;
using Infrastructure;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace WebApi.Tests;

/// <summary>
/// La cadena de conexión proviene de la configuración externa (secretos de usuario o variables
/// de entorno) y debe llegar al contexto de datos sin quedar escrita en el repositorio.
/// </summary>
public sealed class InfrastructureConnectionTests
{
    private const string Connection =
        "Server=example;Database=Sad;User ID=usuario;Password=clave;TrustServerCertificate=True";

    private static ServiceProvider BuildProvider(string? connection)
    {
        var values = new Dictionary<string, string?>();
        if (connection is not null) values["ConnectionStrings:Sad"] = connection;
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(values).Build();
        var services = new ServiceCollection();
        services.AddInfrastructureServices(configuration);
        return services.BuildServiceProvider();
    }

    [Fact]
    public void The_configured_connection_reaches_the_data_context()
    {
        using var provider = BuildProvider(Connection);
        using var scope = provider.CreateScope();

        var context = (DbContext)scope.ServiceProvider.GetRequiredService<ISadContext>();
        var actual = new Microsoft.Data.SqlClient.SqlConnectionStringBuilder(
            context.Database.GetConnectionString());

        // SqlClient normaliza la cadena: se comparan los valores efectivos, no el texto.
        Assert.Equal("example", actual.DataSource);
        Assert.Equal("Sad", actual.InitialCatalog);
        Assert.Equal("usuario", actual.UserID);
        Assert.Equal(15, context.Database.GetCommandTimeout());
    }

    [Fact]
    public void The_read_adapters_are_registered_with_the_context()
    {
        using var provider = BuildProvider(Connection);
        using var scope = provider.CreateScope();

        Assert.IsType<SadContextProcedures>(scope.ServiceProvider.GetRequiredService<ISadContextProcedures>());
        Assert.IsType<ActivitySectorReader>(scope.ServiceProvider.GetRequiredService<IActivitySectorReader>());
    }

    [Fact]
    public void A_missing_connection_leaves_the_context_without_a_target()
    {
        using var provider = BuildProvider(null);
        using var scope = provider.CreateScope();

        // Sin cadena configurada la consulta no puede resolverse y el endpoint la traduce
        // a un 503 sanitizado en lugar de exponer el error de conexión.
        var context = (DbContext)scope.ServiceProvider.GetRequiredService<ISadContext>();
        Assert.True(string.IsNullOrWhiteSpace(context.Database.GetConnectionString()));
    }
}
