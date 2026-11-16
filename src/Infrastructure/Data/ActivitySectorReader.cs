using Application.Activities.Queries.GetActivityCatalogs;
using Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Data;

/// <summary>Adaptador EF para el catálogo de sectores activos.</summary>
public sealed class ActivitySectorReader(SadContext context) : IActivitySectorReader
{
    public async Task<IReadOnlyList<CatalogOptionDTO>> GetActiveAsync(CancellationToken cancellationToken) =>
        await context.Sectors.AsNoTracking().Where(item => item.Estado).OrderBy(item => item.NombreSector)
            // El sistema legado usa el nombre del sector como valor y el código como texto visible.
            .Select(item => new CatalogOptionDTO(item.NombreSector, item.CodSector)).ToListAsync(cancellationToken);
}
