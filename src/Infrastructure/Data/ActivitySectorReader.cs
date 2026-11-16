using Application.Activities.Queries.GetActivityCatalogs;
using Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Data;

/// <summary>Adaptador EF para el catálogo de sectores activos.</summary>
public sealed class ActivitySectorReader(SadContext context) : IActivitySectorReader
{
    public async Task<IReadOnlyList<CatalogOptionDTO>> GetActiveAsync(CancellationToken cancellationToken) =>
        await context.Sectors.AsNoTracking().Where(item => item.Estado).OrderBy(item => item.NombreSector)
            .Select(item => new CatalogOptionDTO(item.CodSector, item.NombreSector)).ToListAsync(cancellationToken);
}
