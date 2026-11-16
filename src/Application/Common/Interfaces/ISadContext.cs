using Domain.Entities.Sad.Tables;
using Microsoft.EntityFrameworkCore;

namespace Application.Common.Interfaces;

/// <summary>Tablas SAD necesarias para las consultas de Actividades.</summary>
public interface ISadContext
{
    /// <summary>Sectores activos disponibles para filtrar el calendario.</summary>
    DbSet<Sector> Sectors { get; }
}
