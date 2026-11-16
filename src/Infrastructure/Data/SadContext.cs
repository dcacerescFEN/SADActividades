using Application.Common.Interfaces;
using Domain.Entities.Sad.Tables;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Data;

/// <summary>Contexto mínimo de tablas SAD requeridas por la consulta de Actividades.</summary>
public sealed class SadContext(DbContextOptions<SadContext> options) : DbContext(options), ISadContext
{
    public DbSet<Sector> Sectors => Set<Sector>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Sector>(entity =>
        {
            entity.ToTable("Sector");
            entity.HasKey(item => item.IdSector);
            entity.HasIndex(item => item.CodSector).IsUnique();
            entity.Property(item => item.CodSector).HasMaxLength(50).IsUnicode(false);
            entity.Property(item => item.NombreSector).HasMaxLength(300).IsUnicode(false);
        });
    }
}
