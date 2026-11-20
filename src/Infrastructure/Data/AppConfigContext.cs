using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Data;

/// <summary>
/// Contexto de la base AppConfig, que publica la configuración del sitio. Se usa solo para tomar
/// la instantánea del arranque; no participa de las transacciones del módulo de Actividades.
/// </summary>
public sealed class AppConfigContext(DbContextOptions<AppConfigContext> options) : DbContext(options)
{
    /// <summary>Configuraciones por aplicación y ambiente.</summary>
    public DbSet<Domain.Entities.AppConfig.Configuration> Configurations =>
        Set<Domain.Entities.AppConfig.Configuration>();

    /// <summary>Aplicaciones registradas en AppConfig.</summary>
    public DbSet<Domain.Entities.AppConfig.Application> Applications =>
        Set<Domain.Entities.AppConfig.Application>();

    /// <summary>Ambientes registrados en AppConfig.</summary>
    public DbSet<Domain.Entities.AppConfig.Environment> Environments =>
        Set<Domain.Entities.AppConfig.Environment>();

    /// <inheritdoc />
    protected override void OnModelCreating(ModelBuilder builder)
    {
        // Nombres y largos de columna tomados de las tablas existentes de AppConfig.
        builder.Entity<Domain.Entities.AppConfig.Application>()
            .Property(row => row.ApplicationName).HasColumnType("varchar(30)");
        builder.Entity<Domain.Entities.AppConfig.Environment>()
            .Property(row => row.EnvironmentName).HasColumnType("varchar(30)");
        builder.Entity<Domain.Entities.AppConfig.Configuration>()
            .Property(row => row.ConfigurationName).HasColumnType("varchar(100)");
        builder.Entity<Domain.Entities.AppConfig.Configuration>()
            .Property(row => row.ConfigurationValue).HasColumnType("varchar(4000)");
    }
}
